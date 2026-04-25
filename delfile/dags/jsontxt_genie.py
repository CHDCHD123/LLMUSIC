import glob
import json
import os
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()


def _find_latest_brief_json(input_folder: str) -> str:
    today_str = datetime.today().strftime("%Y-%m-%d")
    preferred = os.path.join(input_folder, f"genie_diff_brief_{today_str}.json")
    if os.path.exists(preferred):
        return preferred

    candidates = glob.glob(os.path.join(input_folder, "genie_diff_brief_*.json"))
    if not candidates:
        raise FileNotFoundError(
            f"LLM 리포트 입력 파일이 없습니다: {input_folder}/genie_diff_brief_*.json"
        )
    return max(candidates, key=os.path.getmtime)


def _load_brief_json(input_folder: str) -> tuple[dict, str, str]:
    json_file = _find_latest_brief_json(input_folder)
    with open(json_file, "r", encoding="utf-8") as f:
        brief_json = json.load(f)

    report_date = brief_json.get("meta", {}).get("date")
    if not report_date:
        base = os.path.basename(json_file)
        report_date = base.replace("genie_diff_brief_", "").replace(".json", "")
    return brief_json, json_file, report_date


def _build_prompt(brief_json: dict) -> tuple[str, str]:
    question = """당신은 음악 차트 애널리스트입니다.
참조된 JSON은 전날 대비 오늘의 지니 차트 변화 요약(숫자 계산 완료)입니다.
- 새로운 산술 계산은 하지 말고, 제공된 수치를 근거로 해석하세요.
- '큰 변화' 기준: abs(순위변동) >= 10 또는 변화율 >= 10%.
- 큰 변화가 없다면 '큰 변화 없음'이라고 명시하세요.
- 신규/이탈/장르 변화의 맥락은 필요시 URL 없이 해석하되, 추정임을 분명히 하세요.
- 결과는 한국어로, 짧은 단락과 불릿 위주로 정리하세요."""
    brief_text = json.dumps(brief_json, ensure_ascii=False, indent=2)
    return question, brief_text


def _build_fallback_report(brief_json: dict, reason: str) -> str:
    meta = brief_json.get("meta", {})
    highlights = brief_json.get("highlights", {})
    counts = meta.get("counts", {})

    lines = [
        "[자동 생성 기본 리포트]",
        f"- 생성일: {meta.get('date', 'unknown')}",
        f"- 사유: {reason}",
        "",
        "[요약]",
        f"- 신규 진입: {counts.get('new', 0)}곡",
        f"- 차트 이탈: {counts.get('dropped', 0)}곡",
        f"- 유지 곡: {counts.get('kept', 0)}곡",
        f"- 큰 변화 곡: {counts.get('big_moves', 0)}곡",
        "",
        "[상승 상위]",
    ]

    rank_up = highlights.get("rank_up", [])[:5]
    if rank_up:
        for item in rank_up:
            lines.append(
                f"- {item.get('곡명', 'Unknown')} / {item.get('아티스트', 'Unknown')} / 순위변동 {item.get('순위변동')}"
            )
    else:
        lines.append("- 데이터 없음")

    lines.extend(["", "[신규 진입]"])
    new_entries = highlights.get("new_entries", [])[:5]
    if new_entries:
        for item in new_entries:
            lines.append(
                f"- {item.get('곡명', 'Unknown')} / {item.get('아티스트', 'Unknown')} / 순위 {item.get('순위')}"
            )
    else:
        lines.append("- 데이터 없음")

    lines.extend(["", "[장르 변화]"])
    genre_changes = highlights.get("genre_changes", [])[:5]
    if genre_changes:
        for item in genre_changes:
            lines.append(f"- {item.get('장르', 'Unknown')}: {item.get('변화량', 0)}")
    else:
        lines.append("- 데이터 없음")

    return "\n".join(lines)


def _generate_with_openai(question: str, brief_text: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY 환경변수가 없습니다.")
    model_name = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": question},
            {"role": "user", "content": brief_text},
        ],
        temperature=0.3,
        max_tokens=800,
    )
    text = response.choices[0].message.content or ""
    if not text.strip():
        raise RuntimeError("OpenAI 응답 텍스트가 비어 있습니다.")
    return text


def run_report_generation(input_folder=".", output_folder="."):
    brief_json, json_file, report_date = _load_brief_json(input_folder)
    question, brief_text = _build_prompt(brief_json)
    out = os.path.join(output_folder, f"genie_report_{report_date}.txt")

    try:
        report_text = _generate_with_openai(question, brief_text)
        print(f"OpenAI 리포트 생성 성공: {json_file}")
    except Exception as e:
        report_text = _build_fallback_report(brief_json, f"{type(e).__name__}: {e}")
        print(f"OpenAI 리포트 생성 실패, 기본 리포트로 대체: {type(e).__name__} - {e}")

    with open(out, "w", encoding="utf-8-sig") as f:
        f.write(report_text.rstrip() + "\n")
    print(f"LLM 보고서 저장: {out}")


if __name__ == "__main__":
    run_report_generation(input_folder="data", output_folder="data")
