import cors from "cors";
import express from "express";
import path from "path";
import {
  getMeta,
  getProjectTrend,
  getProjects,
  getSummary,
  getTrend
} from "./api-handlers.js";

const app = express();
app.use(cors());

app.get("/api/meta", (_req, res) => {
  res.json(getMeta());
});

app.get("/api/summary", (_req, res) => {
  res.json(getSummary());
});

app.get("/api/trend", (_req, res) => {
  res.json(getTrend());
});

app.get("/api/projects", (req, res) => {
  res.json(
    getProjects({
      search: String(req.query.search ?? ""),
      ladder: String(req.query.ladder ?? ""),
      onlyBelowTarget: String(req.query.onlyBelowTarget ?? "") === "true"
    })
  );
});

app.get("/api/projects/:siteNo/trend", (req, res) => {
  res.json(getProjectTrend(req.params.siteNo));
});

const port = Number(process.env.PORT ?? 8787);

app.use(express.static(path.join(process.cwd(), "dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist/index.html"));
});

app.listen(port, () => {
  console.log(`Pricing monitor API listening on http://localhost:${port}`);
});
