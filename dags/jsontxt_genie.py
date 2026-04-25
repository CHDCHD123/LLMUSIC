# gemini API 설정 & 임포트
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY 또는 GOOGLE_API_KEY 환경변수가 필요합니다.")

genai.configure(api_key=api_key)

# gemini 모델 선택
model = genai.GenerativeModel("gemini-2.0-flash")

# LLM 참조 자료 코드
import json
from datetime import datetime
import pandas as pd

def run_report_generation(input_folder=".", output_folder="."):
    # 오늘 날짜 문자열
    today_str = datetime.today().strftime("%Y-%m-%d")

    # 오늘자 요약 JSON 파일명 자동 생성
    json_file = os.path.join(input_folder, f"genie_diff_brief_{today_str}.json")

    with open(json_file, "r", encoding="utf-8") as f:
        brief_json = json.load(f)

    # 모델 입력을 문자열로 직렬화
    brief_text = json.dumps(brief_json, ensure_ascii=False, indent=2)

    question = """당신은 음악 차트 애널리스트입니다.
참조된 JSON은 전날 대비 오늘의 지니 차트 변화 요약(숫자 계산 완료)입니다.
- 새로운 산술 계산은 하지 말고, 제공된 수치를 근거로 해석하세요.
- ‘큰 변화’ 기준: abs(순위변동) ≥ 10 또는 변화율 ≥ 10%.
- 큰 변화가 없다면 ‘큰 변화 없음’이라고 명시하세요.
- 신규/이탈/장르 변화의 맥락은 필요시 URL 없이 해석하되, 추정임을 분명히 하세요."""

    # 보고서 뽑기
    response = model.generate_content([question, brief_text])

    # 줄 단위 TXT 저장 (TSV 형태)
    out = os.path.join(output_folder, f"genie_report_{today_str}.txt")

    pd.Series(response.text.splitlines()).to_csv(
        out, index=False, header=False, sep="\t", encoding="utf-8-sig"
    )

    print(f"✅ LLM 보고서 저장: {out}")

if __name__ == "__main__":
    run_report_generation(input_folder="data", output_folder="data")
