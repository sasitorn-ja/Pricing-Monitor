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
  avgIncrease: number;
  avgTargetPercent: number;
  moveInto500: number;
  moveInto400: number;
  moveInto300: number;
  moveInto250: number;
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

export type ProjectTrendRow = {
  siteNo: string;
  siteName: string;
  day: string;
  baselineNetPrice: number;
  postNetPrice: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
};

export type PostDailyRow = {
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

export type SummaryStats = {
  comparableSites: number;
  ladder500: number;
  ladder400: number;
  ladder300: number;
  ladder250: number;
  ladder200: number;
  ladder100: number;
  ladder0: number;
  belowTargetSites: number;
  totalIncrease: number;
  avgIncrease: number;
  avgTargetPercent: number;
  targetHitShare: number;
  minIncrease: number;
  maxIncrease: number;
  latestDayMin: string | null;
  latestDayMax: string | null;
};

export type AnalyticsBundle = {
  metadata: {
    total_rows: number;
    total_sites: number;
    min_dp_date: string | null;
    max_dp_date: string | null;
  };
  summary: SummaryStats;
  summaryByDay: Map<string, SummaryStats>;
  trend: TrendPoint[];
  projects: ProjectRow[];
  dailyProjects: ProjectRow[];
  projectTrendMap: Map<string, ProjectTrendRow[]>;
};

export type DiscountDropKey =
  | "disc0"
  | "disc3"
  | "disc6"
  | "disc9"
  | "disc12"
  | "disc15";
