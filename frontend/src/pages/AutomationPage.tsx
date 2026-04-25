import { FormEvent, useEffect, useState } from "react";

import StatusPanel from "../components/StatusPanel";
import { fetchAutomationStatus, runAutomation, updateSchedule } from "../services/api";

type Props = {
  systemStatus?: any;
  onStatusRefresh?: () => void;
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

  async function handleRunNow() {
    try {
      await runAutomation();
      setMessage("자동화 파이프라인 실행을 시작했습니다.");
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
      setMessage("자동 실행 시간이 저장되었습니다.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "저장 실패");
    }
  }

  async function handleScheduleDisable() {
    try {
      await updateSchedule(false, timeValue);
      setMessage("자동 실행이 비활성화되었습니다.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "비활성화 실패");
    }
  }

  return (
    <div className="page-grid">
      <section className="hero panel">
        <p className="eyebrow">Automation</p>
        <h1>크롤링/보고서 자동화</h1>
        <p className="lead">
          서버가 켜져 있는 동안 사용자가 지정한 시각에 지니 크롤링, diff 생성, OpenAI 보고서 생성을 순서대로 실행합니다.
        </p>
        <p className="lead">
          수동 실행과 예약 실행을 모두 지원하며, 산출물 파일명에는 실행 시각이 함께 기록됩니다.
        </p>
      </section>

      {systemStatus ? (
        <StatusPanel
          title="API 연결 상태"
          items={[
            { label: "iTunes Search", value: systemStatus.itunes?.status ?? "-", meta: systemStatus.itunes?.note },
            { label: "MusicBrainz", value: systemStatus.musicbrainz?.status ?? "-", meta: systemStatus.musicbrainz?.note },
            { label: "Last.fm", value: systemStatus.lastfm?.status ?? "-" },
            { label: "OpenAI", value: systemStatus.openai?.status ?? "-", meta: systemStatus.openai?.model },
            { label: "로컬 모델", value: systemStatus.local_models?.status ?? "-" },
          ]}
        />
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <h2>현재 상태</h2>
          <button className="secondary-button" onClick={() => refresh()}>
            새로고침
          </button>
        </div>
        {status ? (
          <div className="automation-meta">
            <div><strong>실행 중</strong><span>{String(status.running)}</span></div>
            <div><strong>타임존</strong><span>{status.timezone}</span></div>
            <div><strong>자동 실행</strong><span>{status.schedule_enabled ? "활성화" : "비활성화"}</span></div>
            <div><strong>실행 시간</strong><span>{status.schedule_time ?? "-"}</span></div>
            <div><strong>다음 실행</strong><span>{status.next_run_at ?? "-"}</span></div>
            <div><strong>마지막 결과</strong><span>{status.last_result ?? "-"}</span></div>
            <div><strong>마지막 시작</strong><span>{status.last_started_at ?? "-"}</span></div>
            <div><strong>마지막 종료</strong><span>{status.last_finished_at ?? "-"}</span></div>
            <div><strong>에러</strong><span>{status.last_error ?? "-"}</span></div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>수동 실행</h2>
        </div>
        <p>필요할 때 즉시 크롤링과 분석을 실행할 수 있습니다. 동일한 날에도 여러 번 실행할 수 있습니다.</p>
        <button className="primary-button" onClick={handleRunNow}>
          지금 실행
        </button>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>자동 실행 시간</h2>
        </div>
        <p>지정한 시각의 정각에 자동 파이프라인이 실행됩니다. 서버가 켜져 있어야 예약 실행이 동작합니다.</p>
        <form className="schedule-form" onSubmit={handleScheduleSave}>
          <label className="field">
            <span>매일 실행할 시간</span>
            <input type="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} />
          </label>
          <div className="button-row">
            <button className="primary-button" type="submit">자동 실행 저장</button>
            <button className="secondary-button" type="button" onClick={handleScheduleDisable}>자동 실행 끄기</button>
          </div>
        </form>
      </section>

      {status?.last_outputs ? (
        <section className="panel">
          <div className="section-heading">
            <h2>최근 산출물</h2>
          </div>
          <div className="automation-meta">
            {Object.entries(status.last_outputs).map(([key, value]) => (
              <div key={key}>
                <strong>{key}</strong>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {message ? <section className="panel notice-panel">{message}</section> : null}
    </div>
  );
}
