export type StatusResponse = Record<string, any>;
export type AuthResponse = { token: string; username: string };

export type RecommendPayload = {
  emotion: string;
  situation: string;
  korean_only: boolean;
  variation?: number;
  engine_mode?: "auto" | "openai" | "local" | "template";
};

const AUTH_TOKEN_KEY = "llmusic-auth-token";

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function apiFetch(input: string, init: RequestInit = {}, authRequired = false) {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (authRequired) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? "로그인 실패");
  return data;
}

export async function fetchMe(): Promise<{ username: string }> {
  const response = await apiFetch("/api/auth/me", {}, true);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? "인증 확인 실패");
  return data;
}

export async function fetchStatus(probe = false): Promise<StatusResponse> {
  const response = await fetch(`/api/status${probe ? "?probe=1" : ""}`);
  if (!response.ok) throw new Error("상태 조회 실패");
  return response.json();
}

export async function fetchAutomationStatus(): Promise<StatusResponse> {
  const response = await apiFetch("/api/automation/status", {}, true);
  if (!response.ok) throw new Error("자동화 상태 조회 실패");
  return response.json();
}

export async function recommend(payload: RecommendPayload) {
  const response = await apiFetch("/api/recommend", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? "추천 실패");
  }
  return response.json();
}

export async function runAutomation() {
  const response = await apiFetch("/api/automation/run", { method: "POST" }, true);
  if (!response.ok) throw new Error("자동화 실행 실패");
  return response.json();
}

export async function updateSchedule(enabled: boolean, time: string) {
  const response = await apiFetch("/api/automation/schedule", {
    method: "POST",
    body: JSON.stringify({ enabled, time }),
  }, true);
  if (!response.ok) throw new Error("스케줄 저장 실패");
  return response.json();
}

export async function fetchReports(): Promise<StatusResponse> {
  const response = await apiFetch("/api/automation/reports", {}, true);
  if (!response.ok) throw new Error("리포트 목록 조회 실패");
  return response.json();
}

export async function fetchReportContent(reportName: string): Promise<string> {
  const response = await apiFetch(`/api/automation/reports/${encodeURIComponent(reportName)}`, {}, true);
  if (!response.ok) throw new Error("리포트 조회 실패");
  return response.text();
}
