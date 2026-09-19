import type { Dictionary } from "../types";

export const en = {
  metadata: {
    title: "AI Waste Index",
    description:
      "Estimate avoidable AI compute and its derived environmental impact.",
  },
  navigation: {
    languageSelectorLabel: "Choose language",
    italian: "Italiano",
    english: "English",
  },
  landing: {
    brand: "AI Waste Index",
    title: "Estimate avoidable AI compute.",
    description:
      "Understand the estimated compute associated with producing visible content and its derived energy, carbon and water impact.",
    estimateNoticeTitle: "An estimate, not a judgement",
    estimateNoticeBody:
      "Results are estimates based on conventional assumptions. They do not measure environmental impact or judge the quality, truth or value of the content.",
  },
  apiMessages: {
    EXTRACTION_CONFIRMATION_REQUIRED:
      "Review and confirm the extracted text before analysis.",
    INVALID_INPUT: "Check the input and try again.",
    INPUT_TOO_LARGE: "The input is too large.",
    REQUEST_TIMEOUT: "The request took too long. Try again.",
    URL_BLOCKED: "This URL cannot be accessed safely.",
    URL_FETCH_FAILED: "The URL could not be fetched.",
    EXTRACTION_FAILED: "Usable text could not be extracted.",
    RATE_LIMITED: "Too many requests. Try again later.",
    GLOBAL_CAP_REACHED: "The service has reached its current capacity.",
    GUARD_UNAVAILABLE: "The service protection is temporarily unavailable.",
    ESTIMATOR_UNAVAILABLE: "The estimation service is temporarily unavailable.",
    INTERNAL_ERROR: "A technical error occurred. Try again later.",
  },
} satisfies Dictionary;
