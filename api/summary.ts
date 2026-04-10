import { getSummary } from "../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "./_shared.js";
import { sendJson } from "./_shared.js";

export default function handler(_req: ApiRequest, res: ApiResponse) {
  return sendJson(res, getSummary());
}
