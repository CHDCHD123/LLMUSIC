from __future__ import annotations

import os
import re
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

from backend.app.services.artifact_utils import format_snapshot_timestamp

ROOT = "https://www.genie.co.kr"
CHART = f"{ROOT}/chart/top200"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.genie.co.kr/",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}


def _text_or_blank(el) -> str:
    return el.get_text(" ", strip=True) if el else ""


def _to_int_from_text(text: str | None) -> int | None:
    if not text:
        return None
    nums = re.findall(r"\d+", text.replace(",", ""))
    return int("".join(nums)) if nums else None


def _extract_song_id(tr) -> str | None:
    song_id = tr.get("songid")
    if song_id:
        return song_id
    link = tr.select_one("td.link > a")
    if link:
        match = re.search(r"fnViewSongInfo\('(\d+)'\)", (link.get("onclick") or "").strip())
        if match:
            return match.group(1)
    match = re.search(r'songid="(\d+)"', str(tr))
    return match.group(1) if match else None


def fetch_chart_page(page: int) -> list[dict]:
    response = requests.get(CHART, headers=HEADERS, params={"pg": page}, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.select_one("#body-content div.newest-list > div > table")
    if not table:
        return []

    rows = table.select("tbody > tr")
    items: list[dict] = []
    for idx, tr in enumerate(rows):
        title_el = tr.select_one("a.title.ellipsis")
        artist_el = tr.select_one("a.artist.ellipsis") or tr.select_one("a.artist")
        if not title_el:
            continue
        song_id = _extract_song_id(tr)
        if not song_id:
            continue
        rank = (page - 1) * 50 + idx + 1
        items.append(
            {
                "순위": rank,
                "곡명": _text_or_blank(title_el),
                "아티스트": _text_or_blank(artist_el),
                "곡ID": song_id,
                "상세URL": f"{ROOT}/detail/songInfo?xgnm={song_id}",
            }
        )
    return items


def fetch_detail(detail_url: str) -> dict:
    try:
        response = requests.get(detail_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception:
        return {
            "앨범명": "",
            "장르": "",
            "재생시간": "",
            "작사가": "",
            "작곡가": "",
            "편곡자": "",
            "좋아요": None,
            "전체 청취자수": None,
            "전체 재생수": None,
        }

    soup = BeautifulSoup(response.text, "html.parser")
    info_zone = soup.select_one("#body-content > div.song-main-infos > div.info-zone")
    like_path = "#emLikeCount"
    listeners_path = (
        "#body-content > div.song-main-infos > div.aside-zone.daily-chart > div.total > div:nth-child(1) > p"
    )
    plays_path = (
        "#body-content > div.song-main-infos > div.aside-zone.daily-chart > div.total > div:nth-child(2) > p"
    )

    album = ""
    genre = ""
    runtime = ""
    lyricist = ""
    composer = ""
    arranger = ""

    if info_zone:
        li_elements = info_zone.select("ul > li")
        if li_elements:
            lines = [line.strip() for line in li_elements[0].get_text().split("\n") if line.strip()]
            if len(lines) >= 4:
                album = lines[1] if len(lines) > 1 else ""
                genre = lines[2] if len(lines) > 2 else ""
                if len(lines) > 3 and re.match(r"\d{1,2}:\d{2}", lines[3]):
                    runtime = lines[3]
        if len(li_elements) >= 2:
            lyricist = li_elements[1].get_text().replace("작사가", "").strip()
        if len(li_elements) >= 3:
            composer = li_elements[2].get_text().replace("작곡가", "").strip()
        if len(li_elements) >= 4:
            arranger = li_elements[3].get_text().replace("편곡자", "").strip()

    if not album:
        album_img = soup.select_one("#body-content > div.song-main-infos img[alt]")
        if album_img:
            album = album_img.get("alt", "")

    if not runtime:
        for candidate in soup.find_all(
            string=lambda text: text and re.search(r"\d{1,2}:\d{2}", text.strip()) and len(text.strip()) < 20
        ):
            match = re.search(r"\d{1,2}:\d{2}", candidate.strip())
            if match:
                runtime = match.group()
                break

    return {
        "앨범명": album,
        "장르": genre,
        "재생시간": runtime,
        "작사가": lyricist,
        "작곡가": composer,
        "편곡자": arranger,
        "좋아요": _to_int_from_text(_text_or_blank(soup.select_one(like_path))),
        "전체 청취자수": _to_int_from_text(_text_or_blank(soup.select_one(listeners_path))),
        "전체 재생수": _to_int_from_text(_text_or_blank(soup.select_one(plays_path))),
    }


def run_crawler(output_folder: str | os.PathLike[str]) -> Path:
    output_dir = Path(output_folder)
    output_dir.mkdir(parents=True, exist_ok=True)

    base_rows: list[dict] = []
    for page in (1, 2):
        base_rows.extend(fetch_chart_page(page))
        time.sleep(0.8)

    enriched: list[dict] = []
    for row in base_rows:
        row.update(fetch_detail(row["상세URL"]))
        enriched.append(row)
        time.sleep(1.0)

    df = pd.DataFrame(
        enriched,
        columns=[
            "순위",
            "곡명",
            "아티스트",
            "앨범명",
            "장르",
            "재생시간",
            "작사가",
            "작곡가",
            "편곡자",
            "좋아요",
            "전체 청취자수",
            "전체 재생수",
            "상세URL",
            "곡ID",
        ],
    ).sort_values("순위")

    output_path = output_dir / f"genie_top100_{format_snapshot_timestamp(datetime.now())}.csv"
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    return output_path
