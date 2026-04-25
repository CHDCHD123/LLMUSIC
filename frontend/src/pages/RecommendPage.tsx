import { FormEvent, useEffect, useState } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Link,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { ExternalLink, Headphones, Sparkles } from "lucide-react";

import StatusPanel from "../components/StatusPanel";
import { fetchStatus, recommend } from "../services/api";

const emotions = ["행복", "슬픔", "화남", "평온", "신남", "그리움", "집중", "운동", "휴식", "로맨틱"];
const MotionCard = motion.create(Card);

type Props = {
  initialStatus?: any;
  onStatusRefresh?: () => void;
};

export default function RecommendPage({ initialStatus, onStatusRefresh }: Props) {
  const [emotion, setEmotion] = useState("행복");
  const [situation, setSituation] = useState("");
  const [koreanOnly, setKoreanOnly] = useState(false);
  const [status, setStatus] = useState<any>(initialStatus ?? null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialStatus) fetchStatus(true).then(setStatus).catch((err) => setError(err.message));
  }, [initialStatus]);

  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await recommend({ emotion, situation, korean_only: koreanOnly });
      setResult(response);
      const nextStatus = await fetchStatus(false);
      setStatus(nextStatus);
      onStatusRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추천 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Grid container spacing={3} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Stack spacing={1.5}>
                <Typography variant="overline" color="primary.light">
                  Recommendation
                </Typography>
                <Typography variant="h3">지금 듣기 좋은 곡을 바로 찾습니다.</Typography>
                <Typography variant="body1" color="text.secondary">
                  입력은 짧게, 결과는 빠르게. 검색 결과를 듣고 바로 열 수 있게 정리합니다.
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip label="iTunes" color="primary" />
                <Chip label="MusicBrainz" color="secondary" />
                <Chip label="Last.fm" variant="outlined" />
                <Chip label={status?.genie?.status ?? "Genie"} variant="outlined" />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider", position: "sticky", top: 108 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                <Stack spacing={0.5}>
                  <Typography variant="h5">추천 검색</Typography>
                  <Typography variant="body2" color="text.secondary">
                    감정과 상황만 넣으면 됩니다.
                  </Typography>
                </Stack>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {emotions.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      clickable
                      color={item === emotion ? "primary" : "default"}
                      variant={item === emotion ? "filled" : "outlined"}
                      onClick={() => setEmotion(item)}
                    />
                  ))}
                </Box>

                <TextField
                  label="상황"
                  placeholder="비 오는 밤, 퇴근길, 카페에서 공부"
                  value={situation}
                  onChange={(event) => setSituation(event.target.value)}
                  fullWidth
                />

                <FormControlLabel
                  control={<Switch checked={koreanOnly} onChange={(event) => setKoreanOnly(event.target.checked)} />}
                  label="한국 노래 위주"
                />

                <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={<Sparkles size={18} />}>
                  {loading ? "추천 생성 중..." : "추천받기"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <StatusPanel
              title="연결 상태"
              items={[
                { label: "iTunes", value: status?.itunes?.status ?? "-", meta: status?.itunes?.note },
                { label: "MusicBrainz", value: status?.musicbrainz?.status ?? "-", meta: status?.musicbrainz?.note },
                { label: "Last.fm", value: status?.lastfm?.status ?? "-" },
                { label: "Genie", value: status?.genie?.status ?? "-", meta: status?.genie?.note },
                { label: "OpenAI", value: status?.openai?.status ?? "-", meta: status?.openai?.model },
              ]}
            />

            <Card elevation={0} sx={{ borderRadius: 5, border: "1px solid", borderColor: "divider" }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Stack spacing={0.5}>
                      <Typography variant="h5">추천 결과</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result ? result.model_used : "아직 생성 전"}
                      </Typography>
                    </Stack>
                  </Box>

                  {loading ? (
                    <Stack spacing={2}>
                      <Skeleton variant="rounded" height={84} animation="wave" />
                      {[0, 1, 2, 3].map((item) => (
                        <Card key={item} variant="outlined" sx={{ borderRadius: 4 }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                              <Skeleton variant="rounded" width={72} height={72} animation="wave" />
                              <Box sx={{ flex: 1 }}>
                                <Skeleton width="36%" animation="wave" />
                                <Skeleton width="58%" animation="wave" />
                                <Skeleton width="28%" animation="wave" />
                              </Box>
                              <Skeleton variant="rounded" width={90} height={36} animation="wave" />
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : result ? (
                    <Stack spacing={2}>
                      <Card variant="outlined" sx={{ borderRadius: 4, backgroundColor: "rgba(255,255,255,0.02)" }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                            {result.explanation}
                          </Typography>
                        </CardContent>
                      </Card>

                      <Stack spacing={1.5}>
                        {result.recommendations.map((item: any, index: number) => (
                          <MotionCard
                            key={`${item.title}-${item.artist}`}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.24 }}
                            elevation={0}
                            sx={{ borderRadius: 4, border: "1px solid", borderColor: "divider" }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                                <Grid size={{ xs: 12, sm: 1 }}>
                                  <Typography variant="h6" color="primary.light">
                                    {String(index + 1).padStart(2, "0")}
                                  </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 2 }}>
                                  {item.artwork_url ? (
                                    <Box
                                      component="img"
                                      src={item.artwork_url}
                                      alt={`${item.title} artwork`}
                                      sx={{ width: 72, height: 72, borderRadius: 3, objectFit: "cover" }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: 72,
                                        height: 72,
                                        borderRadius: 3,
                                        display: "grid",
                                        placeItems: "center",
                                        background: "linear-gradient(135deg, rgba(255,122,69,0.28), rgba(94,160,255,0.22))",
                                        typography: "caption",
                                      }}
                                    >
                                      {item.source}
                                    </Box>
                                  )}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 5 }}>
                                  <Stack spacing={0.5}>
                                    <Typography variant="h6">{item.title}</Typography>
                                    <Typography variant="body1" color="text.secondary">
                                      {item.artist}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {item.album ?? "앨범 정보 없음"}
                                    </Typography>
                                  </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 2 }}>
                                  <Stack spacing={1}>
                                    <Chip size="small" label={item.source} color="secondary" variant="outlined" />
                                    <Typography variant="caption" color="text.secondary">
                                      {item.rank ? `지니 ${item.rank}위` : "검색 결과"}
                                    </Typography>
                                  </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 2 }}>
                                  <Stack direction={{ xs: "row", sm: "column" }} spacing={1}>
                                    {item.external_url ? (
                                      <Button
                                        component={Link}
                                        href={item.external_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ExternalLink size={14} />}
                                      >
                                        열기
                                      </Button>
                                    ) : null}
                                    {item.preview_url ? (
                                      <Button
                                        component={Link}
                                        href={item.preview_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        variant="contained"
                                        size="small"
                                        startIcon={<Headphones size={14} />}
                                      >
                                        미리듣기
                                      </Button>
                                    ) : null}
                                  </Stack>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </MotionCard>
                        ))}
                      </Stack>
                    </Stack>
                  ) : (
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                      <CardContent sx={{ p: 4 }}>
                        <Typography color="text.secondary">추천 결과가 여기에 표시됩니다.</Typography>
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {error ? (
        <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid", borderColor: "error.main", backgroundColor: "rgba(211,47,47,0.08)" }}>
          <CardContent>
            <Typography color="error.light">{error}</Typography>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
