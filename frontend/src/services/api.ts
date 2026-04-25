export type StatusResponse = Record<string, any>;

export type RecommendPayload = {
  emotion: string;
  situation: string;
  korean_only: boolean;
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

export async function fetchStatus(probe = false): Promise<StatusResponse> {
  const response = await fetch(`/api/status${probe ? "?probe=1" : ""}`);
  if (!response.ok) throw new Error("상태 조회 실패");
  return response.json();
}

export async function fetchAutomationStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/automation/status");
  if (!response.ok) throw new Error("자동화 상태 조회 실패");
  return response.json();
}

export async function recommend(payload: RecommendPayload) {
  const response = await fetch("/api/recommend", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? "추천 실패");
  }
  return response.json();
}

export async function runAutomation() {
  const response = await fetch("/api/automation/run", { method: "POST" });
  if (!response.ok) throw new Error("자동화 실행 실패");
  return response.json();
}

export async function updateSchedule(enabled: boolean, time: string) {
  const response = await fetch("/api/automation/schedule", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ enabled, time }),
  });
  if (!response.ok) throw new Error("스케줄 저장 실패");
  return response.json();
}
