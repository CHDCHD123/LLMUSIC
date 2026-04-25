import pandas as pd

# 지니차트 변화 요약 코드
import glob
import os
from datetime import datetime
import json

import numpy as np
import pandas as pd


REQUIRED_COLS = [
    "순위","곡명","아티스트","앨범명","장르","재생시간",
    "작사가","작곡가","편곡자","좋아요","전체 청취자수","전체 재생수","상세URL","곡ID"
]

# === 최종 저장 컬럼(필요 최소 + 단일 URL) ===
FINAL_COLS = [
    "분류","곡ID","곡명","아티스트","장르",
    "어제순위","오늘순위","순위변동",
    "어제좋아요","오늘좋아요","좋아요변동","좋아요변화율(%)",
    "어제전체청취자수","오늘전체청취자수","청취자수변동","청취자수변화율(%)",
    "어제전체재생수","오늘전체재생수","재생수변동","재생수변화율(%)",
    "URL"  # ← 단일 URL
]


def find_latest_two(folder: str):
    files = glob.glob(os.path.join(folder, "genie_top100_*.csv"))
    if len(files) < 2:
        raise FileNotFoundError("최신 CSV 2개 이상이 필요합니다. 폴더를 확인하세요.")
    # 파일명에서 날짜 추출해 정렬
    files_sorted = sorted(
        files,
        key=lambda x: datetime.strptime(
            os.path.basename(x).replace("genie_top100_", "").replace(".csv", ""),
            "%Y-%m-%d"
        )
    )
    return files_sorted[-1], files_sorted[-2]  # (오늘, 어제)


def _to_int_safe(series: pd.Series):
    def _parse(x):
        if pd.isna(x):
            return np.nan
        s = str(x).replace(",", "").strip()
        if s == "":
            return np.nan
        try:
            return int(float(s))
        except Exception:
            return np.nan
    return series.map(_parse)


def load_and_clean(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"{os.path.basename(path)}에 필요한 컬럼이 없습니다: {missing}")
    # 타입 정리
    df["곡ID"] = df["곡ID"].astype(str)
    df["순위"] = _to_int_safe(df["순위"])
    df["좋아요"] = _to_int_safe(df["좋아요"])
    df["전체 청취자수"] = _to_int_safe(df["전체 청취자수"])
    df["전체 재생수"] = _to_int_safe(df["전체 재생수"])
    return df


def safe_pct_change(old, new):
    """(new-old)/old * 100, 0/NaN 대비"""
    if pd.isna(old) or old == 0:
        return np.nan
    return (new - old) / old * 100.0


def build_diff(today: pd.DataFrame, yesterday: pd.DataFrame) -> pd.DataFrame:
    key = "곡ID"
    # 공통 / 신규 / 이탈
    common = today.merge(yesterday, on=key, suffixes=("_오늘", "_어제"))
    new = today.loc[~today[key].isin(yesterday[key])].copy()
    dropped = yesterday.loc[~yesterday[key].isin(today[key])].copy()

    # 공통 곡: 변화량/변화율
    common["순위변동"] = common["순위_어제"] - common["순위_오늘"]  # +면 상승
    common["좋아요변동"] = common["좋아요_오늘"] - common["좋아요_어제"]
    common["청취자수변동"] = common["전체 청취자수_오늘"] - common["전체 청취자수_어제"]
    common["재생수변동"] = common["전체 재생수_오늘"] - common["전체 재생수_어제"]

    common["좋아요변화율(%)"] = [
        safe_pct_change(o, n) for o, n in zip(common["좋아요_어제"], common["좋아요_오늘"])
    ]
    common["청취자수변화율(%)"] = [
        safe_pct_change(o, n) for o, n in zip(common["전체 청취자수_어제"], common["전체 청취자수_오늘"])
    ]
    common["재생수변화율(%)"] = [
        safe_pct_change(o, n) for o, n in zip(common["전체 재생수_어제"], common["전체 재생수_오늘"])
    ]
    for col in ["좋아요변화율(%)","청취자수변화율(%)","재생수변화율(%)"]:
        common[col] = common[col].round(2)

    # ===== 행 구성: 단일 URL 채우기 (오늘 우선, 없으면 어제) =====
    kept = pd.DataFrame({
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
    })

    new_rows = pd.DataFrame({
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
        "URL": new["상세URL"],   # 오늘 URL
    })

    dropped_rows = pd.DataFrame({
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
        "URL": dropped["상세URL"],  # 어제 URL
    })

    diff_rows = pd.concat([new_rows, dropped_rows, kept], ignore_index=True)

    # ===== 장르 변화 요약 (단일 URL은 공란) =====
    genre_today = today["장르"].value_counts()
    genre_yest = yesterday["장르"].value_counts()
    genre_diff = (genre_today - genre_yest).fillna(0).astype(int).sort_values(ascending=False)

    if not genre_diff.empty:
        add = pd.DataFrame({
            "분류": "장르요약",
            "곡ID": "",
            "곡명": genre_diff.index,     # 장르명 표기용
            "아티스트": "",
            "장르": "",
            "어제순위": np.nan,
            "오늘순위": np.nan,
            "순위변동": genre_diff.values,  # 장르별 곡수 변화량
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
        })
        diff_rows = pd.concat([diff_rows, add], ignore_index=True)

    # 정렬: 신규진입 → 차트이탈 → 유지 → 장르요약
    sort_key = pd.Categorical(
        diff_rows["분류"],
        categories=["신규진입","차트이탈","유지","장르요약"],
        ordered=True
    )
    diff_rows = diff_rows.assign(_cat=sort_key).sort_values(
        by=["_cat","순위변동","오늘순위","어제순위"], ascending=[True, False, True, True]
    ).drop(columns=["_cat"]).reset_index(drop=True)

    # 최종: 필요한 컬럼만 남김
    keep = [c for c in FINAL_COLS if c in diff_rows.columns]
    return diff_rows[keep]


# -----------------------
# LLM 브리프(초압축 JSON)
# -----------------------

def _pick_top_k(df, sort_col, k=10, descending=True, extra_cols=None):
    extra_cols = extra_cols or []
    cols = ["곡명","А티스트" if "А티스트" in df.columns else "아티스트","장르",
            "어제순위","오늘순위","순위변동",
            "좋아요변화율(%)","청취자수변화율(%)","재생수변화율(%)"]
    cols = [c for c in cols + extra_cols if c in df.columns]
    dd = df.sort_values(sort_col, ascending=not descending)
    dd = dd[cols].head(k)
    return dd.to_dict(orient="records")

def make_llm_brief(diff_df: pd.DataFrame,
                   big_rank=10,
                   big_pct=10.0,
                   top_k=10) -> dict:
    # 섹션 구분
    is_new = diff_df["분류"] == "신규진입"
    is_drop = diff_df["분류"] == "차트이탈"
    is_keep = diff_df["분류"] == "유지"
    is_genre = diff_df["분류"] == "장르요약"

    keep = diff_df[is_keep].copy()
    # 큰 변화 조건
    def _abscol(df, c): 
        col = c if c in df.columns else None
        return df[col].abs() if col else pd.Series([], dtype=float)
    keep["abs_rank"] = keep["순위변동"].abs()
    keep["abs_like"] = _abscol(keep, "좋아요변화율(%)")
    keep["abs_listen"] = _abscol(keep, "청취자수변화율(%)")
    keep["abs_play"] = _abscol(keep, "재생수변화율(%)")

    big_move = keep[
        (keep["abs_rank"] >= big_rank) |
        (keep["abs_like"] >= big_pct) |
        (keep["abs_listen"] >= big_pct) |
        (keep["abs_play"] >= big_pct)
    ]

    # 장르 변화(0 아닌 것만)
    if is_genre.any():
        genre = diff_df[is_genre][["곡명","순위변동"]].rename(
            columns={"곡명":"장르","순위변동":"변화량"}
        )
        genre = genre[genre["변화량"] != 0].sort_values("변화량", ascending=False)
        genre_changes = genre.to_dict(orient="records")
    else:
        genre_changes = []

    # 신규/이탈 요약(최소 정보)
    new_brief = diff_df[is_new][["곡명","아티스트","오늘순위"]].rename(
        columns={"오늘순위":"순위"}
    ).sort_values("순위", ascending=True).to_dict(orient="records")

    drop_brief = diff_df[is_drop][["곡명","아티스트","어제순위"]].rename(
        columns={"어제순위":"순위"}
    ).sort_values("순위", ascending=True).to_dict(orient="records")

    # TOP 리스트
    top_rank_up = _pick_top_k(keep[keep["순위변동"] > 0], "순위변동", k=top_k, descending=True)
    top_rank_down = _pick_top_k(keep[keep["순위변동"] < 0], "순위변동", k=top_k, descending=False)

    top_like_up = _pick_top_k(keep.dropna(subset=["좋아요변화율(%)"]), "좋아요변화율(%)", k=top_k, descending=True)
    top_like_down = _pick_top_k(keep.dropna(subset=["좋아요변화율(%)"]), "좋아요변화율(%)", k=top_k, descending=False)

    top_listen_up = _pick_top_k(keep.dropna(subset=["청취자수변화율(%)"]), "청취자수변화율(%)", k=top_k, descending=True)
    top_listen_down = _pick_top_k(keep.dropna(subset=["청취자수변화율(%)"]), "청취자수변화율(%)", k=top_k, descending=False)

    top_play_up = _pick_top_k(keep.dropna(subset=["재생수변화율(%)"]), "재생수변화율(%)", k=top_k, descending=True)
    top_play_down = _pick_top_k(keep.dropna(subset=["재생수변화율(%)"]), "재생수변화율(%)", k=top_k, descending=False)

    brief = {
        "meta": {
            "date": datetime.today().strftime("%Y-%m-%d"),
            "rules": {
                "big_rank_abs": big_rank,
                "big_pct_abs": big_pct,
                "top_k": top_k
            },
            "counts": {
                "new": int(is_new.sum()),
                "dropped": int(is_drop.sum()),
                "kept": int(is_keep.sum()),
                "genre_changes_nonzero": int(len(genre_changes)),
                "big_moves": int(len(big_move)),
            }
        },
        "highlights": {
            "genre_changes": genre_changes,
            "new_entries": new_brief[:top_k],
            "dropouts": drop_brief[:top_k],
            "rank_up": top_rank_up,
            "rank_down": top_rank_down,
            "like_growth": top_like_up,
            "like_drop": top_like_down,
            "listener_growth": top_listen_up,
            "listener_drop": top_listen_down,
            "play_growth": top_play_up,
            "play_drop": top_play_down,
        }
    }
    return brief


def save_llm_brief(diff_df: pd.DataFrame, folder: str, big_rank=10, big_pct=10.0, top_k=10):
    brief = make_llm_brief(diff_df, big_rank=big_rank, big_pct=big_pct, top_k=top_k)
    out_json = os.path.join(folder, f"genie_diff_brief_{brief['meta']['date']}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(brief, f, ensure_ascii=False, indent=2)
    print(f"✅ LLM 브리프 저장: {out_json}")


def main(folder: str):
    today_path, yday_path = find_latest_two(folder)
    today = load_and_clean(today_path)
    yday = load_and_clean(yday_path)

    out_name = f"genie_diff_{datetime.today().strftime('%Y-%m-%d')}.csv"
    out_path = os.path.join(folder, out_name)

    diff_df = build_diff(today, yday)
    diff_df.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"✅ 비교 diff (필요 컬럼 + 단일 URL) 저장: {out_path} (rows={len(diff_df)})")

    # LLM 요약본(JSON) 저장
    save_llm_brief(diff_df, folder, big_rank=10, big_pct=10.0, top_k=10)

    print(diff_df.head(10))

def run_diff_analysis(input_folder=".", output_folder="."):
    today_path, yday_path = find_latest_two(input_folder)
    today = load_and_clean(today_path)
    yday = load_and_clean(yday_path)

    out_name = f"genie_diff_{datetime.today().strftime('%Y-%m-%d')}.csv"
    out_path = os.path.join(output_folder, out_name)

    diff_df = build_diff(today, yday)
    diff_df.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"✅ 비교 diff (필요 컬럼 + 단일 URL) 저장: {out_path} (rows={len(diff_df)})")

    # LLM 요약본(JSON) 저장
    save_llm_brief(diff_df, output_folder, big_rank=10, big_pct=10.0, top_k=10)

    print(diff_df.head(10))


if __name__ == "__main__":
    # import sys
    # if "ipykernel" in sys.modules:  # 주피터/노트북
    #     folder = "."
    #     run_diff_analysis(folder)
    # else:  # 터미널 실행
    #     import argparse
    #     parser = argparse.ArgumentParser()
    #     parser.add_argument("--folder", type=str, default=".", help="CSV가 저장된 폴더 경로")
    #     args = parser.parse_args()
    #     run_diff_analysis(args.folder)
    run_diff_analysis(input_folder="data")