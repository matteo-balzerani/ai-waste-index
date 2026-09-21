import { parentPort, workerData } from "node:worker_threads";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

interface Job {
  bytes: Uint8Array;
  contentType: string;
  maxTextCodePoints: number;
}
const job = workerData as Job;
try {
  const media = job.contentType.split(";", 1)[0]?.trim().toLowerCase();
  if (media !== "text/html" && media !== "text/plain") throw new Error();
  const declared =
    /(?:^|;)\s*charset\s*=\s*["']?([^\s;"']+)/i
      .exec(job.contentType)?.[1]
      ?.toLowerCase() ?? "utf-8";
  if (
    !["utf-8", "utf8", "us-ascii", "iso-8859-1", "windows-1252"].includes(
      declared,
    )
  )
    throw new Error();
  const raw = new TextDecoder(declared === "us-ascii" ? "utf-8" : declared, {
    fatal: true,
  }).decode(job.bytes);
  let text: string;
  if (media === "text/plain") {
    text = raw.trim();
  } else {
    // LinkeDOM parses inert markup: it neither runs scripts nor loads resources.
    const { document } = parseHTML(raw);
    for (const node of document.querySelectorAll(
      "script,style,noscript,iframe,svg,canvas,template,form,[hidden],[aria-hidden=true]",
    ))
      node.remove();
    const article = new Readability(document as unknown as Document, {
      charThreshold: 0,
      maxElemsToParse: 50000,
    }).parse();
    if (!article?.content) throw new Error();
    const extracted = parseHTML(`<html><body>${article.content}</body></html>`);
    text = extracted.document.body.innerText.trim();
  }
  if ([...text].length > job.maxTextCodePoints) {
    parentPort?.postMessage({ error: "INPUT_TOO_LARGE" });
  } else if (!text || !text.isWellFormed()) {
    parentPort?.postMessage({ error: "EXTRACTION_FAILED" });
  } else {
    parentPort?.postMessage({ text });
  }
} catch {
  parentPort?.postMessage({ error: "EXTRACTION_FAILED" });
}
