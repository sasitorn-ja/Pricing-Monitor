import { formatHandlerError, getDashboard } from "../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "./_shared.js";
import { readQueryValue, sendJson } from "./_shared.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    return sendJson(
      res,
      await getDashboard({
        divisions: readQueryValue(req.query, "divisions")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        segments: readQueryValue(req.query, "segments")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        day: readQueryValue(req.query, "day")
      })
    );
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
