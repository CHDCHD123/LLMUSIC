from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from openai import OpenAI

from backend.app.core.config import Settings
from backend.app.services.artifact_utils import format_elapsed, format_snapshot_timestamp, list_artifacts


def _find_latest_brief_json(input_folder: Path, archive_folder: Path | None = None) -> tuple[datetime, Path]:
    directories = [input_folder]
    if archive_folder is not None:
        directories.append(archive_folder)
    candidates = list_artifacts(directories, "genie_diff_brief_*.json", "genie_diff_brief_")
    if not candidates:
        raise FileNotFoundError(f"LLM 리포트 입력 파일이 없습니다: {input_folder}")
    return candidates[-1]


def _find_previous_brief_json(
    current_timestamp: datetime,
    current_path: Path,
    input_folder: Path,
    archive_folder: Path | None = None,
) -> tuple[datetime, Path] | None:
    directories = [input_folder]
    if archive_folder is not None:
        directories.append(archive_folder)
    candidates = list_artifacts(directories, "genie_diff_brief_*.json", "genie_diff_brief_")
    previous = [(timestamp, path) for timestamp, path in candidates if (timestamp, path) != (current_timestamp, current_path)]
    previous = [item for item in previous if item[0] < current_timestamp]
    return previous[-1] if previous else None


def _find_previous_report(
    current_timestamp: datetime,
    input_folder: Path,
    archive_folder: Path | None = None,
) -> tuple[datetime, Path] | None:
    directories = [input_folder]
    if archive_folder is not None:
        directories.append(archive_folder)
    candidates = list_artifacts(directories, "genie_report_*.txt", "genie_report_")
    previous = [item for item in candidates if item[0] < current_timestamp]
    return previous[-1] if previous else None


def _build_context_header(
    current_timestamp: datetime,
    previous_timestamp: datetime | None,
    previous_report_timestamp: datetime | None,
) -> str:
    lines = [
        "[리포트 안내]",
        f"- 현재 분석 시각: {current_timestamp.strftime('%Y-%m-%d %H:%M:%S')}",
    ]
    if previous_timestamp is not None:
        elapsed = format_elapsed(current_timestamp - previous_timestamp)
        lines.append(f"- 직전 차트 비교 시각: {previous_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"- 직전 차트 대비 경과 시간: {elapsed}")
    else:
        lines.append("- 직전 차트 비교 시각: 없음")
        lines.append("- 직전 차트 대비 경과 시간: 첫 리포트이므로 비교 기준 없음")
    if previous_report_timestamp is not None:
        elapsed = format_elapsed(current_timestamp - previous_report_timestamp)
        lines.append(f"- 마지막 리포트 시각: {previous_report_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"- 마지막 리포트 이후 경과 시간: {elapsed}")
    else:
        lines.append("- 마지막 리포트 시각: 없음")
        lines.append("- 마지막 리포트 이후 경과 시간: 첫 리포트이므로 이전 리포트 없음")
    return "\n".join(lines)


def _build_prompt(brief_json: dict, previous_brief_json: dict | None, context_header: str) -> tuple[str, str]:
    question = """당신은 음악 차트 애널리스트입니다.
참조된 JSON은 지니 차트 변화 요약입니다.
- 새로운 산술 계산은 하지 말고 제공된 수치만 근거로 해석하세요.
- 리포트 첫머리에서 현재 분석 시각, 직전 비교 시각, 경과 시간을 짧게 안내하세요.
- 직전 리포트 또는 직전 브리프와 간격이 길거나 짧으면 그 해석상의 주의점을 함께 적으세요.
- 큰 변화 기준: abs(순위변동) >= 10 또는 변화율 >= 10%.
- 큰 변화가 없다면 큰 변화 없음이라고 명시하세요.
- 신규/이탈/장르 변화의 맥락은 필요시 추정임을 밝히고 설명하세요.
- 결과는 한국어로, 짧은 단락과 불릿 위주로 정리하세요."""
    payload = {
        "report_context": context_header,
        "current_brief": brief_json,
        "previous_brief": previous_brief_json,
    }
    return question, json.dumps(payload, ensure_ascii=False, indent=2)


def _build_fallback_report(
    brief_json: dict,
    reason: str,
    context_header: str,
    previous_brief_json: dict | None,
) -> str:
    meta = brief_json.get("meta", {})
    highlights = brief_json.get("highlights", {})
    counts = meta.get("counts", {})
    previous_counts = (previous_brief_json or {}).get("meta", {}).get("counts", {})
    lines = [
        context_header,
        "",
        "[자동 생성 기본 리포트]",
        f"- 생성일: {meta.get('date', 'unknown')}",
        f"- 사유: {reason}",
        "",
        "[요약]",
        f"- 신규 진입: {counts.get('new', 0)}곡",
        f"- 차트 이탈: {counts.get('dropped', 0)}곡",
        f"- 유지 곡: {counts.get('kept', 0)}곡",
        f"- 큰 변화 곡: {counts.get('big_moves', 0)}곡",
    ]
    if previous_counts:
        lines.extend(
            [
                "",
                "[직전 리포트 대비 참고]",
                f"- 직전 신규 진입: {previous_counts.get('new', 0)}곡",
                f"- 직전 차트 이탈: {previous_counts.get('dropped', 0)}곡",
                f"- 직전 큰 변화 곡: {previous_counts.get('big_moves', 0)}곡",
            ]
        )
    lines.extend(["", "[상승 상위]"])
    for item in highlights.get("rank_up", [])[:5] or []:
        lines.append(
            f"- {item.get('곡명', 'Unknown')} / {item.get('아티스트', 'Unknown')} / 순위변동 {item.get('순위변동')}"
        )
    lines.extend(["", "[신규 진입]"])
    for item in highlights.get("new_entries", [])[:5] or []:
        lines.append(f"- {item.get('곡명', 'Unknown')} / {item.get('아티스트', 'Unknown')} / 순위 {item.get('순위')}")
    lines.extend(["", "[장르 변화]"])
    for item in highlights.get("genre_changes", [])[:5] or []:
        lines.append(f"- {item.get('장르', 'Unknown')}: {item.get('변화량', 0)}")
    return "\n".join(lines)


def generate_report(settings: Settings, input_folder: Path, output_folder: Path) -> Path:
    current_timestamp, json_path = _find_latest_brief_json(input_folder, settings.archive_dir)
    with open(json_path, "r", encoding="utf-8") as file:
        brief_json = json.load(file)

    previous_brief_info = _find_previous_brief_json(current_timestamp, json_path, input_folder, settings.archive_dir)
    previous_brief_json = None
    previous_timestamp = None
    if previous_brief_info is not None:
        previous_timestamp, previous_path = previous_brief_info
        with open(previous_path, "r", encoding="utf-8") as file:
            previous_brief_json = json.load(file)

    previous_report_info = _find_previous_report(current_timestamp, input_folder, settings.archive_dir)
    previous_report_timestamp = previous_report_info[0] if previous_report_info else None

    context_header = _build_context_header(current_timestamp, previous_timestamp, previous_report_timestamp)
    output_path = output_folder / f"genie_report_{format_snapshot_timestamp(current_timestamp)}.txt"

    try:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY 환경변수가 없습니다.")
        client = OpenAI(api_key=settings.openai_api_key)
        system_prompt, user_prompt = _build_prompt(brief_json, previous_brief_json, context_header)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1100,
        )
        report_text = (response.choices[0].message.content or "").strip()
        if not report_text:
            raise RuntimeError("OpenAI 응답 텍스트가 비어 있습니다.")
        if not report_text.startswith("[리포트 안내]"):
            report_text = f"{context_header}\n\n{report_text}"
    except Exception as exc:
        report_text = _build_fallback_report(brief_json, f"{type(exc).__name__}: {exc}", context_header, previous_brief_json)

    with open(output_path, "w", encoding="utf-8-sig") as file:
        file.write(report_text.rstrip() + "\n")
    return output_path
