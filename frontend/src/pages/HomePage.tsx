type Props = {
  onNavigate: (tab: "recommend" | "automation" | "reports") => void;
};

export default function HomePage({ onNavigate }: Props) {
  return (
    <div className="overflow-x-hidden">
      <section className="relative flex min-h-[921px] items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-background"></div>
          <div className="absolute inset-y-0 left-0 z-10 w-[46%] bg-gradient-to-r from-background via-background/80 to-transparent"></div>
          <img
            alt="abstract visualization of sound waves in deep indigo and gold"
            className="h-full w-full object-cover object-center opacity-40 mix-blend-screen"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXE9Zy5VlvZghMsQs55t8bXHORfYu09eALS-VisnzDPMqpZc2So6iAELslRhZrnvGe8JSuUG-F3D_ucslDns3mKIusDwMPejqWmDlZ7g5JGBhvINoXAsIYFpT1z054gL7Dcnml_8iRsUMR0bVgkMkaO5uSGoQYo0N7HxWZGZ0OE5QlotLNdUq4dII_434duiUNsThzJ_e5-zpP5SPaViSO__KfOjyOpKUtGAkEOQIPjz6RCl87ft-WM0N_0kFOlpe4XAg8xqDCoANV"
          />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center gap-8 px-16 md:flex-row">
          <div className="flex w-full flex-col gap-4 md:w-2/3">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-px w-12 bg-[#e9c176]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>
                Next-Gen Audio Platform
              </span>
            </div>
            <h1
              className="text-[72px] font-normal leading-[80px] tracking-[-0.02em] text-on-surface"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              당신의 감성을 깨우는
              <br />
              <span className="bg-gradient-to-r from-[#e9c176] to-[#ffdea5] bg-clip-text text-transparent">AI 사운드 엔진</span>
            </h1>
            <p
              className="mt-6 max-w-2xl text-[18px] font-light leading-7 tracking-[0.01em] text-on-surface-variant"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              인공지능 추천과 시스템 자동화가 만난 차세대 음악 플랫폼.
              <br />
              지금 가장 화려한 음악 경험을 시작하세요.
            </p>
            <div className="mt-10">
              <button
                type="button"
                onClick={() => onNavigate("recommend")}
                className="cursor-pointer border border-[#e9c176] bg-transparent px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-[#e9c176] transition-all duration-300 hover:bg-[linear-gradient(90deg,rgba(233,193,118,0.15)_0%,transparent_100%)]"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-16 py-20">
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>Core Features</span>
          <h2
            className="text-[48px] font-normal leading-[56px] tracking-[-0.01em] text-on-surface"
            style={{ fontFamily: '"Noto Serif", serif' }}
          >
            강력한 <span className="text-[#e9c176]">두 가지</span> 핵심 기능
          </h2>
        </div>
        <div className="grid auto-rows-[320px] grid-cols-1 gap-6 md:grid-cols-12">
          <div className="group relative overflow-hidden rounded-[8px] border border-white/10 bg-[rgba(18,20,20,0.4)] p-10 backdrop-blur-[20px] transition-all duration-500 hover:shadow-[0_0_15px_rgba(233,193,118,0.15)] md:col-span-8">
            <div className="relative z-10 w-full md:w-2/3">
              <span className="material-symbols-outlined mb-6 text-4xl text-[#e9c176]">graphic_eq</span>
              <h3 className="mb-4 text-[32px] font-normal leading-10 text-on-surface" style={{ fontFamily: '"Noto Serif", serif' }}>AI 감성 추천</h3>
              <p className="text-[16px] leading-6 text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
                지금 당신의 기분에 딱 맞는 곡을 AI가 직접 선곡합니다. 실시간 감정 분석을 통한 완벽한 사운드트랙.
              </p>
            </div>
            <div className="absolute bottom-8 right-8 flex h-full w-1/2 items-end justify-end gap-2 opacity-30 transition-opacity duration-700 group-hover:opacity-50">
              <div className="h-[20%] w-1 rounded-t-full bg-[#e9c176]"></div>
              <div className="h-[60%] w-1 rounded-t-full bg-[#e9c176]"></div>
              <div className="h-[40%] w-1 rounded-t-full bg-[#e9c176]"></div>
              <div className="h-[80%] w-1 rounded-t-full bg-[#e9c176]"></div>
              <div className="h-[30%] w-1 rounded-t-full bg-[#e9c176]"></div>
              <div className="h-[50%] w-1 rounded-t-full bg-[#e9c176]"></div>
              <div className="h-[90%] w-1 rounded-t-full bg-[#e9c176]"></div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-[8px] border border-white/10 bg-[rgba(18,20,20,0.4)] p-10 text-center backdrop-blur-[20px] transition-all duration-500 hover:shadow-[0_0_15px_rgba(233,193,118,0.15)] md:col-span-4">
            <span className="material-symbols-outlined mb-6 text-5xl text-[#e9c176]" style={{ fontVariationSettings: '"FILL" 1' }}>
              touch_app
            </span>
            <h3 className="mb-2 text-[18px] font-semibold leading-7 text-on-surface" style={{ fontFamily: "Manrope, sans-serif" }}>직관적 인터페이스</h3>
            <p className="text-[16px] leading-6 text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>복잡한 설정 없이 누구나 즉시 사용할 수 있는 완벽한 UX.</p>
          </div>
          <div className="group relative overflow-hidden rounded-[8px] border border-white/10 bg-[rgba(18,20,20,0.4)] backdrop-blur-[20px] transition-all duration-500 hover:shadow-[0_0_15px_rgba(233,193,118,0.15)] md:col-span-5">
            <img
              alt="close up of premium brushed metal audio equipment dial"
              className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-opacity duration-700 group-hover:opacity-80"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVpv5_RiTEMURmvb3_GIwepLuH0xsJEvEVBBrmXWYmAkr14GlYzVJxP9ZDxZDPzB1x3OusLDZ1vtmF9KOXtopLDtVMTwL7dT33RWCAXcVdPW7nb5t6vHwknCj_Dv8rgMSQfUPiRFmaoxW1PAlYQU_JQv7yUXv_aZ4Pa2Chg_Dt2bbLZFEVgWj67fVFshJLW5JY1YEuCztyz99_um0CMsJ_3b_pGia9Zl85rbHhF900ce80nBUjPQlXYFXnOqYpVWJLCeyI2E7hWcww"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-8 left-8 text-[12px] font-semibold uppercase tracking-[0.15em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>LLMUSIC</div>
          </div>
          <div className="flex flex-col justify-center rounded-[8px] border border-white/10 bg-[rgba(18,20,20,0.4)] p-10 backdrop-blur-[20px] transition-all duration-500 hover:shadow-[0_0_15px_rgba(233,193,118,0.15)] md:col-span-7">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-[32px] font-normal leading-10 text-on-surface" style={{ fontFamily: '"Noto Serif", serif' }}>실시간 데이터</h3>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e9c176]/30">
                <div className="h-2 w-2 rounded-full bg-[#e9c176] shadow-[0_0_10px_rgba(233,193,118,0.8)]"></div>
              </div>
            </div>
            <p className="max-w-lg text-[16px] leading-6 text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
              추천, 자동화, 리포트 흐름을 하나의 서비스 안에서 연결하고 현재 상태를 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-20 w-full border-y border-white/5 bg-surface-container-low py-[120px]">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-[100px] px-16 md:flex-row">
          <div className="relative w-full md:w-1/2">
            <div className="relative z-10 rounded-[8px] border border-white/10 bg-[rgba(18,20,20,0.4)] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
              <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[12px] font-semibold uppercase tracking-[0.15em] text-on-surface" style={{ fontFamily: "Manrope, sans-serif" }}>System Status</span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>ACTIVE</span>
              </div>
              <div className="space-y-6">
                {[
                  ["data_usage", "Data In", "OPTIMIZED", "85%"],
                  ["memory", "Processing", "100%", "60%"],
                ].map(([icon, label, value, width]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[16px] leading-6 text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
                        <span className="material-symbols-outlined text-sm">{icon}</span>
                        {label}
                      </span>
                      <span className="text-[16px] leading-6 text-on-surface" style={{ fontFamily: "Manrope, sans-serif" }}>{value}</span>
                    </div>
                    <div className="relative mt-4 h-px w-full bg-white/5">
                      <div className="absolute left-0 top-0 h-full bg-[#e9c176]/50" style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e9c176]/10 blur-[80px]"></div>
          </div>
          <div className="flex w-full flex-col gap-4 md:w-1/2">
            <span className="mb-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>Smart Integration</span>
            <h2 className="text-[48px] font-normal leading-[56px] text-on-surface" style={{ fontFamily: '"Noto Serif", serif' }}>시스템 자동화 허브</h2>
            <p className="text-[18px] font-light leading-7 tracking-[0.01em] text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
              복잡한 차트 분석과 데이터 처리를 24시간 잠들지 않는 AI가 자동으로 처리합니다.
            </p>
            <ul className="mt-6 space-y-4 text-[16px] leading-6 text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
              {[
                ["압도적 기술력", "가장 진보된 신경망 엔진이 만들어내는 무결점 사운드 환경."],
                ["실시간 데이터", "글로벌 트렌드를 초당 단위로 분석하여 최적의 결과를 도출."],
                ["직관적 인터페이스", "복잡한 설정 없이 누구나 즉시 사용할 수 있는 완벽한 UX."],
              ].map(([title, body]) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="material-symbols-outlined mt-1 text-lg text-[#e9c176]">check_circle</span>
                  <span>
                    <strong className="font-semibold text-on-surface">{title}: </strong>
                    {body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1440px] flex-col items-center px-16 py-[160px] text-center">
        <h2 className="mb-8 text-[72px] font-normal leading-[80px] tracking-[-0.02em] text-on-surface" style={{ fontFamily: '"Noto Serif", serif' }}>
          지금 바로 <span className="text-[#e9c176]">LLMUSIC</span>을 경험하세요.
        </h2>
        <p className="mb-12 max-w-2xl text-[18px] font-light leading-7 tracking-[0.01em] text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>
          더 이상의 타협은 없습니다.
          <br />
          당신의 감각을 존중하는 마에스트로,
          <br />
          LLMUSIC과 함께 궁극의 청취 여정을 시작하십시오.
        </p>
        <button
          type="button"
          onClick={() => onNavigate("recommend")}
          className="cursor-pointer border border-[#e9c176] bg-transparent px-12 py-5 text-[16px] font-semibold uppercase tracking-[0.15em] text-[#e9c176] transition-all duration-300 hover:bg-[linear-gradient(90deg,rgba(233,193,118,0.15)_0%,transparent_100%)] hover:shadow-[0_0_30px_rgba(233,193,118,0.2)]"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          시스템 접속하기
        </button>
      </section>
    </div>
  );
}
