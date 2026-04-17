import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type MetaResponse = {
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
  };
};

type SummaryResponse = {
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

type TrendPoint = {
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

type ShareTrendPoint = TrendPoint & {
  ladder500Share: number;
  ladder400Share: number;
  ladder300Share: number;
  ladder200Share: number;
  ladder100Share: number;
  ladder0Share: number;
};

type ProjectRow = {
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

type ProjectTrendPoint = {
  siteNo: string;
  siteName: string;
  day: string;
  baselineNetPrice: number;
  postNetPrice: number;
  increaseAmount: number;
  targetPercent: number;
  ladder: string;
};

type ProjectResponse = {
  rows: ProjectRow[];
  total: number;
};

type TrendRange = "all" | "post25" | "last14" | "last7";

const bucketLabels = [
  { key: "500+", label: "500 บาทขึ้นไป", tone: "bg-green-600" },
  { key: "400-499", label: "400-499 บาท", tone: "bg-green-500" },
  { key: "300-399", label: "300-399 บาท", tone: "bg-emerald-400" },
  { key: "200-299", label: "200-299 บาท", tone: "bg-sky-400" },
  { key: "100-199", label: "100-199 บาท", tone: "bg-amber-400" },
  { key: "0-99", label: "ต่ำกว่า 100 บาท", tone: "bg-rose-400" }
] as const;

const bucketColors = {
  topMax: "#16a34a",
  topHigh: "#22c55e",
  top: "#34d399",
  high: "#38bdf8",
  mid: "#fbbf24",
  low: "#fb7185"
} as const;

const trendBucketSeries = [
  { shareKey: "ladder0Share", countKey: "ladder0", name: "0-99", fill: bucketColors.low },
  { shareKey: "ladder100Share", countKey: "ladder100", name: "100-199", fill: bucketColors.mid },
  { shareKey: "ladder200Share", countKey: "ladder200", name: "200-299", fill: bucketColors.high },
  { shareKey: "ladder300Share", countKey: "ladder300", name: "300-399", fill: bucketColors.top },
  { shareKey: "ladder400Share", countKey: "ladder400", name: "400-499", fill: bucketColors.topHigh },
  { shareKey: "ladder500Share", countKey: "ladder500", name: "500+", fill: bucketColors.topMax }
] as const;

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const API_TIMEOUT_MS = 20_000;
const tableColumnHelp = {
  segment: "กลุ่มขนาดโครงการเดียวกับที่ใช้กรองในกราฟสัดส่วนด้านบน",
  ladder: "ระดับการขึ้นราคาเทียบเป้า 300 บาท",
  baseline: "ค่าเฉลี่ย NP_AVG ตรง ๆ ช่วงวันที่ 1-24",
  current: "net price ล่าสุดหลังวันที่ 25",
  increase: "Current - Baseline และถ้าติดลบจะนับเป็น 0 บาท",
  target: "(Increase / 300) x 100",
  latestDay: "วันที่ใช้เป็นราคาล่าสุดของโครงการ"
} as const;

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Request timed out after ${API_TIMEOUT_MS / 1000} seconds`);
    }

    throw error;
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const errorBody = (await response.json()) as { error?: string };
      message = errorBody.error || message;
    } catch {
      // Ignore JSON parse errors and keep the HTTP status message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatNumber(value)}%`;
}

function formatPercentTick(value: number) {
  return `${Math.round(value)}%`;
}

function formatBaht(value: number) {
  return `${formatNumber(value)} บาท`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric"
  });
}

function formatThaiDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatThaiDateShort(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric"
  });
}

function renderPercentBarLabel(props: any) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const value = Number(props.value ?? 0);

  if (!value || value < 9 || height < 24 || width < 18) {
    return null;
  }

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#f8fbff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {formatPercentTick(value)}
    </text>
  );
}

function HeaderWithHint({
  hintKey,
  label,
  hint,
  activeHint,
  onToggle
}: {
  hintKey: keyof typeof tableColumnHelp;
  label: string;
  hint: string;
  activeHint: keyof typeof tableColumnHelp | null;
  onToggle: (key: keyof typeof tableColumnHelp) => void;
}) {
  const isOpen = activeHint === hintKey;

  return (
    <span className="thLabel">
      {label}
      <button
        type="button"
        className={`hintDot ${isOpen ? "open" : ""}`}
        aria-label={hint}
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(hintKey);
        }}
      >
        i
      </button>
      {isOpen ? <span className="hintPopup">{hint}</span> : null}
    </span>
  );
}

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedTrend, setSelectedTrend] = useState<ProjectTrendPoint[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [activeHint, setActiveHint] = useState<keyof typeof tableColumnHelp | null>(
    null
  );
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState("");

  const buildFilterQuery = () => {
    const params = new URLSearchParams();

    if (selectedDivisions.length > 0) {
      params.set("divisions", selectedDivisions.join(","));
    }

    if (selectedSegments.length > 0) {
      params.set("segments", selectedSegments.join(","));
    }

    return params;
  };

  const toggleValue = (
    value: string,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter((items) =>
      items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
    );
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    async function loadMeta() {
      try {
        setMetaLoading(true);
        setError("");
        const metaResponse = await fetchJson<MetaResponse>("/api/meta");
        setMeta(metaResponse);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      } finally {
        setMetaLoading(false);
      }
    }

    void loadMeta();
  }, []);

  useEffect(() => {
    async function loadFilteredDashboard() {
      try {
        setError("");
        const params = buildFilterQuery();
        const query = params.toString();
        const suffix = query ? `?${query}` : "";

        const [summaryResponse, trendResponse] = await Promise.all([
          fetchJson<SummaryResponse>(`/api/summary${suffix}`),
          fetchJson<TrendPoint[]>(`/api/trend${suffix}`)
        ]);

        setSummary(summaryResponse);
        setTrend(trendResponse);
        setHasLoadedSummary(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadFilteredDashboard();
  }, [selectedDivisions, selectedSegments]);

  useEffect(() => {
    async function loadProjects() {
      try {
        setError("");
        const params = buildFilterQuery();

        if (selectedBucket) {
          params.set("ladder", selectedBucket);
        }

        if (selectedDay) {
          params.set("day", selectedDay);
        }

        if (debouncedSearch) {
          params.set("search", debouncedSearch);
        }

        params.set("page", String(currentPage));
        params.set("pageSize", String(PAGE_SIZE));

        const query = params.toString();
        const projectResponse = await fetchJson<ProjectResponse>(
          `/api/projects${query ? `?${query}` : ""}`
        );

        setProjectRows(projectResponse.rows);
        setProjectTotal(projectResponse.total);
        setHasLoadedProjects(true);

        const stillExists = projectResponse.rows.some(
          (row) => row.siteNo === selectedSite
        );

        if (!stillExists) {
          setSelectedSite(projectResponse.rows[0]?.siteNo ?? "");
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadProjects();
  }, [
    currentPage,
    debouncedSearch,
    selectedBucket,
    selectedDay,
    selectedDivisions,
    selectedSegments
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBucket, selectedDay, selectedDivisions, selectedSegments]);

  useEffect(() => {
    async function loadSelectedTrend() {
      if (!selectedSite) {
        setSelectedTrend([]);
        return;
      }

      try {
        const params = buildFilterQuery();
        const query = params.toString();
        const projectTrend = await fetchJson<ProjectTrendPoint[]>(
          `/api/projects/${encodeURIComponent(selectedSite)}/trend${query ? `?${query}` : ""}`
        );

        setSelectedTrend(projectTrend);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadSelectedTrend();
  }, [selectedSite, selectedDivisions, selectedSegments]);

  const post25TrendData = useMemo(() => {
    if (!meta) {
      return trend;
    }

    return trend.filter((point) => point.day >= meta.config.campaignStart);
  }, [meta, trend]);

  const proportionTrendData = useMemo<ShareTrendPoint[]>(() => {
    return post25TrendData.map((point) => {
      const denominator = point.siteCount || 1;

      return {
        ...point,
        ladder500Share: (point.ladder500 / denominator) * 100,
        ladder400Share: (point.ladder400 / denominator) * 100,
        ladder300Share: (point.ladder300 / denominator) * 100,
        ladder200Share: (point.ladder200 / denominator) * 100,
        ladder100Share: (point.ladder100 / denominator) * 100,
        ladder0Share: (point.ladder0 / denominator) * 100
      };
    });
  }, [post25TrendData]);

  const filteredAverageTrend = useMemo(() => {
    if (!meta) {
      return trend;
    }

    if (trendRange === "post25") {
      return trend.filter((point) => point.day >= meta.config.campaignStart);
    }

    if (trendRange === "last14") {
      return trend.slice(-14);
    }

    if (trendRange === "last7") {
      return trend.slice(-7);
    }

    return trend;
  }, [meta, trend, trendRange]);

  const availableDays = useMemo(() => {
    return post25TrendData.map((point) => point.day);
  }, [post25TrendData]);

  const availableDivisions = meta?.filters?.divisions ?? [];
  const availableSegments = meta?.filters?.segments ?? [];

  const totalPages = Math.max(1, Math.ceil(projectTotal / PAGE_SIZE));
  const pageStart = projectTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, projectTotal);
  const activeTableFilters = [
    { label: "Ladder", value: selectedBucket || "ทั้งหมด" },
    {
      label: "วันที่",
      value: selectedDay ? formatThaiDateShort(selectedDay) : "ราคาล่าสุด"
    },
    {
      label: "Segment",
      value: selectedSegments.length > 0 ? selectedSegments.join(", ") : "ทุก segment"
    }
  ];

  if (search.trim()) {
    activeTableFilters.push({
      label: "Search",
      value: search.trim()
    });
  }

  if (!error && (metaLoading || !hasLoadedSummary)) {
    return <div className="shell">Loading dashboard...</div>;
  }

  if (error || !meta || !summary) {
    return <div className="shell">Cannot load dashboard: {error || "missing data"}</div>;
  }

  return (
    <div className="shell" onClick={() => setActiveHint(null)}>
      <header className="hero heroSingle">
        <div>
          <p className="eyebrow">Pricing Monitor</p>
          <h1>Executive dashboard ติดตามการขึ้นราคา</h1>
          <p className="subtle">
            ใช้ NP_AVG เป็น net price เพื่อนำไปเทียบกับ Baseline
            {" "}ซึ่งอ้างอิงช่วง {meta.config.baselineStart} ถึง {meta.config.baselineEnd}
            {" "}และติดตามผลตั้งแต่ {meta.config.campaignStart} เป็นต้นไป
          </p>
        </div>
      </header>

      <section className="gridStats">
        <article className="statCard">
          <span>Total increase</span>
          <strong>{formatNumber(summary.totalIncrease)} บาท</strong>
          <p>ผลรวมการขึ้นราคาล่าสุดเทียบ baseline</p>
        </article>
        <article className="statCard">
          <span>Average to target</span>
          <strong>{formatPercent(summary.avgTargetPercent)}</strong>
          <p>ความคืบหน้าเฉลี่ยเทียบเป้า 300 บาท</p>
        </article>
        <article className="statCard">
          <span>Lowest increase</span>
          <strong>{formatNumber(summary.minIncrease)} บาท</strong>
          <p>โครงการที่ยังถอยจาก baseline มากที่สุด</p>
        </article>
        <article className="statCard">
          <span>Highest increase</span>
          <strong>{formatNumber(summary.maxIncrease)} บาท</strong>
          <p>โครงการที่ขึ้นราคาได้สูงสุด</p>
        </article>
      </section>

      <section className="chartStack sectionPanel">
        <article className="panel chartPanel">
          <div className="panelHeader">
            <div>
              <h2>% สัดส่วนโครงการตามระดับการขึ้นราคา</h2>
              <p>
                มุมมองนี้แสดงเป็น 100% stacked bar เพื่อให้เห็นสัดส่วนแต่ละ ladder ต่อวัน
                หลังวันที่ 25 และเปลี่ยนตามฟิลเตอร์ที่เลือก
              </p>
            </div>
            <div className="chartSummaryPills">
              <span className="summaryPill">{formatNumber(summary.comparableSites)} sites</span>
              <button
                type="button"
                className="clearFilterButton"
                onClick={() => {
                  setSelectedDivisions([]);
                  setSelectedSegments([]);
                }}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>

          <div className="compactFilterDock">
            <div className="compactFilterRow">
              <span className="compactFilterLabel">DIVISION</span>
              <div className="compactFilterChips">
                <button
                  type="button"
                  className={`compactFilterChip ${selectedDivisions.length === 0 ? "selected" : ""}`}
                  onClick={() => setSelectedDivisions([])}
                >
                  ทั้งหมด
                </button>
                {availableDivisions.map((division) => (
                  <button
                    key={division}
                    type="button"
                    className={`compactFilterChip ${selectedDivisions.includes(division) ? "selected" : ""}`}
                    onClick={() => toggleValue(division, setSelectedDivisions)}
                  >
                    {division}
                  </button>
                ))}
              </div>
            </div>

            <div className="compactFilterRow">
              <span className="compactFilterLabel">SEGMENT</span>
              <div className="compactFilterChips">
                <button
                  type="button"
                  className={`compactFilterChip ${selectedSegments.length === 0 ? "selected" : ""}`}
                  onClick={() => setSelectedSegments([])}
                >
                  ทั้งหมด
                </button>
                {availableSegments.map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    className={`compactFilterChip ${selectedSegments.includes(segment) ? "selected" : ""}`}
                    onClick={() => toggleValue(segment, setSelectedSegments)}
                  >
                    {segment}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="chartWrap proportionChart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proportionTrendData} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={formatPercentTick}
                  stroke="#9fb0d0"
                />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const point = payload?.[0]?.payload as ShareTrendPoint | undefined;
                    return `${formatThaiDateShort(String(label))}${
                      point ? ` • ${formatNumber(point.siteCount)} โครงการ` : ""
                    }`;
                  }}
                  formatter={(value, name, item) => {
                    const countKey = String(item.dataKey).replace("Share", "") as keyof ShareTrendPoint;
                    const point = item.payload as ShareTrendPoint;
                    return [
                      `${formatNumber(Number(value))}% (${formatNumber(Number(point[countKey] ?? 0))} โครงการ)`,
                      String(name)
                    ];
                  }}
                />
                <Legend />
                {trendBucketSeries.map((series) => (
                  <Bar
                    key={series.shareKey}
                    dataKey={series.shareKey}
                    stackId="share"
                    fill={series.fill}
                    name={series.name}
                  >
                    <LabelList dataKey={series.shareKey} content={renderPercentBarLabel} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel chartPanel">
          <div className="panelHeader">
            <div>
              <h2>ค่าเฉลี่ยการขึ้นราคาเทียบ Baseline รายวัน</h2>
              <p>
                เส้นนี้ยังคงช่วยดู momentum ว่าค่าเฉลี่ยการขึ้นราคาเคลื่อนไปทางไหน
                ภายใต้ฟิลเตอร์เดียวกับกราฟสัดส่วนด้านบน
              </p>
            </div>
            <label className="chartRangeField">
              <span>เลือกช่วงเวลา</span>
              <select
                value={trendRange}
                onChange={(event) => setTrendRange(event.target.value as TrendRange)}
              >
                <option value="all">ทั้งหมด</option>
                <option value="post25">หลังวันที่ 25</option>
                <option value="last14">14 วันล่าสุด</option>
                <option value="last7">7 วันล่าสุด</option>
              </select>
            </label>
          </div>
          <div className="chartWrap lineInsightChart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredAverageTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis stroke="#9fb0d0" tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value, name) => [
                    formatBaht(Number(value ?? 0)),
                    String(name)
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgIncrease"
                  stroke="#fb7185"
                  strokeWidth={3}
                  dot
                  name="Average increase"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="twoColumn">
        <article className="panel">
          <div className="panelHeader">
            <div>
              <h2>Project trend</h2>
              <p>
                {selectedTrend[0]?.siteName ?? "เลือกไซต์จากตารางด้านล่าง"}{" "}
                {selectedSite ? `(${selectedSite})` : ""}
              </p>
            </div>
          </div>
          <div className="chartWrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis
                  yAxisId="price"
                  stroke="#9fb0d0"
                  tickFormatter={formatNumber}
                  width={84}
                />
                <YAxis
                  yAxisId="increase"
                  orientation="right"
                  stroke="#9fb0d0"
                  tickFormatter={formatNumber}
                  width={84}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatBaht(Number(value ?? 0)),
                    String(name)
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  yAxisId="price"
                  dataKey="postNetPrice"
                  stroke="#7dd3fc"
                  strokeWidth={3}
                  dot
                  name="ราคาขาย (บาท)"
                />
                <Line
                  type="monotone"
                  yAxisId="increase"
                  dataKey="increaseAmount"
                  stroke={bucketColors.top}
                  strokeWidth={3}
                  dot
                  name="ขึ้นราคา (บาท)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel sectionPanel">
        <div className="panelHeader controls">
          <div>
            <h2>Project table</h2>
            <p>คลิกแถวเพื่อดูกราฟรายโครงการ และกรองข้อมูลด้วยวันร่วมกับ ladder ได้</p>
          </div>
        </div>

        <div className="filterShell projectFilterShell">
          <div className="tableFilterTop">
            <div className="tableFilterInputs">
              <input
                className="searchField"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา SITE_NAME, SITE_NO, division, segment"
              />
              <label className="filterField filterFieldSelect compactField">
                <span>เลือกวันที่</span>
                <select
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                >
                  <option value="">ราคาล่าสุดทุกวัน</option>
                  {availableDays.map((day) => (
                    <option key={day} value={day}>
                      {formatThaiDate(day)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="tableFilterStatsCompact">
              <span className="tableFilterStatsLabel">รายการ</span>
              <strong>
                {hasLoadedProjects
                  ? `${formatNumber(pageStart)}-${formatNumber(pageEnd)}`
                  : "..."}
              </strong>
              <span>
                {hasLoadedProjects
                  ? `จาก ${formatNumber(projectTotal)}`
                  : "กำลังโหลดรายการโครงการ..."}
              </span>
            </div>
          </div>

          <div className="tableCompactRow">
            <span className="tableCompactLabel">LADDER</span>
            <div className="bucketFilterGroup tableBucketRow">
              <button
                type="button"
                className={`bucketFilter ${selectedBucket === "" ? "selected" : ""}`}
                onClick={() => setSelectedBucket("")}
              >
                ทั้งหมด
              </button>
              {bucketLabels.map((bucket) => (
                <button
                  key={bucket.key}
                  type="button"
                  className={`bucketFilter ${selectedBucket === bucket.key ? "selected" : ""}`}
                  onClick={() => setSelectedBucket(bucket.key)}
                >
                  {bucket.key}
                </button>
              ))}
            </div>
          </div>

          <div className="tableCompactRow">
            <span className="tableCompactLabel">SEGMENT</span>
            <div className="compactFilterChips">
              <button
                type="button"
                className={`compactFilterChip ${selectedSegments.length === 0 ? "selected" : ""}`}
                onClick={() => setSelectedSegments([])}
              >
                ทั้งหมด
              </button>
              {availableSegments.map((segment) => (
                <button
                  key={segment}
                  type="button"
                  className={`compactFilterChip ${selectedSegments.includes(segment) ? "selected" : ""}`}
                  onClick={() => toggleValue(segment, setSelectedSegments)}
                >
                  {segment}
                </button>
              ))}
            </div>
          </div>

          <div className="tableFilterFooter">
            <div className="tableActiveFilters">
              {activeTableFilters.map((filter) => (
                <span key={`${filter.label}-${filter.value}`} className="tableActivePill">
                  <strong>{filter.label}</strong>
                  {filter.value}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="clearFilterButton"
              onClick={() => {
                setSearch("");
                setSelectedDay("");
                setSelectedBucket("");
                setSelectedSegments([]);
                setCurrentPage(1);
              }}
            >
              รีเซ็ต filter ตาราง
            </button>
          </div>
        </div>

        <details className="explanationBox explanationBoxCollapsible">
          <summary>คำอธิบาย Increase และ % Target</summary>
          <p>
            `Increase` คือส่วนต่างระหว่างค่า NP_AVG ของวันที่เลือก
            หรือราคาล่าสุดถ้ายังไม่ได้เลือกวัน กับ baseline ช่วงวันที่ 1-24
            โดยถ้าราคาวันนั้นต่ำกว่า baseline ระบบจะนับเป็น 0 บาท เพื่อให้เห็นเฉพาะจำนวนบาทที่ขึ้นจริง
          </p>
          <p>
            `% Target` คิดจากสูตร `(Increase / 300) x 100` จึงสามารถติดลบได้เช่นกัน
            หากโครงการนั้นยังต่ำกว่าระดับ baseline เดิม
          </p>
        </details>

        <div className="tableWrap">
          {hasLoadedProjects ? (
            <table>
              <thead>
                <tr>
                  <th>SITE_NO</th>
                  <th>SITE_NAME</th>
                  <th>
                    <HeaderWithHint
                      hintKey="segment"
                      label="Segment"
                      hint={tableColumnHelp.segment}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="ladder"
                      label="Ladder"
                      hint={tableColumnHelp.ladder}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="baseline"
                      label="Baseline"
                      hint={tableColumnHelp.baseline}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="current"
                      label="Current"
                      hint={
                        selectedDay
                          ? "net price ของโครงการในวันที่เลือก"
                          : tableColumnHelp.current
                      }
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="increase"
                      label="Increase vs Baseline"
                      hint={tableColumnHelp.increase}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="target"
                      label="% of 300 Target"
                      hint={tableColumnHelp.target}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="latestDay"
                      label={selectedDay ? "Selected day" : "Latest day"}
                      hint={
                        selectedDay
                          ? "วันที่ที่ใช้กรองในตารางนี้"
                          : tableColumnHelp.latestDay
                      }
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((row) => (
                  <tr
                    key={row.siteNo}
                    onClick={() => setSelectedSite(row.siteNo)}
                    className={selectedSite === row.siteNo ? "activeRow" : ""}
                  >
                    <td>{row.siteNo}</td>
                    <td>
                      <div className="siteCell">
                        <strong>{row.siteName}</strong>
                        <span>
                          {row.divisionName} / {row.fcName}
                        </span>
                      </div>
                    </td>
                    <td>{row.segment || "-"}</td>
                    <td>{row.ladder}</td>
                    <td>{formatNumber(row.baselineNetPrice)}</td>
                    <td>{formatNumber(row.currentNetPrice)}</td>
                    <td>{formatNumber(row.increaseAmount)}</td>
                    <td>{formatPercent(row.targetPercent)}</td>
                    <td>{row.latestDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="tableLoadingState">กำลังโหลดรายการโครงการ...</div>
          )}
        </div>

        <div className="paginationBar">
          <button
            type="button"
            className="pagerButton"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            ย้อนกลับ
          </button>
          <div className="paginationSummary">
            หน้า {formatNumber(currentPage)} / {formatNumber(totalPages)}
          </div>
          <button
            type="button"
            className="pagerButton"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            ถัดไป
          </button>
        </div>
      </section>
    </div>
  );
}
