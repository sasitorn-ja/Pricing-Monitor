import { formatHandlerError, getMeta } from "../server/handlers/pricing.js";
import type { ApiRequest, ApiResponse } from "./shared/http.js";
import { sendJson } from "./shared/http.js";

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    return sendJson(res, await getMeta());
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
