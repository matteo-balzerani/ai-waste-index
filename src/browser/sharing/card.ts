import type { ShareModel } from "./model";

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
        lines.push(line);
        line = "";
      }
      line += segment;
    }
    lines.push(line);
  }
  return lines;
}

/** Same disclosure fields as the HTML card. Refuse an unbounded card, never crop its version/disclaimer. */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  model: ShareModel,
): void {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CARD_UNAVAILABLE");
  if (model.badgeText.length > MAX_COPY_LENGTH)
    throw new Error("CARD_UNAVAILABLE");
  context.font = "28px Arial, sans-serif";
  const blocks = [
    model.methodology,
    model.disclaimer,
    ...(model.demoNotice ? [model.demoNotice] : []),
    ...(model.experimentalNotice ? [model.experimentalNotice] : []),
  ].map((text) => wrap(context, text, WIDTH - PADDING * 2));
  const height =
    420 +
    blocks.reduce((sum, lines) => sum + lines.length * 40 + 28, 0) +
    PADDING;
  if (height > MAX_HEIGHT) throw new Error("CARD_UNAVAILABLE");
  canvas.width = WIDTH;
  canvas.height = height;
  context.fillStyle = "#f5f4ec";
  context.fillRect(0, 0, WIDTH, height);
  context.fillStyle = "#193e35";
  context.fillRect(0, 0, WIDTH, 16);
  context.textBaseline = "top";
  context.fillStyle = "#193e35";
  context.font = "bold 34px Arial, sans-serif";
  context.fillText(model.brand, PADDING, 60);
  context.font = "28px Arial, sans-serif";
  context.fillText(model.context, PADDING, 116);
  context.fillStyle = "#232722";
  context.font = "28px Arial, sans-serif";
  context.fillText(model.scoreLabel, PADDING, 202);
  context.font = "bold 104px Arial, sans-serif";
  context.fillText(model.score, PADDING, 246);
  context.font = "28px Arial, sans-serif";
  context.fillText(model.classLabel, 790, 202);
  context.font = "bold 104px Arial, sans-serif";
  context.fillText(model.className, 790, 246);
  context.fillStyle = "#536158";
  context.fillRect(PADDING, 388, WIDTH - PADDING * 2, 2);
  let y = 420;
  context.font = "28px Arial, sans-serif";
  for (const [index, lines] of blocks.entries()) {
    context.fillStyle = index === 2 ? "#7b361b" : "#232722";
    for (const line of lines) {
      context.fillText(line, PADDING, y);
      y += 40;
    }
    y += 28;
  }
}

/** No object URL or data URL. Clear the canvas and discard late encodes on navigation. */
export function encodeShareCard(
  model: ShareModel,
  signal: AbortSignal,
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
      drawShareCard(canvas, model);
      canvas.toBlob(finish, "image/png");
    } catch {
      finish();
    }
  });
}
