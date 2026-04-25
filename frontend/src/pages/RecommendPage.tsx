import { FormEvent, useEffect, useMemo, useState } from "react";

import AppModal from "../components/AppModal";
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

type EngineMode = "auto" | "openai" | "local" | "template";

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
  const [emotion, setEmotion] = useState(stored?.emotion ?? "");
  const [selectedSituation, setSelectedSituation] = useState(stored?.selectedSituation ?? "");
  const [customSituation, setCustomSituation] = useState(stored?.customSituation ?? "");
  const [koreanOnly, setKoreanOnly] = useState(stored?.koreanOnly ?? true);
  const [engineMode, setEngineMode] = useState<EngineMode>(stored?.engineMode ?? "auto");
  const [variation, setVariation] = useState(0);
  const [status, setStatus] = useState<any>(initialStatus ?? null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [validationModalOpen, setValidationModalOpen] = useState(false);

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
        engineMode,
      })
    );
  }, [emotion, selectedSituation, customSituation, koreanOnly, engineMode]);

  async function handleRecommend(nextVariation = variation) {
    if (!emotion && !selectedSituation && !customSituation.trim()) {
      setValidationModalOpen(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await recommend({
        emotion,
        situation,
        korean_only: koreanOnly,
        variation: nextVariation,
        engine_mode: engineMode,
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
  const displayMode = engineMode.toUpperCase();
  const selectedEngineLabel =
    engineMode === "auto"
      ? "자동 선택"
      : engineMode === "openai"
        ? "OpenAI 우선"
        : engineMode === "local"
          ? "EXAONE 우선"
          : "Template 고정";
  const actualModelLabel = result?.model_used ?? "추천 실행 후 표시";
  const failoverSteps = [
    { order: "01", title: "OpenAI", value: openaiModel, key: "openai" as EngineMode, active: activeModel === openaiModel },
    { order: "02", title: "EXAONE", value: localModel, key: "local" as EngineMode, active: activeModel === `local:${localModel}` || activeModel === localModel },
    { order: "03", title: "Template", value: "template-fallback", key: "template" as EngineMode, active: activeModel === "template-fallback" },
  ];

  return (
    <>
      <header className="w-full flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-4 min-w-0">
          <div className="mb-1 flex items-center gap-sm text-[#e9c176]">
            <span className="material-symbols-outlined text-[32px]">auto_awesome</span>
            <span className="text-label-sm uppercase tracking-widest" style={{ fontFamily: "Manrope, sans-serif" }}>AI 추천 엔진</span>
          </div>
          <h1 className="text-[48px] leading-[56px] text-on-surface" style={{ fontFamily: '"Noto Serif", serif' }}>당신의 감성을 찾으세요</h1>
          <p className="max-w-5xl text-on-surface-variant whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontFamily: "Manrope, sans-serif" }}>
            정밀하게 설계된 음악 탐색을 경험하세요. 우리의 기술 엔진이 다양한 소스의 데이터를 통합하여 당신을 위한 완벽한 청각적 환경을 큐레이팅합니다.
          </p>
        </div>
        <div className="w-full md:w-auto md:min-w-[560px]">
          <div className="rounded-xl border border-[#e9c176]/20 bg-[rgba(18,20,20,0.4)] p-3 backdrop-blur-xl">
            <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>
              Failover Chain
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setEngineMode("auto")}
                className={`rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-all ${
                  engineMode === "auto"
                    ? "border-[#e9c176]/40 bg-[#604403]/25 text-[#f3d7a0]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                }`}
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Auto
              </button>
              <span className="text-[11px] uppercase tracking-[0.15em] text-slate-500" style={{ fontFamily: "Manrope, sans-serif" }}>
                Mode: {displayMode}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-white/70" style={{ fontFamily: "Manrope, sans-serif" }}>
                Selected: {selectedEngineLabel}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {failoverSteps.map((step) => (
                <button
                  key={step.order}
                  type="button"
                  onClick={() => setEngineMode(step.key)}
                  className={`rounded-lg border px-3 py-3 text-left transition-all ${
                    engineMode === step.key || (engineMode === "auto" && step.active)
                      ? "border-[#e9c176]/40 bg-[#604403]/25 shadow-[0_0_18px_rgba(233,193,118,0.12)]"
                      : "border-white/10 bg-white/[0.03] hover:border-[#e9c176]/20 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400" style={{ fontFamily: "Manrope, sans-serif" }}>
                      {step.order}
                    </span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        engineMode === step.key || (engineMode === "auto" && step.active)
                          ? "bg-[#e9c176] shadow-[0_0_10px_rgba(233,193,118,0.8)]"
                          : "bg-white/20"
                      }`}
                    />
                  </div>
                  <div className="mb-1 text-[11px] uppercase tracking-[0.15em] text-slate-400" style={{ fontFamily: "Manrope, sans-serif" }}>
                    {step.title}
                  </div>
                  <div
                    className={`break-words text-sm leading-5 ${
                      engineMode === step.key || (engineMode === "auto" && step.active) ? "text-[#f3d7a0]" : "text-on-surface-variant"
                    }`}
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {step.value}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="w-full">
        <form className="rounded-xl border border-white/10 bg-[rgba(18,20,20,0.4)] p-md glass-effect" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
            <div className="lg:col-span-8 space-y-md">
              <div>
                <label className="block mb-sm text-label-sm text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>감정 선택</label>
                <div className="flex flex-wrap gap-xs">
                  {emotions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setEmotion((current: string) => (current === item ? "" : item))}
                      className={
                        item === emotion
                          ? "px-md py-xs bg-[#604403] text-[#dab36a] rounded-lg text-label-sm transition-all border border-[#e9c176]/30"
                          : "px-md py-xs bg-[rgba(255,255,255,0.04)] text-on-surface-variant rounded-lg text-label-sm hover:bg-white/10 transition-all"
                      }
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-sm">
                <label className="block text-label-sm text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>상황 선택</label>
                <div className="flex flex-wrap gap-xs">
                  {situations.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSelectedSituation((current: string) => (current === item ? "" : item))}
                      className={
                        item === selectedSituation
                          ? "px-md py-xs bg-[#604403] text-[#dab36a] rounded-lg text-label-sm transition-all"
                          : "px-md py-xs bg-[rgba(255,255,255,0.04)] text-on-surface-variant rounded-lg text-label-sm hover:bg-white/10 transition-all"
                      }
                      style={{ fontFamily: "Manrope, sans-serif" }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-sm text-label-sm text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>자유입력</label>
                <input
                  className="w-full rounded-lg border border-[#e9c176]/20 bg-surface-container-lowest p-sm text-on-surface focus:ring-1 focus:ring-[#e9c176]/40 focus:border-[#e9c176]/40 transition-all outline-none"
                  placeholder="예: 비 내리는 밤, 창밖 보면서 멍때리는 느낌"
                  type="text"
                  value={customSituation}
                  onChange={(e) => setCustomSituation(e.target.value)}
                  style={{ fontFamily: "Manrope, sans-serif" }}
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
                    <span className={`${koreanOnly ? "text-[#dab36a]" : "text-on-surface-variant"}`} style={{ fontFamily: "Manrope, sans-serif" }}>KR</span>
                    <div className={`w-12 h-6 rounded-full relative border transition-all ${koreanOnly ? "bg-[#604403]/20 border-[#e9c176]/40" : "bg-surface-container-lowest border-outline-variant"}`}>
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                          koreanOnly
                            ? "right-1 bg-[#e9c176] shadow-[0_0_8px_rgba(233,193,118,0.6)]"
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
                  className="w-full py-md rounded-lg border border-[#e9c176] text-[#e9c176] hover:bg-[linear-gradient(90deg,rgba(233,193,118,0.15)_0%,transparent_100%)] active:scale-[0.98] transition-all flex items-center justify-center gap-sm"
                  style={{ fontFamily: "Manrope, sans-serif" }}
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
                  style={{ fontFamily: "Manrope, sans-serif" }}
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
            <h2 className="flex items-center gap-sm text-[32px] leading-10 text-on-surface" style={{ fontFamily: '"Noto Serif", serif' }}>
              선별된 추천 곡
              <span className="rounded-full bg-[#604403] px-sm py-1 text-label-sm text-[#dab36a]" style={{ fontFamily: "Manrope, sans-serif" }}>
                {recommendations.length || 0}개의 트랙 발견
              </span>
            </h2>
            <p className="max-w-4xl break-words whitespace-normal leading-6 text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
              {result?.explanation ?? "추천을 실행하면 감정, 상황, 곡 메타데이터, 차트 흐름을 함께 반영한 설명이 여기 표시됩니다."}
            </p>
          </div>
          <div className="grid w-full gap-2 md:w-auto md:min-w-[360px]">
            <div className="max-w-full rounded-lg border border-white/10 bg-[rgba(18,20,20,0.35)] px-md py-sm break-words whitespace-normal leading-5 text-white/75" style={{ fontFamily: "Manrope, sans-serif" }}>
              선택 엔진: {selectedEngineLabel}
            </div>
            <div className="max-w-full rounded-lg border border-[#e9c176]/20 bg-[rgba(18,20,20,0.4)] px-md py-sm break-words whitespace-normal leading-5 text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>
              실제 사용: {actualModelLabel}
            </div>
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
                    className="w-16 h-16 rounded-full bg-[#e9c176] text-[#412d00] flex items-center justify-center shadow-2xl"
                  >
                    <span className="material-symbols-outlined text-[32px]">play_arrow</span>
                  </a>
                </div>
                <div className="absolute top-sm left-sm bg-surface/80 backdrop-blur-md px-sm py-1 rounded font-data-mono text-data-mono text-on-surface">
                  #{String(index + 1).padStart(2, "0")}
                </div>
                {!loading && item.match_score ? (
                  <div className="absolute top-sm right-sm rounded-full bg-[#604403]/90 px-2 py-1 text-[11px] font-semibold text-[#dab36a]">
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
                    <span className="material-symbols-outlined text-[#e9c176] text-[20px]">link</span>
                  </a>
                </div>
                <div className="flex justify-between items-start gap-sm pt-xs border-t border-white/5">
                  <div className="flex items-center gap-xs flex-wrap min-w-0">
                    <span className="text-label-sm font-label-sm text-[#dab36a] bg-[#604403]/20 px-xs rounded">
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
      <AppModal
        open={validationModalOpen}
        title="입력이 필요합니다"
        description="감정, 상황, 자유입력 중 하나 이상 제대로 입력해 주세요."
        confirmLabel="확인"
        onClose={() => setValidationModalOpen(false)}
      />
    </>
  );
}
