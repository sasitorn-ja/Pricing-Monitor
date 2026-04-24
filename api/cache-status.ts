import { getCacheStatus } from "../server/handlers/pricing.js";
import type { ApiRequest, ApiResponse } from "./shared/http.js";
import { sendJson } from "./shared/http.js";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  return sendJson(res, getCacheStatus());
}
