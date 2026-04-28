import React from "react";
export const ACCENT      = "#C8FF00";
export const ACCENT_DIM  = "rgba(200,255,0,0.12)";
export const INK         = "#0A0A0A";
export const INK_60      = "rgba(10,10,10,0.6)";
export const INK_20      = "rgba(10,10,10,0.2)";
export const PAPER       = "#F2EFEA";
export const PAPER_DARK  = "#E4E0D8";
export const BG          = "#0A0A0A";
export const FG          = "#F2EFEA";
export const CRISIS      = "#FF3B2F";
export const CAUTION     = "#FF8C00";
export const CLEAR       = "#00C46A";
export const WHITE       = "#FFFFFF";

export const FONT_DISPLAY = `"ProductSans", "Helvetica Neue", Arial, sans-serif`;
export const FONT_BODY    = `"Inter", "DM Sans", sans-serif`;
export const FONT_MONO    = `"Space Mono", "Courier New", monospace`;

export const pageShell: React.CSSProperties = {
  background: PAPER,
  color: INK,
  minHeight: "100vh",
  overflowX: "hidden",
  fontFamily: FONT_BODY,
};
export const pageDark: React.CSSProperties = {
  background: BG,
  color: FG,
  minHeight: "100vh",
  overflowX: "hidden",
  fontFamily: FONT_BODY,
};
export const section: React.CSSProperties = {
  padding: "120px 40px",
  borderTop: `1px solid ${INK_20}`,
  position: "relative",
  zIndex: 1,
};

export const sectionDark: React.CSSProperties = {
  padding: "120px 40px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  position: "relative",
  zIndex: 1,
};
export const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  background: ACCENT,
  color: INK,
  fontFamily: FONT_MONO,
  fontWeight: 700,
  fontSize: "0.78rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  padding: "14px 28px",
  border: `1px solid ${ACCENT}`,
  borderRadius: 0,
  cursor: "none",
  transition: "opacity 0.18s, transform 0.18s",
};
export const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  background: "transparent",
  color: INK,
  fontFamily: FONT_MONO,
  fontWeight: 400,
  fontSize: "0.78rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  padding: "13px 28px",
  border: `1px solid ${INK}`,
  borderRadius: 0,
  cursor: "none",
  transition: "background 0.18s, color 0.18s",
};

export const btnGhostDark: React.CSSProperties = {
  ...btnGhost,
  color: FG,
  border: "1px solid rgba(242,239,234,0.25)",
};

export const card: React.CSSProperties = {
  background: PAPER_DARK,
  border: `1px solid ${INK_20}`,
  borderRadius: 0,
  padding: "32px",
  transition: "border-color 0.2s",
};

export const cardDark: React.CSSProperties = {
  background: "#111",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 0,
  padding: "32px",
  transition: "border-color 0.2s",
};

export const riskColor = (score: number): string => {
  if (score >= 7) return CRISIS;
  if (score >= 4) return CAUTION;
  return CLEAR;
};

export const riskLabel = (score: number): string => {
  if (score >= 7) return "HIGH";
  if (score >= 4) return "MED";
  return "LOW";
};
export const labelCaps: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: "10px",
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: INK_60,
};

export const labelCapsAccent: React.CSSProperties = {
  ...labelCaps,
  color: ACCENT,
};
