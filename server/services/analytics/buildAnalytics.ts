import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START,
  TARGET_INCREASE
} from "../../config/pricing.js";
import {
  NO_BASELINE_LADDER,
  getDiscountDropBucket,
  getLadder,
  round2,
  safeString,
  summarizeProjects,
  toDateOnly
} from "./helpers.js";
import type {
  AnalyticsBundle,
  PostDailyRow,
  PricingRecord,
  ProjectRow,
  ProjectTrendRow
} from "./types.js";

export type AnalyticsOptions = {
  baselineStart?: string;
  baselineEnd?: string;
  campaignStart?: string;
};

function parseDateOrDefault(value: string | undefined, fallback: string) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(fallback);
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function getAnalyticsConfig(options: AnalyticsOptions = {}) {
  const baselineStart = parseDateOrDefault(options.baselineStart, BASELINE_START);
  const baselineEnd = parseDateOrDefault(options.baselineEnd, BASELINE_END);
  const baselineStartValue = toDateKey(baselineStart);
  const baselineEndValue = toDateKey(baselineEnd);
  const campaignStart =
    options.campaignStart ||
    toDateKey(new Date(baselineEnd.getTime() + 24 * 60 * 60 * 1000)) ||
    CAMPAIGN_START;

  if (baselineStart > baselineEnd) {
    return getAnalyticsConfig({
      baselineStart: baselineEndValue,
      baselineEnd: baselineStartValue
    });
  }

  return {
    baselineStart: baselineStartValue,
    baselineEnd: baselineEndValue,
    campaignStart,
    baselineStartDate: baselineStart,
    baselineEndDate: baselineEnd
  };
}

export function buildAnalytics(records: PricingRecord[], options: AnalyticsOptions = {}): AnalyticsBundle {
  const analyticsConfig = getAnalyticsConfig(options);
  const siteSet = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  const baselineAccumulator = new Map<
    string,
    {
      siteNo: string;
      siteName: string;
      divisionName: string;
      fcName: string;
      sectName: string;
      segment: string;
      channel: string;
      priceWeightedTotal: number;
      discountWeightedTotal: number;
      recordCount: number;
      totalVolume: number;
    }
  >();

  const postAccumulator = new Map<
    string,
    {
      siteNo: string;
      siteName: string;
      day: string;
      divisionName: string;
      fcName: string;
      sectName: string;
      segment: string;
      channel: string;
      priceWeightedTotal: number;
      discountWeightedTotal: number;
      recordCount: number;
      totalVolume: number;
    }
  >();

  for (const record of records) {
    const siteNo = safeString(record.SITE_NO);
    if (siteNo) {
      siteSet.add(siteNo);
    }

    const dpDate = toDateOnly(record.DP_DATE);
    if (!dpDate || !siteNo) {
      continue;
    }

    minDate =
      minDate === null || dpDate.raw.localeCompare(minDate) < 0 ? dpDate.raw : minDate;
    maxDate =
      maxDate === null || dpDate.raw.localeCompare(maxDate) > 0 ? dpDate.raw : maxDate;

    const npAvg = Number(record.NP_AVG ?? 0);
    const sumQ = Number(record.SUMQ ?? 0);
    const volume = Number.isFinite(sumQ) && sumQ > 0 ? sumQ : 0;

    if (!Number.isFinite(npAvg) || volume <= 0) {
      continue;
    }

    if (
      dpDate.date >= analyticsConfig.baselineStartDate &&
      dpDate.date <= analyticsConfig.baselineEndDate
    ) {
      const current = baselineAccumulator.get(siteNo) ?? {
        siteNo,
        siteName: safeString(record.SITE_NAME),
        divisionName: safeString(record.DIVISION_NAME),
        fcName: safeString(record.FC_NAME),
        sectName: safeString(record.SECT_NAME),
        segment: safeString(record.SEGMENT),
        channel: safeString(record.CHANNEL),
        priceWeightedTotal: 0,
        discountWeightedTotal: 0,
        recordCount: 0,
        totalVolume: 0
      };

      const dcAvg = Number(record.DC_AVG ?? 0);
      current.priceWeightedTotal += npAvg * volume;
      current.discountWeightedTotal += (Number.isFinite(dcAvg) ? dcAvg : 0) * volume;
      current.recordCount += 1;
      current.totalVolume += volume;
      baselineAccumulator.set(siteNo, current);
    }

    if (dpDate.raw >= analyticsConfig.baselineStart) {
      const key = `${siteNo}__${dpDate.raw}`;
      const current = postAccumulator.get(key) ?? {
        siteNo,
        siteName: safeString(record.SITE_NAME),
        day: dpDate.raw,
        divisionName: safeString(record.DIVISION_NAME),
        fcName: safeString(record.FC_NAME),
        sectName: safeString(record.SECT_NAME),
        segment: safeString(record.SEGMENT),
        channel: safeString(record.CHANNEL),
        priceWeightedTotal: 0,
        discountWeightedTotal: 0,
        recordCount: 0,
        totalVolume: 0
      };

      const dcAvg = Number(record.DC_AVG ?? 0);
      current.priceWeightedTotal += npAvg * volume;
      current.discountWeightedTotal += (Number.isFinite(dcAvg) ? dcAvg : 0) * volume;
      current.recordCount += 1;
      current.totalVolume += volume;
      postAccumulator.set(key, current);
    }
  }

  const baselineMap = new Map<
    string,
    {
      siteNo: string;
      siteName: string;
      divisionName: string;
      fcName: string;
      sectName: string;
      segment: string;
      channel: string;
      baselineNetPrice: number;
      baselineDisc: number;
      baselineVolume: number;
    }
  >();

  for (const [siteNo, value] of baselineAccumulator) {
    if (value.totalVolume <= 0) {
      continue;
    }

    baselineMap.set(siteNo, {
      siteNo,
      siteName: value.siteName,
      divisionName: value.divisionName,
      fcName: value.fcName,
      sectName: value.sectName,
      segment: value.segment,
      channel: value.channel,
      baselineNetPrice: value.priceWeightedTotal / value.totalVolume,
      baselineDisc: value.discountWeightedTotal / value.totalVolume,
      baselineVolume: value.totalVolume
    });
  }

  const postRows: PostDailyRow[] = [];
  const projectTrendMap = new Map<string, ProjectTrendRow[]>();
  const noBaselineDailyProjects: ProjectRow[] = [];
  const noBaselineLatestBySite = new Map<string, ProjectRow>();

  for (const value of postAccumulator.values()) {
    const baseline = baselineMap.get(value.siteNo);
    if (!baseline || value.totalVolume <= 0) {
      if (!baseline && value.totalVolume > 0 && value.day >= analyticsConfig.campaignStart) {
        const postNetPrice = value.priceWeightedTotal / value.totalVolume;
        const postDisc = value.discountWeightedTotal / value.totalVolume;
        const noBaselineRow = {
          siteNo: value.siteNo,
          siteName: value.siteName,
          divisionName: value.divisionName,
          fcName: value.fcName,
          sectName: value.sectName,
          segment: value.segment,
          channel: value.channel,
          latestDay: value.day,
          baselineNetPrice: 0,
          currentNetPrice: round2(postNetPrice),
          baselineDisc: 0,
          currentDisc: round2(postDisc),
          increaseAmount: 0,
          targetPercent: 0,
          ladder: NO_BASELINE_LADDER,
          baselineVolume: 0,
          postVolume: round2(value.totalVolume)
        };
        const projectTrend = projectTrendMap.get(value.siteNo) ?? [];
        projectTrend.push({
          siteNo: value.siteNo,
          siteName: value.siteName,
          day: value.day,
          baselineNetPrice: 0,
          postNetPrice: round2(postNetPrice),
          increaseAmount: 0,
          targetPercent: 0,
          ladder: NO_BASELINE_LADDER
        });
        projectTrendMap.set(value.siteNo, projectTrend);
        noBaselineDailyProjects.push(noBaselineRow);

        const previousLatest = noBaselineLatestBySite.get(value.siteNo);
        if (!previousLatest || value.day.localeCompare(previousLatest.latestDay) > 0) {
          noBaselineLatestBySite.set(value.siteNo, noBaselineRow);
        }
      }

      continue;
    }

    const postNetPrice = value.priceWeightedTotal / value.totalVolume;
    const postDisc = value.discountWeightedTotal / value.totalVolume;
    const rawIncreaseAmount = postNetPrice - baseline.baselineNetPrice;
    const increaseAmount = Math.max(rawIncreaseAmount, 0);
    const targetPercent = (increaseAmount / TARGET_INCREASE) * 100;
    const ladder = getLadder(increaseAmount);
    const projectTrend = projectTrendMap.get(value.siteNo) ?? [];
    projectTrend.push({
      siteNo: value.siteNo,
      siteName: baseline.siteName || value.siteName,
      day: value.day,
      baselineNetPrice: round2(baseline.baselineNetPrice),
      postNetPrice: round2(postNetPrice),
      increaseAmount: round2(increaseAmount),
      targetPercent: round2(targetPercent),
      ladder: ladder.label
    });
    projectTrendMap.set(value.siteNo, projectTrend);

    if (value.day < analyticsConfig.campaignStart) {
      continue;
    }

    postRows.push({
      siteNo: value.siteNo,
      siteName: baseline.siteName || value.siteName,
      day: value.day,
      divisionName: baseline.divisionName,
      fcName: baseline.fcName,
      sectName: baseline.sectName,
      segment: baseline.segment,
      channel: baseline.channel,
      baselineNetPrice: baseline.baselineNetPrice,
      baselineDisc: baseline.baselineDisc,
      baselineVolume: baseline.baselineVolume,
      postNetPrice,
      postDisc,
      postVolume: value.totalVolume,
      increaseAmount,
      targetPercent,
      ladder: ladder.label,
      ladderRank: ladder.rank
    });
  }

  postRows.sort((a, b) => {
    if (a.siteNo === b.siteNo) {
      return a.day.localeCompare(b.day);
    }

    return a.siteNo.localeCompare(b.siteNo);
  });

  for (const rows of projectTrendMap.values()) {
    rows.sort((a, b) => a.day.localeCompare(b.day));
  }

  const latestBySite = new Map<string, PostDailyRow>();
  const trendByDay = new Map<
    string,
    {
      day: string;
      siteCount: number;
      noBaseline: number;
      ladder500: number;
      ladder400: number;
      ladder300: number;
      ladder250: number;
      ladder200: number;
      ladder100: number;
      ladder0: number;
      volumeTotal: number;
      volumeNoBaseline: number;
      volumeLadder500: number;
      volumeLadder400: number;
      volumeLadder300: number;
      volumeLadder250: number;
      volumeLadder200: number;
      volumeLadder100: number;
      volumeLadder0: number;
      disc0: number;
      disc3: number;
      disc6: number;
      disc9: number;
      disc12: number;
      disc15: number;
      avgIncreaseTotal: number;
      avgTargetPercentTotal: number;
      weightedIncreaseTotal: number;
      comparableVolumeTotal: number;
      comparableSiteCount: number;
      moveInto500: number;
      moveInto400: number;
      moveInto300: number;
      moveInto250: number;
      moveInto200: number;
      moveInto100: number;
      moveInto0: number;
    }
  >();

  const createTrendBucket = (day: string) => ({
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
    avgIncreaseTotal: 0,
    avgTargetPercentTotal: 0,
    weightedIncreaseTotal: 0,
    comparableVolumeTotal: 0,
    comparableSiteCount: 0,
    moveInto500: 0,
    moveInto400: 0,
    moveInto300: 0,
    moveInto250: 0,
    moveInto200: 0,
    moveInto100: 0,
    moveInto0: 0
  });

  for (const value of postAccumulator.values()) {
    if (value.day < analyticsConfig.campaignStart || value.totalVolume <= 0) {
      continue;
    }

    const dayBucket = trendByDay.get(value.day) ?? createTrendBucket(value.day);
    dayBucket.siteCount += 1;
    dayBucket.volumeTotal += value.totalVolume;

    if (!baselineMap.has(value.siteNo)) {
      dayBucket.noBaseline += 1;
      dayBucket.volumeNoBaseline += value.totalVolume;
    }

    trendByDay.set(value.day, dayBucket);
  }

  const previousBySite = new Map<string, number>();

  for (const row of postRows) {
    latestBySite.set(row.siteNo, row);

    const dayBucket = trendByDay.get(row.day) ?? createTrendBucket(row.day);

    if (dayBucket.siteCount === 0) {
      dayBucket.siteCount += 1;
      dayBucket.volumeTotal += row.postVolume;
    }

    dayBucket.comparableSiteCount += 1;
    dayBucket.avgIncreaseTotal += row.increaseAmount;
    dayBucket.avgTargetPercentTotal += row.targetPercent;
    dayBucket.weightedIncreaseTotal += row.increaseAmount * row.postVolume;
    dayBucket.comparableVolumeTotal += row.postVolume;

    if (row.ladder === "500+") {
      dayBucket.ladder500 += 1;
      dayBucket.volumeLadder500 += row.postVolume;
    } else if (row.ladder === "400-499") {
      dayBucket.ladder400 += 1;
      dayBucket.volumeLadder400 += row.postVolume;
    } else if (row.ladder === "300-399") {
      dayBucket.ladder300 += 1;
      dayBucket.volumeLadder300 += row.postVolume;
    } else if (row.ladder === "250-299") {
      dayBucket.ladder250 += 1;
      dayBucket.volumeLadder250 += row.postVolume;
    } else if (row.ladder === "200-249") {
      dayBucket.ladder200 += 1;
      dayBucket.volumeLadder200 += row.postVolume;
    } else if (row.ladder === "100-199") {
      dayBucket.ladder100 += 1;
      dayBucket.volumeLadder100 += row.postVolume;
    } else {
      dayBucket.ladder0 += 1;
      dayBucket.volumeLadder0 += row.postVolume;
    }

    const discountBucket = getDiscountDropBucket(row.baselineDisc, row.postDisc);
    dayBucket[discountBucket] += 1;

    const previousRank = previousBySite.get(row.siteNo);
    const movedUp = previousRank === undefined || row.ladderRank > previousRank;
    if (movedUp) {
      if (row.ladder === "500+") dayBucket.moveInto500 += 1;
      else if (row.ladder === "400-499") dayBucket.moveInto400 += 1;
      else if (row.ladder === "300-399") dayBucket.moveInto300 += 1;
      else if (row.ladder === "250-299") dayBucket.moveInto250 += 1;
      else if (row.ladder === "200-249") dayBucket.moveInto200 += 1;
      else if (row.ladder === "100-199") dayBucket.moveInto100 += 1;
      else dayBucket.moveInto0 += 1;
    }

    previousBySite.set(row.siteNo, row.ladderRank);
    trendByDay.set(row.day, dayBucket);
  }

  const trend = [...trendByDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((bucket) => ({
      day: bucket.day,
      siteCount: bucket.siteCount,
      noBaseline: bucket.noBaseline,
      ladder500: bucket.ladder500,
      ladder400: bucket.ladder400,
      ladder300: bucket.ladder300,
      ladder250: bucket.ladder250,
      ladder200: bucket.ladder200,
      ladder100: bucket.ladder100,
      ladder0: bucket.ladder0,
      volumeTotal: round2(bucket.volumeTotal),
      volumeNoBaseline: round2(bucket.volumeNoBaseline),
      volumeLadder500: round2(bucket.volumeLadder500),
      volumeLadder400: round2(bucket.volumeLadder400),
      volumeLadder300: round2(bucket.volumeLadder300),
      volumeLadder250: round2(bucket.volumeLadder250),
      volumeLadder200: round2(bucket.volumeLadder200),
      volumeLadder100: round2(bucket.volumeLadder100),
      volumeLadder0: round2(bucket.volumeLadder0),
      disc0: bucket.disc0,
      disc3: bucket.disc3,
      disc6: bucket.disc6,
      disc9: bucket.disc9,
      disc12: bucket.disc12,
      disc15: bucket.disc15,
      avgIncrease: round2(
        bucket.comparableVolumeTotal > 0
          ? bucket.weightedIncreaseTotal / bucket.comparableVolumeTotal
          : bucket.comparableSiteCount
            ? bucket.avgIncreaseTotal / bucket.comparableSiteCount
            : 0
      ),
      avgTargetPercent: round2(
        bucket.comparableSiteCount
          ? bucket.avgTargetPercentTotal / bucket.comparableSiteCount
          : 0
      ),
      moveInto500: bucket.moveInto500,
      moveInto400: bucket.moveInto400,
      moveInto300: bucket.moveInto300,
      moveInto250: bucket.moveInto250,
      moveInto200: bucket.moveInto200,
      moveInto100: bucket.moveInto100,
      moveInto0: bucket.moveInto0
    }));

  const comparableProjects = [...latestBySite.values()]
    .map((row) => ({
      siteNo: row.siteNo,
      siteName: row.siteName,
      divisionName: row.divisionName,
      fcName: row.fcName,
      sectName: row.sectName,
      segment: row.segment,
      channel: row.channel,
      latestDay: row.day,
      baselineNetPrice: round2(row.baselineNetPrice),
      currentNetPrice: round2(row.postNetPrice),
      baselineDisc: round2(row.baselineDisc),
      currentDisc: round2(row.postDisc),
      increaseAmount: round2(row.increaseAmount),
      targetPercent: round2(row.targetPercent),
      ladder: row.ladder,
      baselineVolume: round2(row.baselineVolume),
      postVolume: round2(row.postVolume)
    }))
    .sort((a, b) => {
      if (a.increaseAmount === b.increaseAmount) {
        return a.siteName.localeCompare(b.siteName);
      }

      return a.increaseAmount - b.increaseAmount;
    });

  const comparableDailyProjects = postRows
    .map((row) => ({
      siteNo: row.siteNo,
      siteName: row.siteName,
      divisionName: row.divisionName,
      fcName: row.fcName,
      sectName: row.sectName,
      segment: row.segment,
      channel: row.channel,
      latestDay: row.day,
      baselineNetPrice: round2(row.baselineNetPrice),
      currentNetPrice: round2(row.postNetPrice),
      baselineDisc: round2(row.baselineDisc),
      currentDisc: round2(row.postDisc),
      increaseAmount: round2(row.increaseAmount),
      targetPercent: round2(row.targetPercent),
      ladder: row.ladder,
      baselineVolume: round2(row.baselineVolume),
      postVolume: round2(row.postVolume)
    }))
    .sort((a, b) => {
      if (a.latestDay === b.latestDay) {
        if (a.increaseAmount === b.increaseAmount) {
          return a.siteName.localeCompare(b.siteName);
        }

        return a.increaseAmount - b.increaseAmount;
      }

      return a.latestDay.localeCompare(b.latestDay);
    });

  const projects = [...comparableProjects, ...noBaselineLatestBySite.values()].sort((a, b) => {
    if (a.increaseAmount === b.increaseAmount) {
      return a.siteName.localeCompare(b.siteName);
    }

    return a.increaseAmount - b.increaseAmount;
  });

  const dailyProjects = [...comparableDailyProjects, ...noBaselineDailyProjects].sort((a, b) => {
    if (a.latestDay === b.latestDay) {
      if (a.increaseAmount === b.increaseAmount) {
        return a.siteName.localeCompare(b.siteName);
      }

      return a.increaseAmount - b.increaseAmount;
    }

    return a.latestDay.localeCompare(b.latestDay);
  });

  const dailyProjectsByDay = new Map<string, ProjectRow[]>();
  for (const row of comparableDailyProjects) {
    const rows = dailyProjectsByDay.get(row.latestDay) ?? [];
    rows.push(row);
    dailyProjectsByDay.set(row.latestDay, rows);
  }

  const summaryByDay = new Map<string, ReturnType<typeof summarizeProjects>>();
  for (const [day, rows] of dailyProjectsByDay) {
    summaryByDay.set(day, summarizeProjects(rows));
  }

  const summary = summarizeProjects(comparableProjects);

  return {
    metadata: {
      total_rows: records.length,
      total_sites: siteSet.size,
      min_dp_date: minDate,
      max_dp_date: maxDate
    },
    summary,
    summaryByDay,
    trend,
    projects,
    dailyProjects,
    projectTrendMap
  };
}
