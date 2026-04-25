# LLMUSIC

`LLMUSIC`는 감정 기반 음악 추천, 지니 차트 수집/비교 분석, 리포트 생성과 리포트 열람을 한 서비스 안에서 관리하는 프로젝트입니다.

## 현재 구조

- `frontend/`
  React + Vite + TypeScript UI
- `backend/`
  FastAPI API 서버
- `backend/app/services/`
  추천, LLM, 크롤링, diff 분석, 리포트, 자동화 스케줄링 모듈
- `data/`
  현재 런타임에서 사용하는 실제 스냅샷/분석/리포트 저장 폴더
- `delfile/`
  예전 구조 파일과 과거 데이터 보관 폴더
- `model/`
  로컬 LLM fallback 모델

중요:

- 런타임 추천과 자동화 비교는 `data/`만 기준으로 동작합니다.
- `delfile/data_archive/`는 보관용이며, 현재 실행 로직에서 비교 기준으로 가져오지 않습니다.

## 접근 제어

현재 접근 정책:

- 메인 페이지: 공개
- 추천: 로그인 필요
- 자동화: 로그인 필요
- 리포트: 로그인 필요

로그인 구조:

- 로그인 페이지: `/login`
- 기본 관리자 계정:
  - 아이디 `admin`
  - 비밀번호 `1234`
- 회원가입 버튼은 현재 UI만 있고, 클릭 시 `준비중입니다` 안내를 표시합니다.
- 로그인 후 헤더 우측에 사용자 이름, `MY PAGE`, `LOGOUT`이 표시됩니다.
- `MY PAGE`도 현재는 `준비중입니다` 안내만 표시합니다.

주의:

- 실제로는 `.env`의 `ADMIN_USERNAME`, `ADMIN_PASSWORD`가 우선입니다.
- 위 기본 계정은 `.env`에 값이 없을 때만 fallback으로 사용됩니다.

## 추천 기능

추천은 아래 소스를 조합합니다.

- `iTunes Search API`
- `MusicBrainz`
- `Last.fm` 선택 사용
- `Genie` 분석 데이터 선택 사용

동작 방식:

- `data/`에 `genie_diff_brief_*.json`이 있으면 지니 분석 결과도 추천에 반영
- `data/`에 지니 분석 파일이 없으면 공개 API만으로 추천
- 설명 생성은 `OpenAI` 우선, 실패 시 로컬 모델 fallback
- 추천 엔진은 페이지에서 직접 선택할 수 있습니다.
  - `AUTO`
  - `OpenAI`
  - `EXAONE`
  - `Template`
- 추천 페이지는 입력값만 세션에 유지하고, 추천 결과 자체는 서버 재시작/새로고침 시 복원하지 않습니다.

현재는 `Spotify`를 사용하지 않습니다.

## 자동화 기능

자동화 페이지에서 할 수 있는 것:

- 수동 실행
- 매일 정각 예약 실행
- 현재 단계 확인
- 최근 실행 로그 확인
- 최근 산출물 확인
- 실행 로그 전체 보기
- `data/` 폴더 전체 산출물 목록 확인

실행 순서:

1. 지니 차트 크롤링
2. `data/` 안에 스냅샷이 2개 이상 있으면 diff 분석
3. diff 결과로 리포트 생성

첫 실행 동작:

- `data/`에 스냅샷이 하나뿐이면 비교를 하지 않습니다.
- 이 경우 첫 실행은 기준 데이터만 저장하고 종료합니다.

예시 파일:

- `genie_top100_YYYY-MM-DD_HH-MM-SS.csv`
- `genie_diff_YYYY-MM-DD_HH-MM-SS.csv`
- `genie_diff_brief_YYYY-MM-DD_HH-MM-SS.json`
- `genie_report_YYYY-MM-DD_HH-MM-SS.txt`

## 서비스 페이지

현재 프론트 탭:

- 메인
- 로그인
- 추천
- 자동화
- 리포트

리포트 탭에서는 생성된 `genie_report_*.txt` 목록과 본문을 서비스 안에서 바로 읽을 수 있습니다.

## 설치

Python 패키지:

```powershell
venv\Scripts\python -m pip install -r requirements.txt
```

프론트 패키지:

```powershell
cd frontend
npm install
```

프론트 빌드:

```powershell
cd frontend
npm run build
```

로컬 모델 다운로드:

```powershell
venv\Scripts\python scripts\download_local_model.py
```

## 환경 변수

루트 `.env`에 아래 값을 둡니다.

```env
LASTFM_API_KEY=your_lastfm_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
LOCAL_LLM_MODEL_ID=LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct
ADMIN_USERNAME=admin
ADMIN_PASSWORD=1234
AUTH_SECRET=change-this-secret
```

최소 실행 기준:

- 꼭 필요: `OPENAI_API_KEY`
- 선택: `LASTFM_API_KEY`

## 실행

개발 모드 한 번에 실행:

```powershell
.\LLMUSIC.bat
```

개발 모드 주소:

- 프론트: `http://127.0.0.1:5173`
- 백엔드: `http://127.0.0.1:8010`

`LLMUSIC.bat`를 실행한 콘솔에서 `Ctrl + C`를 누르면 백엔드와 프론트가 같이 종료됩니다.
또한 백엔드 `8010/health`가 실제로 응답한 뒤 프론트를 띄우도록 되어 있어, 시작 시점 프록시 에러를 줄이도록 맞춰져 있습니다.

빌드된 프론트를 FastAPI 단독으로 서빙:

```powershell
cd frontend
npm run build
cd ..
venv\Scripts\activate
uvicorn backend.app.main:app --host 127.0.0.1 --port 8010
```

이 경우 아래 경로를 직접 열거나 새로고침해도 됩니다.

- `http://127.0.0.1:8010/`
- `http://127.0.0.1:8010/login`
- `http://127.0.0.1:8010/recommend`
- `http://127.0.0.1:8010/automation`
- `http://127.0.0.1:8010/reports`

FastAPI가 `frontend/dist`를 직접 서빙하고 SPA fallback도 처리합니다.

외부 공유가 필요하면 `cloudflared`를 별도로 설치한 뒤 아래처럼 `8010` 포트에 터널을 열면 됩니다.

```powershell
cloudflared tunnel --url http://localhost:8010
```

## 참고

- `delfile/data_archive/`는 보관용입니다.
- 현재 비교 분석과 추천 fallback은 보관 데이터에 의존하지 않습니다.
- `data/`를 비워두면 첫 자동화 실행은 기준 데이터 저장만 수행합니다.
- 비로그인 상태에서 보호 페이지로 접근하면 `/login`으로 이동합니다.
