import { Card, CardContent, Chip, Grid, Stack, Typography } from "@mui/material";

type StatusItem = { label: string; value: string; meta?: string };

type Props = {
  title: string;
  items: StatusItem[];
  compact?: boolean;
};

function colorForValue(value: string) {
  if (value.includes("연결") || value.includes("준비")) return "success";
  if (value.includes("실행") || value.includes("대기")) return "warning";
  if (value.includes("실패") || value.includes("없음") || value.includes("미")) return "default";
  return "primary";
}

export default function StatusPanel({ title, items, compact = false }: Props) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{title}</Typography>
          <Grid container spacing={1.5}>
            {items.map((item) => (
              <Grid key={`${title}-${item.label}`} size={{ xs: 12, sm: compact ? 12 : 6, md: compact ? 12 : 4 }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={1}>
                      <Typography variant="overline" sx={{ color: "text.secondary", lineHeight: 1.2 }}>
                        {item.label}
                      </Typography>
                      <Chip
                        label={item.value}
                        color={colorForValue(item.value) as any}
                        variant={item.value.includes("연결") || item.value.includes("준비") ? "filled" : "outlined"}
                        sx={{ width: "fit-content" }}
                      />
                      {item.meta ? (
                        <Typography variant="body2" color="text.secondary">
                          {item.meta}
                        </Typography>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}
