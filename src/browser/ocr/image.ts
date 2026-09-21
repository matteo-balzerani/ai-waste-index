import { OcrError, type OcrLimits } from "./types";

export const screenshotMimeTypes = ["image/png", "image/jpeg"] as const;
export function validateFile(
  file: Pick<File, "size" | "type">,
  limits: OcrLimits,
) {
  if (
    !screenshotMimeTypes.some((type) => type === file.type) ||
    file.size === 0
  )
    throw new OcrError("INVALID_INPUT");
  if (file.size > limits.maxBytes) throw new OcrError("INPUT_TOO_LARGE");
}
export function validateDimensions(
  width: number,
  height: number,
  limits: OcrLimits,
) {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new OcrError("INVALID_INPUT");
  if (
    width > limits.maxWidth ||
    height > limits.maxHeight ||
    width * height > limits.maxPixels
  )
    throw new OcrError("INPUT_TOO_LARGE");
}

/** Parse bounded headers before any image decoder or OCR engine sees the bytes. */
export function inspectImage(
  bytes: Uint8Array,
  mime: string,
  limits: OcrLimits,
) {
  validateFile({ size: bytes.byteLength, type: mime }, limits);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const invalid = () => {
    throw new OcrError("INVALID_INPUT");
  };
  let width = 0,
    height = 0;
  if (mime === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, i) => bytes[i] === value)) invalid();
    let offset = 8,
      ended = false,
      imageData = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8),
      );
      if (offset + 12 + length > bytes.length) invalid();
      if (offset === 8 && (type !== "IHDR" || length !== 13)) invalid();
      if (type === "IHDR") {
        if (offset !== 8 || length !== 13) invalid();
        width = view.getUint32(offset + 8);
        height = view.getUint32(offset + 12);
        validateDimensions(width, height, limits);
      }
      // Animated PNGs are outside the static screenshot allowlist.
      if (type === "acTL") invalid();
      if (type === "IDAT") imageData = true;
      offset += 12 + length;
      if (type === "IEND") {
        if (length !== 0 || offset !== bytes.length) invalid();
        ended = true;
        break;
      }
    }
    if (!ended || !imageData) invalid();
  } else if (mime === "image/jpeg") {
    if (
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes.at(-2) !== 255 ||
      bytes.at(-1) !== 217
    )
      invalid();
    let offset = 2,
      scan = false;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) invalid();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (
        marker === undefined ||
        marker === 0 ||
        marker === 216 ||
        marker === 217
      )
        invalid();
      if (offset + 2 > bytes.length) invalid();
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) invalid();
      if (marker === 192 || marker === 194) {
        // Baseline/progressive JPEG only.
        if (width || length < 8) invalid();
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        validateDimensions(width, height, limits);
      } else if (
        marker !== undefined &&
        marker >= 193 &&
        marker <= 207 &&
        ![196, 200, 204].includes(marker)
      ) {
        invalid();
      }
      if (marker === 218) {
        scan = true;
        break;
      }
      offset += length;
    }
    if (!scan) invalid();
  } else invalid();
  validateDimensions(width, height, limits);
  return { width, height };
}
