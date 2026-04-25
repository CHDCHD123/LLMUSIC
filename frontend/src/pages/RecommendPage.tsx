import { FormEvent, useEffect, useMemo, useState } from "react";

import { fetchStatus, recommend } from "../services/api";

const emotions = ["기쁨", "슬픔", "편안함", "에너지", "우울함", "집중", "설렘", "그리움", "몽환", "분노", "잔잔함", "로맨틱"];
const situations = ["출근길", "운동", "산책", "휴식", "드라이브", "공부", "카페", "여행", "야근", "비 오는 밤"];
const fallbackImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDjpr5UI4Wx7K4YvRMpZWGtjNaW-o1wBQwI35wVSsqkC5_sKBKS6slDk9fBQkLAdHF11HcHccUg4rISX8kea_9pEbGocZuleklGXixqXs6okFnoJL5T84XOZY4hCchAQtN9_vTI1piRD0YIQdRH0hkTuLiwEPMQm_SB88rsG2iu-yi_bxDOonvwWgj7_5Am-ws0L5Vu5C2bSCORX6R381Qmcq7UHtBHOiJh3hhgP69eAD3QhEyfIVI2fOoOQ4BWCCF7LcaavImYI421",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAwHM9kpDuOrtlPjdBEs94cuuFoFWxweDw8qLAqXed9i51UzWKXwxNEjPA7de6N9SkzHQ9erRVsuVtUsiJInmJpA14iol3VyjG8H3KGL-tpbAjC5s9YlEYb3OhIQEwJH7n8DTN5zQThWkN-Sir_VIhvYXyoe8oaxJxXl2DBVLA2m1Hm18t5eyqJaGz3tgbJZHn-UMPiVF7RNqHgNVVbHTDxDv1V_uNA85KLGE1aXeho9GJNEq5RxKywDIcfNikIpnze_hoAQg2MBY8s",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAOBXCP76kRtOXbKvqJzNubs6dSR0BqSfgG7eVAcY-kJiMvqeblFu0_ebGEQ_TDTqJyft7xehx5Zbo4CT8CPksTkHUK8C7AI6Vk6kRHAdvSy_E_8jnCzzEByrq3sSv0VBhnqETGzmgSNV74-7c1fVLyKjRNY8u0AMM9lRUZ41BhkR5NX75WndoWpFVI5frfajA7pEeqRpk7LC0LCcqtsd2Sect545lVXVwAY1UmWFL_bof8YviSB8I1fBHZUt6Nv1POqkQOrw_Sziy2",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAkBHgWt4q0DfJEOfLGBHQ2eyppIhPEIZhNTHa9l22MZYLj5-vvvFDNonzCE8cjJxuVhMZeUy7n6ddwfg47Wiz1WOzgfg8zhRR5wGS-9ZFVeikxCJZP6p6mtXRz3Hs5jLhtg04AznZ3WE35Gx6zyadYC0EdfPqxY_dpw6t4ACzo3h8Ffcf8qqX5BQo9SKXoRCJ8Wdau4wBCl9ERTcz5uCIJWTU3YFJmBtByf4uYu9-1m-A8QiSBJw_v0Vu_DUnreYF4DhEQD5WPTQHr",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAQtGyHdlyg6ks_IpXifBs5SCdBwgNXUObptXOfqiBDSFPDFCXWpCFDWc9hIqrCTKpMKbx_ZNJ2ehOupc-HycrdsCBsW4Daity9y_tYntTGj96kQhbBWlJdqnI47cz-whZmgdENZHgNmhzNA7h1eQgV77pMI2MOh7zp2dUVQvEibDRcfGoCGDJ0V7GFTy7U18dKTmMCOzTap_1wkWq6am0RcnGaQIKUREITzOy3BhOKH1MHB9ZAAF1nAS3LCmk_lw6u18k7RJu7O907",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCkHcHG3iab6rX6AoA1oF5lR4PNtqQwZ2lpwoXAHdYXM0JooMfii244s0-CY6y-aOXt_qcFfU5tYC1WCD5GmGr2c4_U9peQIoSUbhhTAZQ0dZdXazBo9BfMkZV5lZLBCmXIzFDqJDhWDHfot55Gld43gZs42G5gQX8revNTUDLUsRtm4V1tSsQoEhufWJLEHrxdz2PKhn5OzaprTmn29c8XhC7nnwytWfKoZmquFyNATE8x2QFSFF8eF0h4RoVg13VlgKvp8RRtDcSi",
];

type Props = {
  initialStatus?: any;
  onStatusRefresh?: () => void;
};

const STORAGE_KEY = "llmusic-recommend-state";

function loadStoredState() {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export default function RecommendPage({ initialStatus, onStatusRefresh }: Props) {
  const stored = typeof window !== "undefined" ? loadStoredState() : null;
  const [emotion, setEmotion] = useState(stored?.emotion ?? "기쁨");
  const [selectedSituation, setSelectedSituation] = useState(stored?.selectedSituation ?? "출근길");
  const [customSituation, setCustomSituation] = useState(stored?.customSituation ?? "");
  const [koreanOnly, setKoreanOnly] = useState(stored?.koreanOnly ?? true);
  const [variation, setVariation] = useState(0);
  const [status, setStatus] = useState<any>(initialStatus ?? null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const situation = useMemo(
    () => [selectedSituation, customSituation.trim()].filter(Boolean).join(" / "),
    [selectedSituation, customSituation]
  );

  useEffect(() => {
    if (!initialStatus && !stored?.status) fetchStatus(true).then(setStatus).catch(() => undefined);
  }, [initialStatus]);

  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        emotion,
        selectedSituation,
        customSituation,
        koreanOnly,
      })
    );
  }, [emotion, selectedSituation, customSituation, koreanOnly]);

  async function handleRecommend(nextVariation = variation) {
    setLoading(true);
    setError("");
    try {
      const response = await recommend({
        emotion,
        situation,
        korean_only: koreanOnly,
        variation: nextVariation,
      });
      setResult(response);
      setVariation(nextVariation);
      const nextStatus = await fetchStatus(false);
      setStatus(nextStatus);
      onStatusRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await handleRecommend(variation);
  }

  const recommendations = (result?.recommendations ?? []).slice(0, 6);
  const openaiModel = status?.openai?.model ?? "OpenAI 미설정";
  const localModel = status?.local_models?.model_id ?? "로컬 모델 미설정";
  const activeModel = result?.model_used ?? openaiModel;
  const failoverLabel = `1차 ${openaiModel} / 2차 ${localModel} / 3차 template-fallback`;

  return (
    <>
      <header className="w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-sm text-primary mb-1">
            <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest">AI 추천 엔진</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface">당신의 감성을 찾으세요</h1>
          <p className="text-on-surface-variant max-w-5xl font-body-base whitespace-nowrap overflow-hidden text-ellipsis">
            정밀하게 설계된 음악 탐색을 경험하세요. 우리의 기술 엔진이 다양한 소스의 데이터를 통합하여 당신을 위한 완벽한 청각적 환경을 큐레이팅합니다.
          </p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2 overflow-x-auto md:justify-end">
          <span className="shrink-0 rounded-full border border-white/10 bg-surface-container-high px-3 py-2 font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
            {activeModel}
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-surface-container-high px-3 py-2 text-[11px] text-on-surface-variant whitespace-nowrap">
            {failoverLabel}
          </span>
        </div>
      </header>

      <section className="w-full">
        <form className="bg-surface-container-low border border-white/5 rounded-xl p-md glass-effect" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            <div className="lg:col-span-8 space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-sm">감정 선택</label>
                <div className="flex flex-wrap gap-xs">
                  {emotions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setEmotion(item)}
                      className={
                        item === emotion
                          ? "px-md py-xs bg-primary-container text-on-primary-container rounded-lg font-label-sm text-label-sm transition-all border border-primary/20"
                          : "px-md py-xs bg-surface-container-highest text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-variant transition-all"
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-sm">
                <label className="font-label-sm text-label-sm text-on-surface-variant block">상황 선택</label>
                <div className="flex flex-wrap gap-xs">
                  {situations.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedSituation(item)}
                      className={
                        item === selectedSituation
                          ? "px-md py-xs bg-secondary-container text-white rounded-lg font-label-sm text-label-sm transition-all"
                          : "px-md py-xs bg-surface-container-highest text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface-variant transition-all"
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-sm">자유입력</label>
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-sm text-on-surface focus:ring-1 focus:ring-secondary-container focus:border-secondary-container transition-all outline-none font-body-base"
                  placeholder="예: 비 내리는 밤, 창밖 보면서 멍때리는 느낌"
                  type="text"
                  value={customSituation}
                  onChange={(e) => setCustomSituation(e.target.value)}
                />
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col justify-between gap-md">
              <div className="rounded-lg border border-white/5 bg-surface-container-high p-sm">
                <div className="flex items-center justify-between gap-sm">
                  <div>
                    <div className="text-sm font-medium text-white">KR 필터</div>
                    <div className="text-xs text-slate-400">국내 곡 중심으로 추천</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKoreanOnly((prev: boolean) => !prev)}
                    className="flex items-center gap-3"
                  >
                    <span className={`font-label-sm text-label-sm ${koreanOnly ? "text-secondary-container" : "text-on-surface-variant"}`}>KR</span>
                    <div className={`w-12 h-6 rounded-full relative border transition-all ${koreanOnly ? "bg-secondary-container/20 border-secondary-container/40" : "bg-surface-container-lowest border-outline-variant"}`}>
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                          koreanOnly
                            ? "right-1 bg-secondary-container shadow-[0_0_8px_rgba(30,149,242,0.6)]"
                            : "left-1 bg-slate-400"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-xs">
                <button
                  type="submit"
                  className="w-full py-md bg-secondary-container text-white font-headline-md text-headline-md rounded-lg shadow-[0_0_20px_rgba(30,149,242,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-sm"
                >
                  {loading ? (
                    <span className="loading-dots" aria-label="loading">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  ) : (
                    <span className="material-symbols-outlined">auto_fix</span>
                  )}
                  {loading ? "검색 중" : "음악 추천받기"}
                </button>
                <button
                  type="button"
                  disabled={loading || !result}
                  onClick={() => void handleRecommend(variation + 1)}
                  className="w-full py-md border border-white/10 text-on-surface rounded-lg hover:bg-white/5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  다시 추천받기
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section className="w-full space-y-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md pb-sm border-b border-white/5">
          <div className="space-y-base min-w-0 flex-1">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              선별된 추천 곡
              <span className="text-secondary text-label-sm font-label-sm bg-secondary/10 px-sm py-1 rounded-full">
                {recommendations.length || 0}개의 트랙 발견
              </span>
            </h2>
            <p className="text-on-surface-variant font-data-mono text-data-mono max-w-4xl break-words whitespace-normal leading-6">
              {result?.explanation ?? "추천을 실행하면 감정, 상황, 곡 메타데이터, 차트 흐름을 함께 반영한 설명이 여기 표시됩니다."}
            </p>
          </div>
          <div className="font-data-mono text-data-mono text-secondary-fixed-dim bg-surface-container-high px-md py-sm rounded-lg border border-white/5 break-words whitespace-normal leading-5 max-w-full md:max-w-[360px]">
            모델: {activeModel}
          </div>
        </div>

        {error ? <div className="text-error">{error}</div> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {(loading ? Array.from({ length: 6 }) : recommendations).map((item: any, index: number) => (
            <div key={loading ? index : `${item.title}-${item.artist}-${index}`} className="bg-surface-container-high rounded-xl p-sm border border-white/5 music-card-hover transition-all duration-300 group">
              <div className="relative aspect-square mb-sm overflow-hidden rounded-lg">
                {loading ? (
                  <div className="w-full h-full bg-surface-container-highest animate-pulse" />
                ) : (
                  <img className="w-full h-full object-cover" src={item.artwork_url || fallbackImages[index % fallbackImages.length]} alt={item.title} />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={loading ? "#" : item.preview_url || item.external_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <span className="material-symbols-outlined text-[32px]">play_arrow</span>
                  </a>
                </div>
                <div className="absolute top-sm left-sm bg-surface/80 backdrop-blur-md px-sm py-1 rounded font-data-mono text-data-mono text-on-surface">
                  #{String(index + 1).padStart(2, "0")}
                </div>
                {!loading && item.match_score ? (
                  <div className="absolute top-sm right-sm rounded-full bg-secondary-container/90 px-2 py-1 text-[11px] font-semibold text-white">
                    {item.match_score}점
                  </div>
                ) : null}
              </div>
              <div className="px-xs space-y-xs">
                <div className="flex justify-between items-start gap-sm">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-headline-md text-label-sm text-on-surface break-words whitespace-normal leading-5">{loading ? "..." : item.title}</h3>
                    <p className="text-on-surface-variant text-label-sm font-data-mono break-words whitespace-normal">{loading ? "..." : item.artist}</p>
                  </div>
                  <a href={loading ? "#" : item.external_url || "#"} target="_blank" rel="noreferrer">
                    <span className="material-symbols-outlined text-secondary-fixed-dim text-[20px]">link</span>
                  </a>
                </div>
                <div className="flex justify-between items-start gap-sm pt-xs border-t border-white/5">
                  <div className="flex items-center gap-xs flex-wrap min-w-0">
                    <span className="text-label-sm font-label-sm text-on-secondary-container bg-secondary-container/20 px-xs rounded">
                      {loading ? "..." : item.source || "iTunes"}
                    </span>
                    <span className="text-label-sm font-label-sm text-tertiary">{loading ? "..." : item.rank ? `차트 ${item.rank}위` : "추천 후보"}</span>
                  </div>
                  <span className="font-data-mono text-[10px] text-on-surface-variant uppercase break-words whitespace-normal text-right max-w-[44%]">
                    앨범: {loading ? "..." : item.album || "정보 없음"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
