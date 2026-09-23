import type { CSSProperties } from "react";

/** Presentation colours shared by the live UI, HTML previews and local PNGs. */
export const palette = {
  background: "#f8f9f5", ink: "#20221f", paper: "#ffffff",
  border: "#d9ddd2", lime: "#d5fa46", purple: "#7053db", muted: "#62675d",
} as const;
export const themeStyle = {
  "--background": palette.background, "--foreground": palette.ink,
  "--surface": palette.paper, "--border": palette.border,
  "--lime": palette.lime, "--purple": palette.purple, "--muted": palette.muted,
} as CSSProperties;
