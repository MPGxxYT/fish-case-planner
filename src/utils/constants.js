export const PAN_WIDTHS = [3, 6, 8, 12];
export const PAN_DEPTHS_SPLIT = ["full", "half", "third"];
export const DEPTH_UNITS = { full: 12, half: 6, third: 4 };
export const CASE_DEPTH = 12;
export const DEFAULT_CASE_WIDTH = 81;

export const PRODUCT_COLORS = {
  warm: { bg: "#f97316", label: "Warm" },
  cool: { bg: "#9ca3af", label: "Cool" },
  red: { bg: "#dc2626", label: "Red" },
};

export const COOK_TYPES = ["Raw", "Cooked", "Unassigned"];
export const FISH_TYPES = ["Finfish", "Shellfish", "Unassigned"];

export const PRODUCT_LABELS = [
  { key: "previously_frozen", label: "Previously Frozen", abbr: "PF",   color: "#93c5fd" },
  { key: "fresh",             label: "Fresh",             abbr: "Fr",   color: "#86efac" },
  { key: "msc",               label: "MSC",               abbr: "MSC",  color: "#60a5fa" },
  { key: "wild",              label: "Wild",              abbr: "Wild", color: "#34d399" },
  { key: "yellow_rated",      label: "Yellow Rated",      abbr: "YR",   color: "#fcd34d" },
  { key: "green_rated",       label: "Green Rated",       abbr: "GR",   color: "#4ade80" },
  { key: "farm_raised",       label: "Farm Raised",       abbr: "Frm",  color: "#fb923c" },
];

export const FONT = `'JetBrains Mono','SF Mono','Fira Code',monospace`;
export const DFONT = `'DM Sans','Segoe UI',system-ui,sans-serif`;

export const T = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceAlt: "#1a2235",
  border: "#1e293b",
  borderLight: "#334155",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  accent: "#38bdf8",
  accentDim: "#0c4a6e",
  danger: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
};

export const S = {
  ov: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  mod: { background: T.surface, borderRadius: 12, padding: 20, border: `1px solid ${T.borderLight}`, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  inp: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", color: T.text, fontSize: 13, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box" },
  sel: { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 4px", color: T.text, fontSize: 10, fontFamily: FONT, outline: "none", flex: 1, boxSizing: "border-box" },
  fl: { display: "flex", flexDirection: "column", gap: 4, fontSize: 10, color: T.textMuted, fontFamily: FONT, textTransform: "uppercase", letterSpacing: 0.5 },
  bp: { background: T.accent, color: T.bg, border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: DFONT },
  bs: { background: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: DFONT },
  ch: { background: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: FONT, fontWeight: 600 },
  hb: { background: T.surfaceAlt, color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: DFONT, fontWeight: 600 },
  tb: { background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "0 3px", lineHeight: 1 },
};
