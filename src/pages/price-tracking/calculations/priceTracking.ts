import { trendBucketDetailSeries, trendBucketSeries } from "../constants";
import type {
  MetaResponse,
  PriceLadderMode,
  ProjectTrendChartPoint,
  ProjectTrendPoint,
  ShareTrendPoint,
  TrendGranularity,
  TrendPoint,
  TrendRange
} from "../types";
import { getDateRange } from "../utils/format";

export function buildSelectedTrendChartData({
  meta,
  selectedSite,
  selectedTrend
}: {
  meta: MetaResponse | null;
  selectedSite: string;
  selectedTrend: ProjectTrendPoint[];
}): ProjectTrendChartPoint[] {
  if (!meta || !selectedSite || selectedTrend.length === 0) {
    return selectedTrend.map((point) => ({
      ...point,
      increaseAmount:
        point.day >= (meta?.config.campaignStart ?? "9999-12-31")
          ? point.increaseAmount
          : 0,
      hasRecord: true,
      isBaselinePeriod: point.day < (meta?.config.campaignStart ?? "0000-01-01")
    }));
  }

  const trendByDay = new Map(selectedTrend.map((point) => [point.day, point]));
  const template = selectedTrend[0];
  const lastDay = meta.metadata.max_dp_date || selectedTrend.at(-1)?.day || template.day;

  return getDateRange(meta.config.baselineStart, lastDay).map((day) => {
    const point = trendByDay.get(day);

    if (point) {
      return {
        ...point,
        increaseAmount: day >= meta.config.campaignStart ? point.increaseAmount : 0,
        targetPercent: day >= meta.config.campaignStart ? point.targetPercent : 0,
        hasRecord: true,
        isBaselinePeriod: day < meta.config.campaignStart
      };
    }

    return {
      siteNo: selectedSite,
      siteName: template.siteName,
      day,
      baselineNetPrice: template.baselineNetPrice,
      postNetPrice: 0,
      increaseAmount: 0,
      targetPercent: 0,
      ladder: "ไม่มีข้อมูลขาย",
      hasRecord: false,
      isBaselinePeriod: day < meta.config.campaignStart
    };
  });
}

export function getPostCampaignTrendData(meta: MetaResponse | null, trend: TrendPoint[]) {
  if (!meta) {
    return trend;
  }

  return trend.filter((point) => point.day >= meta.config.campaignStart);
}

function createEmptyTrendPoint(day: string): TrendPoint {
  return {
    day,
    siteCount: 0,
    noBaseline: 0,
    ladder500: 0,
    ladder400: 0,
    ladder300: 0,
    ladder250: 0,
    ladder200: 0,
    ladder100: 0,
    ladder0: 0,
    volumeTotal: 0,
    volumeNoBaseline: 0,
    volumeLadder500: 0,
    volumeLadder400: 0,
    volumeLadder300: 0,
    volumeLadder250: 0,
    volumeLadder200: 0,
    volumeLadder100: 0,
    volumeLadder0: 0,
    disc0: 0,
    disc3: 0,
    disc6: 0,
    disc9: 0,
    disc12: 0,
    disc15: 0,
    avgIncrease: 0,
    avgTargetPercent: 0,
    moveInto500: 0,
    moveInto400: 0,
    moveInto300: 0,
    moveInto250: 0,
    moveInto200: 0,
    moveInto100: 0,
    moveInto0: 0
  };
}

export function fillTrendDateGaps(trend: TrendPoint[]) {
  if (trend.length <= 1) {
    return trend;
  }

  const sortedTrend = [...trend].sort((pointA, pointB) => pointA.day.localeCompare(pointB.day));
  const trendByDay = new Map(sortedTrend.map((point) => [point.day, point]));
  const firstDay = sortedTrend[0]?.day;
  const lastDay = sortedTrend.at(-1)?.day;

  if (!firstDay || !lastDay) {
    return sortedTrend;
  }

  return getDateRange(firstDay, lastDay).map((day) => trendByDay.get(day) ?? createEmptyTrendPoint(day));
}

export function buildProportionTrendData(postCampaignTrendData: TrendPoint[]): ShareTrendPoint[] {
  return postCampaignTrendData.map((point) => {
    const denominator = point.siteCount || 1;
    const volumeDenominator = point.volumeTotal || 1;
    const ladder300Plus = point.ladder300 + point.ladder400 + point.ladder500;

    return {
      ...point,
      ladder300Plus,
      ladder300PlusShare: (ladder300Plus / denominator) * 100,
      ladder500Share: (point.ladder500 / denominator) * 100,
      ladder400Share: (point.ladder400 / denominator) * 100,
      ladder300Share: (point.ladder300 / denominator) * 100,
      ladder250Share: (point.ladder250 / denominator) * 100,
      ladder200Share: (point.ladder200 / denominator) * 100,
      ladder100Share: (point.ladder100 / denominator) * 100,
      ladder0Share: (point.ladder0 / denominator) * 100,
      noBaselineShare: (point.noBaseline / denominator) * 100,
      volumeLadder500Share: (point.volumeLadder500 / volumeDenominator) * 100,
      volumeLadder400Share: (point.volumeLadder400 / volumeDenominator) * 100,
      volumeLadder300Share: (point.volumeLadder300 / volumeDenominator) * 100,
      volumeLadder250Share: (point.volumeLadder250 / volumeDenominator) * 100,
      volumeLadder200Share: (point.volumeLadder200 / volumeDenominator) * 100,
      volumeLadder100Share: (point.volumeLadder100 / volumeDenominator) * 100,
      volumeLadder0Share: (point.volumeLadder0 / volumeDenominator) * 100,
      volumeNoBaselineShare: (point.volumeNoBaseline / volumeDenominator) * 100,
      disc0Share: (point.disc0 / denominator) * 100,
      disc3Share: (point.disc3 / denominator) * 100,
      disc6Share: (point.disc6 / denominator) * 100,
      disc9Share: (point.disc9 / denominator) * 100,
      disc12Share: (point.disc12 / denominator) * 100,
      disc15Share: (point.disc15 / denominator) * 100
    };
  });
}

export function getActiveTrendBucketSeries(priceLadderMode: PriceLadderMode) {
  return priceLadderMode === "summary" ? trendBucketSeries : trendBucketDetailSeries;
}

function getMonthWeekPeriod(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();

  let startDate = 1;
  let endDate = 7;

  if (dayOfMonth <= 7) {
    startDate = 1;
    endDate = 7;
  } else if (dayOfMonth <= 14) {
    startDate = 8;
    endDate = 14;
  } else if (dayOfMonth <= 21) {
    startDate = 15;
    endDate = 21;
  } else if (dayOfMonth <= 28) {
    startDate = 22;
    endDate = 28;
  } else {
    startDate = 29;
    endDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }

  const periodStart = new Date(Date.UTC(year, month, startDate)).toISOString().slice(0, 10);
  const periodEnd = new Date(Date.UTC(year, month, endDate)).toISOString().slice(0, 10);

  return { periodStart, periodEnd };
}

function aggregateTrendPoints(points: TrendPoint[]) {
  const grouped = new Map<string, TrendPoint[]>();

  points.forEach((point) => {
    const { periodStart } = getMonthWeekPeriod(point.day);
    const items = grouped.get(periodStart) ?? [];
    items.push(point);
    grouped.set(periodStart, items);
  });

  return Array.from(grouped.entries())
    .sort(([periodStartA], [periodStartB]) => periodStartA.localeCompare(periodStartB))
    .map(([periodStart, weekPoints]) => {
      const totals = weekPoints.reduce(
        (accumulator, point) => {
          accumulator.siteCount += point.siteCount;
          accumulator.noBaseline += point.noBaseline;
          accumulator.ladder500 += point.ladder500;
          accumulator.ladder400 += point.ladder400;
          accumulator.ladder300 += point.ladder300;
          accumulator.ladder250 += point.ladder250;
          accumulator.ladder200 += point.ladder200;
          accumulator.ladder100 += point.ladder100;
          accumulator.ladder0 += point.ladder0;
          accumulator.volumeTotal += point.volumeTotal;
          accumulator.volumeNoBaseline += point.volumeNoBaseline;
          accumulator.volumeLadder500 += point.volumeLadder500;
          accumulator.volumeLadder400 += point.volumeLadder400;
          accumulator.volumeLadder300 += point.volumeLadder300;
          accumulator.volumeLadder250 += point.volumeLadder250;
          accumulator.volumeLadder200 += point.volumeLadder200;
          accumulator.volumeLadder100 += point.volumeLadder100;
          accumulator.volumeLadder0 += point.volumeLadder0;
          accumulator.disc0 += point.disc0;
          accumulator.disc3 += point.disc3;
          accumulator.disc6 += point.disc6;
          accumulator.disc9 += point.disc9;
          accumulator.disc12 += point.disc12;
          accumulator.disc15 += point.disc15;
          accumulator.moveInto500 += point.moveInto500;
          accumulator.moveInto400 += point.moveInto400;
          accumulator.moveInto300 += point.moveInto300;
          accumulator.moveInto250 += point.moveInto250;
          accumulator.moveInto200 += point.moveInto200;
          accumulator.moveInto100 += point.moveInto100;
          accumulator.moveInto0 += point.moveInto0;
          accumulator.weightedIncrease += point.avgIncrease * point.volumeTotal;
          accumulator.weightedTarget += point.avgTargetPercent * point.siteCount;
          return accumulator;
        },
        {
          siteCount: 0,
          noBaseline: 0,
          ladder500: 0,
          ladder400: 0,
          ladder300: 0,
          ladder250: 0,
          ladder200: 0,
          ladder100: 0,
          ladder0: 0,
          volumeTotal: 0,
          volumeNoBaseline: 0,
          volumeLadder500: 0,
          volumeLadder400: 0,
          volumeLadder300: 0,
          volumeLadder250: 0,
          volumeLadder200: 0,
          volumeLadder100: 0,
          volumeLadder0: 0,
          disc0: 0,
          disc3: 0,
          disc6: 0,
          disc9: 0,
          disc12: 0,
          disc15: 0,
          moveInto500: 0,
          moveInto400: 0,
          moveInto300: 0,
          moveInto250: 0,
          moveInto200: 0,
          moveInto100: 0,
          moveInto0: 0,
          weightedIncrease: 0,
          weightedTarget: 0
        }
      );
      const nominalPeriod = getMonthWeekPeriod(periodStart);
      const actualPeriodEnd = weekPoints.at(-1)?.day ?? nominalPeriod.periodEnd;

      return {
        day: periodStart,
        periodEnd:
          actualPeriodEnd < nominalPeriod.periodEnd ? actualPeriodEnd : nominalPeriod.periodEnd,
        siteCount: totals.siteCount,
        noBaseline: totals.noBaseline,
        ladder500: totals.ladder500,
        ladder400: totals.ladder400,
        ladder300: totals.ladder300,
        ladder250: totals.ladder250,
        ladder200: totals.ladder200,
        ladder100: totals.ladder100,
        ladder0: totals.ladder0,
        volumeTotal: totals.volumeTotal,
        volumeNoBaseline: totals.volumeNoBaseline,
        volumeLadder500: totals.volumeLadder500,
        volumeLadder400: totals.volumeLadder400,
        volumeLadder300: totals.volumeLadder300,
        volumeLadder250: totals.volumeLadder250,
        volumeLadder200: totals.volumeLadder200,
        volumeLadder100: totals.volumeLadder100,
        volumeLadder0: totals.volumeLadder0,
        disc0: totals.disc0,
        disc3: totals.disc3,
        disc6: totals.disc6,
        disc9: totals.disc9,
        disc12: totals.disc12,
        disc15: totals.disc15,
        avgIncrease: totals.volumeTotal > 0 ? totals.weightedIncrease / totals.volumeTotal : 0,
        avgTargetPercent: totals.siteCount > 0 ? totals.weightedTarget / totals.siteCount : 0,
        moveInto500: totals.moveInto500,
        moveInto400: totals.moveInto400,
        moveInto300: totals.moveInto300,
        moveInto250: totals.moveInto250,
        moveInto200: totals.moveInto200,
        moveInto100: totals.moveInto100,
        moveInto0: totals.moveInto0
      };
    });
}

export function getTrendPointsByGranularity({
  trend,
  granularity
}: {
  trend: TrendPoint[];
  granularity: TrendGranularity;
}) {
  return granularity === "weekly" ? aggregateTrendPoints(trend) : trend;
}

export function getFilteredAverageTrend({
  meta,
  trend,
  trendRange
}: {
  meta: MetaResponse | null;
  trend: TrendPoint[];
  trendRange: TrendRange;
}) {
  const baseTrend =
    meta && trendRange === "post25"
      ? trend.filter((point) => point.day >= meta.config.campaignStart)
      : trend;

  if (trendRange === "last14") {
    return baseTrend.slice(-14);
  }

  if (trendRange === "last7") {
    return baseTrend.slice(-7);
  }

  return baseTrend;
}

export function buildActiveTableFilters({
  selectedBuckets,
  selectedDayLabel,
  selectedDivisions,
  selectedSegments,
  selectedChannels,
  selectedFcNames,
  selectedDiscountTypes,
  search
}: {
  selectedBuckets: string[];
  selectedDayLabel: string;
  selectedDivisions: string[];
  selectedSegments: string[];
  selectedChannels: string[];
  selectedFcNames: string[];
  selectedDiscountTypes: string[];
  search: string;
}) {
  const filters: Array<{ label: string; value: string }> = [];

  if (selectedBuckets.length > 0) {
    filters.push({ label: "Ladder", value: selectedBuckets.join(", ") });
  }

  if (selectedDayLabel) {
    filters.push({ label: "วันที่", value: selectedDayLabel });
  }

  if (selectedDivisions.length > 0) {
    filters.push({ label: "Division", value: selectedDivisions.join(", ") });
  }

  if (selectedSegments.length > 0) {
    filters.push({ label: "Segment", value: selectedSegments.join(", ") });
  }

  if (selectedChannels.length > 0) {
    filters.push({ label: "Channel", value: selectedChannels.join(", ") });
  }

  if (selectedFcNames.length > 0) {
    filters.push({ label: "FC", value: selectedFcNames.join(", ") });
  }

  if (selectedDiscountTypes.length > 0) {
    filters.push({
      label: "Discount type",
      value: selectedDiscountTypes.join(", ")
    });
  }

  if (search.trim()) {
    filters.push({ label: "Search", value: search.trim() });
  }

  return filters;
}
