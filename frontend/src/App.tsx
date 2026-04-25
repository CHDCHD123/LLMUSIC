import { useEffect, useState } from "react";

import AppModal from "./components/AppModal";
import AutomationPage from "./pages/AutomationPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ReportPage from "./pages/ReportPage";
import RecommendPage from "./pages/RecommendPage";
import { clearAuthToken, fetchMe, fetchStatus, getAuthToken, login as loginRequest, setAuthToken } from "./services/api";

const tabs = [
  { key: "home", label: "메인", path: "/home" },
  { key: "recommend", label: "추천", path: "/recommend" },
  { key: "automation", label: "자동화", path: "/automation" },
  { key: "reports", label: "리포트", path: "/reports" },
] as const;

type TabKey = (typeof tabs)[number]["key"];
type RouteKey = TabKey | "login";

function pathToTab(pathname: string): RouteKey {
  if (pathname === "/" || pathname === "/home") return "home";
  if (pathname === "/login") return "login";
  if (pathname === "/automation") return "automation";
  if (pathname === "/reports") return "reports";
  return "recommend";
}

function tabToPath(tab: RouteKey): string {
  if (tab === "login") return "/login";
  return tabs.find((item) => item.key === tab)?.path ?? "/";
}

function indicatorColor(value: string) {
  if (value.includes("없음") || value.includes("실패")) return "#F44336";
  return "#4CAF50";
}

function TopStatusBar({ status, onRefresh }: { status: any; onRefresh: () => void }) {
  const items = [
    { label: "iTunes", value: status?.itunes?.status ?? "-" },
    { label: "MusicBrainz", value: status?.musicbrainz?.status ?? "-" },
    { label: "Genie", value: status?.genie?.status ?? "-" },
    { label: "OpenAI", value: status?.openai?.status ?? "-" },
  ];

  return (
    <div className="w-full bg-surface-container-lowest border-b border-white/5 px-4 py-2 md:px-6 lg:px-8 flex justify-between items-center z-[60]">
      <div className="flex gap-md items-center">
        {items.map((item) => {
          const color = indicatorColor(String(item.value));
          const pulse = color === "#F44336" ? " animate-pulse" : "";
          const shadow = color === "#F44336" ? "" : " shadow-[0_0_8px_#4CAF50]";
          return (
            <div key={item.label} className="flex items-center gap-xs">
              <div className={`w-1.5 h-1.5 rounded-full${pulse}${shadow}`} style={{ backgroundColor: color }} />
              <span className="font-label-sm text-label-sm text-on-surface-variant" style={{ fontFamily: "Manrope, sans-serif" }}>{item.label}</span>
            </div>
          );
        })}
      </div>
      <button className="flex items-center gap-xs font-label-sm text-label-sm text-[#e9c176] hover:opacity-80 transition-opacity" onClick={onRefresh} style={{ fontFamily: "Manrope, sans-serif" }}>
        <span className="material-symbols-outlined text-[16px]">sync</span>
        새로고침
      </button>
    </div>
  );
}

function TopAppBar({ tab, onTabChange, onRefresh, status }: { tab: TabKey; onTabChange: (tab: TabKey) => void; onRefresh: () => void; status: any }) {
  const healthItems = [
    { label: "iTunes", value: status?.itunes?.status ?? "-" },
    { label: "MusicBrainz", value: status?.musicbrainz?.status ?? "-" },
    { label: "Genie", value: status?.genie?.status ?? "-" },
    { label: "OpenAI", value: status?.openai?.status ?? "-" },
  ];
  const activeModel = status?.openai?.model || status?.local_models?.model_id || "모델 정보 없음";

  return (
    <nav className="sticky top-0 w-full flex items-center justify-between px-4 py-4 md:px-6 lg:px-8 z-50 bg-[#1C1F2E]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <button type="button" className="flex items-center gap-sm min-w-[220px] text-left" onClick={() => onTabChange("home")}>
        <img src="/LLMUSICLOGO.png" alt="LLMUSIC logo" className="h-9 w-9 rounded-lg object-cover" />
        <div className="flex flex-col leading-none">
          <div className="text-xl font-black tracking-tighter text-white">LLMUSIC</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Intelligence Hub</div>
        </div>
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-md">
        <div className="flex items-center gap-md">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={
                item.key === tab
                  ? "font-inter tracking-tight font-medium text-[#e9c176] border-b-2 border-[#e9c176] pb-1"
                  : "font-inter tracking-tight font-medium text-slate-400 hover:text-white transition-colors"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-sm min-w-[320px] justify-end">
        <div className="hidden xl:flex items-center gap-sm mr-sm flex-wrap justify-end max-w-[420px]">
          {healthItems.map((item) => {
            const color = indicatorColor(String(item.value));
            return (
              <div key={item.label} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] uppercase tracking-widest text-slate-300">{item.label}</span>
              </div>
            );
          })}
        </div>
        <div className="hidden lg:block max-w-[420px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-widest text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis">
          Model: {activeModel}
        </div>
        <button className="p-base hover:bg-white/5 rounded-lg transition-all duration-200 active:scale-95" onClick={onRefresh}>
          <span className="material-symbols-outlined text-[#e9c176]">sync</span>
        </button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#0A0C14] flex flex-col md:flex-row justify-between items-center px-8 py-12 gap-6">
      <div className="flex items-center gap-md">
        <span className="font-bold text-[#e9c176]">LLMUSIC</span>
        <p className="font-inter text-xs uppercase tracking-widest text-slate-600">© 2026 LLMUSIC 기술 관리 엔진</p>
      </div>
      <div className="flex gap-lg">
        {["문서", "시스템 상태", "개인정보처리방침", "API"].map((item) => (
          <a key={item} className="font-inter text-xs uppercase tracking-widest text-slate-600 hover:text-[#e9c176] transition-colors" href="#">
            {item}
          </a>
        ))}
      </div>
    </footer>
  );
}

function HomeTopBar({
  onNavigate,
  isAuthenticated,
  username,
  onLoginClick,
  onSignupClick,
  onMyPageClick,
  onLogoutClick,
}: {
  onNavigate: (tab: TabKey) => void;
  isAuthenticated: boolean;
  username: string;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onMyPageClick: () => void;
  onLogoutClick: () => void;
}) {
  return (
    <nav className="z-50 flex w-full items-center justify-between border-b border-white/10 bg-[#0F121D]/80 px-16 py-6 shadow-[0_0_15px_rgba(212,175,55,0.1)] backdrop-blur-xl">
      <button type="button" className="text-2xl italic tracking-[0.18em] text-amber-500" style={{ fontFamily: '"Noto Serif", serif' }} onClick={() => onNavigate("home")}>
        LLMUSIC
      </button>
      <div className="hidden items-center gap-16 md:flex">
        {[
          ["HOME", "home"],
          ["RECOMMEND", "recommend"],
          ["AUTOMATION", "automation"],
          ["REPORTS", "reports"],
        ].map(([label, target]) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(target as TabKey)}
            className="text-sm uppercase tracking-[0.2em] text-white/70 transition-colors duration-500 hover:text-amber-500"
            style={{ fontFamily: '"Noto Serif", serif' }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-8">
        {isAuthenticated ? (
          <>
            <div
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#f3d7a0]"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              {username || "ADMIN"}
            </div>
            <button
              type="button"
              onClick={onMyPageClick}
              className="text-sm uppercase tracking-[0.2em] text-white/70 transition-colors duration-500 hover:text-white"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              MY PAGE
            </button>
            <button
              type="button"
              onClick={onLogoutClick}
              className="text-sm uppercase tracking-[0.2em] text-amber-500 transition-colors duration-500 hover:text-amber-400"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              LOGOUT
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onSignupClick}
              className="text-sm uppercase tracking-[0.2em] text-white/70 transition-colors duration-500 hover:text-white"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              SIGN UP
            </button>
            <button
              type="button"
              onClick={onLoginClick}
              className="text-sm uppercase tracking-[0.2em] text-amber-500 transition-colors duration-500 hover:text-amber-400"
              style={{ fontFamily: '"Noto Serif", serif' }}
            >
              SIGN IN
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function HomeFooter() {
  return (
    <footer className="w-full bg-[#0F121D] px-16 py-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6">
          <div className="text-lg italic text-amber-500" style={{ fontFamily: '"Noto Serif", serif' }}>LLMUSIC</div>
          <div className="flex gap-8">
            {["LEGACY", "SHOWROOMS", "SUPPORT", "LEGAL"].map((item) => (
              <a key={item} href="#" className="text-xs tracking-[0.18em] text-white/40 transition-all hover:text-white" style={{ fontFamily: '"Noto Serif", serif' }}>
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="text-center text-xs uppercase tracking-[0.18em] text-white/40" style={{ fontFamily: '"Noto Serif", serif' }}>© 2026 LLMUSIC. PULSING WITH POWER.</div>
      </div>
    </footer>
  );
}

export default function App() {
  const [tab, setTab] = useState<RouteKey>(() => pathToTab(window.location.pathname));
  const [status, setStatus] = useState<any>(null);
  const [statusError, setStatusError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [myPageModalOpen, setMyPageModalOpen] = useState(false);

  async function refreshStatus(probe = false) {
    try {
      const next = await fetchStatus(probe);
      setStatus(next);
      setStatusError("");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "상태 조회 실패");
    }
  }

  function navigate(nextTab: TabKey) {
    if (!isAuthenticated && nextTab !== "home") {
      window.history.pushState({}, "", "/login");
      window.sessionStorage.setItem("llmusic-login-redirect", tabToPath(nextTab));
      setTab("login");
      return;
    }
    const nextPath = tabToPath(nextTab);
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    setTab(nextTab);
  }

  async function handleLogin(username: string, password: string) {
    if (!username.trim()) {
      setLoginError("아이디를 입력해 주세요.");
      return;
    }
    if (!password.trim()) {
      setLoginError("비밀번호를 입력해 주세요.");
      return;
    }
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await loginRequest(username, password);
      setAuthToken(response.token);
      setIsAuthenticated(true);
      setAuthUser(response.username);
      const redirectPath = window.sessionStorage.getItem("llmusic-login-redirect") || "/recommend";
      window.sessionStorage.removeItem("llmusic-login-redirect");
      window.history.pushState({}, "", redirectPath);
      setTab(pathToTab(redirectPath));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "로그인 실패");
    } finally {
      setLoginBusy(false);
    }
  }

  function handleLogout() {
    clearAuthToken();
    setIsAuthenticated(false);
    setAuthUser("");
    setLoginError("");
    if (window.location.pathname !== "/home") window.history.pushState({}, "", "/home");
    setTab("home");
  }

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/home");
      setTab("home");
    }
    const handlePopState = () => {
      const nextTab = pathToTab(window.location.pathname);
      if (!isAuthenticated && !["home", "login"].includes(nextTab)) {
        window.history.replaceState({}, "", "/login");
        setTab("login");
        return;
      }
      setTab(nextTab);
    };
    window.addEventListener("popstate", handlePopState);
    refreshStatus(true).catch(() => undefined);
    if (!getAuthToken()) {
      setAuthChecked(true);
      setIsAuthenticated(false);
      setAuthUser("");
      const nextTab = pathToTab(window.location.pathname);
      if (!["home", "login"].includes(nextTab)) {
        window.history.replaceState({}, "", "/login");
        setTab("login");
      }
    } else {
      fetchMe()
        .then((response) => {
          setIsAuthenticated(true);
          setAuthUser(response.username);
        })
        .catch(() => {
          clearAuthToken();
          setIsAuthenticated(false);
          setAuthUser("");
          const nextTab = pathToTab(window.location.pathname);
          if (!["home", "login"].includes(nextTab)) {
            window.history.replaceState({}, "", "/login");
            setTab("login");
          }
        })
        .finally(() => setAuthChecked(true));
    }
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-on-background font-body-base flex flex-col">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_16%,rgba(0,240,255,0.08),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(182,0,248,0.07),transparent_20%),linear-gradient(180deg,#11131c_0%,#101117_50%,#0c0d13_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.08]" />
      <TopStatusBar status={status} onRefresh={() => refreshStatus(true)} />
      <HomeTopBar
        onNavigate={navigate}
        isAuthenticated={isAuthenticated}
        username={authUser}
        onLoginClick={() => {
          if (window.location.pathname !== "/login") window.history.pushState({}, "", "/login");
          setTab("login");
        }}
        onSignupClick={() => setSignupModalOpen(true)}
        onMyPageClick={() => setMyPageModalOpen(true)}
        onLogoutClick={handleLogout}
      />
      <main className={`relative z-10 flex-1 w-full ${tab === "home" ? "" : "max-w-[1720px] mx-auto px-4 py-8 md:px-6 lg:px-8 space-y-8"}`}>
        {tab === "home" ? <HomePage onNavigate={navigate} /> : null}
        {tab === "login" ? <LoginPage onLogin={handleLogin} busy={loginBusy} error={loginError} /> : null}
        {authChecked && isAuthenticated && tab === "recommend" ? <RecommendPage initialStatus={status} onStatusRefresh={() => refreshStatus(false)} /> : null}
        {authChecked && isAuthenticated && tab === "automation" ? <AutomationPage systemStatus={status} onStatusRefresh={() => refreshStatus(false)} /> : null}
        {authChecked && isAuthenticated && tab === "reports" ? <ReportPage /> : null}
      </main>
      <div className="relative z-10">
        <HomeFooter />
      </div>
      {statusError ? <div className="fixed bottom-4 right-4 rounded-lg border border-red-500/30 bg-red-950/80 px-3 py-2 text-sm text-red-200">{statusError}</div> : null}
      <AppModal
        open={signupModalOpen}
        title="준비중입니다"
        description="회원가입 기능은 아직 준비 중입니다. 현재는 관리자 계정으로만 로그인할 수 있습니다."
        confirmLabel="확인"
        onClose={() => setSignupModalOpen(false)}
      />
      <AppModal
        open={myPageModalOpen}
        title="준비중입니다"
        description="마이페이지 기능은 아직 준비 중입니다. 현재는 로그인 상태 표시만 먼저 연결했습니다."
        confirmLabel="확인"
        onClose={() => setMyPageModalOpen(false)}
      />
    </div>
  );
}
