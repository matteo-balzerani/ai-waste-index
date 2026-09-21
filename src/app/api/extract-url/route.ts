import { createExtractionHandler } from "@/server/extraction/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createExtractionHandler();
