import { mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { build } from "esbuild";
const require = createRequire(import.meta.url);
const output = "public/ocr";
await mkdir(output, { recursive: true });
const core = dirname(require.resolve("tesseract.js-core/package.json"));
for (const file of ["tesseract-core-lstm.wasm.js", "LICENSE"])
  await copyFile(join(core, file), join(output, file));
for (const lang of ["eng", "ita"]) {
  const data = dirname(
    require.resolve(`@tesseract.js-data/${lang}/package.json`),
  );
  await copyFile(
    join(data, "4.0.0_best_int", `${lang}.traineddata.gz`),
    join(output, `${lang}.traineddata.gz`),
  );
}
await build({
  entryPoints: ["src/browser/ocr/worker.ts"],
  outfile: `${output}/worker.js`,
  bundle: true,
  inject: ["src/browser/ocr/buffer.ts"],
  platform: "browser",
  format: "iife",
  target: "es2022",
  define: { global: "globalThis" },
  minify: true,
});
