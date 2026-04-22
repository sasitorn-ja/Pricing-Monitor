import cors from "cors";
import express from "express";
import path from "path";
import {
  formatHandlerError,
  getDashboard,
  getMeta,
  getProjectTrend,
  getProjects,
  getSummary,
  getTrend,
  warmRemoteSnapshot
} from "./api-handlers.js";

const app = express();
app.use(cors());

app.get("/api/dashboard", async (req, res) => {
  try {
    const divisions = String(req.query.divisions ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const segments = String(req.query.segments ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    res.json(await getDashboard({ divisions, segments, day: String(req.query.day ?? "") }));
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
    const divisions = String(_req.query.divisions ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const segments = String(_req.query.segments ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    res.json(await getSummary({ divisions, segments, day: String(_req.query.day ?? "") }));
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

app.get("/api/trend", async (req, res) => {
  try {
    const divisions = String(req.query.divisions ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const segments = String(req.query.segments ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    res.json(await getTrend({ divisions, segments }));
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
        segments: String(req.query.segments ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
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
        segments: String(req.query.segments ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      })
    );
  } catch (error) {
    res.status(502).json(formatHandlerError(error));
  }
});

const port = Number(process.env.PORT ?? 8787);

app.use(express.static(path.join(process.cwd(), "dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist/index.html"));
});

app.listen(port, () => {
  console.log(`Pricing monitor API listening on http://localhost:${port}`);
  warmRemoteSnapshot();
});
