import "server-only";

export type EstimatorClientErrorCode =
  | "INVALID_INPUT"
  | "INPUT_TOO_LARGE"
  | "ESTIMATOR_UNAVAILABLE";

export class EstimatorClientError extends Error {
  readonly code: EstimatorClientErrorCode;
  readonly status: 400 | 413 | 503;

  constructor(code: EstimatorClientErrorCode, status: 400 | 413 | 503) {
    super(code);
    this.name = "EstimatorClientError";
    this.code = code;
    this.status = status;
  }
}

export function isEstimatorClientError(
  error: unknown,
): error is EstimatorClientError {
  return error instanceof EstimatorClientError;
}
