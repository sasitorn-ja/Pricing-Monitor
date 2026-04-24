import {
  formatHandlerError,
  getProjectTrend
} from "../../../server/handlers/pricing.js";
import type { ApiRequest, ApiResponse } from "../../shared/http.js";
import { readQueryValue, sendJson } from "../../shared/http.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const siteNo =
    readQueryValue(req.query, "siteNo") || readQueryValue(req.params, "siteNo");

  if (!siteNo) {
    return sendJson(res, { error: "Missing siteNo" }, 400);
  }

  try {
    return sendJson(
      res,
      await getProjectTrend(siteNo, {
        divisions: readQueryValue(req.query, "divisions")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        segments: readQueryValue(req.query, "segments")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        channels: readQueryValue(req.query, "channels")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        fcNames: readQueryValue(req.query, "fcNames")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        discountTypes: readQueryValue(req.query, "discountTypes")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        baselineStart: readQueryValue(req.query, "baselineStart"),
        baselineEnd: readQueryValue(req.query, "baselineEnd")
      })
    );
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
