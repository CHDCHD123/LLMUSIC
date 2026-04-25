# LLMUSIC

`LLMUSIC`는 감정 기반 음악 추천과 지니 차트 크롤링/분석/리포트 생성을 한 프로젝트에서 관리하는 서비스입니다.

## 구조 변경 요약

이전 구조는 Flask 서버, 정적 프론트, 크롤링 스크립트, Airflow/Docker 파일이 루트에 섞여 있었습니다. 추천 로직과 자동화 로직도 강하게 결합되어 있어서 유지보수가 어려운 상태였습니다.

현재 구조는 다음처럼 분리했습니다.

- `frontend/`
  React + Vite + TypeScript 프론트엔드
- `backend/`
  FastAPI 백엔드
- `backend/app/services/`
  추천, LLM, 크롤링, diff 분석, 리포트, 자동화 스케줄링 모듈
- `data/`
  새로 생성되는 크롤링/분석/리포트 산출물 저장 폴더
- `delfile/`
  예전 Flask/정적 프론트/Docker/Airflow 파일과 과거 데이터 보관 폴더
- `model/`
  로컬 LLM fallback 모델 저장 폴더

즉 지금은 프론트, 백엔드, 크롤링, 분석, 리포트, 자동화가 역할별로 나뉘어 있습니다.

## 현재 기능

- 감정/상황 기반 음악 추천
- OpenAI 우선 설명 생성
- 로컬 EXAONE fallback
- 최종 템플릿 fallback
- iTunes Search 기반 공개 검색
- MusicBrainz 기반 공개 메타데이터 검색
- 지니 차트 크롤링
- 직전 스냅샷 대비 diff 분석
- OpenAI 차트 리포트 생성
- 자동화 페이지에서 수동 실행
- 자동화 페이지에서 매일 실행 시간 설정

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
├─ delfile/
│  └─ data_archive/
├─ model/
├─ scripts/
├─ LLMUSIC.bat
├─ README.md
└─ requirements.txt
```

## 설치해야 하는 것

Python 패키지:

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
- `requests`
- `beautifulsoup4`
- `transformers`
- `torch`
- `huggingface-hub`
- `accelerate`

프론트 패키지:

```powershell
cd frontend
npm install
```

주요 패키지:

- `react`
- `react-dom`
- `vite`
- `typescript`

로컬 모델 다운로드:

```powershell
venv\Scripts\python scripts\download_local_model.py
```

현재 로컬 fallback 모델:

- `LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct`

저장 위치:

- `model/EXAONE-3.5-2.4B-Instruct`

`model/`은 `.gitignore`에 포함되어 Git 업로드 대상에서 제외됩니다.

## 대략적인 용량

환경에 따라 차이는 있지만 대략 이 정도를 보면 됩니다.

- Python 가상환경 + 백엔드 패키지: 약 `2~4GB`
- 프론트 `node_modules`: 약 `150~300MB`
- EXAONE 로컬 모델: 약 `9~10GB`
- `data/` 산출물: 실행 횟수에 따라 증가, 개별 파일은 보통 수 MB 내외
- `delfile/data_archive/` 과거 이력: 누적 데이터 양에 따라 계속 증가

로컬 모델까지 포함하면 전체적으로 `12GB+` 여유를 보는 편이 안전합니다.

## 환경 변수

루트 `.env`에 아래 값을 둡니다.

```env
LASTFM_API_KEY=your_lastfm_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
LOCAL_LLM_MODEL_ID=LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct
```

최소 실행 기준:

- 꼭 필요: `OPENAI_API_KEY`
- 있으면 좋음: `LASTFM_API_KEY`
- 지금 기본 추천 흐름에는 불필요: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

현재 추천 API 소스 구성:

- `iTunes Search API`: 키 없이 사용
- `MusicBrainz`: 키 없이 사용
- `Last.fm`: 키 있으면 추가 추천 소스로 사용
- `Spotify`: 정책 이슈로 기본 추천 소스에서 제외

## 실행 방법

한 번에 실행:

```powershell
.\LLMUSIC.bat
```

이 배치 파일은 아래 두 프로세스를 같이 띄웁니다.

- 백엔드 `FastAPI`: `http://127.0.0.1:8010`
- 프론트 `Vite`: `http://127.0.0.1:5173`

`LLMUSIC.bat`를 실행한 콘솔에서 `Ctrl + C`를 누르면 백엔드와 프론트 프로세스가 같이 종료되도록 구성했습니다.

수동 실행:

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

가능한 작업:

- 수동으로 크롤링/분석/보고서 실행
- 매일 실행 시간 저장
- 자동 실행 끄기
- 최근 실행 결과와 산출물 경로 확인

동작 순서:

1. 지니 차트 크롤링
2. 직전 스냅샷과 diff 생성
3. 브리프 JSON 생성
4. OpenAI 보고서 생성

중요한 변경점:

- 하루 1회 제한은 제거했습니다.
- 같은 날에도 수동 실행을 여러 번 할 수 있습니다.
- 예약 실행도 매일 지정 시각에 계속 동작합니다.
- 파일명에 시각까지 포함되어 실행 단위 이력이 남습니다.
- 리포트는 직전 브리프/직전 리포트와의 시간 간격을 함께 참고해서 생성됩니다.

저장 위치:

- 새 산출물은 전부 `data/`
- 과거 이력은 `delfile/data_archive/`

예시 파일명:

- `genie_top100_YYYY-MM-DD_HH-MM-SS.csv`
- `genie_diff_YYYY-MM-DD_HH-MM-SS.csv`
- `genie_diff_brief_YYYY-MM-DD_HH-MM-SS.json`
- `genie_report_YYYY-MM-DD_HH-MM-SS.txt`

리포트 상단에는 다음 정보가 포함됩니다.

- 현재 분석 시각
- 직전 차트 비교 시각
- 직전 차트 대비 경과 시간
- 마지막 리포트 시각
- 마지막 리포트 이후 경과 시간

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
- 과거 `data/` 파일도 현재는 `delfile/data_archive/`에 보관합니다.
