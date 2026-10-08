from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3] / '_site'
PREFIX = '/0930_codex_project'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def translate_path(self, value):
        if value.startswith(PREFIX):
            value = value[len(PREFIX):] or '/'
        return super().translate_path(value)

ThreadingHTTPServer(('127.0.0.1', 8963), Handler).serve_forever()
