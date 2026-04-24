import cors from "cors";
import express from "express";
import path from "path";
import {
  forceRefreshRemoteSnapshot,
  formatHandlerError,
  getCacheStatus,
  getDashboard,
  getMeta,
  getProjectTrend,
  getProjects,
  getSummary,
  getTrend,
  scheduleRemoteSnapshotRefresh
} from "./handlers/pricing.js";

const app = express();
app.use(cors());

function readCsvQuery(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readBaselineQuery(req: express.Request) {
  return {
    baselineStart: String(req.query.baselineStart ?? ""),
    baselineEnd: String(req.query.baselineEnd ?? "")
  };
}

app.get("/api/dashboard", async (req, res) => {
  try {
    const divisions = readCsvQuery(req.query.divisions);
    const segments = readCsvQuery(req.query.segments);
    const channels = readCsvQuery(req.query.channels);
    const fcNames = readCsvQuery(req.query.fcNames);
    const discountTypes = readCsvQuery(req.query.discountTypes);

    res.json(
      await getDashboard({
        divisions,
        segments,
        channels,
        fcNames,
        discountTypes,
        day: String(req.query.day ?? ""),
        ...readBaselineQuery(req)
      })
    );
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/meta", async (_req, res) => {
  try {
    res.json(await getMeta());
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/summary", async (_req, res) => {
  try {
    const divisions = readCsvQuery(_req.query.divisions);
    const segments = readCsvQuery(_req.query.segments);
    const channels = readCsvQuery(_req.query.channels);
    const fcNames = readCsvQuery(_req.query.fcNames);
    const discountTypes = readCsvQuery(_req.query.discountTypes);

    res.json(
      await getSummary({
        divisions,
        segments,
        channels,
        fcNames,
        discountTypes,
        day: String(_req.query.day ?? ""),
        ...readBaselineQuery(_req)
      })
    );
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/trend", async (req, res) => {
  try {
    const divisions = readCsvQuery(req.query.divisions);
    const segments = readCsvQuery(req.query.segments);
    const channels = readCsvQuery(req.query.channels);
    const fcNames = readCsvQuery(req.query.fcNames);
    const discountTypes = readCsvQuery(req.query.discountTypes);

    res.json(
      await getTrend({
        divisions,
        segments,
        channels,
        fcNames,
        discountTypes,
        ...readBaselineQuery(req)
      })
    );
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    res.json(
      await getProjects({
        search: String(req.query.search ?? ""),
        ladder: String(req.query.ladder ?? ""),
        day: String(req.query.day ?? ""),
        page: Number(req.query.page ?? 1),
        pageSize: Number(req.query.pageSize ?? 20),
        divisions: String(req.query.divisions ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        segments: readCsvQuery(req.query.segments),
        channels: readCsvQuery(req.query.channels),
        fcNames: readCsvQuery(req.query.fcNames),
        discountTypes: readCsvQuery(req.query.discountTypes),
        ...readBaselineQuery(req)
      })
    );
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/projects/:siteNo/trend", async (req, res) => {
  try {
    res.json(
      await getProjectTrend(req.params.siteNo, {
        divisions: String(req.query.divisions ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        segments: readCsvQuery(req.query.segments),
        channels: readCsvQuery(req.query.channels),
        fcNames: readCsvQuery(req.query.fcNames),
        discountTypes: readCsvQuery(req.query.discountTypes),
        ...readBaselineQuery(req)
      })
    );
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

function canRefreshCache(req: express.Request) {
  const token = process.env.CACHE_REFRESH_TOKEN ?? "";
  if (!token) {
    return true;
  }

  return (
    req.headers.authorization === `Bearer ${token}` ||
    String(req.query.token ?? "") === token
  );
}

app.get("/api/cache/status", (_req, res) => {
  res.json(getCacheStatus());
});

app.post("/api/cache/refresh", async (req, res) => {
  if (!canRefreshCache(req)) {
    res.status(401).json({ error: "Unauthorized cache refresh request." });
    return;
  }

  try {
    await forceRefreshRemoteSnapshot();
    res.json(getCacheStatus());
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/cache/refresh", async (req, res) => {
  if (!canRefreshCache(req)) {
    res.status(401).json({ error: "Unauthorized cache refresh request." });
    return;
  }

  try {
    await forceRefreshRemoteSnapshot();
    res.json(getCacheStatus());
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

const port = Number(process.env.PORT ?? 8787);

app.use(express.static(path.join(process.cwd(), "dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist/index.html"));
});

const server = app.listen(port, () => {
  console.log(`Pricing monitor API listening on http://localhost:${port}`);
  scheduleRemoteSnapshotRefresh();
});

(globalThis as typeof globalThis & { __pricingMonitorServer?: typeof server }).__pricingMonitorServer =
  server;
