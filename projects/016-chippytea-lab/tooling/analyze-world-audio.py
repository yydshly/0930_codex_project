"""Measure a real soundtrack for deterministic offline animation previews.

This is a Hann-window FFT approximation. It does not capture a browser
AnalyserNode, verify audio output, or prove browser audio/animation sync.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib
import shutil
import subprocess
from datetime import datetime, timezone

import numpy as np


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_FFMPEG = pathlib.Path(
    "D:/26project/26audio_and_video_project/ffmpeg-n6.1.3-win64-gpl-shared-6.1/bin/ffmpeg.exe"
)


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: pathlib.Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def run() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="web/audio/shadow-minimax.mp3")
    parser.add_argument("--scene", default="shadow")
    parser.add_argument("--output", default="assets/worlds-v9-qa/shadow-audio-spectrum.json")
    parser.add_argument("--summary", default="notes/audio-analysis-v9.json")
    parser.add_argument("--receipt", help="Generation receipt relative to this subproject; defaults to the scene's v9/v10 receipt")
    parser.add_argument("--ffmpeg")
    parser.add_argument("--sample-rate", type=int, default=44100)
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--duration", type=float, default=32.0)
    parser.add_argument("--fft-size", type=int, default=1024)
    parser.add_argument("--min-db", type=float, default=-90.0)
    parser.add_argument("--max-db", type=float, default=-10.0)
    parser.add_argument("--energy-min-hz", type=float, default=80.0)
    parser.add_argument("--low-min-hz", type=float, default=50.0)
    parser.add_argument("--low-max-hz", type=float, default=320.0)
    parser.add_argument("--high-min-hz", type=float, default=1500.0)
    parser.add_argument("--high-max-hz", type=float, default=8000.0)
    args = parser.parse_args()
    if args.fft_size < 32 or args.fft_size & (args.fft_size - 1):
        parser.error("--fft-size must be a power of two of at least 32")
    if args.max_db <= args.min_db or args.fps <= 0 or args.duration <= 0:
        parser.error("invalid decibel range, FPS or duration")

    source = (ROOT / args.source).resolve()
    output = (ROOT / args.output).resolve()
    summary_path = (ROOT / args.summary).resolve()
    # All task inputs and outputs stay within this subproject.
    for path in (source, output, summary_path):
        path.relative_to(ROOT)
    ffmpeg = args.ffmpeg or shutil.which("ffmpeg") or str(DEFAULT_FFMPEG)
    command = [
        ffmpeg, "-v", "error", "-i", str(source), "-f", "f32le",
        "-acodec", "pcm_f32le", "-ar", str(args.sample_rate), "-ac", "2", "-",
    ]
    decoded = subprocess.run(command, check=True, capture_output=True).stdout
    stereo = np.frombuffer(decoded, dtype="<f4").reshape(-1, 2)
    mono = stereo.mean(axis=1, dtype=np.float64)
    half = args.fft_size // 2
    padded = np.pad(mono, (half, half))
    window = np.hanning(args.fft_size)
    window_sum = float(window.sum())
    frequencies = np.fft.rfftfreq(args.fft_size, 1.0 / args.sample_rate)[:-1]
    masks = {
        "energy": (frequencies >= args.energy_min_hz) & (frequencies < args.high_max_hz),
        "low": (frequencies >= args.low_min_hz) & (frequencies < args.low_max_hz),
        "high": (frequencies >= args.high_min_hz) & (frequencies < args.high_max_hz),
    }
    if any(not mask.any() for mask in masks.values()):
        parser.error("FFT frequency resolution leaves a selected band empty")

    samples = []
    rms_values = []
    count = int(round(args.duration * args.fps))
    for index in range(count):
        time = index / args.fps
        center = int(round(time * args.sample_rate))
        frame = padded[center:center + args.fft_size]
        if len(frame) < args.fft_size:
            frame = np.pad(frame, (0, args.fft_size - len(frame)))
        rms = float(np.sqrt(np.mean(frame * frame)))
        rms_values.append(rms)
        magnitude = np.abs(np.fft.rfft(frame * window))[:-1] * (2.0 / window_sum)
        magnitude[0] *= 0.5
        decibels = 20.0 * np.log10(np.maximum(magnitude, 1e-12))
        normalized = np.clip(
            (decibels - args.min_db) / (args.max_db - args.min_db), 0.0, 1.0
        )
        # Silence uses a measured RMS floor; no invented beat pulses or envelope.
        values = {
            name: float(normalized[mask].mean()) if rms > 1e-7 else 0.0
            for name, mask in masks.items()
        }
        samples.append({"time": round(time, 9), **{
            name: round(value, 8) for name, value in values.items()
        }})

    normalization = {
        "fftSize": args.fft_size,
        "fft": "numpy.fft.rfft, Nyquist bin excluded",
        "window": "symmetric Hann (numpy.hanning)",
        "channelMix": "arithmetic mean of decoded stereo channels",
        "framePlacement": "centered at each sample time; zero padding at audio boundaries",
        "magnitude": "single-sided peak amplitude: abs(rfft(frame * window)) * 2 / sum(window), DC halved",
        "decibels": "20 * log10(max(magnitude, 1e-12))",
        "rangeDb": [args.min_db, args.max_db],
        "unitInterval": "clip((bin dB - minDb) / (maxDb - minDb), 0, 1); mean of bins in each band",
        "frequencyBandsHz": {
            "energy": [args.energy_min_hz, args.high_max_hz],
            "low": [args.low_min_hz, args.low_max_hz],
            "high": [args.high_min_hz, args.high_max_hz],
        },
        "upperFrequencyBoundsExclusive": True,
        "silenceRmsFloor": 1e-7,
        "temporalSmoothing": False,
        "browserDifference": "Browser AnalyserNode windowing, decibel scaling and smoothing may differ; this measures the soundtrack, not the browser node.",
    }
    document = {
        "scene": args.scene,
        "source": relative(source),
        "sourceSha256": sha256(source),
        "sampleRate": args.sample_rate,
        "fps": args.fps,
        "duration": args.duration,
        "note": "offline FFT approximation, not browser AnalyserNode capture",
        "normalization": normalization,
        "samples": samples,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    signals = ("energy", "low", "high")
    stats = {
        signal: {
            "min": min(sample[signal] for sample in samples),
            "max": max(sample[signal] for sample in samples),
            "nonzeroSampleCount": sum(sample[signal] > 0 for sample in samples),
        }
        for signal in signals
    }
    source_receipt = ROOT / (args.receipt or (
        "notes/world-music-generation-v9.json" if args.scene == "shadow"
        else f"notes/world-music-{args.scene}-generation-v10.json"
    ))
    source_receipt.resolve().relative_to(ROOT)
    receipt = json.loads(source_receipt.read_text(encoding="utf-8")) if source_receipt.exists() else {}
    expected_hash = receipt.get("playbackOutput", {}).get("sha256")
    native_duration = receipt.get("nativeOutput", {}).get("durationSeconds")
    tail_start = math.ceil(float(native_duration) + args.fft_size / (2 * args.sample_rate)) if native_duration is not None and float(native_duration) < args.duration else None
    padded_tail = [sample for sample in samples if tail_start is not None and sample["time"] >= tail_start]
    checks = {
        "sourceHashMatchesGenerationReceipt": expected_hash == document["sourceSha256"] if expected_hash else None,
        "decodedDuration32Seconds": abs(len(mono) / args.sample_rate - args.duration) < 1.0 / args.sample_rate,
        "sampleCountMatchesDuration": len(samples) == int(round(args.duration * args.fps)),
        "signalsWithinUnitInterval": all(0 <= sample[signal] <= 1 for sample in samples for signal in signals),
        "allBandsHaveMeasuredEnergy": all(stats[signal]["nonzeroSampleCount"] > 0 for signal in signals),
        "paddedTailAllZero": all(sample[signal] == 0 for sample in padded_tail for signal in signals) if padded_tail else None,
    }
    summary = {
        "kind": "offline-real-audio-fft-analysis",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": document["source"],
        "sourceSha256": document["sourceSha256"],
        "output": relative(output),
        "outputSha256": sha256(output),
        "tool": relative(pathlib.Path(__file__)),
        "toolSha256": sha256(pathlib.Path(__file__)),
        "decodedSampleFrames": len(mono),
        "decodedDurationSeconds": len(mono) / args.sample_rate,
        "sampleCount": len(samples),
        "generationReceipt": relative(source_receipt) if source_receipt.exists() else None,
        "paddedTailCheckedFromSeconds": tail_start,
        "signalStatistics": stats,
        "checks": checks,
        "status": "passed" if all(value is not False for value in checks.values()) else "failed",
        "limitations": "FFT approximation from real MP3 PCM; browser output, listening quality, AnalyserNode equivalence and animation synchronization were not verified.",
    }
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=True))
    if summary["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    run()
