from __future__ import annotations

import json
import random
from urllib.parse import quote_plus

import requests

from backend.app.core.config import Settings
from backend.app.models.schemas import RecommendationItem
from backend.app.services.artifact_utils import list_artifacts
from backend.app.services.llm_service import LLMService


class RecommendationService:
    def __init__(self, settings: Settings, llm_service: LLMService) -> None:
        self.settings = settings
        self.llm_service = llm_service
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "LLMUSIC/2.0 (https://github.com/CHDCHD123/LLMUSIC)",
                "Accept": "application/json",
            }
        )

    def _emotion_keywords(self, emotion: str, situation: str) -> list[str]:
        keywords = {
            "행복": ["happy", "upbeat", "cheerful", "joy"],
            "슬픔": ["sad", "melancholy", "ballad"],
            "화남": ["rock", "intense", "angry"],
            "평온": ["calm", "peaceful", "relaxing", "chill"],
            "신남": ["energetic", "dance", "pop"],
            "그리움": ["nostalgic", "longing", "ballad"],
            "집중": ["focus", "instrumental", "ambient"],
            "운동": ["workout", "gym", "energy"],
            "휴식": ["soft", "chill", "relaxing"],
            "로맨틱": ["romantic", "love", "sweet"],
        }.get(emotion, ["popular"])

        if "비" in situation:
            keywords.extend(["rain", "rainy day"])
        if "공부" in situation:
            keywords.extend(["study", "lofi"])
        if "운동" in situation:
            keywords.extend(["workout", "motivation"])
        if "카페" in situation:
            keywords.extend(["cafe", "acoustic"])
        if "드라이브" in situation:
            keywords.extend(["drive", "road trip"])

        deduped: list[str] = []
        seen = set()
        for item in keywords:
            if item not in seen:
                deduped.append(item)
                seen.add(item)
        return deduped

    def search_itunes(self, emotion: str, situation: str, korean_only: bool = False) -> list[dict]:
        recommendations: list[dict] = []
        search_terms = self._emotion_keywords(emotion, situation)
        if korean_only:
            search_terms = [
                "아이유",
                "BTS",
                "NewJeans",
                "IVE",
                "AKMU",
                "DAY6",
                "태연",
                "윤하",
            ]
        random.shuffle(search_terms)

        for term in search_terms[:3]:
            params = {
                "term": term,
                "media": "music",
                "entity": "song",
                "limit": 6,
                "country": "KR" if korean_only else "US",
            }
            try:
                response = self.session.get(
                    "https://itunes.apple.com/search",
                    params=params,
                    timeout=6,
                )
                response.raise_for_status()
                data = response.json()
                for track in data.get("results", [])[:4]:
                    artwork_url = track.get("artworkUrl100")
                    if artwork_url:
                        artwork_url = artwork_url.replace("100x100bb", "600x600bb")
                    recommendations.append(
                        {
                            "title": track.get("trackName"),
                            "artist": track.get("artistName"),
                            "album": track.get("collectionName"),
                            "artwork_url": artwork_url,
                            "external_url": track.get("trackViewUrl") or track.get("collectionViewUrl"),
                            "preview_url": track.get("previewUrl"),
                            "source": "iTunes Search",
                        }
                    )
            except Exception:
                continue
        return recommendations

    def search_musicbrainz(self, emotion: str, situation: str, korean_only: bool = False) -> list[dict]:
        recommendations: list[dict] = []
        search_terms = self._emotion_keywords(emotion, situation)
        if korean_only:
            search_terms = ["아이유", "BTS", "NewJeans", "IVE", "AKMU", "성시경", "잔나비"]
        random.shuffle(search_terms)

        for term in search_terms[:2]:
            query = f'recording:"{term}"'
            if korean_only:
                query += ' AND primarytype:album'
            try:
                response = self.session.get(
                    "https://musicbrainz.org/ws/2/recording",
                    params={"query": query, "fmt": "json", "limit": 5},
                    timeout=6,
                )
                response.raise_for_status()
                data = response.json()
                for recording in data.get("recordings", [])[:3]:
                    artist_names = ", ".join(artist["name"] for artist in recording.get("artist-credit", []) if artist.get("name"))
                    release_title = ""
                    if recording.get("releases"):
                        release_title = recording["releases"][0].get("title", "")
                    recommendations.append(
                        {
                            "title": recording.get("title"),
                            "artist": artist_names or "Unknown",
                            "album": release_title or None,
                            "artwork_url": None,
                            "external_url": f"https://musicbrainz.org/recording/{recording.get('id')}",
                            "source": "MusicBrainz",
                        }
                    )
            except Exception:
                continue
        return recommendations

    def search_lastfm(self, emotion: str) -> list[dict]:
        if not self.settings.lastfm_api_key:
            return []
        tags = {"슬픔": ["sad", "melancholy"], "행복": ["happy", "upbeat"], "평온": ["chill", "ambient"]}.get(
            emotion,
            ["popular"],
        )
        recommendations: list[dict] = []
        for tag in tags[:2]:
            url = (
                "https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks"
                f"&tag={quote_plus(tag)}&api_key={self.settings.lastfm_api_key}&format=json&limit=5"
            )
            try:
                response = self.session.get(url, timeout=6)
                response.raise_for_status()
                data = response.json()
                for track in data.get("tracks", {}).get("track", [])[:3]:
                    recommendations.append(
                        {
                            "title": track.get("name"),
                            "artist": track.get("artist", {}).get("name", "Unknown"),
                            "artwork_url": None,
                            "lastfm_url": track.get("url"),
                            "external_url": track.get("url"),
                            "source": "Last.fm",
                        }
                    )
            except Exception:
                continue
        return recommendations

    def get_genie_backup(self, emotion: str) -> list[dict]:
        candidates = list_artifacts(
            [self.settings.data_dir, self.settings.archive_dir],
            "genie_diff_brief_*.json",
            "genie_diff_brief_",
        )
        if not candidates:
            return []
        latest_json = candidates[-1][1]
        with open(latest_json, "r", encoding="utf-8") as file:
            data = json.load(file)
        genre_mapping = {
            "행복": ["가요 / 댄스", "POP / 팝"],
            "슬픔": ["가요 / 발라드", "가요 / 인디"],
            "신남": ["가요 / 댄스", "가요 / 랩/힙합"],
            "평온": ["가요 / 발라드", "가요 / 인디"],
            "그리움": ["가요 / 발라드", "OST / 드라마"],
            "화남": ["가요 / 락", "가요 / 랩/힙합"],
            "운동": ["가요 / 댄스", "가요 / 랩/힙합"],
            "휴식": ["가요 / 발라드", "가요 / 인디"],
            "로맨틱": ["가요 / 발라드", "OST / 드라마"],
        }
        preferred_genres = genre_mapping.get(emotion, ["가요 / 전체"])
        recommendations: list[dict] = []
        for category in ("rank_up", "like_growth", "new_entries"):
            for song in data.get("highlights", {}).get(category, []):
                if song.get("장르", "") in preferred_genres:
                    recommendations.append(
                        {
                            "title": song["곡명"],
                            "artist": song["아티스트"],
                            "rank": song.get("오늘순위", song.get("순위", 0)),
                            "artwork_url": None,
                            "external_url": None,
                            "source": "지니차트",
                        }
                    )
        random.shuffle(recommendations)
        return recommendations[:4]

    def _dedupe(self, items: list[dict]) -> list[dict]:
        unique: list[dict] = []
        seen = set()
        for item in items:
            title = (item.get("title") or "").strip()
            artist = (item.get("artist") or "").strip()
            if not title or not artist:
                continue
            key = (title.lower(), artist.lower())
            if key in seen:
                continue
            seen.add(key)
            unique.append(item)
        return unique

    def recommend(self, emotion: str, situation: str, korean_only: bool) -> tuple[list[RecommendationItem], str, str]:
        all_recommendations: list[dict] = []
        all_recommendations.extend(self.get_genie_backup(emotion))
        all_recommendations.extend(self.search_itunes(emotion, situation, korean_only=korean_only))
        all_recommendations.extend(self.search_musicbrainz(emotion, situation, korean_only=korean_only))
        all_recommendations.extend(self.search_lastfm(emotion))
        all_recommendations = self._dedupe(all_recommendations)
        random.shuffle(all_recommendations)

        songs_text = ", ".join(f"{item['title']} - {item['artist']}" for item in all_recommendations[:3]) or "추천 후보 없음"
        explanation, model_used = self.llm_service.generate(f"{emotion} 감정, {situation} 상황", songs_text)
        items = [RecommendationItem(**item) for item in all_recommendations[:5]]
        return items, explanation, model_used

    def source_status(self, probe_llm: bool = False) -> dict:
        llm_status = self.llm_service.status(probe=probe_llm)
        return {
            "itunes": {
                "status": "연결됨",
                "api_key_required": False,
                "note": "공개 Search API",
            },
            "musicbrainz": {
                "status": "연결됨",
                "api_key_required": False,
                "note": "공개 메타데이터 API",
            },
            "lastfm": {
                "status": "연결됨" if self.settings.lastfm_api_key else "선택사항",
                "api_key_configured": bool(self.settings.lastfm_api_key),
            },
            "spotify": {
                "status": "비활성화",
                "note": "정책 변경으로 기본 추천 소스에서 제외",
            },
            "llm": {
                "status": llm_status["openai"]["status"],
                "model_used": "없음",
                "local_fallback_enabled": True,
            },
            **llm_status,
        }
