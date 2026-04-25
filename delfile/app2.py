"""
🎵 간단한 감정 기반 음악 추천 시스템 (UI 개선: 카드형 감정 선택 + 중앙 단일 컨테이너)
"""
import streamlit as st
import os
import json
import glob
import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import time
import random
from typing import List, Dict, Optional, Tuple

# LLM용 import
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    import google.generativeai as genai
    TRANSFORMERS_AVAILABLE = True
    GENAI_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    GENAI_AVAILABLE = False

# 환경변수 로드
load_dotenv()

st.set_page_config(
    page_title="🎵 감성 음악 추천",
    page_icon="🎵",
    layout="wide",
    initial_sidebar_state="collapsed"  # 사이드바는 쓰지 않음
)

# -----------------------
# 간단 스타일 (카드 버튼)
# -----------------------
st.markdown("""
<style>
/* 중앙 고정 + 상단 여백 확장 (문구 짤림 방지) */
.block-container {max-width: 900px; padding-top: 2.5rem; padding-bottom: 4rem;}
h1, h2, h3, p {overflow-wrap: anywhere;}

/* 버튼을 카드처럼 보이게 */
.stButton > button {
  width: 100%;
  border: 2px solid #e6e6e6 !important;
  border-radius: 14px !important;
  padding: 12px 14px !important;
  background: #ffffff !important;
  font-weight: 600 !important;
  transition: transform .02s ease-in-out, border .08s ease-in-out, box-shadow .08s ease-in-out !important;
}
.stButton > button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.06);
}
/* 선택된 버튼을 강조하기 위해 :focus 스타일을 조금 강화 */
.stButton > button:focus {
  border: 2px solid #5a8dee !important;
  box-shadow: 0 0 0 4px rgba(90,141,238,0.12) !important;
  outline: none !important;
}

/* 상태칩(연결 상태) */
.status-chip {
  display:inline-flex; align-items:center; gap:8px;
  border:1px solid #e6e6e6; border-radius:999px; padding:6px 12px; background:#fff;
}
.status-dot {width:8px; height:8px; border-radius:999px;}
.status-ok {background:#32c28f;}
.status-warn {background:#ffb400;}
.status-off {background:#ff5f5f;}
.section-card {
  border:1px solid #ececec; border-radius:16px; padding:16px 18px; background:#fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}
.badge {
  display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px;
  background:#f2f2f2; margin-left:8px; vertical-align:middle;
}
</style>
""", unsafe_allow_html=True)

# -----------------------
# 원본 기능 클래스 (불변)
# -----------------------
class MusicRecommender:
    def __init__(self):
        self.spotify = None
        self.lastfm_key = os.getenv('LASTFM_API_KEY')
        self.init_spotify()
        self._tf_generator = None
        self._local_generator = None

    def init_spotify(self):
        try:
            client_id = os.getenv('SPOTIFY_CLIENT_ID')
            client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
            if client_id and client_secret:
                credentials = SpotifyClientCredentials(
                    client_id=client_id,
                    client_secret=client_secret
                )
                self.spotify = spotipy.Spotify(client_credentials_manager=credentials)
                return True
        except Exception as e:
            st.warning(f"Spotify 연결 실패: {e}")
        return False

    def search_spotify(self, emotion: str, situation: str, korean_only: bool = False) -> List[Dict]:
        if not self.spotify:
            return []
        try:
            all_recommendations = []
            if korean_only:
                korean_artists = [
                    "아이유","BTS","BLACKPINK","NewJeans","IVE","LE SSERAFIM","TWICE","Red Velvet","aespa","ITZY",
                    "STRAY KIDS","SEVENTEEN","임영웅","성시경","잔나비","DAY6","멜로망스","폴킴","이찬혁","AKMU",
                    "볼빨간사춘기","윤하","마마무","태연","박효신","이하이","크러쉬","딘","지코","로꼬","헤이즈","다비치","백예린"
                ]
                random.shuffle(korean_artists)
                selected_artists = korean_artists[:4]
                for artist in selected_artists:
                    try:
                        results = self.spotify.search(q=f"artist:{artist}", type='track', limit=4, market='KR')
                        for track in results['tracks']['items']:
                            track_artists = [a['name'] for a in track['artists']]
                            if any(k in track_artists for k in [artist]):
                                all_recommendations.append({
                                    'title': track['name'],
                                    'artist': ', '.join(track_artists),
                                    'album': track['album']['name'],
                                    'spotify_url': track['external_urls']['spotify'],
                                    'preview_url': track['preview_url'],
                                    'popularity': track['popularity'],
                                    'source': 'Spotify (한국 아티스트)'
                                })
                    except:
                        continue
            else:
                search_terms = []
                emotion_keywords = {
                    "행복": ["happy","upbeat","cheerful","joy"],
                    "슬픔": ["sad","melancholy","ballad","emotional"],
                    "화남": ["rock","intense","angry"],
                    "평온": ["calm","peaceful","relaxing","chill"],
                    "신남": ["energetic","dance","pop","upbeat"],
                    "그리움": ["nostalgic","longing","ballad"],
                    "집중": ["focus","instrumental","ambient"],
                    "운동": ["workout","gym","energy","pump"],
                    "휴식": ["chill","soft","relaxing"],
                    "로맨틱": ["romantic","love","sweet"]
                }
                if "비" in situation:
                    search_terms.extend(["rain","rainy day","korean ballad"])
                elif "공부" in situation:
                    search_terms.extend(["study","focus","lo-fi"])
                elif "운동" in situation:
                    search_terms.extend(["workout","gym","motivation"])
                elif "카페" in situation:
                    search_terms.extend(["cafe","acoustic","indie"])
                elif "드라이브" in situation:
                    search_terms.extend(["driving","road trip","chill"])
                if emotion in emotion_keywords:
                    search_terms.extend(emotion_keywords[emotion])
                random.shuffle(search_terms)
                selected_terms = search_terms[:2] if search_terms else ["popular"]
                for term in selected_terms:
                    try:
                        results = self.spotify.search(q=term, type='track', limit=5, market='KR')
                        for track in results['tracks']['items']:
                            all_recommendations.append({
                                'title': track['name'],
                                'artist': ', '.join([a['name'] for a in track['artists']]),
                                'album': track['album']['name'],
                                'spotify_url': track['external_urls']['spotify'],
                                'preview_url': track['preview_url'],
                                'popularity': track['popularity'],
                                'source': 'Spotify'
                            })
                    except:
                        continue
            seen = set()
            unique_recs = []
            for rec in all_recommendations:
                key = (rec['title'], rec['artist'])
                if key not in seen:
                    seen.add(key)
                    unique_recs.append(rec)
            random.shuffle(unique_recs)
            return unique_recs[:8]
        except Exception as e:
            st.error(f"Spotify 검색 실패: {e}")
            return []

    def search_lastfm(self, emotion: str, situation: str) -> List[Dict]:
        if not self.lastfm_key:
            return []
        try:
            tags = []
            if "슬픔" in emotion:
                tags = ["sad","melancholy"]
            elif "행복" in emotion:
                tags = ["happy","upbeat"]
            elif "평온" in emotion:
                tags = ["chill","ambient"]
            else:
                tags = ["popular"]
            recommendations = []
            for tag in tags[:1]:
                url = f"http://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag={tag}&api_key={self.lastfm_key}&format=json&limit=5"
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if 'tracks' in data and 'track' in data['tracks']:
                        for track in data['tracks']['track'][:3]:
                            recommendations.append({
                                'title': track['name'],
                                'artist': track['artist']['name'],
                                'lastfm_url': track['url'],
                                'source': 'Last.fm'
                            })
            return recommendations
        except Exception as e:
            st.warning(f"Last.fm 검색 실패: {e}")
            return []

    def get_genie_backup(self, emotion: str) -> List[Dict]:
        try:
            json_files = glob.glob("data/genie_diff_brief_*.json")
            if not json_files:
                return []
            latest_json = max(json_files, key=lambda x: x.split('_')[-1].replace('.json', ''))
            with open(latest_json, 'r', encoding='utf-8') as f:
                data = json.load(f)
            genre_mapping = {
                "행복": ["가요 / 댄스", "POP / 팝"],
                "슬픔": ["가요 / 발라드", "가요 / 인디"],
                "신남": ["가요 / 댄스", "가요 / 랩/힙합"],
                "평온": ["가요 / 발라드", "가요 / 인디"],
                "그리움": ["가요 / 발라드", "OST / 드라마"],
                "화남": ["가요 / 락", "가요 / 랩/힙합"],
                "운동": ["가요 / 댄스", "가요 / 랩/힙합"],
                "휴식": ["가요 / 발라드", "가요 / 인디"],
                "로맨틱": ["가요 / 발라드", "OST / 드라마"]
            }
            preferred_genres = genre_mapping.get(emotion, ["가요 / 전체"])
            all_candidates = []
            for category in ['rank_up', 'like_growth', 'new_entries']:
                if category in data.get('highlights', {}):
                    for song in data['highlights'][category]:
                        if song.get('장르', '') in preferred_genres:
                            all_candidates.append({
                                'title': song['곡명'],
                                'artist': song['아티스트'],
                                'rank': song.get('오늘순위', song.get('순위', 0)),
                                'source': '지니차트'
                            })
            random.shuffle(all_candidates)
            return all_candidates[:3]
        except Exception:
            return []

    def generate_explanation(self, recommendations: List[Dict], emotion: str, situation: str) -> Tuple[str, str]:
        if not recommendations:
            return "죄송해요, 현재 조건에 맞는 음악을 찾지 못했습니다.", "없음"
        user_input = f"{emotion} 감정, {situation} 상황"
        song_list = [f"{rec['title']} - {rec['artist']}" for rec in recommendations[:3]]
        songs_text = ", ".join(song_list)
        with st.spinner("🤖 AI가 추천 이유를 분석하고 있어요..."):
            ai_explanation, model_used = self.ask_llm(user_input, songs_text)
            time.sleep(1)
        explanation_text = f"""
**{emotion}** 감정과 **{situation}** 상황에 맞는 추천입니다!

**추천곡:** {songs_text}

**AI 분석:** {ai_explanation}
        """
        return explanation_text, model_used

    def ask_llm(self, user_input: str, songs: str) -> Tuple[str, str]:
        result = self.try_gemini_with_key(user_input, songs)
        if result:
            return result, "Gemini"
        result = self.try_transformers_pipeline(user_input, songs)
        if result:
            return result, "Qwen/Qwen2.5-1.5B-Instruct"
        result = self.try_huggingface_inference(user_input, songs)
        if result:
            return result, "Transformers (DialoGPT)"
        return "LLM 연결에 실패했습니다. API 설정을 확인해주세요.", "없음"

    def try_gemini_with_key(self, user_input: str, songs: str) -> Optional[str]:
        try:
            if not GENAI_AVAILABLE:
                return None
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                return None
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            prompt = f"""
            사용자 상황: {user_input}
            추천된 음악: {songs}
            위 상황에서 이 음악들을 추천하는 이유를 2-3문장으로 자연스럽게 한국어로 설명해주세요.
            """
            response = model.generate_content(prompt)
            if hasattr(response, "text") and response.text:
                return response.text.strip()
            return None
        except Exception as e:
            st.warning(f"Gemini API 오류: {e}")
            return None

    def try_transformers_pipeline(self, user_input: str, songs: str) -> Optional[str]:
        import torch
        try:
            if not TRANSFORMERS_AVAILABLE:
                return None
            songs_short = ", ".join(songs.split(", ")[:3])
            if getattr(self, "_tf_model", None) is None:
                model_id = "Qwen/Qwen2.5-1.5B-Instruct"
                tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
                mdl = AutoModelForCausalLM.from_pretrained(
                    model_id, trust_remote_code=True,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else None
                )
                if torch.cuda.is_available():
                    mdl = mdl.to("cuda:0")
                self._tf_tokenizer = tok
                self._tf_model = mdl

            tok = self._tf_tokenizer
            mdl = self._tf_model

            system_prompt = (
                "당신은 음악 큐레이터입니다. 사용자의 감정과 상황을 읽고, "
                "선정된 곡이 왜 어울리는지 한국어로 간결하게 설명합니다.\n"
                "- 2문장 이내, 군더더기 금지, 반복 금지\n"
                "- 감정(분위기)·상황·곡의 특징(장르/템포/보컬 톤 중 1~2개) 연결\n"
                "- 과장 표현(최고/완벽) 금지"
            )
            user_prompt = (
                f"[상황] {user_input}\n"
                f"[추천곡] {songs_short}\n"
                f"[요청] 위 곡들이 위 상황/감정에 어울리는 이유를 1~2문장으로 자연스럽게 설명하세요.\n"
                f"예시: 비 오는 날의 잔잔한 분위기에 맞춰 서정적인 보컬과 느린 템포가 감정을 가라앉혀 줍니다."
            )
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            inputs = tok.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_tensors="pt"
            )
            if mdl.device.type == "cuda":
                inputs = inputs.to(mdl.device)

            out = mdl.generate(
                inputs,
                max_new_tokens=120,
                temperature=0.6,
                top_p=0.9,
                top_k=50,
                no_repeat_ngram_size=3,
                repetition_penalty=1.15,
                eos_token_id=tok.eos_token_id,
                pad_token_id=tok.pad_token_id if tok.pad_token_id is not None else tok.eos_token_id,
            )
            gen = tok.decode(out[0][inputs.shape[-1]:], skip_special_tokens=True).strip()

            import re
            gen_fixed = re.sub(r'([.!?]|다\.)', r'\1\n', gen)
            sents = [s.strip() for s in gen_fixed.split("\n") if s.strip()]
            gen = " ".join(sents[:2])
            return gen if len(gen) > 5 else None

        except Exception as e:
            st.warning(f"Transformers(Qwen chat) 오류: {e}")
            return None

    def try_huggingface_inference(self, user_input: str, songs: str) -> Optional[str]:
        try:
            if not TRANSFORMERS_AVAILABLE:
                return None
            if self._local_generator is None:
                model_id = "microsoft/DialoGPT-medium"
                tok = AutoTokenizer.from_pretrained(model_id)
                mdl = AutoModelForCausalLM.from_pretrained(model_id)
                if tok.pad_token_id is None and tok.eos_token_id is not None:
                    tok.pad_token_id = tok.eos_token_id
                self._local_generator = pipeline(
                    "text-generation",
                    model=mdl,
                    tokenizer=tok,
                    device=-1,
                    return_full_text=False
                )
            prompt = (
                f"User feels {user_input} and got {songs} recommended. "
                f"Explain briefly in Korean (2-3 sentences) why these are a good match."
            )
            result = self._local_generator(
                prompt,
                max_new_tokens=80,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1,
                pad_token_id=self._local_generator.tokenizer.pad_token_id
            )
            if result and isinstance(result, list):
                text = (result[0].get("generated_text") or "").strip()
                return text if len(text) > 5 else None
            return None
        except Exception as e:
            st.warning(f"Transformers(DialoGPT) 오류: {e}")
            return None


# -----------------------
# 메인 (디자인만 변경)
# -----------------------
def main():
    # 세션 상태: 감정 선택 (카드형)
    if "emotion_selected" not in st.session_state:
        st.session_state.emotion_selected = "행복"  # 기본값: 이전 selectbox와 동일 역할

    if "recommender" not in st.session_state:
        st.session_state.recommender = MusicRecommender()
    recommender = st.session_state.recommender

    # 모든 요소를 하나의 컨테이너로 감쌈
    with st.container():
        st.title("🎵 감정 기반 음악 추천")
        st.markdown("감정과 상황을 입력하면 맞춤 음악을 추천해드려요!")

        # ---- 감정 선택 (버튼=카드) ----
        st.subheader("감정을 선택하세요")
        emotions = ["행복", "슬픔", "화남", "평온", "신남", "그리움", "집중", "운동", "휴식", "로맨틱"]

        # 5개씩 2행
        rows = [emotions[:5], emotions[5:]]
        for row in rows:
            cols = st.columns(len(row))
            for i, em in enumerate(row):
                with cols[i]:
                    # 선택 상태는 라벨에 ✅로만 표기 (시각적 피드백)
                    label = f"✅ {em}" if st.session_state.emotion_selected == em else em
                    clicked = st.button(label, key=f"emotion_btn_{em}", use_container_width=True)
                    if clicked:
                        st.session_state.emotion_selected = em
                        st.rerun()

        # 현재 선택 표시
        st.markdown(
            f"현재 선택: **{st.session_state.emotion_selected}**"
            f' <span class="badge">감정</span>',
            unsafe_allow_html=True
        )
        st.markdown("---")


        # ---- 입력 폼 (상황 + 한국노래 체크 + 제출) ----
        with st.form("music_form"):
            # 감정은 위 카드로 선택되므로 폼에는 상황/체크/제출만 남김
            situation = st.text_input(
                "상황을 입력하세요:",
                placeholder="예: 카페에서 공부, 헬스장에서 운동..."
            )
            korean_only = st.checkbox("🇰🇷 한국 노래만 추천받기", value=False)
            submitted = st.form_submit_button("🎵 추천받기", use_container_width=True)

        model_used_display = "없음"
        explanation_text = ""
        all_recommendations: List[Dict] = []

        # ---- 결과 처리 (기존 로직 동일) ----
        if submitted and st.session_state.emotion_selected and situation:
            emotion = st.session_state.emotion_selected
            with st.spinner("음악을 찾고 있어요..."):
                time.sleep(1)
                if korean_only:
                    genie_recs = recommender.get_genie_backup(emotion)
                    spotify_korean_recs = recommender.search_spotify(emotion, situation, korean_only=True)
                    all_recommendations = genie_recs + spotify_korean_recs
                else:
                    spotify_recs = recommender.search_spotify(emotion, situation, korean_only=False)
                    genie_recs = recommender.get_genie_backup(emotion)
                    lastfm_recs = recommender.search_lastfm(emotion, situation)
                    all_recommendations = spotify_recs + genie_recs + lastfm_recs

                random.shuffle(all_recommendations)
                explanation_text, model_used_display = recommender.generate_explanation(all_recommendations, emotion, situation)

            st.success("✨ 추천 완료!")
            st.markdown(explanation_text)

            if all_recommendations:
                st.markdown("---")
                st.header("🎵 추천 음악")
                for i, rec in enumerate(all_recommendations[:5], 1):
                    with st.container():
                        st.markdown(f"### {i}. {rec['title']}")
                        st.markdown(f"**아티스트:** {rec['artist']}")
                        col1, col2 = st.columns([3, 1])
                        with col1:
                            if 'album' in rec and rec['album']:
                                st.markdown(f"**앨범:** {rec['album']}")
                            if 'spotify_url' in rec:
                                st.markdown(f"[🎧 Spotify에서 듣기]({rec['spotify_url']})")
                            elif 'lastfm_url' in rec:
                                st.markdown(f"[📊 Last.fm에서 보기]({rec['lastfm_url']})")
                            if 'rank' in rec:
                                st.markdown(f"**지니차트 순위:** {rec['rank']}위")
                        with col2:
                            source = rec.get('source', '알 수 없음')
                            if 'Spotify (한국 아티스트)' in source:
                                st.markdown("🇰🇷 **한국 아티스트**")
                            elif 'Spotify' in source:
                                st.markdown("🌍 **Spotify**")
                            elif 'Last.fm' in source:
                                st.markdown("🎯 **Last.fm**")
                            elif '지니차트' in source:
                                st.markdown("📈 **지니차트**")
                            else:
                                st.markdown(f"❓ **{source}**")
                            if 'popularity' in rec:
                                st.markdown(f"인기도: {rec['popularity']}/100")
                        st.markdown("---")
            else:
                st.warning("추천할 음악을 찾지 못했어요. 다른 감정이나 상황을 시도해보세요!")

        # ---- (사이드바 → 메인) 연결 상태/AI 표기 ----
        st.markdown("### 🔗 연결 상태")
        with st.container():
            c1, c2, c3 = st.columns(3)
            with c1:
                ok = recommender.spotify is not None
                st.markdown(
                    f'<div class="section-card status-chip">'
                    f'<div class="status-dot {"status-ok" if ok else "status-off"}"></div>'
                    f'<div><strong>Spotify</strong><br>{"연결됨" if ok else "미연결"}</div>'
                    f'</div>', unsafe_allow_html=True
                )
            with c2:
                ok = bool(recommender.lastfm_key)
                st.markdown(
                    f'<div class="section-card status-chip">'
                    f'<div class="status-dot {"status-ok" if ok else "status-warn"}"></div>'
                    f'<div><strong>Last.fm</strong><br>{"연결됨" if ok else "선택"}</div>'
                    f'</div>', unsafe_allow_html=True
                )
            with c3:
                # 마지막 사용된 모델 표시 (없으면 "AI Model")
                label = f"AI 사용됨: {model_used_display}" if model_used_display != "없음" else "AI Model"
                st.markdown(
                    f'<div class="section-card status-chip">'
                    f'<div class="status-dot {"status-ok" if model_used_display != "없음" else "status-warn"}"></div>'
                    f'<div><strong>LLM</strong><br>{label}</div>'
                    f'</div>', unsafe_allow_html=True
                )

if __name__ == "__main__":
    main()
