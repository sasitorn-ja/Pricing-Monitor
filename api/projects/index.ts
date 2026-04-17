import { formatHandlerError, getProjects } from "../../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "../_shared.js";
import { readQueryValue, sendJson } from "../_shared.js";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    return sendJson(
      res,
      await getProjects({
        search: readQueryValue(req.query, "search"),
        ladder: readQueryValue(req.query, "ladder"),
        day: readQueryValue(req.query, "day"),
        page: Number(readQueryValue(req.query, "page") || 1),
        pageSize: Number(readQueryValue(req.query, "pageSize") || 20),
        divisions: readQueryValue(req.query, "divisions")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        segments: readQueryValue(req.query, "segments")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      })
    );
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
