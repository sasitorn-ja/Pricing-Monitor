import { getProjectTrend } from "../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "./_shared.js";
import { readQueryValue, sendJson } from "./_shared.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  const siteNo = readQueryValue(req.query, "siteNo");

  if (!siteNo) {
    return sendJson(res, { error: "Missing siteNo" }, 400);
  }

  return sendJson(res, getProjectTrend(siteNo));
}
