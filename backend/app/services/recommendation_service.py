from __future__ import annotations

import json
import random
from pathlib import Path

import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

from backend.app.core.config import Settings
from backend.app.models.schemas import RecommendationItem
from backend.app.services.llm_service import LLMService


class RecommendationService:
    def __init__(self, settings: Settings, llm_service: LLMService) -> None:
        self.settings = settings
        self.llm_service = llm_service
        self.spotify = None
        self._init_spotify()

    def _init_spotify(self) -> None:
        if not (self.settings.spotify_client_id and self.settings.spotify_client_secret):
            return
        try:
            credentials = SpotifyClientCredentials(
                client_id=self.settings.spotify_client_id,
                client_secret=self.settings.spotify_client_secret,
            )
            self.spotify = spotipy.Spotify(client_credentials_manager=credentials)
        except Exception:
            self.spotify = None

    def search_spotify(self, emotion: str, situation: str, korean_only: bool = False) -> list[dict]:
        if not self.spotify:
            return []
        try:
            all_recommendations: list[dict] = []
            if korean_only:
                korean_artists = [
                    "아이유", "BTS", "BLACKPINK", "NewJeans", "IVE", "LE SSERAFIM", "TWICE", "Red Velvet",
                    "aespa", "ITZY", "STRAY KIDS", "SEVENTEEN", "임영웅", "성시경", "잔나비", "DAY6",
                    "멜로망스", "폴킴", "이찬혁", "AKMU", "볼빨간사춘기", "윤하", "마마무", "태연",
                    "박효신", "이하이", "크러쉬", "딘", "지코", "로꼬", "헤이즈", "다비치", "백예린",
                ]
                random.shuffle(korean_artists)
                selected_artists = korean_artists[:4]
                for artist in selected_artists:
                    try:
                        results = self.spotify.search(q=f"artist:{artist}", type="track", limit=4, market="KR")
                        for track in results["tracks"]["items"]:
                            track_artists = [a["name"] for a in track["artists"]]
                            if artist in track_artists:
                                all_recommendations.append(
                                    {
                                        "title": track["name"],
                                        "artist": ", ".join(track_artists),
                                        "album": track["album"]["name"],
                                        "spotify_url": track["external_urls"]["spotify"],
                                        "preview_url": track["preview_url"],
                                        "popularity": track["popularity"],
                                        "source": "Spotify (한국 아티스트)",
                                    }
                                )
                    except Exception:
                        continue
            else:
                search_terms: list[str] = []
                emotion_keywords = {
                    "행복": ["happy", "upbeat", "cheerful", "joy"],
                    "슬픔": ["sad", "melancholy", "ballad", "emotional"],
                    "화남": ["rock", "intense", "angry"],
                    "평온": ["calm", "peaceful", "relaxing", "chill"],
                    "신남": ["energetic", "dance", "pop", "upbeat"],
                    "그리움": ["nostalgic", "longing", "ballad"],
                    "집중": ["focus", "instrumental", "ambient"],
                    "운동": ["workout", "gym", "energy", "pump"],
                    "휴식": ["chill", "soft", "relaxing"],
                    "로맨틱": ["romantic", "love", "sweet"],
                }
                if "비" in situation:
                    search_terms.extend(["rain", "rainy day", "korean ballad"])
                elif "공부" in situation:
                    search_terms.extend(["study", "focus", "lo-fi"])
                elif "운동" in situation:
                    search_terms.extend(["workout", "gym", "motivation"])
                elif "카페" in situation:
                    search_terms.extend(["cafe", "acoustic", "indie"])
                elif "드라이브" in situation:
                    search_terms.extend(["driving", "road trip", "chill"])
                search_terms.extend(emotion_keywords.get(emotion, []))
                random.shuffle(search_terms)
                for term in (search_terms[:2] if search_terms else ["popular"]):
                    try:
                        results = self.spotify.search(q=term, type="track", limit=5, market="KR")
                        for track in results["tracks"]["items"]:
                            all_recommendations.append(
                                {
                                    "title": track["name"],
                                    "artist": ", ".join(a["name"] for a in track["artists"]),
                                    "album": track["album"]["name"],
                                    "spotify_url": track["external_urls"]["spotify"],
                                    "preview_url": track["preview_url"],
                                    "popularity": track["popularity"],
                                    "source": "Spotify",
                                }
                            )
                    except Exception:
                        continue

            seen = set()
            unique = []
            for rec in all_recommendations:
                key = (rec["title"], rec["artist"])
                if key not in seen:
                    seen.add(key)
                    unique.append(rec)
            random.shuffle(unique)
            return unique[:8]
        except Exception:
            return []

    def search_lastfm(self, emotion: str) -> list[dict]:
        if not self.settings.lastfm_api_key:
            return []
        tags = {"슬픔": ["sad", "melancholy"], "행복": ["happy", "upbeat"], "평온": ["chill", "ambient"]}.get(emotion, ["popular"])
        recommendations: list[dict] = []
        for tag in tags[:1]:
            url = (
                "http://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks"
                f"&tag={tag}&api_key={self.settings.lastfm_api_key}&format=json&limit=5"
            )
            try:
                response = requests.get(url, timeout=5)
                response.raise_for_status()
                data = response.json()
                for track in data.get("tracks", {}).get("track", [])[:3]:
                    recommendations.append(
                        {
                            "title": track["name"],
                            "artist": track["artist"]["name"],
                            "lastfm_url": track["url"],
                            "source": "Last.fm",
                        }
                    )
            except Exception:
                return []
        return recommendations

    def get_genie_backup(self, emotion: str) -> list[dict]:
        json_files = list(self.settings.data_dir.glob("genie_diff_brief_*.json"))
        if not json_files:
            return []
        latest_json = max(json_files, key=lambda item: item.stat().st_mtime)
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
        candidates: list[dict] = []
        for category in ("rank_up", "like_growth", "new_entries"):
            for song in data.get("highlights", {}).get(category, []):
                if song.get("장르", "") in preferred_genres:
                    candidates.append(
                        {
                            "title": song["곡명"],
                            "artist": song["아티스트"],
                            "rank": song.get("오늘순위", song.get("순위", 0)),
                            "source": "지니차트",
                        }
                    )
        random.shuffle(candidates)
        return candidates[:3]

    def recommend(self, emotion: str, situation: str, korean_only: bool) -> tuple[list[RecommendationItem], str, str]:
        all_recommendations = []
        if korean_only:
            all_recommendations.extend(self.get_genie_backup(emotion))
            all_recommendations.extend(self.search_spotify(emotion, situation, korean_only=True))
        else:
            all_recommendations.extend(self.search_spotify(emotion, situation, korean_only=False))
            all_recommendations.extend(self.get_genie_backup(emotion))
            all_recommendations.extend(self.search_lastfm(emotion))
        random.shuffle(all_recommendations)
        songs_text = ", ".join(f"{item['title']} - {item['artist']}" for item in all_recommendations[:3])
        explanation, model_used = self.llm_service.generate(f"{emotion} 감정, {situation} 상황", songs_text)
        items = [RecommendationItem(**item) for item in all_recommendations[:5]]
        return items, explanation, model_used

    def source_status(self, probe_llm: bool = False) -> dict:
        llm_status = self.llm_service.status(probe=probe_llm)
        return {
            "spotify": {
                "status": "연결됨" if self.spotify else "미연결",
                "client_id_configured": bool(self.settings.spotify_client_id),
                "client_secret_configured": bool(self.settings.spotify_client_secret),
            },
            "lastfm": {
                "status": "연결됨" if self.settings.lastfm_api_key else "미연결",
                "api_key_configured": bool(self.settings.lastfm_api_key),
            },
            "llm": {
                "status": llm_status["openai"]["status"],
                "model_used": "없음",
                "local_fallback_enabled": True,
            },
            **llm_status,
        }

