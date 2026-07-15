// Minimal request/response shapes for the Vercel Node functions in this folder, so they can be
// typechecked without pulling @vercel/node into the app graph. Only the surface we actually use.

export interface ApiRequest {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  send(body?: unknown): void;
}
