import type { CSSProperties } from "react";
import type { PublicResult } from "@/contracts";

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

/** Colours for the class returned by the API, independent of the numeric score. */
export const classPalette = {
  A: { background: "#91d8bd", foreground: palette.ink },
  B: { background: "#43c7c5", foreground: palette.ink },
  C: { background: "#70b8ef", foreground: palette.ink },
  D: { background: "#515dbb", foreground: palette.paper },
  E: { background: "#8d59b5", foreground: palette.paper },
  F: { background: "#f08a7c", foreground: palette.ink },
  G: { background: "#b9583f", foreground: palette.paper },
} as const satisfies Record<PublicResult["class"], { background: string; foreground: string }>;

export function classStyle(className: PublicResult["class"]): CSSProperties {
  const colors = classPalette[className];
  return { "--class-background": colors.background, "--class-foreground": colors.foreground } as CSSProperties;
}
