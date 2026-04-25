import { FormEvent, useEffect, useState } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { Clock3, FileStack, Play, RefreshCw, ShieldCheck } from "lucide-react";

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

const MotionCard = motion.create(Card);

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

  const metricCards = [
    { icon: <Play size={18} />, label: "현재 단계", value: stepLabels[status?.current_step ?? "idle"] },
    { icon: <ShieldCheck size={18} />, label: "비교 가능", value: status?.comparison_ready ? "준비됨" : "기준 대기" },
    { icon: <Clock3 size={18} />, label: "다음 예약", value: status?.next_run_at ?? "미설정" },
    { icon: <FileStack size={18} />, label: "마지막 결과", value: status?.last_result ?? "-" },
  ];

  return (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider" }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={1.5}>
            <Typography variant="overline" color="primary.light">
              Automation
            </Typography>
            <Typography variant="h3">차트 수집과 리포트 생성을 운영 화면처럼 관리합니다.</Typography>
            <Typography variant="body1" color="text.secondary">
              첫 실행은 기준 저장, 두 번째부터 비교 분석.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {metricCards.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={1.2}>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", color: "primary.light" }}>
                    {item.icon}
                    <Typography variant="overline" color="text.secondary">
                      {item.label}
                    </Typography>
                  </Box>
                  <Typography variant="h6">{item.value}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h5">실행 제어</Typography>
                  <Button variant="contained" size="large" startIcon={<Play size={18} />} onClick={handleRunNow}>
                    지금 실행
                  </Button>
                  <Stack component="form" spacing={2} onSubmit={handleScheduleSave}>
                    <TextField
                      type="time"
                      label="매일 실행 시각"
                      value={timeValue}
                      onChange={(event) => setTimeValue(event.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Stack direction="row" spacing={1.5}>
                      <Button type="submit" variant="contained">
                        저장
                      </Button>
                      <Button variant="outlined" color="inherit" onClick={handleScheduleDisable}>
                        끄기
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <StatusPanel
              title="연결 상태"
              items={[
                { label: "Genie", value: systemStatus?.genie?.status ?? "-", meta: systemStatus?.genie?.note },
                { label: "OpenAI", value: systemStatus?.openai?.status ?? "-", meta: systemStatus?.openai?.model },
                { label: "로컬 모델", value: systemStatus?.local_models?.status ?? "-", meta: systemStatus?.local_models?.model_id },
              ]}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5">실행 로그</Typography>
                    <Typography variant="body2" color="text.secondary">
                      최근 단계 기록
                    </Typography>
                  </Stack>
                  <Button variant="outlined" color="inherit" size="small" startIcon={<RefreshCw size={16} />} onClick={() => refresh()}>
                    새로고침
                  </Button>
                </Box>

                <Stack spacing={1.5}>
                  {(status?.activity_log ?? []).slice().reverse().map((entry: any, index: number) => (
                    <MotionCard
                      key={`${entry.time}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.18 }}
                      elevation={0}
                      sx={{ borderRadius: 4, border: "1px solid", borderColor: "divider" }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Grid container spacing={2} sx={{ alignItems: "center" }}>
                          <Grid size={{ xs: 12, sm: 3 }}>
                            <Typography variant="subtitle2" color="primary.light">
                              {stepLabels[entry.step] ?? entry.step}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 9 }}>
                            <Stack spacing={0.5}>
                              <Typography variant="body1">{entry.message}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.time}
                              </Typography>
                            </Stack>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </MotionCard>
                  ))}
                  {!status?.activity_log?.length ? (
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                      <CardContent sx={{ p: 4 }}>
                        <Typography color="text.secondary">로그가 아직 없습니다.</Typography>
                      </CardContent>
                    </Card>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack spacing={0.5}>
                    <Typography variant="h5">최근 산출물</Typography>
                    <Typography variant="body2" color="text.secondary">
                      마지막 실행 기준
                    </Typography>
                  </Stack>
                  <Grid container spacing={1.5}>
                    {status?.last_outputs && Object.keys(status.last_outputs).length ? (
                      Object.entries(status.last_outputs).map(([key, value]) => (
                        <Grid key={key} size={{ xs: 12, md: 6 }}>
                          <Card variant="outlined" sx={{ borderRadius: 4 }}>
                            <CardContent sx={{ p: 2 }}>
                              <Stack spacing={1}>
                                <Typography variant="overline" color="text.secondary">
                                  {key}
                                </Typography>
                                <Typography variant="body2">{String(value)}</Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid size={12}>
                        <Card variant="outlined" sx={{ borderRadius: 4 }}>
                          <CardContent sx={{ p: 4 }}>
                            <Typography color="text.secondary">산출물이 아직 없습니다.</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {message ? (
        <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid", borderColor: "primary.main", backgroundColor: "rgba(255,122,69,0.08)" }}>
          <CardContent>
            <Typography>{message}</Typography>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
