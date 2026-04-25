# LLMUSIC

`LLMUSIC`는 감정 기반 음악 추천, 지니 차트 크롤링, diff 분석, 보고서 생성, 예약 실행을 한 프로젝트 안에서 관리하는 서비스입니다.

## 기존 구조와 변경점

### 기존 구조

- 루트에 `musicapp.py` 하나로 Flask 서버와 추천 로직이 섞여 있었음
- `index.html`, `css/`, `js/` 정적 프론트가 루트에 직접 붙어 있었음
- `dags/`에 크롤링, diff, 보고서, Airflow DAG가 함께 있었음
- Docker/Airflow 중심 자동화 구조였음
- 추천/크롤링/보고서/자동화 책임이 분리되어 있지 않았음

### 현재 구조

- `frontend/`
  React + Vite + TypeScript 프론트엔드
- `backend/`
  FastAPI 백엔드
- `backend/app/services/`
  추천, LLM, 크롤링, diff, 보고서, 자동화 스케줄링을 모듈별로 분리
- `data/`
  크롤링 결과, diff 결과, 브리프 JSON, 보고서 TXT 저장
- `model/`
  로컬 fallback 모델 저장 위치
- `delfile/`
  예전 Flask/정적 프론트/Docker/Airflow 파일 보관

즉 지금은

- 프론트
- 백엔드 API
- 크롤링
- 보고서
- 자동화

가 나뉘어 있습니다.

## 현재 기능

- 감정/상황 기반 음악 추천
- OpenAI 우선 설명 생성
- 로컬 EXAONE fallback
- 최종 템플릿 fallback
- 지니 차트 크롤링
- 전일 diff 분석
- OpenAI 보고서 생성
- 자동화 페이지에서 수동 실행
- 자동화 페이지에서 매일 실행 시간 설정
- 동일 날짜 기준 성공 1회 실행 제한

## 디렉터리 구조

```text
LLMUSIC/
├─ backend/
│  └─ app/
│     ├─ api/routes/
│     ├─ core/
│     ├─ models/
│     └─ services/
├─ frontend/
├─ data/
├─ model/
├─ scripts/
├─ delfile/
├─ LLMUSIC.bat
├─ README.md
└─ requirements.txt
```

## 설치해야 하는 것

### 1. Python 가상환경 패키지

루트 기준:

```powershell
venv\Scripts\python -m pip install -r requirements.txt
```

주요 패키지:

- `fastapi`
- `uvicorn[standard]`
- `apscheduler`
- `spotipy`
- `openai`
- `pandas`
- `numpy`
- `beautifulsoup4`
- `transformers`
- `torch`
- `huggingface-hub`
- `accelerate`

### 2. 프론트엔드 패키지

```powershell
cd frontend
npm install
```

주요 패키지:

- `react`
- `react-dom`
- `vite`
- `typescript`

### 3. 로컬 모델

로컬 fallback 모델 다운로드:

```powershell
venv\Scripts\python scripts\download_local_model.py
```

현재 모델:

- `LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct`

저장 위치:

- `model/EXAONE-3.5-2.4B-Instruct`

`model/`은 `.gitignore`에 포함되어 Git 업로드 대상에서 제외됩니다.

## 대략적인 용량

환경에 따라 차이가 있지만 현재 기준으로 보면 대략 이 정도를 잡으면 됩니다.

- Python 가상환경 + 백엔드 패키지: 약 `2~4GB`
- 프론트 `node_modules`: 약 `150~300MB`
- EXAONE 로컬 모델: 약 `9~10GB`
- `data/` 산출물: 날짜가 쌓일수록 증가, 현재는 수십 MB 수준

즉 로컬 모델까지 포함하면 전체적으로 `12GB+` 정도는 여유를 보는 편이 안전합니다.

## 환경 변수

루트 `.env`에 아래 값을 둡니다.

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
LASTFM_API_KEY=your_lastfm_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
LOCAL_LLM_MODEL_ID=LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct
```

## 실행 방법

### 한 번에 실행

```powershell
.\LLMUSIC.bat
```

이 배치 파일은

- 백엔드 `FastAPI`를 `127.0.0.1:8010`
- 프론트 `Vite`를 `127.0.0.1:5173`

로 같이 띄웁니다.

중요:

- `LLMUSIC.bat`를 실행한 콘솔에서 `Ctrl + C`를 누르면
- 백엔드와 프론트 프로세스를 같이 종료하도록 구성했습니다.

### 수동 실행

백엔드:

```powershell
venv\Scripts\activate
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8010
```

프론트:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

## 자동화 페이지

자동화는 프론트에 별도 페이지로 들어가 있습니다.

할 수 있는 것:

- 수동으로 크롤링/분석/보고서 실행
- 매일 실행 시간 저장
- 자동 실행 끄기
- 최근 실행 결과와 산출물 경로 확인

동작 방식:

1. 지니 크롤링
2. diff 생성
3. 브리프 JSON 생성
4. OpenAI 보고서 생성

저장 위치:

- 전부 `data/` 폴더에 저장

예시 파일:

- `genie_top100_YYYY-MM-DD.csv`
- `genie_diff_YYYY-MM-DD.csv`
- `genie_diff_brief_YYYY-MM-DD.json`
- `genie_report_YYYY-MM-DD.txt`

### 일 1회 제한

자동화는 같은 날짜에 성공 기준으로 1회만 실행됩니다.

즉:

- 수동 실행도 하루 1회 성공 후에는 스킵
- 예약 실행도 하루 1회 성공 후에는 스킵
- 실패한 경우에는 다시 시도 가능

## API

- `GET /health`
- `GET /api/status?probe=1`
- `POST /api/recommend`
- `GET /api/automation/status`
- `POST /api/automation/run`
- `POST /api/automation/schedule`

## 참고

- Spotify API는 계정 상태에 따라 `403`이 날 수 있습니다.
- 예전 구조 파일은 삭제하지 않고 `delfile/`로 이동했습니다.
