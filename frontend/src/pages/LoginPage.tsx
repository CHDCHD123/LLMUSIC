import { FormEvent, useState } from "react";

import AppModal from "../components/AppModal";

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
  busy?: boolean;
  error?: string;
};

export default function LoginPage({ onLogin, busy = false, error = "" }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signupModalOpen, setSignupModalOpen] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onLogin(username.trim(), password);
  }

  return (
    <>
      <section className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-[1720px] items-center px-4 py-10 md:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[36px] border border-[#e9c176]/14 bg-[linear-gradient(145deg,rgba(17,19,27,0.98)_0%,rgba(17,19,25,0.82)_48%,rgba(47,35,14,0.58)_100%)] p-8 shadow-[0_36px_100px_rgba(0,0,0,0.34)] md:p-12">
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#e9c176]/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#8c6531]/16 blur-3xl" />
            <div className="relative space-y-10">
              <div className="space-y-5">
                <div
                  className="text-[12px] uppercase tracking-[0.26em] text-[#e9c176]"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  Secure Entry
                </div>
                <h1 className="max-w-3xl text-[62px] leading-[1.02] text-white" style={{ fontFamily: '"Noto Serif", serif' }}>
                  LLMUSIC
                  <br />
                  Control Access
                </h1>
                <p className="max-w-2xl text-[16px] leading-8 text-white/68" style={{ fontFamily: "Manrope, sans-serif" }}>
                  추천, 자동화, 리포트는 인증된 사용자만 사용할 수 있습니다.
                  <br />
                  로그인 이후 LLMUSIC의 실사용 기능과 데이터 작업 공간이 열립니다.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: "ACCESS", value: "ADMIN ONLY" },
                  { label: "RUNTIME", value: "LIVE STATUS" },
                  { label: "SECURITY", value: "TOKEN CHECK" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/8 bg-black/10 px-5 py-5 backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/34" style={{ fontFamily: "Manrope, sans-serif" }}>
                      {item.label}
                    </div>
                    <div className="mt-3 text-[18px] text-[#f1d39a]" style={{ fontFamily: '"Noto Serif", serif' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 rounded-[28px] border border-white/8 bg-black/10 p-6 backdrop-blur-md sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Open Gate
                  </div>
                  <div className="text-[28px] leading-tight text-white" style={{ fontFamily: '"Noto Serif", serif' }}>
                    Home Only
                  </div>
                  <p className="text-[14px] leading-7 text-white/58" style={{ fontFamily: "Manrope, sans-serif" }}>
                    비로그인 상태에서는 메인 화면만 열리고,
                    <br />
                    실제 기능 페이지는 로그인 이후 접근됩니다.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Current Scope
                  </div>
                  <div className="text-[28px] leading-tight text-white" style={{ fontFamily: '"Noto Serif", serif' }}>
                    Sign In First
                  </div>
                  <p className="text-[14px] leading-7 text-white/58" style={{ fontFamily: "Manrope, sans-serif" }}>
                    추천, 자동화, 리포트는 모두 인증 이후 동작하며,
                    <br />
                    회원가입은 현재 준비 중입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-[#e9c176]/16 bg-[rgba(17,19,25,0.92)] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#e9c176]" style={{ fontFamily: "Manrope, sans-serif" }}>
                  Sign In
                </div>
                <h2 className="text-[34px] leading-tight text-white" style={{ fontFamily: '"Noto Serif", serif' }}>
                  관리자 계정으로
                  <br />
                  접속하세요
                </h2>
                <p className="text-[14px] leading-7 text-white/56" style={{ fontFamily: "Manrope, sans-serif" }}>
                  기본 계정은 관리자 전용입니다.
                  <br />
                  입력 정보가 맞지 않으면 아이디 또는 비밀번호 오류를 바로 안내합니다.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[12px] uppercase tracking-[0.18em] text-white/44" style={{ fontFamily: "Manrope, sans-serif" }}>
                    ID
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 py-4 text-white outline-none transition-all placeholder:text-white/22 focus:border-[#e9c176]/30 focus:bg-white/[0.05]"
                    placeholder="아이디를 입력하세요"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] uppercase tracking-[0.18em] text-white/44" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-[18px] border border-white/10 bg-white/[0.03] px-5 py-4 text-white outline-none transition-all placeholder:text-white/22 focus:border-[#e9c176]/30 focus:bg-white/[0.05]"
                    placeholder="비밀번호를 입력하세요"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-[18px] border border-red-500/22 bg-red-950/35 px-4 py-3 text-[14px] text-red-200" style={{ fontFamily: "Manrope, sans-serif" }}>
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full border border-[#e9c176]/35 bg-[#e9c176]/12 px-6 py-4 text-[12px] uppercase tracking-[0.22em] text-[#f2d9a0] transition-all hover:bg-[#e9c176]/18 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  {busy ? "로그인 중..." : "LOGIN"}
                </button>
                <button
                  type="button"
                  onClick={() => setSignupModalOpen(true)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-4 text-[12px] uppercase tracking-[0.22em] text-white/72 transition-all hover:bg-white/[0.06]"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                >
                  SIGN UP
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <AppModal
        open={signupModalOpen}
        title="준비중입니다"
        description="회원가입 기능은 아직 준비 중입니다. 현재는 관리자 로그인만 사용할 수 있습니다."
        confirmLabel="확인"
        onClose={() => setSignupModalOpen(false)}
      />
    </>
  );
}
