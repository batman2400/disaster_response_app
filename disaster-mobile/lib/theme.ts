export const colors = {
  bg: "#F8F9FB",
  bg2: "#F1F3F6",
  card: "#FFFFFF",
  cardSoft: "#EEF2F7",
  line: "#E2E6EC",
  text: "#1A2332",
  muted: "#6B7A8D",
  amber: "#D97706",
  red: "#DC2626",
  green: "#16A34A",
  blue: "#2563EB",
  purple: "#7C3AED",
  ink: "#FFFFFF",
};

export const urgencyColor = {
  LOW: colors.green,
  MEDIUM: colors.amber,
  CRITICAL: colors.red,
} as const;

export const wardStatusColor = {
  NORMAL: colors.green,
  WATCH: colors.amber,
  CRITICAL: colors.red,
} as const;
