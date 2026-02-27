import { ApiRequestError, normalizeErrorEnvelope } from "@/lib/api/errors";

export type ResponseType = "json" | "blob" | "text";

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "credentials"> {
  body?: unknown;
  responseType?: ResponseType;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toRequestBody(body: unknown, headers: Headers) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    responseType = "json",
    headers: inputHeaders,
    ...rest
  } = options;

  const headers = new Headers(inputHeaders);
  headers.set("Accept", "application/json");

  // Session-cookie auth depends on credentials being included in every API request.
  const response = await fetch(path, {
    ...rest,
    method,
    headers,
    credentials: "include",
    body: toRequestBody(body, headers),
  });

  const requestId = response.headers.get("X-Request-Id") ?? undefined;

  // Normalize backend error envelopes into one frontend error shape for all hooks/components.
  if (!response.ok) {
    const payload = await parseResponseBody(response);
    throw new ApiRequestError(
      normalizeErrorEnvelope(response.status, payload, requestId)
    );
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }
  if (responseType === "text") {
    return (await response.text()) as T;
  }

  const payload = await parseResponseBody(response);
  return payload as T;
}
