import type { ApiError, BackendErrorEnvelope } from "@/lib/types/contracts";

export class ApiRequestError extends Error implements ApiError {
  status: number;
  code: string;
  requestId?: string;
  raw: unknown;

  constructor(payload: ApiError) {
    super(payload.message);
    this.name = "ApiRequestError";
    this.status = payload.status;
    this.code = payload.code;
    this.requestId = payload.requestId;
    this.raw = payload.raw;
  }
}

export function isApiRequestError(value: unknown): value is ApiRequestError {
  return value instanceof ApiRequestError;
}

export function normalizeErrorEnvelope(
  status: number,
  payload: unknown,
  fallbackRequestId?: string
): ApiError {
  const defaultCode = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "request_failed";
  const defaultMessage = status === 401 ? "Authentication required" : "Request failed";

  const envelope = payload as Partial<BackendErrorEnvelope>;
  const maybeError = envelope?.error;

  if (maybeError && typeof maybeError === "object") {
    const code = typeof maybeError.code === "string" ? maybeError.code : defaultCode;
    const message = typeof maybeError.message === "string" ? maybeError.message : defaultMessage;
    const requestId =
      (typeof maybeError.request_id === "string" && maybeError.request_id) ||
      fallbackRequestId ||
      undefined;

    return {
      status,
      code,
      message,
      requestId,
      raw: payload,
    };
  }

  return {
    status,
    code: defaultCode,
    message: defaultMessage,
    requestId: fallbackRequestId,
    raw: payload,
  };
}
