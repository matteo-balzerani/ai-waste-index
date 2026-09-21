import { describe, expect, it } from "vitest";
import {
  inspectImage,
  validateDimensions,
  validateFile,
} from "@/browser/ocr/image";
import { loadOcrLimits } from "@/server/ocr-config";
const limits = {
  maxBytes: 1000,
  maxWidth: 100,
  maxHeight: 80,
  maxPixels: 6000,
  timeoutMs: 100,
};
function chunk(name: string, data: number[]) {
  const result = new Uint8Array(data.length + 12);
  new DataView(result.buffer).setUint32(0, data.length);
  result.set(
    [...name].map((s) => s.charCodeAt(0)),
    4,
  );
  result.set(data, 8);
  return [...result]; // Header-only fixtures; actual decoder tests use real browser images.
}
function png(width = 100, height = 60, extra: number[] = []) {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  return new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk("IHDR", [...ihdr]),
    ...extra,
    ...chunk("IDAT", [1]),
    ...chunk("IEND", []),
  ]);
}
function jpeg(width = 100, height = 60, frame = 192) {
  return new Uint8Array([
    255,
    216,
    255,
    224,
    0,
    2,
    255,
    frame,
    0,
    11,
    8,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    1,
    1,
    17,
    0,
    255,
    218,
    0,
    2,
    0,
    255,
    217,
  ]);
}
describe("screenshot resource boundaries before decode", () => {
  it.each(["image/gif", "image/svg+xml", "image/webp", "text/plain", ""])(
    "rejects unsupported MIME %s",
    (type) => {
      expect(() => validateFile({ size: 1, type }, limits)).toThrow(
        "INVALID_INPUT",
      );
    },
  );
  it("rejects empty and oversized files", () => {
    expect(() => validateFile({ size: 0, type: "image/png" }, limits)).toThrow(
      "INVALID_INPUT",
    );
    expect(() =>
      validateFile({ size: 1001, type: "image/png" }, limits),
    ).toThrow("INPUT_TOO_LARGE");
  });
  it.each([0, -1, NaN, Infinity, 0.5])(
    "rejects invalid dimensions %s",
    (dimension) => {
      expect(() => validateDimensions(dimension, 1, limits)).toThrow(
        "INVALID_INPUT",
      );
    },
  );
  it.each([
    [101, 1],
    [1, 81],
    [100, 61],
    [0xffffffff, 0xffffffff],
  ])("bounds width/height/pixel product %s x %s", (width, height) => {
    expect(() => inspectImage(png(width, height), "image/png", limits)).toThrow(
      "INPUT_TOO_LARGE",
    );
  });
  it("allows exact pixel limit and validates PNG/JPEG headers", () => {
    expect(inspectImage(png(), "image/png", limits)).toEqual({
      width: 100,
      height: 60,
    });
    expect(inspectImage(jpeg(), "image/jpeg", limits)).toEqual({
      width: 100,
      height: 60,
    });
    expect(inspectImage(jpeg(100, 60, 194), "image/jpeg", limits)).toEqual({
      width: 100,
      height: 60,
    });
  });
  it("rejects claimed MIME mismatches, unsupported JPEG coding and animation", () => {
    expect(() => inspectImage(png(), "image/jpeg", limits)).toThrow(
      "INVALID_INPUT",
    );
    expect(() => inspectImage(jpeg(), "image/png", limits)).toThrow(
      "INVALID_INPUT",
    );
    expect(() => inspectImage(jpeg(10, 10, 195), "image/jpeg", limits)).toThrow(
      "INVALID_INPUT",
    );
    expect(() =>
      inspectImage(
        png(10, 10, chunk("acTL", [0, 0, 0, 1, 0, 0, 0, 0])),
        "image/png",
        limits,
      ),
    ).toThrow("INVALID_INPUT");
  });
  it.each([0, 4, 15, 30, 55])("rejects truncated PNG at %s", (length) => {
    expect(() =>
      inspectImage(png().slice(0, length), "image/png", limits),
    ).toThrow("INVALID_INPUT");
  });
  it("rejects malicious segment lengths and repeated dimensions", () => {
    const bytes = png();
    new DataView(bytes.buffer).setUint32(33, 0xffffffff);
    expect(() => inspectImage(bytes, "image/png", limits)).toThrow(
      "INVALID_INPUT",
    );
    expect(() =>
      inspectImage(
        png(10, 10, chunk("IHDR", Array(13).fill(0))),
        "image/png",
        limits,
      ),
    ).toThrow("INVALID_INPUT");
    const jpg = jpeg();
    jpg[4] = 255;
    expect(() => inspectImage(jpg, "image/jpeg", limits)).toThrow(
      "INVALID_INPUT",
    );
  });
});
describe("OCR runtime configuration", () => {
  const env = {
    MAX_SCREENSHOT_BYTES: "1000",
    MAX_SCREENSHOT_PIXELS: "6000",
    MAX_SCREENSHOT_WIDTH: "100",
    MAX_SCREENSHOT_HEIGHT: "80",
    OCR_TIMEOUT_MS: "100",
  };
  it("projects only validated operational limits", () =>
    expect(loadOcrLimits(env)).toEqual(limits));
  it.each(Object.keys(env))("requires %s", (key) => {
    for (const bad of [undefined, "", "0", "-1", "NaN", "Infinity", "1.5"])
      expect(() => loadOcrLimits({ ...env, [key]: bad })).toThrow();
  });
});
