# LLMUSIC

감정과 상황을 입력하면 음악을 추천해주는 웹 앱입니다. 실행 진입점은 `LLMUSIC.bat`이고, 지니 차트 수집 자동화는 `dags/`와 `docker-compose.yaml` 기준으로 동작합니다.

## 현재 유지 구조

- `LLMUSIC.bat`: 윈도우 실행용 배치 파일
- `musicapp.py`: Flask 서버 본체
- `index.html`, `css/`, `js/`: 프론트엔드
- `data/`: 지니 차트 수집 결과물
- `dags/`: 지니 차트 자동 수집 파이프라인
- `docker-compose.yaml`, `Dockerfile`: Airflow 실행용
- `delfile/`: 현재 실행/자동화 기준으로 사용하지 않는 예전 파일 보관 폴더

## 환경 변수

루트에 `.env` 파일을 두고 아래 값을 설정합니다.

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
LASTFM_API_KEY=your_lastfm_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

설명:

- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`: 앱 추천 기능에 사실상 필수
- `LASTFM_API_KEY`: 없으면 Last.fm 추천만 비활성화
- `OPENAI_API_KEY`: 앱 설명 생성과 자동화 보고서 생성에 사용
- `OPENAI_MODEL`: 기본값은 `gpt-4.1-mini`

## 로컬 실행 방법

### 1. 가상환경 준비

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 배치 파일로 실행

가장 간단한 실행 방법:

```powershell
.\LLMUSIC.bat
```

동작 방식:

1. 현재 폴더로 이동
2. `venv\Scripts\activate.bat`가 있으면 가상환경 활성화
3. `python musicapp.py` 실행
4. Flask 서버가 `http://127.0.0.1:5000`에서 열림
5. 크롬이 있으면 브라우저 탭/창을 자동으로 엶

### 3. 직접 실행

```powershell
venv\Scripts\activate
python musicapp.py
```

## 데이터 수집 자동화 방법

자동화 파이프라인은 `dags/airflow_genie.py` 기준으로 아래 순서로 실행됩니다.

1. `crawler_genie.py`
2. `diff_genie.py`
3. `jsontxt_genie.py`

생성 파일:

- `data/genie_top100_YYYY-MM-DD.csv`: 지니 TOP100 원본 수집
- `data/genie_diff_YYYY-MM-DD.csv`: 전일 대비 변화 분석
- `data/genie_diff_brief_YYYY-MM-DD.json`: LLM용 요약 JSON
- `data/genie_report_YYYY-MM-DD.txt`: Gemini 분석 리포트

스케줄:

- DAG ID: `genie_chart_pipeline`
- 타임존: `Asia/Seoul`
- 크론: `0 17 * * *`
- 의미: 매일 한국 시간 오후 5시에 실행

### Airflow로 자동화 실행

```powershell
docker compose up airflow-init
docker compose up -d
```

그 다음 Airflow UI 접속:

- `http://localhost:8081`
- 기본 계정: `airflow`
- 기본 비밀번호: `airflow`

UI에서 `genie_chart_pipeline` DAG를 켜면 스케줄에 따라 자동 실행됩니다.

### 수동으로 한 번씩 실행

크롤링:

```powershell
python dags\crawler_genie.py
```

변화 분석:

```powershell
python dags\diff_genie.py
```

LLM 리포트 생성:

```powershell
python dags\jsontxt_genie.py
```

주의:

- `diff_genie.py`는 최소 2일치 `genie_top100_*.csv`가 있어야 동작합니다.
- `jsontxt_genie.py`는 같은 날짜의 `genie_diff_brief_*.json`과 `OPENAI_API_KEY`가 필요합니다.

## LLM 구조

앱 설명 생성은 아래 순서로 동작합니다.

1. OpenAI API (`OPENAI_API_KEY`)
2. 로컬 모델 `model/EXAONE-3.5-2.4B-Instruct`
3. 코드 내 기본 템플릿 문장

로컬 모델 다운로드:

```powershell
venv\Scripts\python scripts\download_local_model.py
```

로컬 모델 경로:

- `model/EXAONE-3.5-2.4B-Instruct`
- Git 업로드 제외: `.gitignore`에서 `model/` 제외 처리

## 실행 확인 포인트

- 앱 실행 확인: 브라우저에서 `http://127.0.0.1:5000`
- 상태 확인 API: `http://127.0.0.1:5000/api/status`
- 추천 API: `POST /api/recommend`

## 정리 메모

중복 또는 실험 성격 파일은 삭제하지 않고 `delfile/`로 이동했습니다.
