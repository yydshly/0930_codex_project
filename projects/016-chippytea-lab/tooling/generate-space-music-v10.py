"""One anonymous official Music3 Space request per remaining original world.

Persist the job before reading SSE; rerunning recovers that job, never reposts.
No credentials, billing, terms acceptance, proxy rotation or quota bypass.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import wave
from datetime import datetime, timezone

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
HOST = "https://minimaxai-minimax-music3.hf.space"
ENDPOINT = HOST + "/gradio_api/call/v2/studio_generate"
FFMPEG = pathlib.Path("D:/26project/26audio_and_video_project/ffmpeg-n6.1.3-win64-gpl-shared-6.1/bin/ffmpeg.exe")
SOURCES = [
    "https://huggingface.co/MiniMaxAI/MiniMax-Music3",
    "https://huggingface.co/spaces/MiniMaxAI/MiniMax-Music3/blob/main/app.py",
    "https://huggingface.co/docs/hub/spaces-zerogpu",
]


def now():
    return datetime.now(timezone.utc).isoformat()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def request_for(scene):
    common = {
        "mode": "studio", "instrumental": True, "lyrics": "[instrumental]",
        "vocals": "Instrumental only. No vocals, words, speech, humming, choir or vocal chops. Do not quote any existing melody.",
    }
    if scene == "gravity":
        common.update({
            "title": "Seeds on a Little Wind",
            "description": "Original instrumental miniature for a handmade gravity garden: an airy mischievous wind sprite scatters star-seeds while a sleepy stone gardener catches them and grows a flower garden. No vocals or speech.",
            "global_meta": "Genre: intimate playful acoustic chamber folk. BPM: 96. Key: G major. Duration target: 35 seconds. Begin immediately. Four-part emotional arc: 0-8s a sleepy woody low motif and a curious high wind note; 8-16s an excited breeze scatters seeds with a little comic stumble; 16-24s the gardener answers and catches them; 24-32s the two motifs bloom together, landing softly; 32-35s short natural decay. Warm tactile hand-painted atmosphere, natural stereo, gentle bass, no epic fanfare.",
            "arrangement": "Two distinct musical personalities: airy piccolo or small wooden flute for the ribbon wind sprite, soft low woody bass plucks and warm bass marimba for the round stone gardener. Start with slow low taps and a tiny curious piccolo pickup. Let the piccolo rise in quick light runs over sparse brushed percussion as the wind gets carried away. Include one playful rhythmic stumble. Low bass replies in falling steps as star-seeds return to earth, then the piccolo and bass enter a clear call-and-response. Build a small warm shared growing melody with subtle acoustic strings near the ending, resolve softly with a brief clean decay. Handmade acoustic instruments only, no vocals, no synthetic beeps, no heavy drums, no cinematic bombast. New original melody.",
        })
    else:
        common.update({
            "title": "Three Stitches for the Moon",
            "description": "Original instrumental miniature for a cozy handmade moon mending shop: a meticulous tailor follows a mischievous hiccupping golden moon, catches its thread, sews three little patches, and they settle happily. No vocals or speech.",
            "global_meta": "Genre: witty intimate acoustic chamber miniature. BPM: 112. Key: D major. Duration target: 35 seconds. Begin immediately. Four-part arc: 0-8s a careful three-note stitch motif discovers leaking starlight; 8-16s offbeat hiccups lead to a light elastic chase; 16-24s three clearly articulated stitch accents weave the two motifs together; 24-32s pulling tension releases into a warm floating resolution; 32-35s a short natural decay. Handmade paper theatre, restrained dynamics, clear pulse, no triumphant fanfare.",
            "arrangement": "Pizzicato chamber strings are the principal voice. Pair a meticulous low plucked-string tailor motif with higher skipping moon replies. Tiny wooden clicks and muted brushed taps form a delicate sewing-like rhythm, never an industrial machine sound. A careful three-note pluck starts immediately. Add a short offbeat pluck and a gentle rhythmic interruption for each imaginary moon hiccup, then a comic elastic chase with pulling and releasing phrases. Three precise stitch accents catch the thread; the string motifs interweave. Warm bowed-string answers arrive near the last section, easing to a soft lyrical phrase and a satisfying compact final chord with clean decay. Acoustic chamber scale, no lyrics, no humming, no choir, no synth drops, no heavy drums. New original melody.",
        })
    return {"state": common, "duration": 35, "seed": 23 if scene == "gravity" else 31,
            "randomize_seed": False, "headroom": 0, "steps": 30, "guidance": 1.7}


def fresh_receipt(scene):
    payload = request_for(scene)
    return {"version": 10, "scene": scene, "provider": "MiniMax", "model": "MiniMaxAI/MiniMax-Music3",
            "route": "official Hugging Face MiniMaxAI ZeroGPU Space", "startedAt": now(),
            "status": "prepared", "endpoint": ENDPOINT, "apiName": "/studio_generate",
            "officialSources": SOURCES, "preflight": "music-space-preflight-v10.json",
            "request": payload, "requestSha256": sha(json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode()),
            "requestHashSerialization": "Canonical compact UTF-8 JSON, preserving insertion order",
            "requestBodySha256": sha(json.dumps(payload, ensure_ascii=False).encode()),
            "generationPostAttempts": 0, "credentialUsed": False, "paidOverageAllowed": False,
            "termsAccepted": False, "quotaEvasion": False, "events": [],
            "quota": {"anonymousTierDailySeconds": 120, "xlargeMultiplier": 2,
                      "sourceDurationEstimateSeconds": 48, "estimatedQuotaSeconds": 96,
                      "remainingBeforeRequest": None,
                      "note": "Published tier limit and source estimate, not measured remaining quota. Stop when the service reports an actual quota/login/terms/payment boundary."}}


def summary():
    pieces = {}
    for scene in ("gravity", "moon"):
        path = ROOT / f"notes/world-music-{scene}-generation-v10.json"
        if path.exists():
            item = json.loads(path.read_text(encoding="utf-8"))
            pieces[scene] = {"status": item["status"], "receipt": path.relative_to(ROOT).as_posix(),
                             "generationPostAttempts": item["generationPostAttempts"],
                             "playbackOutput": item.get("playbackOutput"), "blocker": item.get("blocker")}
    status = "success" if pieces and all(x["status"] == "success" for x in pieces.values()) and len(pieces) == 2 else "partial" if any(x["status"] == "success" for x in pieces.values()) else "blocked"
    save(ROOT / "notes/world-music-generation-v10.json", {"version": 10, "provider": "MiniMax",
         "model": "MiniMaxAI/MiniMax-Music3", "updatedAt": now(), "status": status, "worlds": pieces,
         "existingShadow": "world-music-generation-v9.json; not regenerated",
         "limitations": "Generated file verification is not listening-quality or real browser synchronization verification."})


def event_stream(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"Accept": "text/event-stream"}), timeout=90) as response:
        event, data = "", []
        for raw in response:
            line = raw.decode("utf-8").rstrip("\r\n")
            if not line:
                if data:
                    yield event, json.loads("\n".join(data))
                event, data = "", []
            elif line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                data.append(line[5:].strip())
        if data:
            yield event, json.loads("\n".join(data))


def file_data(value):
    if isinstance(value, dict) and value.get("path") and (value.get("meta", {}).get("_type") == "gradio.FileData" or str(value["path"]).endswith(".wav")):
        return value
    if isinstance(value, list):
        for item in value:
            found = file_data(item)
            if found:
                return found
    return None


def process_audio(receipt, output):
    scene = receipt["scene"]
    native = ROOT / f"assets/music/{scene}-minimax-full.wav"
    playback = ROOT / f"web/audio/{scene}-minimax.mp3"
    native.parent.mkdir(parents=True, exist_ok=True)
    playback.parent.mkdir(parents=True, exist_ok=True)
    url = output.get("url") or HOST + "/gradio_api/file=" + urllib.parse.quote(output["path"], safe="/")
    if urllib.parse.urlparse(url).hostname != urllib.parse.urlparse(HOST).hostname:
        raise ValueError("Unexpected provider file host; no file downloaded")
    if not native.exists():
        with urllib.request.urlopen(url, timeout=90) as response:
            native.write_bytes(response.read())
    with wave.open(str(native), "rb") as wav:
        frames, sr, channels, width = wav.getnframes(), wav.getframerate(), wav.getnchannels(), wav.getsampwidth()
        native_duration = frames / sr
        pcm = np.frombuffer(wav.readframes(frames), dtype="<i2").astype(np.float64) / 32768
    if width != 2 or not pcm.size or np.max(np.abs(pcm)) <= 1e-7:
        raise ValueError("Native output is not a non-silent 16-bit WAV")
    fade_start = max(0, min(32.0, native_duration) - 1.0)
    filters = f"afade=t=out:st={fade_start:.12f}:d=1,atrim=end=32,apad=whole_dur=32"
    subprocess.run([str(FFMPEG), "-v", "error", "-y", "-i", str(native), "-af", filters,
                    "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", str(playback)], check=True)
    decoded = subprocess.run([str(FFMPEG), "-v", "error", "-i", str(playback), "-f", "f32le", "-acodec", "pcm_f32le", "-ar", "44100", "-ac", "2", "-"], check=True, capture_output=True).stdout
    samples = np.frombuffer(decoded, dtype="<f4")
    decoded_seconds = samples.size / (44100 * 2)
    if decoded_seconds != 32.0 or np.max(np.abs(samples)) <= 1e-7:
        raise ValueError("Playback output did not decode to a non-silent exact 32 seconds")
    peak = float(np.max(np.abs(pcm)))
    rms = float(np.sqrt(np.mean(pcm * pcm)))
    receipt.update({"status": "success", "audioFileData": output,
        "nativeOutput": {"path": native.relative_to(ROOT).as_posix(), "bytes": native.stat().st_size,
            "sha256": sha(native.read_bytes()), "durationSeconds": native_duration, "sampleRate": sr,
            "channels": channels, "sampleWidthBytes": width, "peakDbfs": 20 * math.log10(peak), "rmsDbfs": 20 * math.log10(rms), "nonSilent": True},
        "playbackOutput": {"path": playback.relative_to(ROOT).as_posix(), "bytes": playback.stat().st_size,
            "sha256": sha(playback.read_bytes()), "codec": "mp3", "sampleRate": 44100, "channels": 2,
            "bitrate": 192000, "actualDecodedDurationSeconds": decoded_seconds, "nonSilent": True},
        "edit": {"nativeSourceDurationSeconds": native_duration, "playbackDurationSeconds": 32,
            "fadeOutStartSeconds": fade_start, "fadeOutDurationSeconds": 1,
            "tailSilenceSeconds": max(0, 32 - native_duration), "trimmedTailSeconds": max(0, native_duration - 32),
            "timeStretch": False, "regeneration": False, "synthesisAdded": False, "filter": filters},
        "verification": {"decodable": True, "decodedPcmSamples": samples.size,
            "decodedExactly32Seconds": True, "nativeOutputPreserved": True,
            "playbackPeak": float(np.max(np.abs(samples))), "playbackRms": float(np.sqrt(np.mean(samples * samples))),
            "listeningVerified": False, "animationSynchronizationVerified": False}, "finishedAt": now()})


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scene", choices=("gravity", "moon"))
    args = parser.parse_args()
    path = ROOT / f"notes/world-music-{args.scene}-generation-v10.json"
    receipt = json.loads(path.read_text(encoding="utf-8")) if path.exists() else fresh_receipt(args.scene)
    if receipt["status"] in ("success", "blocked", "not_submitted_quota_boundary", "unknown_submit_outcome"):
        print(json.dumps({"scene": args.scene, "status": receipt["status"], "reposted": False}))
        summary()
        return
    save(path, receipt)
    if not receipt.get("eventId"):
        if receipt["generationPostAttempts"]:
            receipt["status"] = "unknown_submit_outcome"
            receipt["blocker"] = "Existing POST has no saved event ID; do not submit again."
            save(path, receipt)
            summary()
            return
        receipt["generationPostAttempts"] = 1
        receipt["status"] = "submitting"
        save(path, receipt)
        try:
            body = json.dumps(receipt["request"], ensure_ascii=False).encode()
            with urllib.request.urlopen(urllib.request.Request(ENDPOINT, data=body, headers={"Content-Type": "application/json"}, method="POST"), timeout=60) as response:
                submitted = json.load(response)
            receipt["submitResponse"] = submitted
            receipt["eventId"] = submitted["event_id"]
            receipt["resultEndpoint"] = ENDPOINT + "/" + receipt["eventId"]
            receipt["status"] = "running"
            save(path, receipt)
        except Exception as error:
            receipt["status"] = "unknown_submit_outcome"
            receipt["blocker"] = repr(error)
            save(path, receipt)
            summary()
            raise
    try:
        result_file = None
        for event, value in event_stream(receipt["resultEndpoint"]):
            log = {"event": event, "at": now(), "valueTypes": [type(x).__name__ for x in value] if isinstance(value, list) else type(value).__name__}
            if isinstance(value, list):
                log["statusText"] = next((x for x in value if isinstance(x, str)), "")
            if event == "error":
                log["error"] = value
                receipt["status"] = "blocked"
                receipt["blocker"] = value
            receipt["events"].append(log)
            result_file = file_data(value) or result_file
            if result_file:
                receipt["audioFileData"] = result_file
            save(path, receipt)
            print(json.dumps({"scene": args.scene, **log}, ensure_ascii=True), flush=True)
            if event in ("error", "complete"):
                break
        if receipt["status"] == "blocked":
            receipt["finishedAt"] = now()
        elif result_file or receipt.get("audioFileData"):
            process_audio(receipt, result_file or receipt["audioFileData"])
        else:
            receipt["status"] = "recoverable_pending"
            receipt["blocker"] = "No terminal file yet; recover the same event ID without a new POST."
    except Exception as error:
        receipt["status"] = "recoverable_pending"
        receipt["blocker"] = repr(error)
        raise
    finally:
        save(path, receipt)
        summary()
    print(json.dumps({"scene": args.scene, "status": receipt["status"], "playbackOutput": receipt.get("playbackOutput")}, ensure_ascii=True))


if __name__ == "__main__":
    run()
