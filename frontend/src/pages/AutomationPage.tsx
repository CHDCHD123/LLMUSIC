import { FormEvent, useEffect, useState } from "react";

import StatusPanel from "../components/StatusPanel";
import { fetchAutomationStatus, runAutomation, updateSchedule } from "../services/api";

type Props = {
  systemStatus?: any;
  onStatusRefresh?: () => void;
};

const stepLabels: Record<string, string> = {
  idle: "대기",
  queued: "준비",
  crawl: "크롤링",
  baseline: "기준 저장",
  diff: "비교 분석",
  report: "리포트",
  done: "완료",
  failed: "실패",
};

export default function AutomationPage({ systemStatus, onStatusRefresh }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [timeValue, setTimeValue] = useState("17:00");
  const [message, setMessage] = useState("");

  async function refresh() {
    const response = await fetchAutomationStatus();
    setStatus(response);
    setTimeValue(response.schedule_time ?? "17:00");
  }

  useEffect(() => {
    refresh().catch((err) => setMessage(err.message));
  }, []);

  useEffect(() => {
    if (!status?.running) return;
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [status?.running]);

  async function handleRunNow() {
    try {
      await runAutomation();
      setMessage("실행을 시작했습니다.");
      await refresh();
      onStatusRefresh?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "실행 실패");
    }
  }

  async function handleScheduleSave(event: FormEvent) {
    event.preventDefault();
    try {
      await updateSchedule(true, timeValue);
      setMessage("자동 실행 저장 완료");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장 실패");
    }
  }

  async function handleScheduleDisable() {
    try {
      await updateSchedule(false, timeValue);
      setMessage("자동 실행 비활성화");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "비활성화 실패");
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">Automation</p>
          <h2>차트 수집, 비교, 리포트 생성 흐름을 한 번에 관리합니다.</h2>
          <p className="lead">첫 실행은 기준 데이터만 저장하고, 두 번째부터 비교 분석을 시작합니다.</p>
        </div>
        <div className="hero-pill-row">
          <span className="hero-pill">{stepLabels[status?.current_step ?? "idle"]}</span>
          <span className="hero-pill">{status?.comparison_ready ? "비교 가능" : "비교 전"}</span>
          <span className="hero-pill">{status?.schedule_enabled ? "예약 켜짐" : "예약 꺼짐"}</span>
        </div>
      </section>

      <div className="page-columns">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>컨트롤</h2>
              <p className="subtle-copy">수동 실행과 예약 설정</p>
            </div>
          </div>
          <div className="control-stack">
            <button className="primary-button large-button" onClick={handleRunNow}>
              지금 실행
            </button>
            <form className="schedule-form" onSubmit={handleScheduleSave}>
              <label className="field">
                <span>매일 실행 시각</span>
                <input type="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} />
              </label>
              <div className="button-row">
                <button className="primary-button" type="submit">저장</button>
                <button className="secondary-button" type="button" onClick={handleScheduleDisable}>끄기</button>
              </div>
            </form>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>실행 상태</h2>
              <p className="subtle-copy">{status?.progress_label ?? "대기 중"}</p>
            </div>
            <button className="secondary-button small-button" onClick={() => refresh()}>
              새로고침
            </button>
          </div>
          <div className="state-grid">
            <div className="state-card">
              <strong>현재 단계</strong>
              <span>{stepLabels[status?.current_step ?? "idle"]}</span>
              <small>{status?.running ? "실행 중" : "대기 중"}</small>
            </div>
            <div className="state-card">
              <strong>마지막 결과</strong>
              <span>{status?.last_result ?? "-"}</span>
              <small>{status?.last_error ?? "에러 없음"}</small>
            </div>
            <div className="state-card">
              <strong>다음 예약</strong>
              <span>{status?.next_run_at ?? "미설정"}</span>
              <small>{status?.schedule_time ?? "-"}</small>
            </div>
            <div className="state-card">
              <strong>비교 상태</strong>
              <span>{status?.comparison_ready ? "준비됨" : "기준 데이터 대기"}</span>
              <small>{status?.last_started_at ?? "-"}</small>
            </div>
          </div>
        </section>
      </div>

      <div className="page-columns">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>실행 로그</h2>
              <p className="subtle-copy">최근 단계 기록</p>
            </div>
          </div>
          <div className="log-list">
            {(status?.activity_log ?? []).slice().reverse().map((entry: any, index: number) => (
              <article className="log-row" key={`${entry.time}-${index}`}>
                <div className="log-step">{stepLabels[entry.step] ?? entry.step}</div>
                <div className="log-copy">
                  <strong>{entry.message}</strong>
                  <small>{entry.time}</small>
                </div>
              </article>
            ))}
            {!status?.activity_log?.length ? <div className="empty-copy empty-panel">로그가 아직 없습니다.</div> : null}
          </div>
        </section>

        <div className="stack-panel">
          <StatusPanel
            title="연결 상태"
            items={[
              { label: "Genie", value: systemStatus?.genie?.status ?? "-", meta: systemStatus?.genie?.note },
              { label: "OpenAI", value: systemStatus?.openai?.status ?? "-", meta: systemStatus?.openai?.model },
              { label: "로컬 모델", value: systemStatus?.local_models?.status ?? "-", meta: systemStatus?.local_models?.model_id },
            ]}
          />

          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>최근 산출물</h2>
                <p className="subtle-copy">마지막 실행 기준</p>
              </div>
            </div>
            <div className="output-list">
              {status?.last_outputs && Object.keys(status.last_outputs).length ? (
                Object.entries(status.last_outputs).map(([key, value]) => (
                  <article className="output-card" key={key}>
                    <strong>{key}</strong>
                    <small>{String(value)}</small>
                  </article>
                ))
              ) : (
                <div className="empty-copy empty-panel">산출물이 아직 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {message ? <section className="panel notice-panel">{message}</section> : null}
    </div>
  );
}
