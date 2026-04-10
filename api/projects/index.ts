import { getProjects } from "../../server/api-handlers.js";
import type { ApiRequest, ApiResponse } from "../_shared.js";
import { readQueryValue, sendJson } from "../_shared.js";

export default function handler(req: ApiRequest, res: ApiResponse) {
  return sendJson(
    res,
    getProjects({
      search: readQueryValue(req.query, "search"),
      ladder: readQueryValue(req.query, "ladder"),
      onlyBelowTarget: readQueryValue(req.query, "onlyBelowTarget") === "true"
    })
  );
}
