"""Refresh the DESLOT page from Superego Software's YouTube Atom feed."""

from __future__ import annotations

import html
import json
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "deslot" / "index.html"
CACHE = ROOT / "deslot" / "videos.json"
CHANNEL_ID = "UCuJZ5qr2TZJsgjZNwoKCmZA"
FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
START = "          <!-- AUTO_VIDEOS_START -->"
END = "          <!-- AUTO_VIDEOS_END -->"
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def read_feed() -> list[dict[str, str]]:
    request = urllib.request.Request(
        FEED_URL, headers={"User-Agent": "Mozilla/5.0 (compatible; DESLOT website updater)"}
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        feed = ET.fromstring(response.read())

    videos = []
    for entry in feed.findall("atom:entry", NAMESPACES):
        video_id = entry.findtext("yt:videoId", namespaces=NAMESPACES)
        title = entry.findtext("atom:title", namespaces=NAMESPACES)
        published = entry.findtext("atom:published", namespaces=NAMESPACES)
        channel = entry.findtext("yt:channelId", namespaces=NAMESPACES)
        link = entry.find("atom:link[@rel='alternate']", NAMESPACES)
        if not (video_id and title and published and link is not None):
            continue
        if channel != CHANNEL_ID or not VIDEO_ID.fullmatch(video_id):
            continue
        url = urlparse(link.attrib.get("href", ""))
        if url.netloc != "www.youtube.com" or url.path != "/watch":
            continue  # YouTube puts Shorts under /shorts/ in this feed.
        if parse_qs(url.query).get("v") != [video_id]:
            continue
        datetime.fromisoformat(published).astimezone(timezone.utc)
        videos.append({"id": video_id, "title": title, "published": published})
    return videos


def cached_videos() -> list[dict[str, str]]:
    if not CACHE.exists():
        return []
    videos = json.loads(CACHE.read_text(encoding="utf-8"))
    if not isinstance(videos, list):
        raise ValueError("Invalid video cache")
    for video in videos:
        if not VIDEO_ID.fullmatch(video["id"]):
            raise ValueError("Invalid cached video ID")
        datetime.fromisoformat(video["published"]).astimezone(timezone.utc)
    return videos


def render_card(video: dict[str, str]) -> str:
    video_id = video["id"]
    title = html.escape(video["title"], quote=True)
    date = datetime.fromisoformat(video["published"]).strftime("%d %b %Y")
    return f'''          <article class="dev-update-card">
            <div class="dev-update-video">
              <iframe
                src="https://www.youtube-nocookie.com/embed/{video_id}?rel=0"
                title="{title}"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              ></iframe>
            </div>
            <div class="dev-update-copy">
              <span class="dev-update-number">{date}</span>
              <h3>{title}</h3>
              <a
                class="dev-update-link"
                href="https://www.youtube.com/watch?v={video_id}"
                target="_blank"
                rel="noopener noreferrer"
              >Watch on YouTube <span aria-hidden="true">↗</span></a>
            </div>
          </article>'''


def main() -> None:
    feed_videos = []
    for attempt in range(3):
        try:
            feed_videos = read_feed()
            break
        except (OSError, ET.ParseError, ValueError) as error:
            if attempt == 2:
                print(f"YouTube feed unavailable ({error}); keeping the published videos")
            else:
                time.sleep(2 ** (attempt + 1))
    if not feed_videos:
        print("No regular videos received; the next scheduled run will try again")
        return

    # Keep older regular videos if a run's 15-item feed is crowded with Shorts.
    by_id = {video["id"]: video for video in cached_videos()}
    by_id.update({video["id"]: video for video in feed_videos})
    videos = sorted(by_id.values(), key=lambda video: video["published"], reverse=True)[:5]

    page = PAGE.read_text(encoding="utf-8")
    if page.count(START) != 1 or page.count(END) != 1:
        raise ValueError("Video list markers are missing or duplicated")
    before, rest = page.split(START, 1)
    _, after = rest.split(END, 1)
    cards = "\n\n".join(render_card(video) for video in videos)
    updated = before + START + "\n" + cards + "\n" + END + after
    if updated != page:
        PAGE.write_text(updated, encoding="utf-8", newline="\n")

    data = json.dumps(videos, ensure_ascii=False, indent=2) + "\n"
    if not CACHE.exists() or CACHE.read_text(encoding="utf-8") != data:
        CACHE.write_text(data, encoding="utf-8", newline="\n")
    print("DESLOT videos:", ", ".join(video["id"] for video in videos))


if __name__ == "__main__":
    main()
