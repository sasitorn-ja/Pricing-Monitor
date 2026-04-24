import {
  CAMPAIGN_START,
  BASELINE_END,
  BASELINE_START,
  TARGET_INCREASE
} from "../../config/pricing.js";
import type { DiscountDropKey, ProjectRow, SummaryStats } from "./types.js";

export const baselineStart = new Date(BASELINE_START);
export const baselineEnd = new Date(BASELINE_END);
export const campaignStart = new Date(CAMPAIGN_START);
export const NO_BASELINE_LADDER = "ไม่มี baseline";

export function toDateOnly(value: string | null) {
  if (!value) {
    return null;
  }

  const dateOnly = value.slice(0, 10);
  const date = new Date(dateOnly);
  return Number.isNaN(date.getTime()) ? null : { raw: dateOnly, date };
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getLadder(increaseAmount: number) {
  if (increaseAmount >= 500) {
    return { label: "500+", rank: 7 };
  }

  if (increaseAmount >= 400) {
    return { label: "400-499", rank: 6 };
  }

  if (increaseAmount >= 300) {
    return { label: "300-399", rank: 5 };
  }

  if (increaseAmount >= 250) {
    return { label: "250-299", rank: 4 };
  }

  if (increaseAmount >= 200) {
    return { label: "200-249", rank: 3 };
  }

  if (increaseAmount >= 100) {
    return { label: "100-199", rank: 2 };
  }

  return { label: "0-99", rank: 1 };
}

export function getDiscountDropBucket(
  baselineDisc: number,
  postDisc: number
): DiscountDropKey {
  const dropPoints = baselineDisc > 0 ? Math.max(baselineDisc - postDisc, 0) : 0;

  if (dropPoints >= 15) return "disc15";
  if (dropPoints >= 12) return "disc12";
  if (dropPoints >= 9) return "disc9";
  if (dropPoints >= 6) return "disc6";
  if (dropPoints >= 3) return "disc3";
  return "disc0";
}

export function safeString(value: string | null) {
  return value ?? "";
}

export function summarizeProjects(rows: ProjectRow[]): SummaryStats {
  const comparableSites = rows.length;
  const increaseList = rows.map((row) => row.increaseAmount);
  const totalIncrease = increaseList.reduce((sum, value) => sum + value, 0);
  const latestDays = rows.map((row) => row.latestDay);
  const totalPostVolume = rows.reduce((sum, row) => sum + row.postVolume, 0);
  const weightedIncreasePerUnit =
    totalPostVolume > 0
      ? rows.reduce((sum, row) => sum + row.increaseAmount * row.postVolume, 0) /
        totalPostVolume
      : comparableSites
        ? totalIncrease / comparableSites
        : 0;
  const targetHitSites = rows.filter(
    (row) => row.increaseAmount >= TARGET_INCREASE
  ).length;

  return {
    comparableSites,
    ladder500: rows.filter((row) => row.ladder === "500+").length,
    ladder400: rows.filter((row) => row.ladder === "400-499").length,
    ladder300: rows.filter((row) => row.ladder === "300-399").length,
    ladder250: rows.filter((row) => row.ladder === "250-299").length,
    ladder200: rows.filter((row) => row.ladder === "200-249").length,
    ladder100: rows.filter((row) => row.ladder === "100-199").length,
    ladder0: rows.filter((row) => row.ladder === "0-99").length,
    belowTargetSites: rows.filter((row) => row.increaseAmount < TARGET_INCREASE).length,
    totalIncrease: round2(totalIncrease),
    avgIncrease: round2(weightedIncreasePerUnit),
    avgTargetPercent: comparableSites
      ? round2(rows.reduce((sum, row) => sum + row.targetPercent, 0) / comparableSites)
      : 0,
    targetHitShare: comparableSites ? round2((targetHitSites / comparableSites) * 100) : 0,
    minIncrease: comparableSites ? round2(Math.min(...increaseList)) : 0,
    maxIncrease: comparableSites ? round2(Math.max(...increaseList)) : 0,
    latestDayMin:
      latestDays.length > 0
        ? latestDays.reduce((min, day) => (day.localeCompare(min) < 0 ? day : min))
        : null,
    latestDayMax:
      latestDays.length > 0
        ? latestDays.reduce((max, day) => (day.localeCompare(max) > 0 ? day : max))
        : null
  };
}
