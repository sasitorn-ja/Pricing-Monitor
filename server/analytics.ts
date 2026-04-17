import {
  CAMPAIGN_START,
  BASELINE_END,
  BASELINE_START,
  TARGET_INCREASE
} from "./queries.js";

export type PricingRecord = {
  DIVISION_NAME: string | null;
  FC_NAME: string | null;
  SECT_NAME: string | null;
  SITE_NO: string | null;
  SITE_NAME: string | null;
  SEGMENT: string | null;
  CREATE_DATE: string | null;
  DISCOUNT_DATE: string | null;
  FUTURE_DISCOUNT_DATE: string | null;
  DP_DATE: string | null;
  DISCOUNT_TYPE: string | null;
  COUNTSITE: number | null;
  SUMQ: number | null;
  NP_AVG: number | null;
  NETCON: number | null;
  DC_AVG: number | null;
  LP_AVG: number | null;
  CHANNEL: string | null;
  CUSTOMER_NO: string | null;
  CUSTOMER_NAME: string | null;
  CUSTOMER_MEMBER_TYPE: string | null;
  SUBCUSTOMER_NO: string | null;
  SUBCUSTOMER_NAME: string | null;
  SUBCUSTOMER_MEMBER_TYPE: string | null;
};

export type TrendPoint = {
  day: string;
  siteCount: number;
  ladder500: number;
  ladder400: number;
  ladder300: number;
  ladder200: number;
  ladder100: number;
  ladder0: number;
  avgIncrease: number;
  avgTargetPercent: number;
  moveInto500: number;
  moveInto400: number;
  moveInto300: number;
  moveInto200: number;
  moveInto100: number;
  moveInto0: number;
};

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
  baselineDisc: number;
  currentDisc: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
  baselineVolume: number;
  postVolume: number;
};

type ProjectTrendRow = {
  siteNo: string;
  siteName: string;
  day: string;
  baselineNetPrice: number;
  postNetPrice: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
};

type PostDailyRow = {
  siteNo: string;
  siteName: string;
  day: string;
  divisionName: string;
  fcName: string;
  sectName: string;
  segment: string;
  channel: string;
  baselineNetPrice: number;
  baselineDisc: number;
  baselineVolume: number;
  postNetPrice: number;
  postDisc: number;
  postVolume: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
  ladderRank: number;
};

type AnalyticsBundle = {
  metadata: {
    total_rows: number;
    total_sites: number;
    min_dp_date: string | null;
    max_dp_date: string | null;
  };
  summary: {
    comparableSites: number;
    ladder500: number;
    ladder400: number;
    ladder300: number;
    ladder200: number;
    ladder100: number;
    ladder0: number;
    belowTargetSites: number;
    totalIncrease: number;
    avgIncrease: number;
    avgTargetPercent: number;
    minIncrease: number;
    maxIncrease: number;
  };
  trend: TrendPoint[];
  projects: ProjectRow[];
  dailyProjects: ProjectRow[];
  projectTrendMap: Map<string, ProjectTrendRow[]>;
};

const baselineStart = new Date(BASELINE_START);
const baselineEnd = new Date(BASELINE_END);
const campaignStart = new Date(CAMPAIGN_START);

function toDateOnly(value: string | null) {
  if (!value) {
    return null;
  }

  const dateOnly = value.slice(0, 10);
  const date = new Date(dateOnly);
  return Number.isNaN(date.getTime()) ? null : { raw: dateOnly, date };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getLadder(increaseAmount: number) {
  if (increaseAmount >= 500) {
    return { label: "500+", rank: 6 };
  }

  if (increaseAmount >= 400) {
    return { label: "400-499", rank: 5 };
  }

  if (increaseAmount >= 300) {
    return { label: "300-399", rank: 4 };
  }

  if (increaseAmount >= 200) {
    return { label: "200-299", rank: 3 };
  }

  if (increaseAmount >= 100) {
    return { label: "100-199", rank: 2 };
  }

  return { label: "0-99", rank: 1 };
}

function safeString(value: string | null) {
  return value ?? "";
}

export function buildAnalytics(records: PricingRecord[]): AnalyticsBundle {
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
      priceTotal: number;
      discountTotal: number;
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
      priceTotal: number;
      discountTotal: number;
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

    if (!Number.isFinite(npAvg)) {
      continue;
    }

    if (dpDate.date >= baselineStart && dpDate.date <= baselineEnd) {
      const current = baselineAccumulator.get(siteNo) ?? {
        siteNo,
        siteName: safeString(record.SITE_NAME),
        divisionName: safeString(record.DIVISION_NAME),
        fcName: safeString(record.FC_NAME),
        sectName: safeString(record.SECT_NAME),
        segment: safeString(record.SEGMENT),
        channel: safeString(record.CHANNEL),
        priceTotal: 0,
        discountTotal: 0,
        recordCount: 0,
        totalVolume: 0
      };

      const dcAvg = Number(record.DC_AVG ?? 0);
      current.priceTotal += npAvg;
      current.discountTotal += Number.isFinite(dcAvg) ? dcAvg : 0;
      current.recordCount += 1;
      current.totalVolume += Number.isFinite(sumQ) && sumQ > 0 ? sumQ : 0;
      baselineAccumulator.set(siteNo, current);
    }

    if (dpDate.date >= campaignStart) {
      const key = `${siteNo}__${dpDate.raw}`;
      const current = postAccumulator.get(key) ?? {
        siteNo,
        siteName: safeString(record.SITE_NAME),
        day: dpDate.raw,
        priceTotal: 0,
        discountTotal: 0,
        recordCount: 0,
        totalVolume: 0
      };

      const dcAvg = Number(record.DC_AVG ?? 0);
      current.priceTotal += npAvg;
      current.discountTotal += Number.isFinite(dcAvg) ? dcAvg : 0;
      current.recordCount += 1;
      current.totalVolume += Number.isFinite(sumQ) && sumQ > 0 ? sumQ : 0;
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
    if (value.recordCount <= 0) {
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
      baselineNetPrice: value.priceTotal / value.recordCount,
      baselineDisc: value.discountTotal / value.recordCount,
      baselineVolume: value.totalVolume
    });
  }

  const postRows: PostDailyRow[] = [];

  for (const value of postAccumulator.values()) {
    const baseline = baselineMap.get(value.siteNo);
    if (!baseline || value.recordCount <= 0) {
      continue;
    }

    const postNetPrice = value.priceTotal / value.recordCount;
    const postDisc = value.discountTotal / value.recordCount;
    const rawIncreaseAmount = postNetPrice - baseline.baselineNetPrice;
    const increaseAmount = Math.max(rawIncreaseAmount, 0);
    const targetPercent = (increaseAmount / TARGET_INCREASE) * 100;
    const ladder = getLadder(increaseAmount);

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

  const latestBySite = new Map<string, PostDailyRow>();
  const trendByDay = new Map<
    string,
    {
      day: string;
      siteCount: number;
      ladder500: number;
      ladder400: number;
      ladder300: number;
      ladder200: number;
      ladder100: number;
      ladder0: number;
      avgIncreaseTotal: number;
      avgTargetPercentTotal: number;
      moveInto500: number;
      moveInto400: number;
      moveInto300: number;
      moveInto200: number;
      moveInto100: number;
      moveInto0: number;
    }
  >();
  const projectTrendMap = new Map<string, ProjectTrendRow[]>();

  const previousBySite = new Map<string, number>();

  for (const row of postRows) {
    latestBySite.set(row.siteNo, row);

    const dayBucket = trendByDay.get(row.day) ?? {
      day: row.day,
      siteCount: 0,
      ladder500: 0,
      ladder400: 0,
      ladder300: 0,
      ladder200: 0,
      ladder100: 0,
      ladder0: 0,
      avgIncreaseTotal: 0,
      avgTargetPercentTotal: 0,
      moveInto500: 0,
      moveInto400: 0,
      moveInto300: 0,
      moveInto200: 0,
      moveInto100: 0,
      moveInto0: 0
    };

    dayBucket.siteCount += 1;
    dayBucket.avgIncreaseTotal += row.increaseAmount;
    dayBucket.avgTargetPercentTotal += row.targetPercent;

    if (row.ladder === "500+") dayBucket.ladder500 += 1;
    else if (row.ladder === "400-499") dayBucket.ladder400 += 1;
    else if (row.ladder === "300-399") dayBucket.ladder300 += 1;
    else if (row.ladder === "200-299") dayBucket.ladder200 += 1;
    else if (row.ladder === "100-199") dayBucket.ladder100 += 1;
    else dayBucket.ladder0 += 1;

    const previousRank = previousBySite.get(row.siteNo);
    const movedUp = previousRank === undefined || row.ladderRank > previousRank;
    if (movedUp) {
      if (row.ladder === "500+") dayBucket.moveInto500 += 1;
      else if (row.ladder === "400-499") dayBucket.moveInto400 += 1;
      else if (row.ladder === "300-399") dayBucket.moveInto300 += 1;
      else if (row.ladder === "200-299") dayBucket.moveInto200 += 1;
      else if (row.ladder === "100-199") dayBucket.moveInto100 += 1;
      else dayBucket.moveInto0 += 1;
    }

    previousBySite.set(row.siteNo, row.ladderRank);
    trendByDay.set(row.day, dayBucket);

    const projectTrend = projectTrendMap.get(row.siteNo) ?? [];
    projectTrend.push({
      siteNo: row.siteNo,
      siteName: row.siteName,
      day: row.day,
      baselineNetPrice: round2(row.baselineNetPrice),
      postNetPrice: round2(row.postNetPrice),
      increaseAmount: round2(row.increaseAmount),
      targetPercent: round2(row.targetPercent),
      ladder: row.ladder
    });
    projectTrendMap.set(row.siteNo, projectTrend);
  }

  const trend = [...trendByDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((bucket) => ({
      day: bucket.day,
      siteCount: bucket.siteCount,
      ladder500: bucket.ladder500,
      ladder400: bucket.ladder400,
      ladder300: bucket.ladder300,
      ladder200: bucket.ladder200,
      ladder100: bucket.ladder100,
      ladder0: bucket.ladder0,
      avgIncrease: round2(bucket.avgIncreaseTotal / bucket.siteCount),
      avgTargetPercent: round2(bucket.avgTargetPercentTotal / bucket.siteCount),
      moveInto500: bucket.moveInto500,
      moveInto400: bucket.moveInto400,
      moveInto300: bucket.moveInto300,
      moveInto200: bucket.moveInto200,
      moveInto100: bucket.moveInto100,
      moveInto0: bucket.moveInto0
    }));

  const projects = [...latestBySite.values()]
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

  const dailyProjects = postRows
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

  const comparableSites = projects.length;
  const increaseList = projects.map((row) => row.increaseAmount);
  const totalIncrease = increaseList.reduce((sum, value) => sum + value, 0);

  return {
    metadata: {
      total_rows: records.length,
      total_sites: siteSet.size,
      min_dp_date: minDate,
      max_dp_date: maxDate
    },
    summary: {
      comparableSites,
      ladder500: projects.filter((row) => row.ladder === "500+").length,
      ladder400: projects.filter((row) => row.ladder === "400-499").length,
      ladder300: projects.filter((row) => row.ladder === "300-399").length,
      ladder200: projects.filter((row) => row.ladder === "200-299").length,
      ladder100: projects.filter((row) => row.ladder === "100-199").length,
      ladder0: projects.filter((row) => row.ladder === "0-99").length,
      belowTargetSites: projects.filter((row) => row.increaseAmount < TARGET_INCREASE).length,
      totalIncrease: round2(totalIncrease),
      avgIncrease: comparableSites ? round2(totalIncrease / comparableSites) : 0,
      avgTargetPercent: comparableSites
        ? round2(projects.reduce((sum, row) => sum + row.targetPercent, 0) / comparableSites)
        : 0,
      minIncrease: comparableSites ? round2(Math.min(...increaseList)) : 0,
      maxIncrease: comparableSites ? round2(Math.max(...increaseList)) : 0
    },
    trend,
    projects,
    dailyProjects,
    projectTrendMap
  };
}
