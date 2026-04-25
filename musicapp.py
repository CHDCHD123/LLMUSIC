import os
import json
import glob
import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv
import time
import random
import tempfile
import threading
import subprocess
from typing import List, Dict, Optional, Tuple

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# LLM용 import
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    import google.generativeai as genai
    TRANSFORMERS_AVAILABLE = True
    GENAI_AVAILABLE = True
    print("Transformers 및 Google Generative AI 라이브러리 로드 성공")
except ImportError as e:
    TRANSFORMERS_AVAILABLE = False
    GENAI_AVAILABLE = False
    print(f"LLM 라이브러리 로드 실패: {e}")
    print("Transformers 또는 Google Generative AI가 설치되지 않았을 수 있습니다.")

# 환경변수 로드
load_dotenv()

# -----------------------------
# 유틸: 크롬 실행 경로 탐색 & 분리 세션으로 실행
# -----------------------------
def find_chrome_path() -> Optional[str]:
    # 일반적인 설치 경로들 체크
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.join(os.environ.get("LOCALAPPDATA", ""), r"Google\Chrome\Application\chrome.exe")
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            return p
    # PATH에 chrome 등록된 경우
    return "chrome"

def open_chrome_isolated(url: str) -> subprocess.Popen:
    """
    분리된 사용자 데이터 디렉토리로 '독립 크롬 인스턴스' 실행.
    이렇게 띄우면 이 창(프로세스)을 닫을 때 Popen이 종료되어 감지가 쉬움.
    """
    chrome_path = find_chrome_path()
    user_data_dir = tempfile.mkdtemp(prefix="chrome_profile_")
    args = [
        chrome_path,
        f"--user-data-dir={user_data_dir}",
        "--disable-extensions",
        "--new-window",
        url
    ]
    # 독립된 크롬 프로세스 실행
    return subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# -----------------------------
# 도메인 로직
# -----------------------------
class MusicRecommender:
    def __init__(self):
        self.spotify = None
        self.lastfm_key = os.getenv('LASTFM_API_KEY')
        self.init_spotify()
        self._tf_generator = None
        self._local_generator = None
        self.last_model_used = "없음"  # 마지막 사용 LLM 모델 기록

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
            print(f"Spotify 연결 실패: {e}")
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

            # 중복 제거 & 섞기
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
            print(f"Spotify 검색 실패: {e}")
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
            print(f"Last.fm 검색 실패: {e}")
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
        ai_explanation, model_used = self.ask_llm(user_input, songs_text)
        self.last_model_used = model_used
        time.sleep(1)
        explanation_text = f"""
**{emotion}** 감정과 **{situation}** 상황에 맞는 추천입니다!

**추천곡:** {songs_text}

**AI 분석:** {ai_explanation}
        """
        print(f"Generated Explanation ({model_used}): {ai_explanation}")
        return explanation_text, model_used

    def ask_llm(self, user_input: str, songs: str) -> Tuple[str, str]:
        self.last_model_used = "Gemini (시도 중)"
        result = self.try_gemini_with_key(user_input, songs)
        if result:
            return result, "Gemini"

        self.last_model_used = "Qwen/Qwen2.5-1.5B-Instruct (시도 중)"
        result = self.try_transformers_pipeline(user_input, songs)
        if result:
            return result, "Qwen/Qwen2.5-1.5B-Instruct"

        self.last_model_used = "Transformers (DialoGPT) (시도 중)"
        result = self.try_huggingface_inference(user_input, songs)
        if result:
            return result, "Transformers (DialoGPT)"

        self.last_model_used = "없음"
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
            print(f"Gemini API 오류: {e}")
            return None

    def try_transformers_pipeline(self, user_input: str, songs: str) -> Optional[str]:
        import torch
        try:
            if not TRANSFORMERS_AVAILABLE:
                print("Transformers 라이브러리 사용 불가.")
                return None
            songs_short = ", ".join(songs.split(", ")[:3])
            if getattr(self, "_tf_model", None) is None:
                print("Qwen 모델 로드 시도...")
                model_id = "Qwen/Qwen2.5-1.5B-Instruct"
                tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
                mdl = AutoModelForCausalLM.from_pretrained(
                    model_id, trust_remote_code=True,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else None
                )
                if torch.cuda.is_available():
                    mdl = mdl.to("cuda:0")
                    print("Qwen 모델 CUDA(GPU) 사용 가능.")
                else:
                    print("Qwen 모델 CPU 사용. (CUDA 사용 불가)")
                self._tf_tokenizer = tok
                self._tf_model = mdl
                print("Qwen 모델 로드 완료.")

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
            print("Qwen 모델 텍스트 생성 시도...")
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
            gen_fixed = re.sub(r'([.!?]|다\.)', r'\g<1>\n', gen)
            sents = [s.strip() for s in gen_fixed.split('\n') if s.strip()]
            gen = " ".join(sents[:2])
            return gen if len(gen) > 5 else None

        except Exception as e:
            print(f"Transformers(Qwen chat) 오류: {type(e).__name__} - {e}")
            return None

    def try_huggingface_inference(self, user_input: str, songs: str) -> Optional[str]:
        try:
            if not TRANSFORMERS_AVAILABLE:
                print("Transformers 라이브러리 (DialoGPT) 사용 불가.")
                return None
            if self._local_generator is None:
                print("DialoGPT 모델 로드 시도...")
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
                print("DialoGPT 모델 로드 완료.")
            prompt = (
                f"User feels {user_input} and got {songs} recommended. "
                f"Explain briefly in Korean (2-3 sentences) why these are a good match."
            )
            print("DialoGPT 모델 텍스트 생성 시도...")
            result = self._local_generator(
                prompt,
                max_new_tokens=80,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
                num_return_sequences=1,
                pad_token_id=self._local_generator.tokenizer.pad_token_id
            )
            print("DialoGPT 모델 텍스트 생성 완료.")
            if result and isinstance(result, list) and result[0] is not None:
                text = (result[0].get("generated_text") or "").strip()
                return text if len(text) > 5 else None
            return None
        except Exception as e:
            print(f"Transformers(DialoGPT) 오류: {type(e).__name__} - {e}")
            return None

# -----------------------------
# Flask 앱 설정
# -----------------------------
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

recommender = MusicRecommender()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        emotion = data.get('emotion')
        situation = data.get('situation', '')
        korean_only = data.get('korean_only', False)

        if not emotion:
            return jsonify({"error": "Emotion is required"}), 400

        all_recommendations: List[Dict] = []

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

        return jsonify({
            "recommendations": all_recommendations[:5],
            "explanation": explanation_text,
            "model_used": model_used_display
        })
    except Exception as e:
        print(f"API /recommend 오류 발생: {type(e).__name__} - {e}")
        return jsonify({"error": f"서버 오류가 발생했습니다: {type(e).__name__} - {e}"}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    spotify_ok = recommender.spotify is not None
    lastfm_ok = bool(recommender.lastfm_key)
    llm_ok = bool(os.getenv('GEMINI_API_KEY')) or TRANSFORMERS_AVAILABLE
    last_llm_model = recommender.last_model_used

    return jsonify({
        "spotify": {"status": "연결됨" if spotify_ok else "미연결"},
        "lastfm": {"status": "연결됨" if lastfm_ok else "미연결"},
        "llm": {"status": "연결됨" if llm_ok else "미연결", "model_used": last_llm_model}
    })

# -----------------------------
# 안전한 종료를 위한 내부용 엔드포인트
# -----------------------------
@app.route('/__shutdown__', methods=['GET', 'POST'])
def __shutdown__():
    func = request.environ.get('werkzeug.server.shutdown')
    if func:
        func()
        return "Server shutting down..."
    # 일부 환경에서 None일 수 있으니 확실히 종료
    os._exit(0)


# -----------------------------
# 메인: 서버 실행 + 기존 크롬 창의 '새 탭'으로 열기
# (탭/창 닫힘 → 프론트에서 /__shutdown__ 으로 종료 신호)
# -----------------------------
import os, time, threading, requests, webbrowser, subprocess, shutil

def _wait_until_server_ready(url: str, timeout_sec: int = 8):
    t0 = time.time()
    while time.time() - t0 < timeout_sec:
        try:
            requests.get(url, timeout=0.8)
            return True
        except Exception:
            time.sleep(0.2)
    return False

def _is_chrome_running() -> bool:
    """Windows에서 chrome.exe 프로세스 유무 확인"""
    try:
        out = subprocess.check_output(
            ['tasklist', '/FI', 'IMAGENAME eq chrome.exe'],
            creationflags=subprocess.CREATE_NO_WINDOW
        ).decode('utf-8', errors='ignore')
        return 'chrome.exe' in out
    except Exception:
        return False

def _find_chrome_path() -> str:
    """크롬 경로 탐색 (PATH 우선, 그다음 일반 경로)"""
    if shutil.which("chrome"):
        return "chrome"
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.join(os.environ.get("LOCALAPPDATA",""), r"Google\Chrome\Application\chrome.exe"),
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            return p
    return "chrome"  # 최후의 수단

def open_in_existing_chrome_tab(url: str):
    _wait_until_server_ready(url, timeout_sec=8)
    try:
        if _is_chrome_running():
            # 크롬이 이미 떠 있으면: 기존 창의 '새 탭'으로 열기
            # 기본 브라우저가 크롬이면 webbrowser로 충분
            if webbrowser.open(url, new=0, autoraise=True):
                return
            # 기본 브라우저가 크롬이 아니거나 실패 시 크롬 직접 호출
            chrome = _find_chrome_path()
            subprocess.Popen([chrome, url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            # 크롬이 안 떠 있으면: 크롬 새 창으로 시작
            chrome = _find_chrome_path()
            subprocess.Popen([chrome, url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                             creationflags=subprocess.CREATE_NO_WINDOW)
    except Exception as e:
        print(f"브라우저 열기 실패: {e}")

if __name__ == '__main__':
    HOST = "127.0.0.1"
    PORT = 5000
    BASE = f"http://{HOST}:{PORT}/"

    # 서버 기동 후 기존 크롬 창의 '새 탭' 또는 새 창으로 열기 (자동 분기)
    threading.Thread(target=open_in_existing_chrome_tab, args=(BASE,), daemon=True).start()

    # Flask 실행 (재로더 끄기: use_reloader=False)
    app.run(host=HOST, port=PORT, debug=True, use_reloader=False, threaded=True)