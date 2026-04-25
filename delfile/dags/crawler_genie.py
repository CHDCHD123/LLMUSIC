# 지니차트 크롤링 코드
import time, re
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import os

ROOT = "https://www.genie.co.kr"
CHART = f"{ROOT}/chart/top200"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Referer": "https://www.genie.co.kr/",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

def text_or_blank(el):
    return el.get_text(" ", strip=True) if el else ""

def texts_join(els):
    return ", ".join(e.get_text(" ", strip=True) for e in els) if els else ""

def to_int_from_text(s):
    if not s: return None
    s = s.replace(",", "")
    nums = re.findall(r"\d+", s)
    return int("".join(nums)) if nums else None

def extract_song_id(tr):
    """
    tr 행에서 곡ID 추출
    1. tr의 songid 속성에서 직접 추출
    2. onclick에서 fnViewSongInfo 함수의 매개변수 추출
    """
    # 1. tr 태그의 songid 속성 확인 (가장 확실한 방법)
    songid = tr.get("songid")
    if songid:
        return songid
    
    # 2. onclick에서 fnViewSongInfo('숫자') 추출
    a = tr.select_one("td.link > a")
    if a:
        onclick = (a.get("onclick") or "").strip()
        m = re.search(r"fnViewSongInfo\('(\d+)'\)", onclick)
        if m:
            return m.group(1)
    
    # 3. 전체 HTML에서 songid 추출 (백업)
    html = str(tr)
    m = re.search(r'songid="(\d+)"', html)
    if m:
        return m.group(1)

    return None

def fetch_chart_page(pg):
    """차트 페이지(pg=1,2)에서 순위/곡명/아티스트/곡ID/상세URL 수집"""
    print(f"차트 페이지 {pg} 수집 중...")
    r = requests.get(CHART, headers=HEADERS, params={"pg": pg}, timeout=10)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    table = soup.select_one("#body-content div.newest-list > div > table")
    if not table:
        return []

    rows = table.select("tbody > tr")
    items = []
    for idx, tr in enumerate(rows):
        # 곡명, 아티스트, 상세 버튼
        title_el  = tr.select_one("a.title.ellipsis")
        artist_el = tr.select_one("a.artist.ellipsis") or tr.select_one("a.artist")
        link_a = tr.select_one("td.link > a")
        if not title_el or not link_a:
            continue
        rank   = (pg - 1) * 50 + (idx + 1)
        title  = text_or_blank(title_el)
        artist = text_or_blank(artist_el)
        song_id = extract_song_id(tr)
        if not song_id:
            continue
        detail_url = f"{ROOT}/detail/songInfo?xgnm={song_id}"
        items.append({
            "순위": rank,
            "곡명": title,
            "아티스트": artist,
            "곡ID": song_id,
            "상세URL": detail_url,
        })
    print(f"페이지 {pg}에서 {len(items)}개 곡 수집 완료")
    return items

def fetch_detail(detail_url, rank):
    """상세페이지에서 지정 셀렉터로 필드 수집 (값 없으면 공란/None)"""
    print(f"{rank}위 곡 상세 정보 수집 중...")
    try:
        r = requests.get(detail_url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except Exception as e:
        print(f"  ⚠️  {rank}위 곡 상세 정보 수집 실패: {e}")
        return {
            "앨범명": "", "장르": "", "재생시간": "",
            "작사가": "", "작곡가": "", "편곡자": "",
            "좋아요": None, "전체 청취자수": None, "전체 재생수": None,
        }

    soup = BeautifulSoup(r.text, "html.parser")

    # 실제 구조에 맞는 셀렉터
    info_zone = soup.select_one("#body-content > div.song-main-infos > div.info-zone")
    like_path = "#emLikeCount"
    total_listeners_path = "#body-content > div.song-main-infos > div.aside-zone.daily-chart > div.total > div:nth-child(1) > p"
    total_plays_path     = "#body-content > div.song-main-infos > div.aside-zone.daily-chart > div.total > div:nth-child(2) > p"

    # 앨범명, 장르, 재생시간 정보 추출
    album = ""
    genre = ""
    ttime = ""
    
    # 핵심 발견: 첫 번째 li에 모든 정보가 순서대로 들어있음
    if info_zone:
        li_elements = info_zone.select("ul > li")
        
        if len(li_elements) > 0:
            # 첫 번째 li의 전체 텍스트를 줄 단위로 분리
            first_li = li_elements[0]
            first_li_text = first_li.get_text().strip()
            lines = [line.strip() for line in first_li_text.split('\n') if line.strip()]
            
            # 패턴 분석: 아티스트, 앨범명, 장르, 재생시간 순서로 나타남
            if len(lines) >= 4:
                # lines[0]: 아티스트 (WOODZ)
                # lines[1]: 앨범명 (OO-LI)  
                # lines[2]: 장르 (가요 / 락)
                # lines[3]: 재생시간 (04:05)
                
                album = lines[1] if len(lines) > 1 else ""
                genre = lines[2] if len(lines) > 2 else ""
                
                # 재생시간은 시간 형식인지 확인
                if len(lines) > 3 and re.match(r'\d{1,2}:\d{2}', lines[3]):
                    ttime = lines[3]
    
    # 앨범명을 못 찾은 경우 이미지 alt에서 찾기
    if not album:
        album_img = soup.select_one("#body-content > div.song-main-infos img[alt]")
        if album_img:
            alt_text = album_img.get('alt', '')
            if alt_text and len(alt_text) > 5:
                album = alt_text
    
    # 재생시간을 못 찾은 경우 전체 페이지에서 찾기
    if not ttime:
        time_texts = soup.find_all(string=lambda text: text and re.search(r'\d{1,2}:\d{2}', text.strip()) and len(text.strip()) < 20)
        for time_text in time_texts:
            time_match = re.search(r'\d{1,2}:\d{2}', time_text.strip())
            if time_match:
                ttime = time_match.group()
                break
    
    # 작사가, 작곡가, 편곡자 정보 추출 (li 구조가 다름)
    lyricist = ""
    composer = ""
    arranger = ""
    
    if info_zone:
        li_elements = info_zone.select("ul > li")
        
        # 2번째 li: 작사가
        if len(li_elements) >= 2:
            li2 = li_elements[1]
            strong = li2.find("strong")
            if strong and "작사가" in strong.get_text():
                # strong 다음의 텍스트 노드 추출
                lyricist = li2.get_text().replace("작사가", "").strip()
        
        # 3번째 li: 작곡가
        if len(li_elements) >= 3:
            li3 = li_elements[2]
            strong = li3.find("strong")
            if strong and "작곡가" in strong.get_text():
                composer = li3.get_text().replace("작곡가", "").strip()
        
        # 4번째 li: 편곡자
        if len(li_elements) >= 4:
            li4 = li_elements[3]
            strong = li4.find("strong")
            if strong and "편곡자" in strong.get_text():
                arranger = li4.get_text().replace("편곡자", "").strip()

    like_cnt = to_int_from_text(text_or_blank(soup.select_one(like_path)))
    total_listeners = to_int_from_text(text_or_blank(soup.select_one(total_listeners_path)))
    total_plays     = to_int_from_text(text_or_blank(soup.select_one(total_plays_path)))

    print(f"  ✅ {rank}위 '{album}' 상세 정보 수집 완료")
    return {
        "앨범명": album, "장르": genre, "재생시간": ttime,
        "작사가": lyricist, "작곡가": composer, "편곡자": arranger,
        "좋아요": like_cnt, "전체 청취자수": total_listeners, "전체 재생수": total_plays,
    }

def run_crawler(output_folder="."):
    print("🎵 지니차트 TOP 100 상세 정보 크롤링을 시작합니다!")
    print("=" * 50)
    
    # 1단계: 기본 차트 정보 수집 (1~100위)
    base_rows = []
    for pg in (1, 2):  # 1~100위
        base_rows.extend(fetch_chart_page(pg))
        time.sleep(0.8)  # 차단 방지

    print(f"\n📊 총 {len(base_rows)}개의 곡 정보를 수집했습니다!")
    print("=" * 50)
    
    # 2단계: 각 곡의 상세 정보 수집
    enriched = []
    total_songs = len(base_rows)
    
    for i, row in enumerate(base_rows, 1):
        print(f"\n[{i}/{total_songs}] {row['순위']}위: {row['곡명']} - {row['아티스트']}")
        detail = fetch_detail(row["상세URL"], row["순위"])
        row.update(detail)
        enriched.append(row)
        time.sleep(1.0)  # 차단 방지
        
        # 10개마다 진행상황 출력
        if i % 10 == 0:
            print(f"\n📈 진행률: {i}/{total_songs} ({i/total_songs*100:.1f}%)")

    # 3단계: 데이터프레임 생성 및 저장
    print("\n" + "=" * 50)
    print("📋 데이터프레임 생성 중...")
    
    df = pd.DataFrame(enriched, columns=[
        "순위","곡명","아티스트","앨범명","장르","재생시간",
        "작사가","작곡가","편곡자","좋아요","전체 청취자수","전체 재생수","상세URL","곡ID"
    ]).sort_values("순위").reset_index(drop=True)
    
    # 결과 미리보기
    print("\n🎯 상위 5곡 미리보기:")
    print(df.head())
    
    # CSV 저장
    # 오늘 날짜 구하기
    today_str = datetime.today().strftime("%Y-%m-%d")

    # 파일명에 날짜 포함
    csv_filename = os.path.join(output_folder, f"genie_top100_{today_str}.csv")
    df.to_csv(csv_filename, index=False, encoding="utf-8-sig")
    
    print(f"\n💾 '{csv_filename}' 파일로 저장되었습니다!")
    
    print("\n🎉 크롤링 완료!")
    print(f"총 {len(df)}개 곡의 상세 정보를 성공적으로 수집했습니다.")

if __name__ == "__main__":
    run_crawler(output_folder="data")