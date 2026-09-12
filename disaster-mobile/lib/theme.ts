export const colors = {
  bg: "#07111C",
  bg2: "#0B1624",
  card: "#122033",
  cardSoft: "#173049",
  line: "#24344A",
  text: "#F4F7FB",
  muted: "#9AA8B8",
  amber: "#F5A524",
  red: "#E23B3B",
  green: "#2F9E6A",
  blue: "#3B82F6",
  purple: "#7C3AED",
  ink: "#07111C",
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

