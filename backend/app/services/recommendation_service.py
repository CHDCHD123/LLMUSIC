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
            "기쁨": ["happy", "upbeat", "joy", "bright", "cheerful", "dance pop"],
            "슬픔": ["sad", "melancholy", "ballad", "emotional", "piano"],
            "편안함": ["calm", "relaxing", "soft", "chill", "acoustic"],
            "에너지": ["energetic", "dance", "electronic", "power", "workout"],
            "우울함": ["moody", "dream pop", "melancholy", "ambient", "night"],
            "집중": ["focus", "instrumental", "study", "ambient", "lofi"],
            "설렘": ["romantic", "fresh", "spring", "sweet", "breezy"],
            "그리움": ["nostalgic", "longing", "ballad", "memory", "sentimental"],
            "몽환": ["dreamy", "ethereal", "synth", "indie", "night drive"],
            "분노": ["intense", "rock", "aggressive", "hip hop", "energy"],
            "잔잔함": ["soft", "quiet", "piano", "acoustic", "healing"],
            "로맨틱": ["romantic", "love", "sweet", "rnb", "serenade"],
        }.get(emotion, ["popular", "top songs"])

        situation_keywords = {
            "출근길": ["morning", "commute", "city pop", "fresh start"],
            "운동": ["workout", "gym", "motivation", "running"],
            "산책": ["walk", "indie", "acoustic", "sunset"],
            "휴식": ["rest", "healing", "chill", "soft"],
            "드라이브": ["drive", "road trip", "night drive", "highway"],
            "공부": ["study", "focus", "lofi", "instrumental"],
            "카페": ["cafe", "coffeehouse", "acoustic", "jazz pop"],
            "여행": ["travel", "adventure", "summer", "festival"],
            "야근": ["late night", "focus", "calm", "deep work"],
            "비 오는 밤": ["rain", "rainy day", "night", "moody"],
        }
        for label, mapped_keywords in situation_keywords.items():
            if label in situation:
                keywords.extend(mapped_keywords)

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
            lowered = item.lower()
            if lowered not in seen:
                deduped.append(item)
                seen.add(lowered)
        return deduped

    def _contains_korean(self, text: str) -> bool:
        return any("가" <= char <= "힣" for char in text)

    def _score_candidate(self, item: dict, emotion: str, situation: str, korean_only: bool, variation: int) -> dict:
        searchable = " ".join(
            [
                str(item.get("title") or ""),
                str(item.get("artist") or ""),
                str(item.get("album") or ""),
                str(item.get("matched_keyword") or ""),
            ]
        ).lower()
        emotion_keywords = [keyword.lower() for keyword in self._emotion_keywords(emotion, situation)]
        situation_bits = [chunk.strip().lower() for chunk in situation.replace(",", " ").split() if chunk.strip()]
        reasons: list[str] = [f"{emotion} 감정 흐름과 맞는 후보"]
        score = {"iTunes Search": 62, "MusicBrainz": 48, "Last.fm": 54, "지니차트": 74}.get(item.get("source"), 40)

        keyword_hits = [keyword for keyword in emotion_keywords if keyword in searchable][:3]
        if keyword_hits:
            score += 9 * len(keyword_hits)
            reasons.append(f"'{', '.join(keyword_hits)}' 키워드와 겹침")

        situation_hits = [part for part in situation_bits if part and part in searchable][:2]
        if situation_hits:
            score += 7 * len(situation_hits)
            reasons.append(f"상황 키워드 '{', '.join(situation_hits)}' 반영")

        matched_keyword = item.get("matched_keyword")
        if matched_keyword:
            score += 8
            reasons.append(f"'{matched_keyword}' 검색 결과 기반")

        if item.get("rank"):
            score += max(0, 18 - int(item["rank"]) // 8)
            reasons.append("최근 차트 흐름 반영")

        if korean_only:
            if self._contains_korean(f"{item.get('title', '')} {item.get('artist', '')}"):
                score += 8
                reasons.append("KR 필터와 일치")
            else:
                score -= 10

        rng = random.Random(f"{emotion}|{situation}|{variation}|{item.get('title')}|{item.get('artist')}")
        score += int(rng.uniform(-6, 6))
        item["match_score"] = max(1, min(99, score))
        item["reason"] = " · ".join(reasons[:3])
        return item

    def _rank_candidates(self, items: list[dict], emotion: str, situation: str, korean_only: bool, variation: int) -> list[dict]:
        scored = [self._score_candidate(item, emotion, situation, korean_only, variation) for item in items]
        scored.sort(key=lambda candidate: candidate.get("match_score", 0), reverse=True)

        ranked: list[dict] = []
        artist_counts: dict[str, int] = {}
        for item in scored:
            artist_key = str(item.get("artist") or "").strip().lower()
            current_count = artist_counts.get(artist_key, 0)
            if current_count >= 1 and len(ranked) < 6:
                item["match_score"] = max(1, int(item["match_score"]) - 12)
            artist_counts[artist_key] = current_count + 1
            ranked.append(item)
        ranked.sort(key=lambda candidate: candidate.get("match_score", 0), reverse=True)
        return ranked

    def search_itunes(self, emotion: str, situation: str, korean_only: bool = False) -> list[dict]:
        recommendations: list[dict] = []
        search_terms = self._emotion_keywords(emotion, situation)
        if korean_only:
            search_terms = self._korean_seed_terms(emotion, situation)
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
                response = self.session.get("https://itunes.apple.com/search", params=params, timeout=6)
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
                            "matched_keyword": term,
                        }
                    )
            except Exception:
                continue
        return recommendations

    def search_musicbrainz(self, emotion: str, situation: str, korean_only: bool = False) -> list[dict]:
        if korean_only:
            return []
        recommendations: list[dict] = []
        search_terms = self._emotion_keywords(emotion, situation)
        if korean_only:
            search_terms = ["아이유", "BTS", "NewJeans", "IVE", "AKMU", "성시경", "잔나비"]
        random.shuffle(search_terms)

        for term in search_terms[:2]:
            query = f'recording:"{term}"'
            try:
                response = self.session.get(
                    "https://musicbrainz.org/ws/2/recording",
                    params={"query": query, "fmt": "json", "limit": 5},
                    timeout=6,
                )
                response.raise_for_status()
                data = response.json()
                for recording in data.get("recordings", [])[:3]:
                    artist_names = ", ".join(
                        artist["name"] for artist in recording.get("artist-credit", []) if artist.get("name")
                    )
                    release_title = recording.get("releases", [{}])[0].get("title", "") if recording.get("releases") else ""
                    recommendations.append(
                        {
                            "title": recording.get("title"),
                            "artist": artist_names or "Unknown",
                            "album": release_title or None,
                            "artwork_url": None,
                            "external_url": f"https://musicbrainz.org/recording/{recording.get('id')}",
                            "source": "MusicBrainz",
                            "matched_keyword": term,
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
                            "album": None,
                            "artwork_url": None,
                            "lastfm_url": track.get("url"),
                            "external_url": track.get("url"),
                            "source": "Last.fm",
                            "matched_keyword": tag,
                        }
                    )
            except Exception:
                continue
        return recommendations

    def get_genie_backup(self, emotion: str) -> list[dict]:
        candidates = list_artifacts([self.settings.data_dir], "genie_diff_brief_*.json", "genie_diff_brief_")
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
                            "album": None,
                            "artwork_url": None,
                            "external_url": None,
                            "source": "지니차트",
                        }
                    )
        random.shuffle(recommendations)
        return recommendations[:3]

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

    def recommend(self, emotion: str, situation: str, korean_only: bool, variation: int = 0) -> tuple[list[RecommendationItem], str, str]:
        all_recommendations: list[dict] = []
        all_recommendations.extend(self.search_itunes(emotion, situation, korean_only=korean_only))
        if not korean_only:
            all_recommendations.extend(self.search_musicbrainz(emotion, situation, korean_only=korean_only))
            all_recommendations.extend(self.search_lastfm(emotion))
        all_recommendations.extend(self.get_genie_backup(emotion))
        all_recommendations = self._dedupe(all_recommendations)
        ranked_recommendations = self._rank_candidates(all_recommendations, emotion, situation, korean_only, variation)

        if len(ranked_recommendations) > 6:
            offset = variation % min(4, max(1, len(ranked_recommendations) - 5))
            top_candidates = ranked_recommendations[offset:offset + 6]
        else:
            top_candidates = ranked_recommendations[:6]
        songs_text = ", ".join(
            f"{item['title']} - {item['artist']} ({item.get('reason', '매칭 후보')})"
            for item in top_candidates[:4]
        ) or "추천 후보 없음"
        explanation, model_used = self.llm_service.generate(f"{emotion} 감정, {situation} 상황", songs_text)
        items = [RecommendationItem(**item) for item in top_candidates]
        return items, explanation, model_used

    def source_status(self, probe_llm: bool = False) -> dict:
        llm_status = self.llm_service.status(probe=probe_llm)
        genie_ready = bool(list_artifacts([self.settings.data_dir], "genie_diff_brief_*.json", "genie_diff_brief_"))
        return {
            "itunes": {"status": "연결됨", "api_key_required": False, "note": "공개 Search API"},
            "musicbrainz": {"status": "연결됨", "api_key_required": False, "note": "공개 메타데이터 API"},
            "lastfm": {"status": "연결됨" if self.settings.lastfm_api_key else "선택사항", "api_key_configured": bool(self.settings.lastfm_api_key)},
            "genie": {"status": "준비됨" if genie_ready else "데이터 없음", "note": "현재 data 폴더 기준"},
            "llm": {"status": llm_status["openai"]["status"], "model_used": "없음", "local_fallback_enabled": True},
            **llm_status,
        }
    def _korean_seed_terms(self, emotion: str, situation: str) -> list[str]:
        seeds = {
            "기쁨": ["신나는 케이팝", "청량한 한국 노래", "기분 좋은 드라이브 노래"],
            "슬픔": ["감성 발라드", "이별 발라드", "새벽 감성 노래"],
            "편안함": ["잔잔한 인디", "편안한 어쿠스틱", "힐링 한국 노래"],
            "에너지": ["운동할 때 듣는 케이팝", "강한 비트 한국 노래", "고텐션 노래"],
            "우울함": ["몽환적인 한국 노래", "새벽 인디", "차분한 감성곡"],
            "집중": ["집중할 때 듣는 연주곡", "공부할 때 듣는 잔잔한 노래", "로파이 한국"],
            "설렘": ["설레는 사랑 노래", "봄 느낌 케이팝", "데이트 감성 노래"],
            "그리움": ["추억의 발라드", "그리운 감성 노래", "회상 분위기 노래"],
            "몽환": ["몽환적인 인디", "드림팝 한국", "밤에 듣는 신스팝"],
            "분노": ["강한 힙합", "센 한국 락", "에너지 넘치는 랩"],
            "잔잔함": ["잔잔한 피아노", "조용한 발라드", "밤 산책 노래"],
            "로맨틱": ["달달한 러브송", "고백 분위기 노래", "로맨틱 케이팝"],
        }.get(emotion, ["요즘 인기 한국 노래", "국내 차트 인기곡"])

        if "출근길" in situation:
            seeds.extend(["출근길 듣기 좋은 노래", "아침에 듣는 케이팝"])
        if "운동" in situation:
            seeds.extend(["운동할 때 듣는 노래", "러닝 플레이리스트 한국"])
        if "산책" in situation:
            seeds.extend(["산책할 때 듣는 인디", "걷기 좋은 한국 노래"])
        if "휴식" in situation:
            seeds.extend(["휴식할 때 듣는 노래", "힐링 음악 한국"])
        if "드라이브" in situation:
            seeds.extend(["드라이브 케이팝", "야간 드라이브 노래"])
        if "공부" in situation:
            seeds.extend(["공부할 때 듣는 노래", "집중용 잔잔한 노래"])
        return seeds
