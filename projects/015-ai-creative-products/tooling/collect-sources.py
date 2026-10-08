"""Collect public tweet evidence and attributed posters; never download videos."""

from __future__ import annotations

import concurrent.futures
import datetime as dt
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
CHECKED_AT = "2026-10-02"
THREAD_ID = "2105685231298630009"
THREAD_URL = f"https://x.com/minchoi/status/{THREAD_ID}"
THREAD_MIRROR = f"https://threadreaderapp.com/thread/{THREAD_ID}.html"
CASES = [
    (1, "三次提示生成作品集网站", "2104999693113766152"),
    (2, "Fallout 风格浏览器游戏", "2104644598626934858"),
    (3, "回应「AI 是普通技术」的视频", "2104985610012504181"),
    (4, "三次提示制作发布宣传片", "2104618175803609305"),
    (5, "COD Zombies 网页移植", "2104980433972703483"),
    (6, "Python 编曲与 Blender 动画", "2105304249060274631"),
    (7, "作者自述的 Opus 创作展示", "2104821709891404194"),
    (8, "第四款游戏的制作展示", "2105350465001029697"),
    (9, "12 小时搭建 Three.js 世界", "2105216139647127750"),
    (10, "浏览器汽车足球同人游戏", "2104800823620632641"),
]
USER_AGENT = "AI-Creative-Products-Source-Audit/1.0"


def request(url: str, method: str = "GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(3):
        try:
            return urllib.request.urlopen(req, timeout=30)
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(attempt + 1)
    raise RuntimeError(f"Unable to read {url}: {last_error}")


def fetch_tweet(post_id: str) -> dict:
    api_url = f"https://api.fxtwitter.com/status/{post_id}"
    with request(api_url) as response:
        raw = json.load(response)
    if raw.get("code") != 200 or not isinstance(raw.get("tweet"), dict):
        raise ValueError(f"Tweet API returned no usable tweet: {post_id}")
    return {"apiUrl": api_url, "response": raw}


def mp4_dimensions(url: str):
    match = re.search(r"/(\d+)x(\d+)/", url)
    return tuple(map(int, match.groups())) if match else (None, None)


def select_video(media: dict, max_width: int = 1280) -> tuple[str, int | None, int | None]:
    candidates = []
    for item in media.get("formats", []):
        url = item.get("url", "")
        if item.get("container") != "mp4":
            continue
        width, height = mp4_dimensions(url)
        if width is not None and width <= max_width:
            candidates.append((width, item.get("bitrate", 0), url, height))
    if not candidates:
        url = media.get("url", "")
        width, height = mp4_dimensions(url)
        if ".mp4" in url and width is not None and width <= max_width:
            return url, width, height
        raise ValueError(f"No source MP4 at or below the requested {max_width}-pixel width")
    width, _bitrate, url, height = max(candidates)
    return url, width, height


def check_video_url(url: str) -> dict:
    # HEAD confirms the public media response without downloading video bytes.
    with request(url, method="HEAD") as response:
        info = {
            "method": "HEAD",
            "status": response.status,
            "contentType": response.headers.get("Content-Type"),
            "contentLength": response.headers.get("Content-Length"),
            "finalUrl": response.url,
        }
    if info["status"] != 200 or "video" not in (info["contentType"] or ""):
        raise ValueError(f"Unexpected public video response: {info}")
    return info


def collect_case(case_spec):
    case_id, title, post_id = case_spec
    audit = fetch_tweet(post_id)
    tweet = audit["response"]["tweet"]
    videos = tweet.get("media", {}).get("videos", [])
    if not videos:
        raise ValueError(f"Source post has no video metadata: {post_id}")
    media = videos[0]
    # The longer clips use a smaller original rendition to reduce startup time.
    video_url, width, height = select_video(media, max_width=640 if case_id in (2, 3) else 1280)
    video_check = check_video_url(video_url)
    poster_source = media.get("thumbnail_url")
    if not poster_source:
        raise ValueError(f"Source post has no poster metadata: {post_id}")
    with request(poster_source) as response:
        poster = response.read()
        poster_type = response.headers.get("Content-Type", "")
    if not poster.startswith(b"\xff\xd8") or "image/jpeg" not in poster_type:
        raise ValueError(f"Poster response was not JPEG: {post_id}")
    poster_path = f"media/thumbnail-{case_id:02d}.jpg"
    (PROJECT / "web" / poster_path).write_bytes(poster)
    created_timestamp = tweet.get("created_timestamp")
    created_at = (
        dt.datetime.fromtimestamp(created_timestamp, dt.timezone.utc).isoformat()
        if isinstance(created_timestamp, (int, float))
        else tweet.get("created_at")
    )
    source = {
        "id": case_id,
        "title": title,
        "author": tweet.get("author", {}).get("screen_name"),
        "authorName": tweet.get("author", {}).get("name"),
        "authorUrl": tweet.get("author", {}).get("url"),
        "url": tweet.get("url"),
        "text": tweet.get("text"),
        "createdAt": created_at,
        "videoUrl": video_url,
        "poster": poster_path,
        "posterSource": poster_source,
        "duration": media.get("duration"),
        "width": width,
        "height": height,
        "videoCheck": video_check,
    }
    quoted = tweet.get("quote")
    if isinstance(quoted, dict):
        source["quote"] = {
            "url": quoted.get("url"),
            "author": quoted.get("author", {}).get("screen_name"),
            "text": quoted.get("text"),
            "createdAt": quoted.get("created_at"),
        }
    audit.update({
        "id": case_id,
        "title": title,
        "posterSource": poster_source,
        "posterPath": poster_path,
        "posterBytes": len(poster),
        "selectedVideoUrl": video_url,
        "videoCheck": video_check,
    })
    return source, audit


def main():
    (PROJECT / "web" / "media").mkdir(parents=True, exist_ok=True)
    (PROJECT / "notes").mkdir(parents=True, exist_ok=True)
    root = fetch_tweet(THREAD_ID)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(collect_case, CASES))
    sources = [source for source, _audit in results]
    audits = [audit for _source, audit in results]
    source_data = {
        "checkedAt": CHECKED_AT,
        "threadUrl": THREAD_URL,
        "threadMirror": THREAD_MIRROR,
        "rootText": root["response"]["tweet"].get("text"),
        "cases": sources,
    }
    audit_data = {
        "checkedAt": CHECKED_AT,
        "collectedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "threadUrl": THREAD_URL,
        "threadMirror": THREAD_MIRROR,
        "method": "Public FxTwitter tweet API; public X CDN thumbnails; video HEAD requests only.",
        "root": root,
        "cases": audits,
    }
    (PROJECT / "notes" / "sources.json").write_text(
        json.dumps(audit_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (PROJECT / "web" / "source-data.js").write_text(
        "// Public source evidence and attributed remote media; checked 2026-10-02.\n"
        + "window.SOURCE_DATA = "
        + json.dumps(source_data, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "cases": len(sources),
        "posters": len(sources),
        "videoHeadChecks": len(sources),
        "allVideoWidthsAtMost1280": all(source["width"] <= 1280 for source in sources),
        "posterBytes": sum(audit["posterBytes"] for audit in audits),
        "output": str(PROJECT),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
