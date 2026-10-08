"""Transport tests use mocks only; no paid or live model calls."""
import importlib.util
import io
import json
import os
from pathlib import Path
import threading
import unittest
from unittest.mock import patch
from urllib.error import URLError

spec = importlib.util.spec_from_file_location('plan_service', Path(__file__).with_name('planning-server.py'))
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)
demo = json.loads((service.ROOT / 'notes/headphone-demo-plan-v12.json').read_text(encoding='utf-8'))

def output(plan=None, **changes):
    return {'id': 'resp_mock', 'status': 'completed', 'output': [{'content': [{'type': 'output_text', 'text': json.dumps(plan or demo['plan'])}]}], **changes}

def response(data):
    return io.BytesIO(json.dumps(data).encode())

class PlanServiceTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {'OPENAI_API_KEY': 'mock-test-key', 'OPENAI_MODEL': 'test-model'})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def rejection(self, data, expected):
        with patch.object(service, 'urlopen', return_value=response(data)), self.assertRaises(service.PlanError) as caught:
            service.generate(demo['brief'])
        self.assertEqual(caught.exception.status, expected)
        self.assertFalse(service.LOCK.locked())

    def test_missing_key_never_calls_network(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': ''}), patch.object(service, 'urlopen') as network, self.assertRaises(service.PlanError) as caught:
            service.generate(demo['brief'])
        self.assertEqual(caught.exception.status, 503)
        network.assert_not_called()

    def test_real_request_contract_with_mocked_response(self):
        with patch.object(service, 'urlopen', return_value=response(output())) as network:
            result = service.generate(demo['brief'])
        req = network.call_args.args[0]
        payload = json.loads(req.data)
        self.assertEqual(req.full_url, 'https://api.openai.com/v1/responses')
        self.assertFalse(payload['store'])
        self.assertEqual(payload['text']['format']['schema'], service.SCHEMA)
        self.assertTrue(payload['text']['format']['strict'])
        self.assertEqual(json.loads(payload['input']), demo['brief'])
        self.assertEqual(result['plan'], demo['plan'])
        self.assertNotIn('mock-test-key', json.dumps(result))

    def test_incomplete(self):
        self.rejection(output(status='incomplete'), 502)

    def test_refusal(self):
        self.rejection(output(output=[{'content': [{'type': 'refusal', 'refusal': 'mock refusal'}]}]), 422)

    def test_malformed_output(self):
        self.rejection(output(output=[{'content': [{'type': 'output_text', 'text': 'not-json'}]}]), 502)

    def test_schema_missing_field(self):
        plan = dict(demo['plan']); del plan['visual']
        self.rejection(output(plan), 502)

    def test_schema_extra_field(self):
        plan = dict(demo['plan'], script='alert(1)')
        self.rejection(output(plan), 502)

    def test_category_mismatch(self):
        self.rejection(output(dict(demo['plan'], category='toilet')), 502)

    def test_bad_palette(self):
        plan = json.loads(json.dumps(demo['plan']))
        plan['visual']['palette'] = ['#ffffff', 'url(javascript:alert(1))']
        self.rejection(output(plan), 502)

    def test_timeout_releases_lock(self):
        with patch.object(service, 'urlopen', side_effect=URLError('mock timeout')), self.assertRaises(service.PlanError) as caught:
            service.generate(demo['brief'])
        self.assertEqual(caught.exception.status, 504)
        self.assertFalse(service.LOCK.locked())

    def test_concurrent_request_does_not_call_twice(self):
        service.LOCK.acquire()
        try:
            with patch.object(service, 'urlopen') as network, self.assertRaises(service.PlanError) as caught:
                service.generate(demo['brief'])
            self.assertEqual(caught.exception.status, 429)
            network.assert_not_called()
        finally:
            service.LOCK.release()

    def test_brief_validation_and_category_boundaries(self):
        for raw in [None, {'product': 'x'}, {'product': 'x', 'goal': ['bad']}, {'product': 'x'*91, 'goal': 'task'}]:
            with self.assertRaises(service.PlanError):
                service.normalize_brief(raw)
        for product, kind in [('头戴式耳机', 'headphones'), ('入耳式耳机', 'other'), ('耳机', 'other'), ('咖啡机', 'other'), ('马桶', 'toilet'), ('台灯', 'lamp')]:
            self.assertEqual(service.category_for(product), kind)

if __name__ == '__main__':
    unittest.main(verbosity=2)
