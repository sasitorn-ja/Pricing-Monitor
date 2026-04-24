export type MetaResponse = {
  metadata: {
    total_rows: number;
    total_sites: number;
    min_dp_date: string;
    max_dp_date: string;
  };
  config: {
    baselineStart: string;
    baselineEnd: string;
    campaignStart: string;
    targetIncrease: number;
  };
  filters?: {
    divisions: string[];
    segments: string[];
    channels: string[];
    fcNamesByDivision: Record<string, string[]>;
    discountTypes: string[];
  };
};

export type SummaryResponse = {
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
  latestDayMin?: string | null;
  latestDayMax?: string | null;
};

export type TrendPoint = {
  day: string;
  periodEnd?: string;
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

export type ShareTrendPoint = TrendPoint & {
  ladder300Plus: number;
  ladder300PlusShare: number;
  ladder500Share: number;
  ladder400Share: number;
  ladder300Share: number;
  ladder250Share: number;
  ladder200Share: number;
  ladder100Share: number;
  ladder0Share: number;
  noBaselineShare: number;
  volumeLadder500Share: number;
  volumeLadder400Share: number;
  volumeLadder300Share: number;
  volumeLadder250Share: number;
  volumeLadder200Share: number;
  volumeLadder100Share: number;
  volumeLadder0Share: number;
  volumeNoBaselineShare: number;
  disc0Share: number;
  disc3Share: number;
  disc6Share: number;
  disc9Share: number;
  disc12Share: number;
  disc15Share: number;
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

export type ProjectTrendPoint = {
  siteNo: string;
  siteName: string;
  day: string;
  baselineNetPrice: number;
  postNetPrice: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
};

export type ProjectTrendChartPoint = Omit<ProjectTrendPoint, "postNetPrice"> & {
  postNetPrice: number;
  hasRecord: boolean;
  isBaselinePeriod: boolean;
};

export type ProjectResponse = {
  rows: ProjectRow[];
  total: number;
};

export type DashboardResponse = {
  meta: MetaResponse;
  summary: SummaryResponse;
  trend: TrendPoint[];
};

export type TrendRange = "all" | "post25" | "last14" | "last7";
export type PriceLadderMode = "summary" | "detail";
export type TrendGranularity = "daily" | "weekly";
export type CalcHelpKey =
  | "baselineDefinition"
  | "totalIncrease"
  | "averageToTarget"
  | "proportionChart"
  | "discountDropChart"
  | "averageTrend"
  | "projectTrend"
  | "projectTable";
