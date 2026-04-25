import { useEffect, useMemo, useState } from "react";

import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Stack,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import { Activity, Bot, Radio } from "lucide-react";

import AutomationPage from "./pages/AutomationPage";
import RecommendPage from "./pages/RecommendPage";
import { fetchStatus } from "./services/api";

const tabs = [
  { key: "recommend", label: "추천", path: "/recommend" },
  { key: "automation", label: "자동화", path: "/automation" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

function pathToTab(pathname: string): TabKey {
  return pathname === "/automation" ? "automation" : "recommend";
}

function tabToPath(tab: TabKey): string {
  return tabs.find((item) => item.key === tab)?.path ?? "/recommend";
}

const MotionBox = motion.create(Box);

export default function App() {
  const [tab, setTab] = useState<TabKey>(() => pathToTab(window.location.pathname));
  const [status, setStatus] = useState<any>(null);
  const [statusError, setStatusError] = useState("");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          primary: { main: "#ff7a45" },
          secondary: { main: "#5ea0ff" },
          background: {
            default: "#0a1018",
            paper: "#121a24",
          },
        },
        shape: { borderRadius: 20 },
        typography: {
          fontFamily: '"Pretendard Variable","SUIT Variable","Apple SD Gothic Neo","Segoe UI",sans-serif',
          h3: { fontWeight: 700, letterSpacing: "-0.04em" },
          h4: { fontWeight: 700, letterSpacing: "-0.03em" },
          h5: { fontWeight: 700, letterSpacing: "-0.02em" },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                background: "rgba(9, 14, 22, 0.78)",
                backdropFilter: "blur(18px)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
        },
      }),
    [],
  );

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
    const nextPath = tabToPath(nextTab);
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    setTab(nextTab);
  }

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState({}, "", "/recommend");
      setTab("recommend");
    }
    const handlePopState = () => setTab(pathToTab(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    refreshStatus(true).catch(() => undefined);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, rgba(255,122,69,0.14), transparent 24%), radial-gradient(circle at top right, rgba(94,160,255,0.14), transparent 22%), linear-gradient(180deg, #0a1018 0%, #0d1520 55%, #0a1018 100%)",
        }}
      >
        <AppBar position="sticky" elevation={0}>
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ py: 1.5, gap: 2, flexWrap: "wrap" }}>
              <Stack spacing={0.5} sx={{ minWidth: 280, flex: 1 }}>
                <Typography variant="overline" sx={{ color: "primary.light", letterSpacing: "0.22em" }}>
                  LLMUSIC
                </Typography>
                <Typography variant="h6">Music concierge + live chart automation</Typography>
              </Stack>

              <Tabs
                value={tab}
                onChange={(_, value) => navigate(value)}
                textColor="inherit"
                indicatorColor="primary"
                sx={{
                  minHeight: 40,
                  "& .MuiTab-root": { minHeight: 40, fontWeight: 700 },
                }}
              >
                {tabs.map((item) => (
                  <Tab key={item.key} value={item.key} label={item.label} />
                ))}
              </Tabs>

              <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Chip icon={<Radio size={14} />} label={`iTunes ${status?.itunes?.status ?? "-"}`} size="small" variant="outlined" />
                <Chip icon={<Activity size={14} />} label={`Genie ${status?.genie?.status ?? "-"}`} size="small" variant="outlined" />
                <Chip icon={<Bot size={14} />} label={`OpenAI ${status?.openai?.status ?? "-"}`} size="small" color="primary" />
                <Button size="small" variant="outlined" color="inherit" onClick={() => refreshStatus(true)}>
                  상태 새로고침
                </Button>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>
          <MotionBox initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {tab === "recommend" ? (
              <RecommendPage initialStatus={status} onStatusRefresh={() => refreshStatus(false)} />
            ) : (
              <AutomationPage systemStatus={status} onStatusRefresh={() => refreshStatus(false)} />
            )}
          </MotionBox>
        </Container>

        <Box
          component="footer"
          sx={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(6, 10, 16, 0.92)",
            mt: 4,
          }}
        >
          <Container maxWidth="xl" sx={{ py: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                LLMUSIC
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statusError || "Public music APIs, OpenAI explanations, Genie automation"}
              </Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
