import {
  forceRefreshRemoteSnapshot,
  formatHandlerError,
  getCacheStatus
} from "../../server/handlers/pricing.js";
import type { ApiRequest, ApiResponse } from "../shared/http.js";
import { readHeaderValue, readQueryValue, sendJson } from "../shared/http.js";

function canRefreshCache(req: ApiRequest) {
  const allowedTokens = [process.env.CACHE_REFRESH_TOKEN, process.env.CRON_SECRET]
    .map((value) => value ?? "")
    .filter(Boolean);

  if (allowedTokens.length === 0) {
    return true;
  }

  const queryToken = readQueryValue(req.query, "token");
  const authorization = readHeaderValue(req.headers, "authorization");

  return allowedTokens.some(
    (token) => queryToken === token || authorization === `Bearer ${token}`
  );
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!canRefreshCache(req)) {
    return sendJson(res, { error: "Unauthorized cache refresh request." }, 401);
  }

  try {
    await forceRefreshRemoteSnapshot();
    return sendJson(res, getCacheStatus());
  } catch (error) {
    return sendJson(res, formatHandlerError(error), 502);
  }
}
