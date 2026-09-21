// Version-pinned worker integration: see scripts/build-ocr.mjs and browser OCR tests.
declare module "tesseract.js/src/worker-script/index.js" {
  export function setAdapter(adapter: Record<string, unknown>): void;
  export function dispatchHandlers(
    packet: Record<string, unknown>,
    send: (message: { status: string; data: unknown }) => void,
  ): void;
}
declare module "tesseract.js/src/worker-script/browser/getCore.js" {
  const getCore: unknown;
  export default getCore;
}
declare module "tesseract.js/src/worker-script/browser/gunzip.js" {
  const gunzip: unknown;
  export default gunzip;
}
