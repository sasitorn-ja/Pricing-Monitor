import { getProjectTrend } from "../../../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "../../_shared.js";
import { readQueryValue, sendJson } from "../../_shared.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  return sendJson(res, getProjectTrend(readQueryValue(req.params, "siteNo")));
}
