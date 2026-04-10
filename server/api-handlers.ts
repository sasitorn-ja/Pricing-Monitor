import { db } from "./db.js";
import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START,
  TARGET_INCREASE,
  metadataQuery,
  projectStatusQuery,
  projectTrendQuery,
  summaryQuery,
  trendQuery
} from "./queries.js";

export type ProjectRow = {
  siteNo: string;
  siteName: string;
  divisionName: string;
  fcName: string;
  sectName: string;
  segment: string;
  channel: string;
  latestDay: string;
  baselineNetPrice: number;
  currentNetPrice: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
  baselineVolume: number;
  postVolume: number;
};

export function getMeta() {
  const metadata = db.prepare(metadataQuery).get();

  return {
    metadata,
    config: {
      baselineStart: BASELINE_START,
      baselineEnd: BASELINE_END,
      campaignStart: CAMPAIGN_START,
      targetIncrease: TARGET_INCREASE
    }
  };
}

export function getSummary() {
  return db.prepare(summaryQuery).get();
}

export function getTrend() {
  return db.prepare(trendQuery).all();
}

export function getProjects(params: {
  search?: string;
  ladder?: string;
  onlyBelowTarget?: boolean;
}) {
  const { search = "", ladder = "", onlyBelowTarget = false } = params;
  const normalizedSearch = search.trim().toLowerCase();
  let rows = db.prepare(projectStatusQuery).all() as ProjectRow[];

  if (normalizedSearch) {
    rows = rows.filter((row) => {
      return (
        row.siteNo.toLowerCase().includes(normalizedSearch) ||
        row.siteName.toLowerCase().includes(normalizedSearch) ||
        row.divisionName.toLowerCase().includes(normalizedSearch) ||
        row.fcName.toLowerCase().includes(normalizedSearch)
      );
    });
  }

  if (ladder) {
    rows = rows.filter((row) => row.ladder === ladder);
  }

  if (onlyBelowTarget) {
    rows = rows.filter((row) => row.increaseAmount < TARGET_INCREASE);
  }

  const leaderboard = [...rows]
    .sort((a, b) => a.targetPercent - b.targetPercent)
    .slice(0, 15);

  return {
    rows,
    leaderboard
  };
}

export function getProjectTrend(siteNo: string) {
  return db.prepare(projectTrendQuery).all(siteNo);
}
