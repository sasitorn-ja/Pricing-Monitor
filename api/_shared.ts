export type ApiRequest = {
  query: Record<string, string | string[] | undefined>;
  params: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

export function sendJson(res: ApiResponse, body: unknown, statusCode = 200) {
  return res.status(statusCode).json(body);
}

export function readQueryValue(
  source: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = source[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
