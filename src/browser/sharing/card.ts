import type { ShareModel } from "./model";
import { palette } from "@/presentation/theme";

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
  const padding = compact ? 40 : PADDING;
  const available = width - padding * 2;
  context.font = "28px Arial, sans-serif";
  const footer = [model.methodology, model.disclaimer,
    ...(model.demoNotice ? [model.demoNotice] : []),
    ...(model.experimentalNotice ? [model.experimentalNotice] : []),
  ].map(text => wrap(context, text, available));
  const metricWidth = (available - 48) / 3;
  context.font = "26px Arial, sans-serif";
  const metrics = compact ? [] : model.metrics.map(metric => ({
    ...metric, lines: wrap(context, metric.range.replace(": ", ": \n"), metricWidth),
  }));
  // Measure values too: finite contract numbers may be much wider than normal examples.
  context.font = "bold 30px Arial, sans-serif";
  const metricValues = metrics.map(metric => wrap(context, metric.value, metricWidth));
  const metricsHeight = compact ? 0 : 76 + Math.max(...metrics.map((metric, index) => metric.lines.length * 34 + metricValues[index]!.length * 38));
  context.font = "28px Arial, sans-serif";
  const contextLines = wrap(context, model.context, available);
  const scoreTop = 132 + contextLines.length * 36;
  const footerTop = scoreTop + 196 + metricsHeight;
  const height = footerTop + footer.reduce((sum, lines) => sum + lines.length * 36 + 12, 0) + padding;
  if (height > MAX_HEIGHT) throw new Error("CARD_UNAVAILABLE");
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = compact ? palette.lime : palette.paper;
  context.fillRect(0, 0, width, height);
  context.fillStyle = compact ? palette.ink : palette.lime;
  context.fillRect(0, 0, width, 14);
  context.textBaseline = "top";
  const box = (x: number, y: number, w: number, h: number, radius: number) => {
    context.beginPath(); context.roundRect(x, y, w, h, radius); context.fill();
  };
  context.fillStyle = palette.ink;
  box(padding, 48, 48, 48, 14);
  context.fillStyle = palette.lime;
  box(padding + 10, 65, 6, 16, 3);
  box(padding + 21, 60, 6, 26, 3);
  box(padding + 32, 65, 6, 16, 3);
  context.fillStyle = palette.ink;
  context.font = "bold 34px Arial, sans-serif";
  context.fillText(model.brand, padding + 64, 54);
  context.font = "28px Arial, sans-serif";
  contextLines.forEach((line, index) => context.fillText(line, padding, 120 + index * 36));
  context.fillText(model.scoreLabel, padding, scoreTop + 10);
  context.textBaseline = "alphabetic";
  const scoreBaseline = scoreTop + (compact ? 128 : 151);
  context.font = `bold ${compact ? 88 : 116}px Arial, sans-serif`;
  context.fillText(model.scoreValue, padding, scoreBaseline);
  const scoreWidth = context.measureText(model.scoreValue).width;
  context.font = `${compact ? 30 : 36}px Arial, sans-serif`;
  context.fillStyle = palette.muted;
  context.fillText("/100", padding + scoreWidth + 10, scoreBaseline);
  context.textBaseline = "top";
  const classX = width - padding - 136;
  context.save();
  context.translate(classX + 68, scoreTop + 78);
  context.rotate(Math.PI / 30);
  context.fillStyle = palette.ink;
  box(-68, -78, 136, 156, 24);
  context.fillStyle = palette.lime;
  context.font = "26px Arial, sans-serif";
  context.fillText(model.classLabel, -44, -60);
  context.font = "bold 92px Arial, sans-serif";
  context.fillText(model.className, -36, -30);
  context.restore();
  context.fillStyle = palette.ink;
  metrics.forEach((metric, index) => {
    const x = padding + index * (metricWidth + 24);
    let y = scoreTop + 206;
    context.font = "26px Arial, sans-serif";
    context.fillText(metric.label, x, y);
    y += 40;
    context.font = "bold 30px Arial, sans-serif";
    metricValues[index]!.forEach(line => { context.fillText(line, x, y); y += 38; });
    context.font = "26px Arial, sans-serif";
    metric.lines.forEach(line => { context.fillText(line, x, y); y += 34; });
  });
  context.fillStyle = palette.muted;
  context.fillRect(padding, footerTop - 18, available, 1);
  context.fillStyle = palette.ink;
  context.font = "28px Arial, sans-serif";
  let y = footerTop;
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
