import "server-only";
import {
  createExtractionRequestSchema,
  createExtractionSuccessSchema,
} from "@/contracts";
import { admitLocalDemo } from "@/server/analysis/admission";
import {
  AnalysisHttpError,
  jsonResponse,
  readJson,
} from "@/server/analysis/http";
import { loadExtractionConfig } from "./config";
import { extractText, type ExtractionDependencies } from "./extract";
import { tooLarge } from "./errors";

export function createExtractionHandler(
  deps: ExtractionDependencies & {
    environment?: Readonly<Record<string, string | undefined>>;
  } = {},
) {
  return async (request: Request): Promise<Response> => {
    try {
      const env = deps.environment ?? process.env;
      // Independent admission boundary: extraction never calls or consumes analysis admission.
      admitLocalDemo(env);
      const config = loadExtractionConfig(env);
      const body = await readJson(request, config);
      if (
        typeof body === "object" &&
        body !== null &&
        "url" in body &&
        typeof body.url === "string" &&
        [...body.url].length > config.maxUrlChars
      )
        throw tooLarge();
      const input = createExtractionRequestSchema(config.maxUrlChars).safeParse(
        body,
      );
      if (!input.success) throw new AnalysisHttpError("INVALID_INPUT", 400);
      const text = await extractText(
        input.data.url,
        config,
        request.signal,
        deps,
      );
      return jsonResponse(
        createExtractionSuccessSchema(config.maxTextCodePoints).parse({
          text,
          requiresConfirmation: true,
          warnings: ["EXTRACTION_CONFIRMATION_REQUIRED"],
        }),
      );
    } catch (error) {
      if (!request.body?.locked) void request.body?.cancel().catch(() => {});
      if (error instanceof AnalysisHttpError)
        return jsonResponse({ error: { code: error.code } }, error.status);
      return jsonResponse({ error: { code: "INTERNAL_ERROR" } }, 500);
    }
  };
}
