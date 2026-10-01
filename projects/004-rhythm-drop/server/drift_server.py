"""Local voice community. Run from any directory; no external services required."""
import argparse
import base64
import hashlib
import io
import json
import secrets
import sqlite3
import threading
import time
import uuid
import wave
from collections import defaultdict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
MAX_AUDIO = 6 * 1024 * 1024


class Problem(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


def text(value, limit, required=False):
    if not isinstance(value, str) or len(value.strip()) > limit or (required and not value.strip()):
        raise Problem('请检查文字长度与必填内容。')
    return value.strip()


class Community:
    def __init__(self, path, clock=time.time):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock, self.clock = threading.RLock(), clock
        self.db.executescript('''
          PRAGMA journal_mode=WAL;
          PRAGMA foreign_keys=ON;
          CREATE TABLE IF NOT EXISTS people(id TEXT PRIMARY KEY, token TEXT UNIQUE, name TEXT, created REAL);
          CREATE TABLE IF NOT EXISTS clips(id TEXT PRIMARY KEY, owner TEXT REFERENCES people(id), title TEXT,
            note TEXT, intention TEXT, mood TEXT, mime TEXT, duration REAL, audio BLOB,
            visibility TEXT, status TEXT, created REAL, recipient TEXT, claimed REAL);
          CREATE TABLE IF NOT EXISTS heard(clip TEXT, person TEXT, PRIMARY KEY(clip,person));
          CREATE TABLE IF NOT EXISTS hidden(clip TEXT, person TEXT, PRIMARY KEY(clip,person));
          CREATE TABLE IF NOT EXISTS threads(id TEXT PRIMARY KEY, original TEXT UNIQUE REFERENCES clips(id),
            recipient TEXT, owner_wants INTEGER DEFAULT 0, peer_wants INTEGER DEFAULT 0,
            ambience TEXT DEFAULT 'rain', level REAL DEFAULT .25, created REAL);
          CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY, thread TEXT REFERENCES threads(id),
            clip TEXT REFERENCES clips(id));
          CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, clip TEXT, reporter TEXT, reason TEXT, created REAL);
          CREATE TABLE IF NOT EXISTS submissions(person TEXT, request TEXT, path TEXT, PRIMARY KEY(person,request));
          CREATE TABLE IF NOT EXISTS moderation(report TEXT PRIMARY KEY, decision TEXT, created REAL);
        ''')

    def person(self, token):
        row = self.db.execute('SELECT * FROM people WHERE token=?', (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
        if not row:
            raise Problem('本机身份无法验证，请选择已有身份或新建体验身份。', 401)
        return row

    def clip(self, ident):
        row = self.db.execute('SELECT * FROM clips WHERE id=?', (ident,)).fetchone()
        if not row:
            raise Problem('这段声音暂时找不到。', 404)
        return row

    def thread(self, ident, me):
        row = self.db.execute('SELECT t.*, c.owner, c.status FROM threads t JOIN clips c ON c.id=t.original WHERE t.id=?', (ident,)).fetchone()
        if not row or me not in (row['owner'], row['recipient']):
            raise Problem('这次相遇不属于当前身份。', 403)
        if self.db.execute('SELECT 1 FROM hidden WHERE clip=? AND person=?', (row['original'], me)).fetchone():
            raise Problem('你已经选择不再接收这段声音。', 403)
        return row

    def can_hear(self, clip, me):
        if clip['owner'] == me:
            return True
        if clip['status'] in ('withdrawn', 'review', 'blocked'):
            return False
        if self.db.execute('SELECT 1 FROM hidden WHERE clip=? AND person=?', (clip['id'], me)).fetchone():
            return False
        if clip['recipient'] == me:
            return True
        relation = self.db.execute('''SELECT c.owner, t.recipient, t.original FROM messages m
            JOIN threads t ON t.id=m.thread JOIN clips c ON c.id=t.original WHERE m.clip=?''', (clip['id'],)).fetchone()
        return bool(relation and me in (relation['owner'], relation['recipient']) and
                    not self.db.execute('SELECT 1 FROM hidden WHERE clip=? AND person=?', (relation['original'], me)).fetchone())

    def meta(self, clip, me):
        owner = self.db.execute('SELECT name FROM people WHERE id=?', (clip['owner'],)).fetchone()['name']
        playable = self.can_hear(clip, me)
        fields = {k: clip[k] for k in ('id', 'title', 'note', 'intention', 'mood', 'duration', 'visibility', 'status', 'created')}
        if not playable:
            fields.update(title='已收回的声音', note='')
        return fields | {
            'name': owner, 'mine': clip['owner'] == me, 'playable': playable,
            'heard': bool(self.db.execute('SELECT 1 FROM heard WHERE clip=? AND person=?', (clip['id'], me)).fetchone())}

    def upload(self, me, body, visibility):
        count = self.db.execute('SELECT count(*) FROM clips WHERE owner=? AND created>?', (me, self.clock()-86400)).fetchone()[0]
        if count >= 30:
            raise Problem('今天已留下 30 段声音，明天再继续。', 429)
        duration, mime = body.get('duration'), body.get('mime')
        if not isinstance(duration, (int, float)) or isinstance(duration, bool) or not 1 <= duration <= 30:
            raise Problem('声音长度需要为 1–30 秒。')
        if mime not in ('audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4'):
            raise Problem('请选择 WAV、WebM、OGG 或 M4A 音频。')
        encoded = body.get('audio')
        if not isinstance(encoded, str) or len(encoded) > MAX_AUDIO*4//3+8:
            raise Problem('声音文件需要小于 6 MB。', 413)
        try:
            data = base64.b64decode(encoded, validate=True)
        except (ValueError, TypeError):
            raise Problem('声音文件无法读取。') from None
        if not 32 <= len(data) <= MAX_AUDIO:
            raise Problem('声音文件为空或过大。', 413)
        signatures = {'audio/webm': data.startswith(b'\x1aE\xdf\xa3'), 'audio/ogg': data.startswith(b'OggS'),
                      'audio/wav': data.startswith(b'RIFF') and data[8:12] == b'WAVE',
                      'audio/mp4': data[4:8] == b'ftyp'}
        if not signatures[mime]:
            raise Problem('音频类型与文件内容不一致。')
        if mime == 'audio/wav':
            try:
                with wave.open(io.BytesIO(data)) as wav:
                    actual = wav.getnframes()/wav.getframerate()
                    if not 1 <= actual <= 30 or abs(actual-duration) > .3:
                        raise Problem('WAV 时长不符合 1–30 秒范围。')
            except (wave.Error, EOFError, ZeroDivisionError):
                raise Problem('WAV 文件损坏。') from None
        intention = body.get('intention', 'listen')
        mood = body.get('mood', '平静')
        if intention not in ('listen', 'create', 'moment') or mood not in ('平静', '想念', '有点累', '期待'):
            raise Problem('请选择一个表达方向与心情。')
        ident = str(uuid.uuid4())
        self.db.execute('INSERT INTO clips VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        (ident, me, text(body.get('title', ''), 40, True), text(body.get('note', ''), 160),
                         intention, mood, mime, duration, data, visibility,
                         'active' if visibility == 'drift' else 'private', self.clock(), None, None))
        return ident

    def state(self, me):
        mine = [self.meta(c, me) for c in self.db.execute("SELECT * FROM clips WHERE owner=? AND visibility!='reply' ORDER BY created DESC", (me,))]
        threads = []
        for row in self.db.execute('SELECT t.id FROM threads t JOIN clips c ON c.id=t.original WHERE c.owner=? OR t.recipient=? ORDER BY t.created DESC', (me, me)).fetchall():
            try:
                t = self.thread(row['id'], me)
            except Problem:
                continue
            original = self.clip(t['original'])
            messages = [self.meta(self.clip(r['clip']), me) for r in self.db.execute('SELECT clip FROM messages WHERE thread=? ORDER BY rowid', (t['id'],))]
            is_owner = t['owner'] == me
            own_wants, peer_wants = bool(t['owner_wants'] if is_owner else t['peer_wants']), bool(t['peer_wants'] if is_owner else t['owner_wants'])
            threads.append({'id': t['id'], 'original': self.meta(original, me), 'messages': messages,
                            'myWish': own_wants, 'theirWish': peer_wants, 'connected': own_wants and peer_wants and t['status'] == 'paired',
                            'ambience': t['ambience'], 'level': t['level']})
        incoming = self.db.execute("SELECT * FROM clips WHERE recipient=? AND status='claimed' ORDER BY claimed DESC LIMIT 1", (me,)).fetchone()
        return {'profile': {'name': self.db.execute('SELECT name FROM people WHERE id=?', (me,)).fetchone()['name']},
                'mine': mine, 'threads': threads, 'incoming': self.meta(incoming, me) if incoming else None}

    def call(self, method, path, token='', body=None):
        body = body or {}
        with self.lock, self.db:
            if method == 'GET' and path == '/api/health':
                return {'mode': 'local', 'name': '回声花园', 'version': 1}
            if method == 'POST' and path == '/api/session':
                token, ident = secrets.token_urlsafe(32), str(uuid.uuid4())
                name = text(body.get('name', '未署名'), 16, True)
                self.db.execute('INSERT INTO people VALUES(?,?,?,?)', (ident, hashlib.sha256(token.encode()).hexdigest(), name, self.clock()))
                return {'token': token, 'name': name}
            me = self.person(token)['id']
            upload_operation = method == 'POST' and (path in ('/api/clips', '/api/reply') or path.endswith('/message'))
            request_id = body.get('requestId')
            if upload_operation:
                if not isinstance(request_id, str) or len(request_id) != 36:
                    raise Problem('提交编号无效，请重新打开录音页。')
                old = self.db.execute('SELECT path FROM submissions WHERE person=? AND request=?', (me, request_id)).fetchone()
                if old:
                    if old['path'] != path:
                        raise Problem('这份录音已经用于另一次提交。', 409)
                    return self.state(me)
            if method == 'GET' and path == '/api/state':
                return self.state(me)
            if method == 'GET' and path.startswith('/api/audio/'):
                clip = self.clip(path.split('/')[-1])
                if not self.can_hear(clip, me):
                    raise Problem('这段声音已经收回，或没有对当前身份开放。', 403)
                return (clip['mime'], bytes(clip['audio']))
            if method == 'POST' and path == '/api/profile':
                self.db.execute('UPDATE people SET name=? WHERE id=?', (text(body.get('name'), 16, True), me))
            elif method == 'POST' and path == '/api/clips':
                visibility = body.get('visibility')
                if visibility not in ('private', 'drift') or (visibility == 'drift' and body.get('consent') is not True):
                    raise Problem('请确认是否愿意让接收者听见这段声音。')
                if visibility == 'drift' and self.db.execute("SELECT count(*) FROM clips WHERE owner=? AND visibility='drift' AND status IN ('active','claimed')", (me,)).fetchone()[0] >= 10:
                    raise Problem('最多同时漂流 10 段声音，先等待回应或收回一段。')
                self.upload(me, body, visibility)
            elif method == 'POST' and path == '/api/next':
                self.db.execute("UPDATE clips SET recipient=NULL, claimed=NULL, status='active' WHERE status='claimed' AND claimed<?", (self.clock()-900,))
                current = self.db.execute("SELECT id FROM clips WHERE recipient=? AND status='claimed'", (me,)).fetchone()
                if not current:
                    candidate = self.db.execute("""SELECT id FROM clips WHERE visibility='drift' AND status='active' AND owner!=?
                        AND NOT EXISTS(SELECT 1 FROM hidden WHERE hidden.clip=clips.id AND hidden.person=?) ORDER BY RANDOM() LIMIT 1""", (me, me)).fetchone()
                    if candidate:
                        self.db.execute("UPDATE clips SET status='claimed',recipient=?,claimed=? WHERE id=?", (me, self.clock(), candidate['id']))
            elif method == 'POST' and path == '/api/heard':
                clip = self.clip(body.get('id'))
                if not self.can_hear(clip, me):
                    raise Problem('无法倾听这段声音。', 403)
                if clip['recipient'] == me and clip['status'] == 'claimed' and self.clock()-clip['claimed'] < clip['duration']*.8:
                    raise Problem('请把这段声音听完，再留下回应。')
                self.db.execute('INSERT OR IGNORE INTO heard VALUES(?,?)', (clip['id'], me))
            elif method == 'POST' and path == '/api/reply':
                clip = self.clip(body.get('id'))
                if clip['recipient'] != me or clip['status'] != 'claimed':
                    raise Problem('这段声音已经离开漂流，无法重复回应。', 409)
                if not self.db.execute('SELECT 1 FROM heard WHERE clip=? AND person=?', (clip['id'], me)).fetchone():
                    raise Problem('先听完这段声音，再回应。')
                if body.get('consent') is not True:
                    raise Problem('请同意将回应交给这段声音的作者。')
                reply = self.upload(me, body, 'reply')
                thread = str(uuid.uuid4())
                self.db.execute('INSERT INTO threads(id,original,recipient,created) VALUES(?,?,?,?)', (thread, clip['id'], me, self.clock()))
                self.db.execute('INSERT INTO messages VALUES(?,?,?)', (str(uuid.uuid4()), thread, reply))
                self.db.execute("UPDATE clips SET status='paired' WHERE id=?", (clip['id'],))
            elif method == 'POST' and path == '/api/withdraw':
                clip = self.clip(body.get('id'))
                if clip['owner'] != me or clip['visibility'] == 'private':
                    raise Problem('只能收回自己分享的声音。', 403)
                if clip['status'] in ('review', 'blocked'):
                    raise Problem('这段声音暂停漂流，等待处理。')
                if body.get('restore'):
                    if clip['status'] != 'withdrawn':
                        raise Problem('这段声音还没有收回。')
                    paired = self.db.execute('SELECT 1 FROM threads WHERE original=?', (clip['id'],)).fetchone()
                    self.db.execute('UPDATE clips SET status=?,recipient=?,claimed=NULL WHERE id=?',
                                    ('private' if clip['visibility'] == 'reply' else 'paired' if paired else 'active', clip['recipient'] if paired else None, clip['id']))
                else:
                    self.db.execute("UPDATE clips SET status='withdrawn' WHERE id=?", (clip['id'],))
            elif method == 'POST' and path in ('/api/skip', '/api/report'):
                clip = self.clip(body.get('id'))
                if clip['owner'] == me or not self.can_hear(clip, me):
                    raise Problem('无法处理这段声音。', 403)
                self.db.execute('INSERT OR IGNORE INTO hidden VALUES(?,?)', (clip['id'], me))
                if path == '/api/report':
                    reason = text(body.get('reason'), 120, True)
                    self.db.execute('INSERT INTO reports VALUES(?,?,?,?,?)', (str(uuid.uuid4()), clip['id'], me, reason, self.clock()))
                    self.db.execute("UPDATE clips SET status='review' WHERE id=?", (clip['id'],))
                    relation = self.db.execute('''SELECT t.id,c.owner FROM threads t JOIN clips c ON c.id=t.original
                        WHERE t.original=? OR t.id IN (SELECT thread FROM messages WHERE clip=?)''', (clip['id'], clip['id'])).fetchone()
                    if relation:
                        column = 'owner_wants' if relation['owner'] == me else 'peer_wants'
                        self.db.execute(f'UPDATE threads SET {column}=0 WHERE id=?', (relation['id'],))
                elif clip['status'] == 'claimed':
                    self.db.execute("UPDATE clips SET status='active',recipient=NULL,claimed=NULL WHERE id=?", (clip['id'],))
            elif method == 'POST' and path.startswith('/api/thread/'):
                parts = path.split('/')
                if len(parts) != 5:
                    raise Problem('操作不存在。', 404)
                thread = self.thread(parts[3], me)
                action = parts[4]
                if action == 'wish':
                    if body.get('want') not in (True, False):
                        raise Problem('请选择是否继续交流。')
                    column = 'owner_wants' if thread['owner'] == me else 'peer_wants'
                    self.db.execute(f'UPDATE threads SET {column}=? WHERE id=?', (int(body['want']), thread['id']))
                elif action == 'soundscape':
                    ambience, level = body.get('ambience'), body.get('level')
                    if ambience not in ('none', 'rain', 'wind', 'bells') or not isinstance(level, (int, float)) or isinstance(level, bool) or not 0 <= level <= 1:
                        raise Problem('请检查背景声音和音量。')
                    self.db.execute('UPDATE threads SET ambience=?,level=? WHERE id=?', (ambience, level, thread['id']))
                elif action == 'message':
                    if not (thread['owner_wants'] and thread['peer_wants'] and thread['status'] == 'paired'):
                        raise Problem('双方都愿意继续交流后，才能留下新的声音。', 403)
                    if self.db.execute('SELECT count(*) FROM messages WHERE thread=?', (thread['id'],)).fetchone()[0] >= 20:
                        raise Problem('这株植物已留下 20 段回应，请先重听这些声音。')
                    if body.get('consent') is not True:
                        raise Problem('请同意将留言交给对方。')
                    clip = self.upload(me, body, 'reply')
                    self.db.execute('INSERT INTO messages VALUES(?,?,?)', (str(uuid.uuid4()), thread['id'], clip))
                else:
                    raise Problem('操作不存在。', 404)
            else:
                raise Problem('操作不存在。', 404)
            if upload_operation:
                self.db.execute('INSERT INTO submissions VALUES(?,?,?)', (me, request_id, path))
            return self.state(me)

    def review(self, report_id, decision):
        """Operator-only local CLI; deliberately no HTTP administration route."""
        with self.lock, self.db:
            row = self.db.execute('SELECT * FROM reports WHERE id=?', (report_id,)).fetchone()
            if not row or decision not in ('restore', 'withdraw'):
                raise Problem('请选择有效的举报编号和处理方式。')
            if self.db.execute('SELECT 1 FROM moderation WHERE report=?', (report_id,)).fetchone():
                raise Problem('这份举报已处理。')
            clip = self.clip(row['clip'])
            paired = self.db.execute('SELECT 1 FROM threads WHERE original=?', (clip['id'],)).fetchone()
            status = 'blocked' if decision == 'withdraw' else 'private' if clip['visibility'] == 'reply' else 'paired' if paired else 'active'
            self.db.execute('UPDATE clips SET status=?,recipient=?,claimed=NULL WHERE id=?',
                            (status, clip['recipient'] if paired else None, clip['id']))
            self.db.execute('INSERT INTO moderation VALUES(?,?,?)', (report_id, decision, self.clock()))
            return {'report': report_id, 'decision': decision, 'status': status}


def serve(port=8941, db=None):
    store = Community(db or ROOT/'build/drift/community.sqlite3')
    arrivals = defaultdict(deque)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT/'web'), **kwargs)

        def log_message(self, *args):
            # Do not log credentials, titles or audio payloads.
            pass

        def end_headers(self):
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'same-origin')
            if self.path.startswith('/api/'):
                self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def list_directory(self, path):
            self.send_error(404)

        def request_api(self):
            try:
                host = self.headers.get('Host', '')
                if host not in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'):
                    raise Problem('当前服务仅用于本机体验。', 403)
                origin = self.headers.get('Origin')
                if origin and origin not in (f'http://127.0.0.1:{self.server.server_port}', f'http://localhost:{self.server.server_port}'):
                    raise Problem('来源地址不匹配。', 403)
                body = {}
                if self.command == 'POST':
                    if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                        raise Problem('请使用 JSON 请求。', 415)
                    length = int(self.headers.get('Content-Length', '0'))
                    if not 0 < length <= 9*1024*1024:
                        raise Problem('请求为空或过大。', 413)
                    body = json.loads(self.rfile.read(length))
                    if not isinstance(body, dict):
                        raise Problem('请求内容无法读取。')
                    bucket = arrivals[(self.client_address[0], urlparse(self.path).path == '/api/session')]
                    now = time.time()
                    while bucket and now-bucket[0] > 60:
                        bucket.popleft()
                    if len(bucket) >= 30:
                        raise Problem('操作有点频繁，请稍等一分钟。', 429)
                    bucket.append(now)
                result = store.call(self.command, urlparse(self.path).path,
                                    self.headers.get('Authorization', '').removeprefix('Bearer '), body)
                if isinstance(result, tuple):
                    mime, payload = result
                else:
                    mime, payload = 'application/json; charset=utf-8', json.dumps(result, ensure_ascii=False).encode()
                self.send_response(200)
                self.send_header('Content-Type', mime)
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            except Problem as error:
                self.error_json(error.status, error.message)
            except (ValueError, TypeError, KeyError):
                self.error_json(400, '请求内容无法读取，原声音保留。')
            except (sqlite3.Error, OSError):
                self.error_json(503, '保存暂时不可用，录音仍在当前页面，请稍后重试。')

        def error_json(self, status, message):
            payload = json.dumps({'error': message}, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            if self.path.startswith('/api/'):
                self.request_api()
            else:
                super().do_GET()

        def do_POST(self):
            self.request_api()

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Voice community: http://127.0.0.1:{server.server_port}/garden/drift/', flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        store.db.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8941)
    parser.add_argument('--db', type=Path)
    parser.add_argument('--reports', action='store_true')
    parser.add_argument('--resolve')
    parser.add_argument('--decision', choices=['restore', 'withdraw'])
    args = parser.parse_args()
    if args.reports or args.resolve:
        community = Community(args.db or ROOT/'build/drift/community.sqlite3')
        try:
            if args.resolve:
                print(json.dumps(community.review(args.resolve, args.decision), ensure_ascii=False))
            else:
                rows = community.db.execute('SELECT id,clip,reason,created FROM reports WHERE id NOT IN (SELECT report FROM moderation)').fetchall()
                print(json.dumps([dict(row) for row in rows], ensure_ascii=False))
        except Problem as problem:
            parser.error(problem.message)
        finally:
            community.db.close()
    else:
        serve(args.port, args.db)
