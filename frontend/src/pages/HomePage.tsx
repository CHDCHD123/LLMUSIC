type Props = {
  onNavigate: (tab: "recommend" | "automation" | "reports") => void;
};

export default function HomePage({ onNavigate }: Props) {
  return (
    <div className="overflow-x-hidden">
      <section className="relative overflow-hidden px-6 pb-[128px] pt-[128px]">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 blur-[150px] opacity-10"></div>
        <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-fuchsia-500 blur-[120px] opacity-10"></div>
        <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-center text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.9)]"></span>
            <span className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Next-Gen Audio Platform</span>
          </div>
          <h1 className="max-w-5xl font-['Space_Grotesk'] text-[44px] font-bold leading-[1.08] tracking-[-0.04em] text-white md:text-[72px]">
            <span className="whitespace-nowrap">LLMUSIC: 당신의 감성을 깨우는</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-cyan-200 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              AI 사운드 엔진
            </span>
          </h1>
          <p className="mb-12 mt-8 max-w-2xl font-['Be_Vietnam_Pro'] text-[18px] leading-[1.6] text-slate-300">
            인공지능 추천과 시스템 자동화가 만난 차세대 음악 플랫폼. 지금 가장 화려한 음악 경험을 시작하세요.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("recommend")}
            className="group relative overflow-hidden rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-950 to-fuchsia-950 px-8 py-4 shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(0,240,255,0.5)]"
          >
            <span className="relative z-10 flex items-center gap-2 font-['Space_Grotesk'] text-lg font-bold text-cyan-100">
              무료로 시작하기
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-fuchsia-500/20 opacity-0 transition-opacity group-hover:opacity-100"></div>
          </button>
        </div>
      </section>

      <section className="relative px-6 py-[64px]">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="mb-16 text-center font-['Space_Grotesk'] text-[48px] font-bold leading-[1.2] tracking-[-0.03em] text-white">
            강력한 <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.45)]">두 가지</span> 핵심 기능
          </h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.01)_100%)] p-8 backdrop-blur-[20px]">
              <div className="absolute left-[-100%] top-0 h-full w-1/2 skew-x-[-25deg] bg-[linear-gradient(to_right,rgba(255,255,255,0)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0)_100%)] transition-all duration-500 ease-in-out group-hover:left-[200%]"></div>
              <div className="absolute right-0 top-0 p-6 opacity-20 transition-opacity group-hover:opacity-100">
                <span className="material-symbols-outlined text-6xl text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.45)]">graphic_eq</span>
              </div>
              <h3 className="mb-4 font-['Space_Grotesk'] text-[32px] font-semibold leading-[1.3] tracking-[-0.02em] text-white">AI 감성 추천</h3>
              <p className="mb-8 max-w-md font-['Be_Vietnam_Pro'] text-base leading-[1.6] text-slate-300">
                지금 당신의 기분에 딱 맞는 곡을 AI가 직접 선곡합니다. 실시간 감정 분석을 통한 완벽한 사운드트랙.
              </p>
              <div className="relative mt-8 h-48 w-full">
                <div className="absolute left-4 top-4 flex h-32 w-3/4 -rotate-6 items-center gap-4 rounded-xl border border-white/10 bg-gradient-to-br from-[#292a2e] to-[#121317] p-4 shadow-2xl">
                  <div className="h-16 w-16 rounded-md border border-cyan-400/30 bg-fuchsia-500/20"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-24 rounded bg-white/20"></div>
                    <div className="h-2 w-16 rounded bg-white/10"></div>
                  </div>
                </div>
                <div className="absolute right-4 top-8 z-10 flex h-32 w-3/4 rotate-3 items-center gap-4 rounded-xl border border-cyan-400/40 bg-gradient-to-br from-[#343439] to-[#121317] p-4 shadow-[0_0_30px_rgba(0,240,255,0.12)] backdrop-blur-3xl">
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-cyan-400 bg-cyan-400/15 shadow-[0_0_10px_rgba(0,240,255,0.35)]">
                    <span className="material-symbols-outlined text-cyan-300">play_arrow</span>
                  </div>
                  <div className="w-full space-y-2">
                    <div className="h-4 w-32 rounded bg-cyan-300/80 shadow-[0_0_5px_rgba(0,240,255,0.35)]"></div>
                    <div className="h-2 w-20 rounded bg-white/20"></div>
                    <div className="mt-2 flex h-6 items-end gap-1">
                      <div className="h-3 w-1 rounded-t bg-cyan-300"></div>
                      <div className="h-5 w-1 rounded-t bg-cyan-300"></div>
                      <div className="h-2 w-1 rounded-t bg-cyan-300"></div>
                      <div className="h-6 w-1 rounded-t bg-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.45)]"></div>
                      <div className="h-4 w-1 rounded-t bg-cyan-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.01)_100%)] p-8 backdrop-blur-[20px]">
              <div className="absolute left-[-100%] top-0 h-full w-1/2 skew-x-[-25deg] bg-[linear-gradient(to_right,rgba(255,255,255,0)_0%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0)_100%)] transition-all duration-500 ease-in-out group-hover:left-[200%]"></div>
              <div className="absolute right-0 top-0 p-6 opacity-20 transition-opacity group-hover:opacity-100">
                <span className="material-symbols-outlined text-6xl text-fuchsia-400 drop-shadow-[0_0_15px_rgba(182,0,248,0.45)]">memory</span>
              </div>
              <h3 className="mb-4 font-['Space_Grotesk'] text-[32px] font-semibold leading-[1.3] tracking-[-0.02em] text-white">시스템 자동화 허브</h3>
              <p className="mb-8 max-w-md font-['Be_Vietnam_Pro'] text-base leading-[1.6] text-slate-300">
                복잡한 차트 분석과 데이터 처리를 24시간 잠들지 않는 AI가 자동으로 처리합니다.
              </p>
              <div className="relative mt-8 w-full rounded-xl border border-white/5 bg-black/10 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-['Space_Grotesk'] text-sm font-bold uppercase tracking-[0.12em] text-slate-300">NODE STATUS</span>
                  <div className="flex gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(0,240,255,0.45)]"></span>
                    <span className="h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_5px_rgba(182,0,248,0.45)]"></span>
                    <span className="h-2 w-2 rounded-full bg-red-400 opacity-50 shadow-[0_0_5px_rgba(255,90,90,0.35)]"></span>
                  </div>
                </div>
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-['Be_Vietnam_Pro'] text-sm text-slate-400">Data In</span>
                    <div className="flex h-1 flex-grow rounded bg-white/10 overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-transparent to-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.45)]"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-['Be_Vietnam_Pro'] text-sm text-slate-400">Processing</span>
                    <div className="flex h-1 flex-grow rounded bg-white/10 overflow-hidden">
                      <div className="h-full w-1/2 bg-gradient-to-r from-transparent to-fuchsia-400 shadow-[0_0_10px_rgba(182,0,248,0.35)]"></div>
                    </div>
                  </div>
                </div>
                <div className="relative mt-4 flex h-24 items-center justify-center overflow-hidden rounded border border-white/5 bg-white/[0.03]">
                  <div className="absolute left-[20%] top-[30%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.45)]"></div>
                  <div className="absolute left-[60%] top-[50%] h-1.5 w-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(182,0,248,0.35)]"></div>
                  <div className="absolute left-[80%] top-[40%] h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(125,244,255,0.45)]">
                    <div className="absolute inset-0 rounded-full bg-cyan-200 animate-ping opacity-75"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-[64px]">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              ["bolt", "압도적 기술력", "가장 진보된 신경망 엔진이 만들어내는 무결점 사운드 환경.", "cyan"],
              ["monitoring", "실시간 데이터", "글로벌 트렌드를 초당 단위로 분석하여 최적의 결과를 도출.", "fuchsia"],
              ["touch_app", "직관적 인터페이스", "복잡한 설정 없이 누구나 즉시 사용할 수 있는 완벽한 UX.", "sky"],
            ].map(([icon, title, text, tone]) => (
              <div
                key={title}
                className={`rounded-xl border p-8 text-center transition-transform duration-300 hover:-translate-y-2 ${
                  tone === "cyan"
                    ? "border-cyan-400/40 shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                    : tone === "fuchsia"
                      ? "border-fuchsia-400/40 shadow-[0_0_20px_rgba(182,0,248,0.12)]"
                      : "border-cyan-200/30 shadow-[0_0_20px_rgba(125,244,255,0.12)]"
                } glass-card`}
              >
                <div
                  className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border ${
                    tone === "cyan"
                      ? "border-cyan-400/30 bg-cyan-400/10"
                      : tone === "fuchsia"
                        ? "border-fuchsia-400/30 bg-fuchsia-400/10"
                        : "border-cyan-200/30 bg-cyan-200/10"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-4xl ${
                      tone === "cyan"
                        ? "text-cyan-300"
                        : tone === "fuchsia"
                          ? "text-fuchsia-300"
                          : "text-cyan-100"
                    }`}
                  >
                    {icon}
                  </span>
                </div>
                <h4 className="mb-2 font-['Space_Grotesk'] text-2xl font-semibold text-white">{title}</h4>
                <p className="font-['Be_Vietnam_Pro'] text-base leading-[1.6] text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-[128px] text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-cyan-400/10 to-transparent"></div>
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <h2 className="mb-8 font-['Space_Grotesk'] text-[48px] font-bold leading-[1.2] tracking-[-0.03em] text-white">
            지금 바로 <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent font-black">LLMUSIC</span>의 파워를 경험하세요.
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("recommend")}
            className="group rounded-2xl border border-white/10 bg-[#292a2e] px-10 py-5 shadow-2xl transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(0,240,255,0.25)]"
          >
            <span className="flex items-center gap-3 font-['Space_Grotesk'] text-2xl font-semibold text-white transition-colors group-hover:text-cyan-300">
              시스템 접속하기
              <span className="material-symbols-outlined">power_settings_new</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
