import base64
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import uuid
import wave

spec = importlib.util.spec_from_file_location('drift_server', Path(__file__).resolve().parents[1]/'server/drift_server.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def recording():
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(8000)
        wav.writeframes(b'\x00\x00' * 16000)
    return buffer.getvalue()


class DriftTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.now = 100000.0
        self.path = Path(self.temp.name)/'community.sqlite3'
        self.store = module.Community(self.path, clock=lambda: self.now)
        self.a = self.store.call('POST', '/api/session', body={'name': '小禾'})['token']
        self.b = self.store.call('POST', '/api/session', body={'name': '阿岚'})['token']
        self.c = self.store.call('POST', '/api/session', body={'name': '未参与者'})['token']

    def tearDown(self):
        self.store.db.close()
        self.temp.cleanup()

    def payload(self, **patch):
        return {'requestId': str(uuid.uuid4()), 'title': '功能验证声音', 'note': '测试素材，非真人录音',
                'intention': 'listen', 'mood': '平静', 'mime': 'audio/wav', 'duration': 2,
                'audio': base64.b64encode(recording()).decode(), 'visibility': 'drift', 'consent': True} | patch

    def call(self, path, token=None, body=None):
        return self.store.call('POST', path, token or self.a, body or {})

    def publish(self):
        return self.call('/api/clips', body=self.payload())['mine'][0]['id']

    def paired(self):
        original = self.publish()
        self.call('/api/next', self.b)
        self.now += 2
        self.call('/api/heard', self.b, {'id': original})
        result = self.call('/api/reply', self.b, self.payload(id=original))
        return result['threads'][0]

    def test_identity_and_private_audio_are_isolated(self):
        self.assertNotEqual(self.a, self.b)
        item = self.call('/api/clips', body=self.payload(visibility='private', consent=False))['mine'][0]
        self.assertIsNone(self.call('/api/next', self.b)['incoming'])
        with self.assertRaises(module.Problem):
            self.store.call('GET', '/api/audio/'+item['id'], self.b)
        self.assertEqual(self.store.call('GET', '/api/audio/'+item['id'], self.a)[1], recording())
        with self.assertRaises(module.Problem):
            self.store.call('GET', '/api/state', 'unknown')

    def test_drift_never_returns_own_voice_and_claim_is_exclusive(self):
        ident = self.publish()
        self.assertIsNone(self.call('/api/next')['incoming'])
        self.assertEqual(self.call('/api/next', self.b)['incoming']['id'], ident)
        self.assertIsNone(self.call('/api/next', self.c)['incoming'])
        with self.assertRaises(module.Problem):
            self.store.call('GET', '/api/audio/'+ident, self.c)

    def test_reply_requires_listening_and_is_idempotent(self):
        ident = self.publish()
        self.call('/api/next', self.b)
        body = self.payload(id=ident)
        with self.assertRaises(module.Problem):
            self.call('/api/reply', self.b, body)
        with self.assertRaises(module.Problem):
            self.call('/api/heard', self.b, {'id': ident})
        self.now += 2
        self.call('/api/heard', self.b, {'id': ident})
        first = self.call('/api/reply', self.b, body)
        second = self.call('/api/reply', self.b, body)
        self.assertEqual(len(first['threads']), 1)
        self.assertEqual(len(second['threads'][0]['messages']), 1)
        self.assertFalse(first['threads'][0]['connected'])

    def test_submit_retry_does_not_duplicate_audio(self):
        body = self.payload()
        self.call('/api/clips', body=body)
        self.call('/api/clips', body=body)
        self.assertEqual(len(self.store.call('GET', '/api/state', self.a)['mine']), 1)

    def test_mutual_wishes_gate_further_messages(self):
        thread = self.paired()
        path = '/api/thread/'+thread['id']
        with self.assertRaises(module.Problem):
            self.call(path+'/message', self.b, self.payload())
        self.call(path+'/wish', self.b, {'want': True})
        with self.assertRaises(module.Problem):
            self.call(path+'/message', self.b, self.payload())
        self.call(path+'/wish', self.a, {'want': True})
        result = self.call(path+'/message', self.a, self.payload())
        self.assertTrue(result['threads'][0]['connected'])
        self.assertEqual(len(result['threads'][0]['messages']), 2)
        self.call(path+'/wish', self.a, {'want': False})
        with self.assertRaises(module.Problem):
            self.call(path+'/message', self.b, self.payload())

    def test_original_and_reply_audio_remain_unchanged(self):
        thread = self.paired()
        for clip in [thread['original'], *thread['messages']]:
            for token in [self.a, self.b]:
                self.assertEqual(self.store.call('GET', '/api/audio/'+clip['id'], token)[1], recording())
        self.call('/api/thread/'+thread['id']+'/soundscape', self.b, {'ambience': 'wind', 'level': .4})
        state = self.store.call('GET', '/api/state', self.a)
        self.assertEqual(state['threads'][0]['ambience'], 'wind')
        with self.assertRaises(module.Problem):
            self.call('/api/thread/'+thread['id']+'/wish', self.c, {'want': True})

    def test_withdraw_and_restore_also_protect_shared_replies(self):
        thread = self.paired()
        original, reply = thread['original']['id'], thread['messages'][0]['id']
        self.call('/api/withdraw', self.a, {'id': original})
        with self.assertRaises(module.Problem):
            self.store.call('GET', '/api/audio/'+original, self.b)
        self.call('/api/withdraw', self.a, {'id': original, 'restore': True})
        self.assertEqual(self.store.call('GET', '/api/audio/'+original, self.b)[1], recording())
        self.call('/api/withdraw', self.b, {'id': reply})
        with self.assertRaises(module.Problem):
            self.store.call('GET', '/api/audio/'+reply, self.a)
        self.call('/api/withdraw', self.b, {'id': reply, 'restore': True})
        self.assertEqual(self.store.call('GET', '/api/audio/'+reply, self.a)[1], recording())

    def test_skip_does_not_redeliver_and_claim_expires(self):
        ident = self.publish()
        self.call('/api/next', self.b)
        self.call('/api/skip', self.b, {'id': ident})
        self.assertIsNone(self.call('/api/next', self.b)['incoming'])
        self.call('/api/next', self.c)
        self.now += 901
        self.assertEqual(self.call('/api/next', self.b)['incoming'], None)
        self.assertEqual(self.call('/api/next', self.c)['incoming']['id'], ident)

    def test_reports_pause_drift_and_are_persisted(self):
        ident = self.publish()
        self.call('/api/next', self.b)
        self.call('/api/report', self.b, {'id': ident, 'reason': '不适合交流'})
        self.assertIsNone(self.call('/api/next', self.c)['incoming'])
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM reports').fetchone()[0], 1)
        with self.assertRaises(module.Problem):
            self.call('/api/withdraw', body={'id': ident, 'restore': True})

    def test_validation_rejects_invalid_or_unconsented_audio_without_writes(self):
        for patch in [{'consent': False}, {'duration': 31}, {'audio': 'bad'}, {'mime': 'audio/mp4'},
                      {'duration': 3}, {'mood': '自动诊断'}, {'title': '<'*41}, {'requestId': ''}]:
            with self.assertRaises(module.Problem):
                self.call('/api/clips', body=self.payload(**patch))
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM clips').fetchone()[0], 0)

    def test_daily_and_in_flight_limits(self):
        for _ in range(10):
            self.publish()
        with self.assertRaises(module.Problem):
            self.publish()
        for _ in range(20):
            self.call('/api/clips', body=self.payload(visibility='private'))
        with self.assertRaises(module.Problem):
            self.call('/api/clips', body=self.payload(visibility='private'))

    def test_database_restart_keeps_participants_and_relationships(self):
        thread = self.paired()
        self.store.db.close()
        self.store = module.Community(self.path, clock=lambda: self.now)
        state = self.store.call('GET', '/api/state', self.a)
        self.assertEqual(state['threads'][0]['id'], thread['id'])
        self.assertEqual(len(state['threads'][0]['messages']), 1)

    def test_operator_can_resolve_reports_with_an_audit_record(self):
        ident = self.publish()
        self.call('/api/next', self.b)
        self.call('/api/report', self.b, {'id': ident, 'reason': '请处理'})
        report = self.store.db.execute('SELECT id FROM reports').fetchone()[0]
        self.assertEqual(self.store.review(report, 'restore')['status'], 'active')
        self.assertEqual(self.call('/api/next', self.c)['incoming']['id'], ident)
        self.assertIsNone(self.call('/api/next', self.b)['incoming'])
        with self.assertRaises(module.Problem):
            self.store.review(report, 'withdraw')
        self.assertEqual(self.store.db.execute('SELECT count(*) FROM moderation').fetchone()[0], 1)
        self.call('/api/report', self.c, {'id': ident, 'reason': '另一份处理'})
        other = self.store.db.execute('SELECT id FROM reports WHERE id!=?', (report,)).fetchone()[0]
        self.assertEqual(self.store.review(other, 'withdraw')['status'], 'blocked')
        with self.assertRaises(module.Problem):
            self.call('/api/withdraw', body={'id': ident, 'restore': True})

    def test_reporting_a_reply_pauses_further_contact(self):
        thread = self.paired()
        path = '/api/thread/'+thread['id']
        self.call(path+'/wish', self.a, {'want': True})
        self.call(path+'/wish', self.b, {'want': True})
        self.call('/api/report', self.a, {'id': thread['messages'][0]['id'], 'reason': '不再交流'})
        with self.assertRaises(module.Problem):
            self.call(path+'/message', self.b, self.payload())


if __name__ == '__main__':
    unittest.main()
