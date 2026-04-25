from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from backend.app.services.artifact_utils import format_snapshot_timestamp, list_artifacts

REQUIRED_COLS = [
    "순위",
    "곡명",
    "아티스트",
    "앨범명",
    "장르",
    "재생시간",
    "작사가",
    "작곡가",
    "편곡자",
    "좋아요",
    "전체 청취자수",
    "전체 재생수",
    "상세URL",
    "곡ID",
]

FINAL_COLS = [
    "분류",
    "곡ID",
    "곡명",
    "아티스트",
    "장르",
    "어제순위",
    "오늘순위",
    "순위변동",
    "어제좋아요",
    "오늘좋아요",
    "좋아요변동",
    "좋아요변화율(%)",
    "어제전체청취자수",
    "오늘전체청취자수",
    "청취자수변동",
    "청취자수변화율(%)",
    "어제전체재생수",
    "오늘전체재생수",
    "재생수변동",
    "재생수변화율(%)",
    "URL",
]


def find_latest_two(*folders: str | Path) -> tuple[tuple[datetime, Path], tuple[datetime, Path]]:
    directories = [Path(folder) for folder in folders]
    snapshots = list_artifacts(directories, "genie_top100_*.csv", "genie_top100_")
    if len(snapshots) < 2:
        raise FileNotFoundError("비교를 위해 지니 차트 CSV 2개 이상이 필요합니다.")
    return snapshots[-1], snapshots[-2]


def _to_int_safe(series: pd.Series) -> pd.Series:
    def parse(value):
        if pd.isna(value):
            return np.nan
        text = str(value).replace(",", "").strip()
        if not text:
            return np.nan
        try:
            return int(float(text))
        except Exception:
            return np.nan

    return series.map(parse)


def load_and_clean(path: str | Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = [col for col in REQUIRED_COLS if col not in df.columns]
    if missing:
        raise ValueError(f"{Path(path).name}에 필요한 컬럼이 없습니다: {missing}")
    df["곡ID"] = df["곡ID"].astype(str)
    df["순위"] = _to_int_safe(df["순위"])
    df["좋아요"] = _to_int_safe(df["좋아요"])
    df["전체 청취자수"] = _to_int_safe(df["전체 청취자수"])
    df["전체 재생수"] = _to_int_safe(df["전체 재생수"])
    return df


def safe_pct_change(old, new):
    if pd.isna(old) or old == 0:
        return np.nan
    return (new - old) / old * 100.0


def build_diff(today: pd.DataFrame, yesterday: pd.DataFrame) -> pd.DataFrame:
    common = today.merge(yesterday, on="곡ID", suffixes=("_오늘", "_어제"))
    new = today.loc[~today["곡ID"].isin(yesterday["곡ID"])].copy()
    dropped = yesterday.loc[~yesterday["곡ID"].isin(today["곡ID"])].copy()

    common["순위변동"] = common["순위_어제"] - common["순위_오늘"]
    common["좋아요변동"] = common["좋아요_오늘"] - common["좋아요_어제"]
    common["청취자수변동"] = common["전체 청취자수_오늘"] - common["전체 청취자수_어제"]
    common["재생수변동"] = common["전체 재생수_오늘"] - common["전체 재생수_어제"]
    common["좋아요변화율(%)"] = [safe_pct_change(o, n) for o, n in zip(common["좋아요_어제"], common["좋아요_오늘"])]
    common["청취자수변화율(%)"] = [
        safe_pct_change(o, n) for o, n in zip(common["전체 청취자수_어제"], common["전체 청취자수_오늘"])
    ]
    common["재생수변화율(%)"] = [
        safe_pct_change(o, n) for o, n in zip(common["전체 재생수_어제"], common["전체 재생수_오늘"])
    ]
    for col in ("좋아요변화율(%)", "청취자수변화율(%)", "재생수변화율(%)"):
        common[col] = common[col].round(2)

    kept = pd.DataFrame(
        {
            "분류": "유지",
            "곡ID": common["곡ID"],
            "곡명": common["곡명_오늘"],
            "아티스트": common["아티스트_오늘"],
            "장르": common["장르_오늘"],
            "어제순위": common["순위_어제"],
            "오늘순위": common["순위_오늘"],
            "순위변동": common["순위변동"],
            "어제좋아요": common["좋아요_어제"],
            "오늘좋아요": common["좋아요_오늘"],
            "좋아요변동": common["좋아요변동"],
            "좋아요변화율(%)": common["좋아요변화율(%)"],
            "어제전체청취자수": common["전체 청취자수_어제"],
            "오늘전체청취자수": common["전체 청취자수_오늘"],
            "청취자수변동": common["청취자수변동"],
            "청취자수변화율(%)": common["청취자수변화율(%)"],
            "어제전체재생수": common["전체 재생수_어제"],
            "오늘전체재생수": common["전체 재생수_오늘"],
            "재생수변동": common["재생수변동"],
            "재생수변화율(%)": common["재생수변화율(%)"],
            "URL": common["상세URL_오늘"].fillna(common["상세URL_어제"]),
        }
    )
    new_rows = pd.DataFrame(
        {
            "분류": "신규진입",
            "곡ID": new["곡ID"],
            "곡명": new["곡명"],
            "아티스트": new["아티스트"],
            "장르": new["장르"],
            "어제순위": np.nan,
            "오늘순위": new["순위"],
            "순위변동": np.nan,
            "어제좋아요": np.nan,
            "오늘좋아요": new["좋아요"],
            "좋아요변동": np.nan,
            "좋아요변화율(%)": np.nan,
            "어제전체청취자수": np.nan,
            "오늘전체청취자수": new["전체 청취자수"],
            "청취자수변동": np.nan,
            "청취자수변화율(%)": np.nan,
            "어제전체재생수": np.nan,
            "오늘전체재생수": new["전체 재생수"],
            "재생수변동": np.nan,
            "재생수변화율(%)": np.nan,
            "URL": new["상세URL"],
        }
    )
    dropped_rows = pd.DataFrame(
        {
            "분류": "차트이탈",
            "곡ID": dropped["곡ID"],
            "곡명": dropped["곡명"],
            "아티스트": dropped["아티스트"],
            "장르": dropped["장르"],
            "어제순위": dropped["순위"],
            "오늘순위": np.nan,
            "순위변동": np.nan,
            "어제좋아요": dropped["좋아요"],
            "오늘좋아요": np.nan,
            "좋아요변동": np.nan,
            "좋아요변화율(%)": np.nan,
            "어제전체청취자수": dropped["전체 청취자수"],
            "오늘전체청취자수": np.nan,
            "청취자수변동": np.nan,
            "청취자수변화율(%)": np.nan,
            "어제전체재생수": dropped["전체 재생수"],
            "오늘전체재생수": np.nan,
            "재생수변동": np.nan,
            "재생수변화율(%)": np.nan,
            "URL": dropped["상세URL"],
        }
    )

    diff_rows = pd.concat([new_rows, dropped_rows, kept], ignore_index=True)
    genre_today = today["장르"].value_counts()
    genre_yest = yesterday["장르"].value_counts()
    genre_diff = (genre_today - genre_yest).fillna(0).astype(int).sort_values(ascending=False)
    if not genre_diff.empty:
        genre_summary = pd.DataFrame(
            {
                "분류": "장르요약",
                "곡ID": "",
                "곡명": genre_diff.index,
                "아티스트": "",
                "장르": "",
                "어제순위": np.nan,
                "오늘순위": np.nan,
                "순위변동": genre_diff.values,
                "어제좋아요": np.nan,
                "오늘좋아요": np.nan,
                "좋아요변동": np.nan,
                "좋아요변화율(%)": np.nan,
                "어제전체청취자수": np.nan,
                "오늘전체청취자수": np.nan,
                "청취자수변동": np.nan,
                "청취자수변화율(%)": np.nan,
                "어제전체재생수": np.nan,
                "오늘전체재생수": np.nan,
                "재생수변동": np.nan,
                "재생수변화율(%)": np.nan,
                "URL": "",
            }
        )
        diff_rows = pd.concat([diff_rows, genre_summary], ignore_index=True)

    sort_key = pd.Categorical(
        diff_rows["분류"],
        categories=["신규진입", "차트이탈", "유지", "장르요약"],
        ordered=True,
    )
    diff_rows = (
        diff_rows.assign(_cat=sort_key)
        .sort_values(by=["_cat", "순위변동", "오늘순위", "어제순위"], ascending=[True, False, True, True])
        .drop(columns=["_cat"])
        .reset_index(drop=True)
    )
    return diff_rows[[col for col in FINAL_COLS if col in diff_rows.columns]]


def _pick_top_k(df: pd.DataFrame, sort_col: str, k: int = 10, descending: bool = True) -> list[dict]:
    artist_col = "А티스트" if "А티스트" in df.columns else "아티스트"
    cols = [
        "곡명",
        artist_col,
        "장르",
        "어제순위",
        "오늘순위",
        "순위변동",
        "좋아요변화율(%)",
        "청취자수변화율(%)",
        "재생수변화율(%)",
    ]
    cols = [col for col in cols if col in df.columns]
    return df.sort_values(sort_col, ascending=not descending)[cols].head(k).to_dict(orient="records")


def make_llm_brief(
    diff_df: pd.DataFrame,
    current_timestamp: datetime,
    previous_timestamp: datetime,
    big_rank: int = 10,
    big_pct: float = 10.0,
    top_k: int = 10,
) -> dict:
    is_new = diff_df["분류"] == "신규진입"
    is_drop = diff_df["분류"] == "차트이탈"
    is_keep = diff_df["분류"] == "유지"
    is_genre = diff_df["분류"] == "장르요약"

    keep = diff_df[is_keep].copy()
    keep["abs_rank"] = keep["순위변동"].abs()
    for target, source in {
        "abs_like": "좋아요변화율(%)",
        "abs_listen": "청취자수변화율(%)",
        "abs_play": "재생수변화율(%)",
    }.items():
        keep[target] = keep[source].abs() if source in keep.columns else pd.Series([], dtype=float)

    big_move = keep[
        (keep["abs_rank"] >= big_rank)
        | (keep["abs_like"] >= big_pct)
        | (keep["abs_listen"] >= big_pct)
        | (keep["abs_play"] >= big_pct)
    ]

    if is_genre.any():
        genre = diff_df[is_genre][["곡명", "순위변동"]].rename(columns={"곡명": "장르", "순위변동": "변화량"})
        genre_changes = genre[genre["변화량"] != 0].sort_values("변화량", ascending=False).to_dict(orient="records")
    else:
        genre_changes = []

    new_brief = (
        diff_df[is_new][["곡명", "아티스트", "오늘순위"]]
        .rename(columns={"오늘순위": "순위"})
        .sort_values("순위", ascending=True)
        .to_dict(orient="records")
    )
    drop_brief = (
        diff_df[is_drop][["곡명", "아티스트", "어제순위"]]
        .rename(columns={"어제순위": "순위"})
        .sort_values("순위", ascending=True)
        .to_dict(orient="records")
    )

    return {
        "meta": {
            "date": current_timestamp.strftime("%Y-%m-%d"),
            "current_timestamp": current_timestamp.isoformat(),
            "previous_timestamp": previous_timestamp.isoformat(),
            "rules": {"big_rank_abs": big_rank, "big_pct_abs": big_pct, "top_k": top_k},
            "counts": {
                "new": int(is_new.sum()),
                "dropped": int(is_drop.sum()),
                "kept": int(is_keep.sum()),
                "genre_changes_nonzero": int(len(genre_changes)),
                "big_moves": int(len(big_move)),
            },
        },
        "highlights": {
            "genre_changes": genre_changes,
            "new_entries": new_brief[:top_k],
            "dropouts": drop_brief[:top_k],
            "rank_up": _pick_top_k(keep[keep["순위변동"] > 0], "순위변동", top_k, True),
            "rank_down": _pick_top_k(keep[keep["순위변동"] < 0], "순위변동", top_k, False),
            "like_growth": _pick_top_k(keep.dropna(subset=["좋아요변화율(%)"]), "좋아요변화율(%)", top_k, True),
            "like_drop": _pick_top_k(keep.dropna(subset=["좋아요변화율(%)"]), "좋아요변화율(%)", top_k, False),
            "listener_growth": _pick_top_k(keep.dropna(subset=["청취자수변화율(%)"]), "청취자수변화율(%)", top_k, True),
            "listener_drop": _pick_top_k(keep.dropna(subset=["청취자수변화율(%)"]), "청취자수변화율(%)", top_k, False),
            "play_growth": _pick_top_k(keep.dropna(subset=["재생수변화율(%)"]), "재생수변화율(%)", top_k, True),
            "play_drop": _pick_top_k(keep.dropna(subset=["재생수변화율(%)"]), "재생수변화율(%)", top_k, False),
        },
    }


def run_diff_analysis(
    input_folder: str | Path,
    output_folder: str | Path,
    archive_folder: str | Path | None = None,
) -> tuple[Path, Path]:
    input_dir = Path(input_folder)
    output_dir = Path(output_folder)
    archive_dir = Path(archive_folder) if archive_folder else None
    output_dir.mkdir(parents=True, exist_ok=True)

    search_dirs: list[Path] = [input_dir]
    if archive_dir:
        search_dirs.append(archive_dir)

    (current_timestamp, today_path), (previous_timestamp, yday_path) = find_latest_two(*search_dirs)
    today = load_and_clean(today_path)
    yday = load_and_clean(yday_path)
    diff_df = build_diff(today, yday)

    timestamp_text = format_snapshot_timestamp(current_timestamp)
    diff_path = output_dir / f"genie_diff_{timestamp_text}.csv"
    brief_path = output_dir / f"genie_diff_brief_{timestamp_text}.json"
    diff_df.to_csv(diff_path, index=False, encoding="utf-8-sig")
    with open(brief_path, "w", encoding="utf-8") as file:
        json.dump(
            make_llm_brief(diff_df, current_timestamp=current_timestamp, previous_timestamp=previous_timestamp),
            file,
            ensure_ascii=False,
            indent=2,
        )
    return diff_path, brief_path
