"""Generate one MiniMax instrumental; keep credentials and API responses out of public assets."""
import argparse
import hashlib
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parents[1]
REPORT = PROJECT / 'notes/music-generation.json'
ORIGINAL = PROJECT / 'assets/music/research-to-folio-full.mp3'
PUBLIC = PROJECT / 'web/audio/research-to-folio.mp3'
MODEL = 'music-3.0'
PROMPT = '''Original instrumental miniature for a hand-drawn research notebook coming to life. Warm tactile acoustic chamber pop, felt piano, pizzicato strings, finger-picked acoustic guitar, muted marimba, brushed percussion and subtle paper-like rhythmic textures. Curious, intelligent, playful, then quietly triumphant; handmade ink-on-cream-paper atmosphere. No vocals, no spoken words, no choir. A memorable gentle melody with clear rhythmic accents at about 100 BPM. Aim for a concise 24-second piece with four 6-second movements: first scattered curious notes, second interweaving instruments and rising motion, third a bright flowing melodic lift, fourth a satisfying warm final chord and a clean soft decay. Start immediately, no long empty intro. Suitable for watching research clues connect, paper notes fold and bind into a finished notebook. Natural acoustic dynamics, polished stereo production, avoid abrasive synths and heavy bass.'''

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('API redirect refused')

def save(data):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    temporary = REPORT.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(REPORT)

def stamp():
    return datetime.now(timezone.utc).isoformat()

def credentials(env_file):
    values = {}
    if env_file:
        for line in Path(env_file).read_text(encoding='utf-8-sig').splitlines():
            match = re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$', line)
            if match:
                values[match[1]] = match[2].strip().strip(chr(34)).strip(chr(39))
    key = values.get('MINIMAX_API_KEY') or os.getenv('MINIMAX_API_KEY', '')
    base = values.get('MINIMAX_API_BASE') or os.getenv('MINIMAX_API_BASE', 'https://api.minimax.cn')
    parsed = urlsplit(base)
    if (parsed.scheme != 'https' or parsed.hostname not in {'api.minimax.cn', 'api.minimaxi.com', 'api.minimax.io'}
            or parsed.username or parsed.password or parsed.port not in (None, 443)
            or parsed.query or parsed.fragment or parsed.path not in ('', '/', '/v1', '/v1/')):
        raise ValueError('Official MiniMax HTTPS origin required')
    if not key or '\n' in key or '\r' in key:
        raise ValueError('MiniMax credential unavailable')
    return key, 'https://' + parsed.hostname

def probe(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration,size:stream=codec_name,sample_rate,channels', '-of', 'json', str(path)],
        check=True, capture_output=True, text=True)
    return json.loads(result.stdout)

def edit(report):
    info = probe(ORIGINAL)
    duration = float(info['format']['duration'])
    if duration < 12:
        raise ValueError('Generated music unexpectedly short')
    clip_duration = min(24, duration)
    PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ORIGINAL), '-t', str(clip_duration),
        '-af', f'afade=t=in:st=0:d=0.12,afade=t=out:st={clip_duration-1.3}:d=1.3',
        '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '192k', str(PUBLIC)], check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(PUBLIC), '-f', 'null', '-'], check=True, capture_output=True)
    metadata = probe(PUBLIC)
    report.update(status='succeeded', completedAt=stamp(), original={
        'path': str(ORIGINAL.relative_to(PROJECT)).replace('\\', '/'), 'duration': duration,
        'bytes': ORIGINAL.stat().st_size, 'sha256': hashlib.sha256(ORIGINAL.read_bytes()).hexdigest()},
        playback={'src': 'audio/research-to-folio.mp3', 'duration': float(metadata['format']['duration']),
            'bytes': PUBLIC.stat().st_size, 'sha256': hashlib.sha256(PUBLIC.read_bytes()).hexdigest(),
            'edit': {'start': 0, 'seconds': clip_duration, 'fadeIn': .12, 'fadeOut': 1.3}, 'metadata': metadata})
    save(report)
    print(json.dumps({'status': report['status'], 'model': report['model'], 'originalSeconds': duration,
        'playbackSeconds': report['playback']['duration'], 'bytes': PUBLIC.stat().st_size}), flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file')
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--model', default=MODEL, choices=['music-3.0', 'music-2.6'])
    args = parser.parse_args()
    report = json.loads(REPORT.read_text(encoding='utf-8')) if REPORT.exists() else {}
    if ORIGINAL.is_file() and report.get('status') in {'generated', 'succeeded'}:
        edit(report)
        return
    if not args.generate:
        print(json.dumps({'status': report.get('status', 'not_generated'), 'model': MODEL}))
        return
    if report.get('status') in {'submitting', 'submission_unknown'}:
        raise RuntimeError('Prior request outcome unknown; do not automatically resubmit')
    key, base = credentials(args.env_file)
    payload = {'model': args.model, 'prompt': PROMPT, 'is_instrumental': True, 'stream': False,
        'output_format': 'hex', 'audio_setting': {'sample_rate': 44100, 'bitrate': 256000, 'format': 'mp3'}}
    report = {'provider': 'MiniMax', 'model': args.model, 'title': '研究成册 / Research to Folio',
        'documentation': 'https://platform.minimax.cn/docs/api-reference/music-generation',
        'status': 'submitting', 'startedAt': stamp(), 'endpoint': base+'/v1/music_generation', 'request': payload}
    save(report)
    print('Submitting one MiniMax instrumental generation.', flush=True)
    request = urllib.request.Request(base + '/v1/music_generation', data=json.dumps(payload).encode(),
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=360) as response:
            result = json.load(response)
        code = result.get('base_resp', {}).get('status_code', 0)
        if code:
            raise ValueError('MiniMax '+str(code)+': '+str(result.get('base_resp', {}).get('status_msg', 'Rejected')).replace(key, '[REDACTED]')[:160])
        data = result.get('data') or {}
        if data.get('status') != 2 or not data.get('audio'):
            raise RuntimeError('Incomplete MiniMax response')
        output = bytes.fromhex(data['audio'])
        ORIGINAL.parent.mkdir(parents=True, exist_ok=True)
        ORIGINAL.write_bytes(output)
        report.update(status='generated', traceId=result.get('trace_id'), extraInfo=result.get('extra_info'), generatedAt=stamp())
        save(report)
        edit(report)
    except Exception as error:
        if isinstance(error, urllib.error.HTTPError):
            detail = error.read().decode('utf-8', errors='replace').replace(key, '[REDACTED]')[:300]
            error = ValueError(f'HTTP {error.code}: {detail}')
        if report.get('status') == 'submitting':
            report.update(status='rejected' if isinstance(error, (urllib.error.HTTPError, ValueError)) else 'submission_unknown',
                error=str(error).replace(key, '[REDACTED]')[:240])
            save(report)
        raise RuntimeError(str(error).replace(key, '[REDACTED]')[:240]) from None

if __name__ == '__main__':
    main()
