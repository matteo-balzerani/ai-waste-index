export const extractionWarningCodes = [
  "EXTRACTION_CONFIRMATION_REQUIRED",
] as const;

export const publicErrorCodes = [
  "INVALID_INPUT",
  "INPUT_TOO_LARGE",
  "REQUEST_TIMEOUT",
  "URL_BLOCKED",
  "URL_FETCH_FAILED",
  "EXTRACTION_FAILED",
  "RATE_LIMITED",
  "GLOBAL_CAP_REACHED",
  "GUARD_UNAVAILABLE",
  "ESTIMATOR_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export const apiMessageCodes = [
  ...extractionWarningCodes,
  ...publicErrorCodes,
] as const;

export const estimatorErrorCodes = [
  "INVALID_REQUEST",
  "UNAUTHORIZED",
  "REQUEST_TIMEOUT",
  "TEXT_TOO_LARGE",
  "INTERNAL_ERROR",
  "ESTIMATOR_NOT_READY",
] as const;

export const analyzeErrorCodesByStatus = {
  400: ["INVALID_INPUT"],
  408: ["REQUEST_TIMEOUT"],
  413: ["INPUT_TOO_LARGE"],
  429: ["RATE_LIMITED", "GLOBAL_CAP_REACHED"],
  500: ["INTERNAL_ERROR"],
  503: ["GUARD_UNAVAILABLE", "ESTIMATOR_UNAVAILABLE"],
} as const;

export const extractionErrorCodesByStatus = {
  400: ["INVALID_INPUT"],
  403: ["URL_BLOCKED"],
  408: ["REQUEST_TIMEOUT"],
  413: ["INPUT_TOO_LARGE"],
  422: ["EXTRACTION_FAILED"],
  429: ["RATE_LIMITED"],
  500: ["INTERNAL_ERROR"],
  503: ["GUARD_UNAVAILABLE"],
  504: ["URL_FETCH_FAILED"],
} as const;

export const estimatorErrorCodesByStatus = {
  400: ["INVALID_REQUEST"],
  401: ["UNAUTHORIZED"],
  408: ["REQUEST_TIMEOUT"],
  413: ["TEXT_TOO_LARGE"],
  500: ["INTERNAL_ERROR"],
  503: ["ESTIMATOR_NOT_READY"],
} as const;

export type ApiMessageCode = (typeof apiMessageCodes)[number];
export type PublicErrorCode = (typeof publicErrorCodes)[number];
export type EstimatorErrorCode = (typeof estimatorErrorCodes)[number];
