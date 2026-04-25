from __future__ import annotations

import glob
import json
from datetime import datetime
from pathlib import Path

from openai import OpenAI

from backend.app.core.config import Settings


def _find_latest_brief_json(input_folder: Path) -> Path:
    preferred = input_folder / f"genie_diff_brief_{datetime.today().strftime('%Y-%m-%d')}.json"
    if preferred.exists():
        return preferred
    candidates = glob.glob(str(input_folder / "genie_diff_brief_*.json"))
    if not candidates:
        raise FileNotFoundError(f"LLM 리포트 입력 파일이 없습니다: {input_folder}")
    return Path(max(candidates, key=lambda item: Path(item).stat().st_mtime))


def _build_prompt(brief_json: dict) -> tuple[str, str]:
    question = """당신은 음악 차트 애널리스트입니다.
참조된 JSON은 전날 대비 오늘의 지니 차트 변화 요약(숫자 계산 완료)입니다.
- 새로운 산술 계산은 하지 말고, 제공된 수치를 근거로 해석하세요.
- 큰 변화 기준: abs(순위변동) >= 10 또는 변화율 >= 10%.
- 큰 변화가 없다면 큰 변화 없음이라고 명시하세요.
- 신규/이탈/장르 변화의 맥락은 필요시 추정임을 밝히고 설명하세요.
- 결과는 한국어로, 짧은 단락과 불릿 위주로 정리하세요."""
    return question, json.dumps(brief_json, ensure_ascii=False, indent=2)


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
    for item in highlights.get("rank_up", [])[:5] or []:
        lines.append(f"- {item.get('곡명', 'Unknown')} / {item.get('아티스트', 'Unknown')} / 순위변동 {item.get('순위변동')}")
    lines.extend(["", "[신규 진입]"])
    for item in highlights.get("new_entries", [])[:5] or []:
        lines.append(f"- {item.get('곡명', 'Unknown')} / {item.get('아티스트', 'Unknown')} / 순위 {item.get('순위')}")
    lines.extend(["", "[장르 변화]"])
    for item in highlights.get("genre_changes", [])[:5] or []:
        lines.append(f"- {item.get('장르', 'Unknown')}: {item.get('변화량', 0)}")
    return "\n".join(lines)


def generate_report(settings: Settings, input_folder: Path, output_folder: Path) -> Path:
    json_path = _find_latest_brief_json(input_folder)
    with open(json_path, "r", encoding="utf-8") as file:
        brief_json = json.load(file)

    report_date = brief_json.get("meta", {}).get("date") or json_path.stem.replace("genie_diff_brief_", "")
    output_path = output_folder / f"genie_report_{report_date}.txt"

    try:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY 환경변수가 없습니다.")
        client = OpenAI(api_key=settings.openai_api_key)
        system_prompt, user_prompt = _build_prompt(brief_json)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=900,
        )
        report_text = (response.choices[0].message.content or "").strip()
        if not report_text:
            raise RuntimeError("OpenAI 응답 텍스트가 비어 있습니다.")
    except Exception as exc:
        report_text = _build_fallback_report(brief_json, f"{type(exc).__name__}: {exc}")

    with open(output_path, "w", encoding="utf-8-sig") as file:
        file.write(report_text.rstrip() + "\n")
    return output_path

