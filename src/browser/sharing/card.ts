import type { ShareModel } from "./model";
import { classPalette, palette } from "@/presentation/theme";

const WIDTH = 1080;
const PADDING = 64;
const MAX_HEIGHT = 4096;
const MAX_COPY_LENGTH = 8192;

function wrap(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const { segment } of new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    }).segment(paragraph)) {
      if (line && context.measureText(line + segment).width > maxWidth) {
        // Prefer a word boundary; retain whitespace and every grapheme verbatim.
        const space = line.lastIndexOf(" ");
        if (space > 0) {
          lines.push(line.slice(0, space + 1));
          line = line.slice(space + 1);
        } else {
          lines.push(line);
          line = "";
        }
      }
      line += segment;
    }
    lines.push(line);
  }
  return lines;
}

export type ShareFormat = "card" | "badge";

/** Adaptive height keeps every disclosure legible in both formats. No cropping. */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  model: ShareModel,
  format: ShareFormat = "card",
): void {
  const context = canvas.getContext("2d");
  if (!context || model.resultText.length > MAX_COPY_LENGTH) throw new Error("CARD_UNAVAILABLE");
  const compact = format === "badge";
  const width = compact ? 720 : WIDTH;
  const padding = compact ? 48 : PADDING;
  const available = width - padding * 2;
  context.font = "26px Arial, sans-serif";
  const footer = [model.disclaimer,
    ...(model.experimentalNotice ? [model.experimentalNotice] : []),
    ...(model.demoNotice ? [model.demoNotice] : []),
    model.methodology,
  ].map(text => wrap(context, text, available));
  const metricWidth = (available - 48) / 3;
  const metrics = compact ? [] : model.metrics.map(metric => ({
    ...metric, lines: wrap(context, metric.range.replace(": ", ": \n"), metricWidth),
  }));
  // Measure values too: finite contract numbers may be much wider than normal examples.
  context.font = "bold 34px Arial, sans-serif";
  const metricValues = metrics.map(metric => wrap(context, metric.value, metricWidth));
  const metricsHeight = compact ? 0 : 40 + Math.max(...metrics.map((metric, index) => metric.lines.length * 34 + metricValues[index]!.length * 42));
  context.font = "26px Arial, sans-serif";
  const contextLines = wrap(context, model.context, available);
  const contextTop = padding + 68;
  const scoreTop = contextTop + contextLines.length * 34 + 32;
  const heroHeight = compact ? 240 : 272;
  const metricsTop = scoreTop + heroHeight + 48;
  const footerTop = (compact ? scoreTop + heroHeight : metricsTop + metricsHeight) + 32;
  const height = footerTop + 64 + footer.reduce((sum, lines) => sum + lines.length * 36 + 12, 0);
  if (height > MAX_HEIGHT) throw new Error("CARD_UNAVAILABLE");
  canvas.width = width;
  canvas.height = height;
  context.textBaseline = "top";
  const box = (x: number, y: number, w: number, h: number, radius: number) => {
    context.beginPath(); context.roundRect(x, y, w, h, radius); context.fill();
  };
  context.fillStyle = palette.paper;
  box(0, 0, width, height, 24);
  context.fillStyle = palette.ink;
  box(padding, padding, 40, 40, 12);
  context.fillStyle = palette.lime;
  box(padding + 8, padding + 14, 5, 13, 2.5);
  box(padding + 18, padding + 9, 5, 23, 2.5);
  box(padding + 28, padding + 14, 5, 13, 2.5);
  context.fillStyle = palette.ink;
  context.font = "bold 30px Arial, sans-serif";
  context.fillText(model.brand, padding + 56, padding + 5);
  context.fillStyle = palette.muted;
  context.font = "26px Arial, sans-serif";
  contextLines.forEach((line, index) => context.fillText(line, padding, contextTop + index * 34));
  const classColors = classPalette[model.className];
  context.fillStyle = classColors.background;
  box(padding, scoreTop, available, heroHeight, 28);
  const scoreX = padding + 32;
  context.fillStyle = classColors.foreground;
  context.fillText(model.scoreLabel, scoreX, scoreTop + 24);
  context.textBaseline = "alphabetic";
  const scoreBaseline = scoreTop + (compact ? 206 : 238);
  context.font = `bold ${compact ? 168 : 208}px Arial, sans-serif`;
  context.fillText(model.scoreValue, scoreX, scoreBaseline);
  const scoreWidth = context.measureText(model.scoreValue).width;
  context.font = "32px Arial, sans-serif";
  context.fillStyle = classColors.foreground;
  context.fillText("/100", scoreX + scoreWidth + 12, scoreBaseline);
  context.textBaseline = "top";
  const classWidth = compact ? 176 : 208;
  const classX = width - padding - classWidth - 24;
  context.fillStyle = classColors.foreground;
  context.textAlign = "center";
  context.font = "26px Arial, sans-serif";
  context.fillText(model.classLabel, classX + classWidth / 2, scoreTop + 24);
  context.textBaseline = "alphabetic";
  context.font = `bold ${compact ? 144 : 176}px Arial, sans-serif`;
  context.fillText(model.className, classX + classWidth / 2, scoreBaseline);
  context.textBaseline = "top";
  context.textAlign = "left";
  if (!compact) {
    context.fillStyle = palette.border;
    context.fillRect(padding, metricsTop - 24, available, 1);
  }
  metrics.forEach((metric, index) => {
    const x = padding + index * (metricWidth + 24);
    let y = metricsTop;
    context.fillStyle = palette.muted;
    context.font = "26px Arial, sans-serif";
    context.fillText(metric.label, x, y);
    y += 40;
    context.fillStyle = palette.ink;
    context.font = "bold 34px Arial, sans-serif";
    metricValues[index]!.forEach(line => { context.fillText(line, x, y); y += 42; });
    context.fillStyle = palette.muted;
    context.font = "26px Arial, sans-serif";
    metric.lines.forEach(line => { context.fillText(line, x, y); y += 34; });
  });
  context.fillStyle = palette.background;
  context.beginPath();
  context.roundRect(0, footerTop, width, height - footerTop, [0, 0, 24, 24]);
  context.fill();
  context.fillStyle = palette.border;
  context.fillRect(0, footerTop, width, 1);
  context.fillStyle = palette.muted;
  context.font = "26px Arial, sans-serif";
  let y = footerTop + 32;
  for (const lines of footer) {
    for (const line of lines) { context.fillText(line, padding, y); y += 36; }
    y += 12;
  }
}

/** No object URL or data URL. Clear the canvas and discard late encodes on navigation. */
export function encodeShareCard(
  model: ShareModel,
  signal: AbortSignal,
  format: ShareFormat = "card",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("CARD_UNAVAILABLE"));
      return;
    }
    const canvas = document.createElement("canvas");
    let finished = false;
    const finish = (blob?: Blob | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      canvas.width = 0;
      canvas.height = 0;
      if (blob?.type === "image/png" && blob.size > 0 && !signal.aborted)
        resolve(blob);
      else reject(new Error("CARD_UNAVAILABLE"));
    };
    const abort = () => finish();
    const timer = setTimeout(abort, 5000);
    signal.addEventListener("abort", abort, { once: true });
    try {
      drawShareCard(canvas, model, format);
      canvas.toBlob(finish, "image/png");
    } catch {
      finish();
    }
  });
}
