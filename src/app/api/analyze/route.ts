import { createAnalysisHandler } from "@/server/analysis/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createAnalysisHandler();
