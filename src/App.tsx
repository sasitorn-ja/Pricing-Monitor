import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
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

type TrendPoint = {
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

type ShareTrendPoint = TrendPoint & {
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

type ProjectTrendChartPoint = Omit<ProjectTrendPoint, "postNetPrice"> & {
  postNetPrice: number;
  hasRecord: boolean;
  isBaselinePeriod: boolean;
};

type ProjectResponse = {
  rows: ProjectRow[];
  total: number;
};

type DashboardResponse = {
  meta: MetaResponse;
  summary: SummaryResponse;
  trend: TrendPoint[];
};

type TrendRange = "all" | "post25" | "last14" | "last7";
type CalcHelpKey =
  | "baselineDefinition"
  | "totalIncrease"
  | "averageToTarget"
  | "proportionChart"
  | "discountDropChart"
  | "averageTrend"
  | "projectTrend"
  | "projectTable";

const bucketLabels = [
  { key: "500+", label: "500 บาทขึ้นไป", tone: "bg-green-600" },
  { key: "400-499", label: "400-499 บาท", tone: "bg-green-500" },
  { key: "300-399", label: "300-399 บาท", tone: "bg-emerald-400" },
  { key: "250-299", label: "250-299 บาท", tone: "bg-cyan-400" },
  { key: "200-249", label: "200-249 บาท", tone: "bg-sky-400" },
  { key: "100-199", label: "100-199 บาท", tone: "bg-amber-400" },
  { key: "0-99", label: "ต่ำกว่า 100 บาท", tone: "bg-rose-400" }
] as const;

const bucketColors = {
  topMax: "#16a34a",
  topHigh: "#22c55e",
  top: "#34d399",
  high: "#22d3ee",
  bridge: "#38bdf8",
  mid: "#fbbf24",
  low: "#fb7185",
  missing: "#94a3b8"
} as const;

const trendBucketSeries = [
  { shareKey: "noBaselineShare", countKey: "noBaseline", name: "ไม่มี baseline", fill: bucketColors.missing },
  { shareKey: "ladder0Share", countKey: "ladder0", name: "0-99", fill: bucketColors.low },
  { shareKey: "ladder100Share", countKey: "ladder100", name: "100-199", fill: bucketColors.mid },
  { shareKey: "ladder200Share", countKey: "ladder200", name: "200-249", fill: bucketColors.bridge },
  { shareKey: "ladder250Share", countKey: "ladder250", name: "250-299", fill: bucketColors.high },
  { shareKey: "ladder300Share", countKey: "ladder300", name: "300-399", fill: bucketColors.top },
  { shareKey: "ladder400Share", countKey: "ladder400", name: "400-499", fill: bucketColors.topHigh },
  { shareKey: "ladder500Share", countKey: "ladder500", name: "500+", fill: bucketColors.topMax }
] as const;

const discountDropSeries = [
  { shareKey: "noBaselineShare", countKey: "noBaseline", name: "ไม่มี baseline", fill: bucketColors.missing },
  { shareKey: "disc0Share", countKey: "disc0", name: "0-2.9%", fill: "#7dd3fc" },
  { shareKey: "disc3Share", countKey: "disc3", name: "3.0-5.9%", fill: "#38bdf8" },
  { shareKey: "disc6Share", countKey: "disc6", name: "6.0-8.9%", fill: "#34d399" },
  { shareKey: "disc9Share", countKey: "disc9", name: "9.0-11.9%", fill: "#fbbf24" },
  { shareKey: "disc12Share", countKey: "disc12", name: "12.0-14.9%", fill: "#fb923c" },
  { shareKey: "disc15Share", countKey: "disc15", name: "15%+", fill: "#fb7185" }
] as const;

const PAGE_SIZE = 20;
const MULTI_LADDER_FETCH_SIZE = 100_000;
const SEARCH_DEBOUNCE_MS = 250;
const API_TIMEOUT_MS = 60_000;
const tableColumnHelp = {
  division: "พื้นที่ขายหรือหน่วยงานที่โครงการนี้อยู่ ใช้สำหรับกรองและดูภาพรวมแยกตามพื้นที่",
  segment: "กลุ่มขนาดของโครงการ เช่น tiny, small, medium ใช้ตัวเดียวกับตัวกรอง Segment ด้านบน",
  ladder: "ช่วงของราคาที่เพิ่มขึ้นเทียบกับ Baseline เช่น 0-99, 100-199, 200-249 หรือ 300 บาทขึ้นไป",
  baseline: "ราคาอ้างอิงก่อนเริ่มติดตาม คำนวณจาก NP_AVG เฉลี่ยถ่วงปริมาณขายช่วง 1-24 มี.ค.",
  current: "ราคา NP_AVG ของวันที่แสดงในแถวนี้ ถ้าไม่ได้เลือกวันจะใช้วันล่าสุดของโครงการนั้น",
  increase: "ราคาที่เพิ่มขึ้น = Current - Baseline ถ้าราคาปัจจุบันต่ำกว่า Baseline จะนับเป็น 0",
  target: "เปอร์เซ็นต์เทียบเป้า 300 บาท เช่น ขึ้น 150 บาท = 50% และขึ้น 300 บาท = 100%",
  latestDay: "วันที่ของข้อมูลราคาที่ใช้คำนวณแถวนี้"
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
  if (!Number.isFinite(value)) {
    return "0%";
  }

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

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateRange(startDay: string, endDay: string) {
  const days: string[] = [];

  for (let day = startDay; day <= endDay; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

function formatSummaryDateRange(summary: SummaryResponse, fallbackDay?: string) {
  if ((!summary.latestDayMin || !summary.latestDayMax) && fallbackDay) {
    return `ข้อมูลล่าสุดถึง ${formatThaiDateShort(fallbackDay)}`;
  }

  if (!summary.latestDayMin || !summary.latestDayMax) {
    return "ไม่มีวันที่คำนวณ";
  }

  if (summary.latestDayMin === summary.latestDayMax) {
    return `ณ วันที่ ${formatThaiDateShort(summary.latestDayMax)}`;
  }

  return `ช่วงวันที่ ${formatThaiDateShort(summary.latestDayMin)} ถึง ${formatThaiDateShort(summary.latestDayMax)}`;
}

function getPaginationItems(currentPage: number, totalPages: number) {
  const items: Array<number | "ellipsis"> = [];
  const addPage = (page: number) => {
    if (page >= 1 && page <= totalPages && !items.includes(page)) {
      items.push(page);
    }
  };

  addPage(1);

  if (currentPage > 4) {
    items.push("ellipsis");
  }

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    addPage(page);
  }

  if (currentPage < totalPages - 3) {
    items.push("ellipsis");
  }

  addPage(totalPages);

  return items;
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

function summarizeMultiSelect(selectedValues: string[], fallbackLabel: string) {
  if (selectedValues.length === 0) {
    return fallbackLabel;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues[0]} +${selectedValues.length - 1}`;
}

function SingleSelectDropdown({
  label,
  options,
  selectedValue,
  fallbackLabel,
  onSelect
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  fallbackLabel: string;
  onSelect: (value: string) => void;
}) {
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.open) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        dropdownRef.current.open = false;
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownRef.current?.open) {
        dropdownRef.current.open = false;
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedLabel =
    options.find((option) => option.value === selectedValue)?.label ?? fallbackLabel;

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  return (
    <details ref={dropdownRef} className="singleSelectDropdown">
      <summary>
        <span>{label}</span>
        <strong>{selectedLabel}</strong>
      </summary>
      <div className="singleSelectMenu">
        <button
          type="button"
          className={`singleSelectOption ${selectedValue === "" ? "selected" : ""}`}
          onClick={() => {
            onSelect("");
            closeDropdown();
          }}
        >
          ราคาล่าสุดทุกวัน
        </button>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`singleSelectOption ${selectedValue === option.value ? "selected" : ""}`}
            onClick={() => {
              onSelect(option.value);
              closeDropdown();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  fallbackLabel,
  onToggle,
  onClear
}: {
  label: string;
  options: string[];
  selectedValues: string[];
  fallbackLabel: string;
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const dropdownRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!dropdownRef.current?.open) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        dropdownRef.current.open = false;
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && dropdownRef.current?.open) {
        dropdownRef.current.open = false;
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeDropdown = () => {
    if (dropdownRef.current) {
      dropdownRef.current.open = false;
    }
  };

  return (
    <details ref={dropdownRef} className="multiSelectDropdown">
      <summary>
        <span>{label}</span>
        <strong>{summarizeMultiSelect(selectedValues, fallbackLabel)}</strong>
      </summary>
      <div className="multiSelectMenu">
        <button
          type="button"
          className={`compactFilterChip ${selectedValues.length === 0 ? "selected" : ""}`}
          onClick={() => {
            onClear();
            closeDropdown();
          }}
        >
          ทั้งหมด
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`compactFilterChip ${selectedValues.includes(option) ? "selected" : ""}`}
            onClick={() => {
              onToggle(option);
              closeDropdown();
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </details>
  );
}

export function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
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
  const [activeCalcHelp, setActiveCalcHelp] = useState<CalcHelpKey | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState("");

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
    async function loadInitialDashboard() {
      try {
        setMetaLoading(true);
        setError("");
        const dashboardResponse = await fetchJson<DashboardResponse>("/api/dashboard");
        setMeta(dashboardResponse.meta);
        setSummary(dashboardResponse.summary);
        setTrend(dashboardResponse.trend);
        setHasLoadedSummary(true);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      } finally {
        setMetaLoading(false);
      }
    }

    void loadInitialDashboard();
  }, []);

  useEffect(() => {
    async function loadFilteredDashboard() {
      if (!meta) {
        return;
      }

      if (
        hasLoadedSummary &&
        !selectedDay &&
        selectedDivisions.length === 0 &&
        selectedSegments.length === 0
      ) {
        return;
      }

      try {
        setError("");
        const params = buildFilterQuery();
        if (selectedDay) {
          params.set("day", selectedDay);
        }
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
  }, [hasLoadedSummary, meta, selectedDay, selectedDivisions, selectedSegments]);

  useEffect(() => {
    async function loadProjects() {
      if (!hasLoadedSummary || !meta) {
        return;
      }

      try {
        setProjectError("");
        const baseParams = buildFilterQuery();

        if (selectedDay) {
          baseParams.set("day", selectedDay);
        }

        if (debouncedSearch) {
          baseParams.set("search", debouncedSearch);
        }

        let projectResponse: ProjectResponse;

        if (selectedBuckets.length > 1) {
          const responses = await Promise.all(
            selectedBuckets.map((bucket) => {
              const params = new URLSearchParams(baseParams);
              params.set("ladder", bucket);
              params.set("page", "1");
              params.set("pageSize", String(MULTI_LADDER_FETCH_SIZE));
              const query = params.toString();

              return fetchJson<ProjectResponse>(`/api/projects?${query}`);
            })
          );
          const rows = responses
            .flatMap((response) => response.rows)
            .sort((a, b) => {
              if (a.latestDay === b.latestDay) {
                if (a.increaseAmount === b.increaseAmount) {
                  return a.siteName.localeCompare(b.siteName);
                }

                return a.increaseAmount - b.increaseAmount;
              }

              return a.latestDay.localeCompare(b.latestDay);
            });
          const startIndex = (currentPage - 1) * PAGE_SIZE;

          projectResponse = {
            rows: rows.slice(startIndex, startIndex + PAGE_SIZE),
            total: rows.length
          };
        } else {
          const params = new URLSearchParams(baseParams);

          if (selectedBuckets.length === 1) {
            params.set("ladder", selectedBuckets[0]);
          }

          params.set("page", String(currentPage));
          params.set("pageSize", String(PAGE_SIZE));

          const query = params.toString();
          projectResponse = await fetchJson<ProjectResponse>(
            `/api/projects${query ? `?${query}` : ""}`
          );
        }

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
        setProjectError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadProjects();
  }, [
    currentPage,
    debouncedSearch,
    hasLoadedSummary,
    meta,
    selectedBuckets,
    selectedDay,
    selectedDivisions,
    selectedSegments
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBuckets, selectedDay, selectedDivisions, selectedSegments]);

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

  const selectedTrendChartData = useMemo<ProjectTrendChartPoint[]>(() => {
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
  }, [meta, selectedSite, selectedTrend]);

  const post25TrendData = useMemo(() => {
    if (!meta) {
      return trend;
    }

    return trend.filter((point) => point.day >= meta.config.campaignStart);
  }, [meta, trend]);

  const proportionTrendData = useMemo<ShareTrendPoint[]>(() => {
    return post25TrendData.map((point) => {
      const denominator = point.siteCount || 1;
      const volumeDenominator = point.volumeTotal || 1;

      return {
        ...point,
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
  const firstProjectIndex = projectTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastProjectIndex = Math.min(currentPage * PAGE_SIZE, projectTotal);
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const activeTableFilters: Array<{ label: string; value: string }> = [];

  if (selectedBuckets.length > 0) {
    activeTableFilters.push({ label: "Ladder", value: selectedBuckets.join(", ") });
  }

  if (selectedDay) {
    activeTableFilters.push({
      label: "วันที่",
      value: formatThaiDateShort(selectedDay)
    });
  }

  if (selectedDivisions.length > 0) {
    activeTableFilters.push({
      label: "Division",
      value: selectedDivisions.join(", ")
    });
  }

  if (selectedSegments.length > 0) {
    activeTableFilters.push({
      label: "Segment",
      value: selectedSegments.join(", ")
    });
  }

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

  const latestTrendDay = post25TrendData.at(-1)?.day ?? meta.metadata.max_dp_date;
  const targetHitSites = summary.comparableSites - summary.belowTargetSites;
  const targetHitShare = Number.isFinite(summary.targetHitShare)
    ? summary.targetHitShare
    : summary.comparableSites > 0
      ? (targetHitSites / summary.comparableSites) * 100
      : 0;
  const summaryDateRange = formatSummaryDateRange(summary, latestTrendDay);
  const calcHelpContent: Record<CalcHelpKey, { title: string; lines: string[] }> = {
    baselineDefinition: {
      title: "ระบบคำนวณ Baseline",
      lines: [
        "ระบบคำนวณ Baseline แยกเป็นรายโครงการ จากข้อมูลช่วง 1-24 มี.ค. 2026",
        "สูตร: SUM(NP_AVG x SUMQ) / SUM(SUMQ)",
        "แปลว่า record ที่มีปริมาณขายมากกว่าจะมีน้ำหนักกับราคา Baseline มากกว่า record ที่ขายน้อย",
        "หลังวันที่ 25 มี.ค. ระบบจะเอาราคาของแต่ละวันมาเทียบกับ Baseline ของโครงการเดียวกัน",
        "ถ้าโครงการไม่มีข้อมูลในช่วง 1-24 มี.ค. จะแสดงเป็น 'ไม่มี baseline' สีเทา เพราะยังเทียบราคาไม่ได้"
      ]
    },
    totalIncrease: {
      title: "Total increase คืออะไร",
      lines: [
        "ตัวเลขนี้คือราคาเพิ่มเฉลี่ยต่อ B/Q ของวันที่กำลังดู ไม่ใช่ยอดรวมบาทของทุกโครงการ",
        "เริ่มจากคำนวณแต่ละโครงการก่อน: ราคาเพิ่มขึ้น = ราคา NP_AVG ของวันนั้น - ราคา Baseline",
        "ถ้าราคาวันนั้นต่ำกว่า Baseline จะนับราคาเพิ่มขึ้นเป็น 0 เพื่อไม่ให้ค่าลบมาดึงภาพรวมลง",
        "จากนั้นถ่วงน้ำหนักด้วยปริมาณขาย: SUM(ราคาเพิ่มขึ้น x SUMQ) / SUM(SUMQ)",
        `ข้อมูลที่ใช้คำนวณคือ ${summaryDateRange}`
      ]
    },
    averageToTarget: {
      title: "Average to target คืออะไร",
      lines: [
        "ตัวเลขนี้บอกว่าวันที่กำลังดู มีโครงการกี่เปอร์เซ็นต์ที่ขึ้นราคาถึงเป้า 300 บาทขึ้นไป",
        "นับเฉพาะโครงการที่มีทั้งราคา Baseline และราคาของวันนั้น จึงเปรียบเทียบได้จริง",
        "สูตร: จำนวนโครงการที่ราคาเพิ่มขึ้นตั้งแต่ 300 บาทขึ้นไป / จำนวนโครงการที่เปรียบเทียบได้ทั้งหมด x 100",
        `ตอนนี้คือ ${formatNumber(targetHitSites)} จาก ${formatNumber(summary.comparableSites)} โครงการ`,
        `ข้อมูลที่ใช้คำนวณคือ ${summaryDateRange}`
      ]
    },
    proportionChart: {
      title: "% สัดส่วนตามราคา อ่านยังไง",
      lines: [
        "กราฟนี้ตอบว่าในแต่ละวัน โครงการกระจายอยู่ในช่วงราคาเพิ่มขึ้นช่วงไหนบ้าง",
        "หนึ่งแท่งคือหนึ่งวัน และทุกสีในแท่งรวมกันเป็น 100%",
        "กราฟนี้นับจำนวนโครงการเป็นหลัก ไม่ได้ถ่วงด้วยปริมาณขาย",
        "ตัวอย่างเช่น สี 300-399 หมายถึงสัดส่วนโครงการที่ราคาวันนั้นสูงกว่า Baseline 300-399 บาท",
        "สีเทา 'ไม่มี baseline' คือโครงการที่มีข้อมูลวันนั้น แต่ไม่มีข้อมูลช่วง 1-24 มี.ค. จึงยังเปรียบเทียบราคาไม่ได้"
      ]
    },
    discountDropChart: {
      title: "% สัดส่วน Disc ที่ลดลง อ่านยังไง",
      lines: [
        "กราฟนี้ดูว่าส่วนลดเฉลี่ยของโครงการลดลงจากช่วง Baseline มากแค่ไหน",
        "คำนวณทีละโครงการ: % Disc ที่ลดลง = (Disc Baseline - Disc วันนั้น) / Disc Baseline x 100",
        "ถ้า Disc วันนั้นไม่ได้ลดลง หรือสูงกว่า Baseline จะนับเป็น 0%",
        "จากนั้นจัดกลุ่มเป็นช่วง 0-2.9%, 3.0-5.9%, 6.0-8.9%, 9.0-11.9%, 12.0-14.9%, และ 15% ขึ้นไป",
        "สีเทา 'ไม่มี baseline' คือโครงการที่ไม่มี Disc Baseline ให้เปรียบเทียบ"
      ]
    },
    averageTrend: {
      title: "ค่าเฉลี่ยการขึ้นราคารายวัน อ่านยังไง",
      lines: [
        "กราฟเส้นนี้แสดงราคาเพิ่มเฉลี่ยของแต่ละวัน เพื่อดูแนวโน้มว่าราคาเพิ่มขึ้นมากขึ้นหรือลดลง",
        "แต่ละจุดใช้สูตรเดียวกับ Total increase: SUM(ราคาเพิ่มขึ้น x SUMQ) / SUM(SUMQ)",
        "ราคาเพิ่มขึ้นของแต่ละโครงการ = ราคา NP_AVG ของวันนั้น - ราคา Baseline",
        "ถ้าราคาวันนั้นต่ำกว่า Baseline จะนับเป็น 0",
        "เมื่อเลือก Division หรือ Segment กราฟนี้จะคำนวณใหม่เฉพาะกลุ่มที่เลือก"
      ]
    },
    projectTrend: {
      title: "Project trend อ่านยังไง",
      lines: [
        "กราฟนี้แสดงเฉพาะโครงการที่คลิกเลือกจากตาราง เพื่อดูการเปลี่ยนแปลงของโครงการนั้นรายวัน",
        "เส้นราคาขายคือราคา NP_AVG รายวันของโครงการนั้น โดยถ่วงน้ำหนักด้วย SUMQ ถ้าวันนั้นมีหลาย record",
        "ช่วง 1-24 มี.ค. ใช้สร้าง Baseline จึงยังไม่ตีความว่าเป็นการขึ้นราคา",
        "ตั้งแต่ 25 มี.ค. เป็นต้นไป เส้นขึ้นราคาคือราคาขายรายวัน - ราคา Baseline ของโครงการเดียวกัน",
        "ถ้าราคาขายรายวันหลัง 25 มี.ค. ต่ำกว่า Baseline จะนับการขึ้นราคาเป็น 0",
        "วันที่ไม่มีข้อมูลขายจะแสดงราคาขายและเส้นขึ้นราคาเป็น 0 เพื่อให้กราฟต่อเนื่อง",
        "กราฟรายโครงการแสดงแกนวันตั้งแต่ 1 มี.ค. ถึงวันล่าสุดของข้อมูล"
      ]
    },
    projectTable: {
      title: "Project table อ่านยังไง",
      lines: [
        "ตารางนี้แสดงรายละเอียดรายโครงการหลังใช้ตัวกรอง เช่น วันที่, Division, Segment และ Ladder",
        "Baseline คือราคาอ้างอิงของโครงการ คำนวณจาก NP_AVG เฉลี่ยถ่วง SUMQ ช่วง 1-24 มี.ค.",
        "Current คือราคา NP_AVG ของวันที่เลือก ถ้าไม่ได้เลือกวันจะใช้ราคาล่าสุดของแต่ละโครงการ",
        "Increase vs Baseline = Current - Baseline และถ้าติดลบจะนับเป็น 0",
        "% of 300 Target = Increase vs Baseline / 300 x 100 เช่น 150 บาท = 50%",
        `ตารางแสดงทีละ ${formatNumber(PAGE_SIZE)} รายการต่อหน้า จากจำนวนโครงการที่ผ่านตัวกรองทั้งหมด`
      ]
    }
  };
  const activeCalcContent = activeCalcHelp ? calcHelpContent[activeCalcHelp] : null;

  return (
    <div className="shell" onClick={() => setActiveHint(null)}>
      <header className="hero heroSingle">
        <div>
          <p className="eyebrow">Pricing Monitor</p>
          <h1>Dashboard ติดตามการขึ้นราคา</h1>
          <p className="subtle">
            ใช้ NP_AVG เป็น net price เพื่อนำไปเทียบกับ Baseline
            {" "}ซึ่งอ้างอิงช่วง {meta.config.baselineStart} ถึง {meta.config.baselineEnd}
            {" "}และติดตามผลตั้งแต่ {meta.config.campaignStart} เป็นต้นไป
            <button
              type="button"
              className="baselineHelpButton"
              onClick={() => setActiveCalcHelp("baselineDefinition")}
            >
              ระบบคำนวณ Baseline
            </button>
          </p>
        </div>
      </header>

      <section className="gridStats">
        <article className="statCard">
          <button type="button" className="calcHelpButton" onClick={() => setActiveCalcHelp("totalIncrease")}>
            วิธีคำนวณ
          </button>
          <span>Total increase</span>
          <strong>{formatNumber(summary.avgIncrease)} บาท B/Q</strong>
          <p>คำนวณจากข้อมูล {summaryDateRange}</p>
        </article>
        <article className="statCard">
          <button type="button" className="calcHelpButton" onClick={() => setActiveCalcHelp("averageToTarget")}>
            วิธีคำนวณ
          </button>
          <span>Average to target</span>
          <strong>{formatPercent(targetHitShare)}</strong>
          <p>สัดส่วนโครงการที่ขึ้นถึง 300 บาท B/C ขึ้นไป {summaryDateRange}</p>
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
              <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("proportionChart")}>
                วิธีคำนวณ
              </button>
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
                <Legend
                  content={() => (
                    <div className="customChartLegend">
                      {trendBucketSeries.map((series) => (
                        <span key={series.shareKey}>
                          <i style={{ backgroundColor: series.fill }} />
                          {series.name}
                        </span>
                      ))}
                    </div>
                  )}
                />
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
              <h2>% สัดส่วน Disc ที่ลดลง</h2>
              <p>
                เทียบ Disc Baseline กับ Disc ณ วันนั้น โดยแบ่งช่วงลดลงทีละ 3%
                และแสดงโครงการที่ไม่มี baseline เป็นสีเทา
              </p>
            </div>
            <div className="chartSummaryPills">
              <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("discountDropChart")}>
                วิธีคำนวณ
              </button>
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
                <Legend
                  content={() => (
                    <div className="customChartLegend">
                      {discountDropSeries.map((series) => (
                        <span key={series.shareKey}>
                          <i style={{ backgroundColor: series.fill }} />
                          {series.name}
                        </span>
                      ))}
                    </div>
                  )}
                />
                {discountDropSeries.map((series) => (
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
            <div className="panelHeaderActions">
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
              <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("averageTrend")}>
                วิธีคำนวณ
              </button>
            </div>
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
              <p className="chartNote">
                ช่วง 1-24 มี.ค. ใช้สร้าง Baseline; หลัง 25 มี.ค. จึงคำนวณขึ้นราคาเทียบ Baseline
              </p>
            </div>
            <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("projectTrend")}>
              วิธีคำนวณ
            </button>
          </div>
          <div className="chartWrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={selectedTrendChartData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis
                  dataKey="day"
                  tickFormatter={formatShortDate}
                  stroke="#9fb0d0"
                  minTickGap={18}
                />
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
                  formatter={(value, name, item) => {
                    const point = item.payload as ProjectTrendChartPoint;

                    if (!point.hasRecord) {
                      return [
                        name === "ราคาขาย (บาท)"
                          ? "0 บาท (ไม่มีข้อมูลขาย)"
                          : "ไม่มีข้อมูลขาย (นับเป็น 0)",
                        String(name)
                      ];
                    }

                    if (point.isBaselinePeriod && name === "ขึ้นราคา (บาท)") {
                      return ["ช่วง Baseline ยังไม่คำนวณการขึ้นราคา", String(name)];
                    }

                    if (value === null || value === undefined) {
                      return ["ไม่มีข้อมูล", String(name)];
                    }

                    return [formatBaht(Number(value)), String(name)];
                  }}
                />
                <Legend />
                {meta ? (
                  <ReferenceLine
                    x={meta.config.baselineEnd}
                    yAxisId="price"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    label={{
                      value: "24 มี.ค.",
                      position: "insideTop",
                      offset: 8,
                      fill: "#ef4444",
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  yAxisId="price"
                  dataKey="postNetPrice"
                  stroke="#7dd3fc"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
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
          <div className="tableHeaderActions">
            <button type="button" className="calcHelpButton compact" onClick={() => setActiveCalcHelp("projectTable")}>
              วิธีคำนวณ
            </button>
          </div>
        </div>

        <div className="filterShell projectFilterShell">
          <div className="tableFilterTop">
            <div className="tableFilterPrimary">
              <input
                className="searchField"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา SITE_NAME, SITE_NO, division, segment"
              />
            </div>

            <div className="tableFilterInputs">
              <SingleSelectDropdown
                label="วันที่"
                options={availableDays.map((day) => ({
                  value: day,
                  label: formatThaiDate(day)
                }))}
                selectedValue={selectedDay}
                fallbackLabel="ราคาล่าสุดทุกวัน"
                onSelect={setSelectedDay}
              />
              <MultiSelectDropdown
                label="Division"
                options={availableDivisions}
                selectedValues={selectedDivisions}
                fallbackLabel="ทุก division"
                onToggle={(value) => toggleValue(value, setSelectedDivisions)}
                onClear={() => setSelectedDivisions([])}
              />
              <MultiSelectDropdown
                label="Segment"
                options={availableSegments}
                selectedValues={selectedSegments}
                fallbackLabel="ทุก segment"
                onToggle={(value) => toggleValue(value, setSelectedSegments)}
                onClear={() => setSelectedSegments([])}
              />
            </div>
          </div>

          <div className="tableCompactRow">
            <span className="tableCompactLabel">LADDER</span>
            <div className="bucketFilterGroup tableBucketRow">
              <button
                type="button"
                className={`bucketFilter ${selectedBuckets.length === 0 ? "selected" : ""}`}
                onClick={() => setSelectedBuckets([])}
              >
                ทั้งหมด
              </button>
              {bucketLabels.map((bucket) => (
                <button
                  key={bucket.key}
                  type="button"
                  className={`bucketFilter ${selectedBuckets.includes(bucket.key) ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedBuckets((current) =>
                      current.includes(bucket.key)
                        ? current.filter((key) => key !== bucket.key)
                        : [...current, bucket.key]
                    )
                  }
                >
                  {bucket.key}
                </button>
              ))}
            </div>
          </div>

          <div className="tableFilterFooter">
            {activeTableFilters.length > 0 ? (
              <div className="tableActiveFilters">
                {activeTableFilters.map((filter) => (
                  <span key={`${filter.label}-${filter.value}`} className="tableActivePill">
                    <strong>{filter.label}</strong>
                    {filter.value}
                  </span>
                ))}
              </div>
            ) : (
              <div className="tableActiveFiltersHint">ยังไม่ได้เลือกตัวกรองเพิ่มเติม</div>
            )}
            <button
              type="button"
              className="clearFilterButton"
              onClick={() => {
                setSearch("");
                setSelectedDay("");
                setSelectedBuckets([]);
                setSelectedDivisions([]);
                setSelectedSegments([]);
                setCurrentPage(1);
              }}
            >
              รีเซ็ต filter ตาราง
            </button>
          </div>
        </div>

        <div className="tableWrap">
          {projectError ? (
            <div className="tableLoadingState">
              โหลดรายการโครงการไม่สำเร็จ: {projectError}
            </div>
          ) : hasLoadedProjects ? (
            <table>
              <thead>
                <tr>
                  <th>SITE_NO</th>
                  <th>SITE_NAME</th>
                  <th>
                    <HeaderWithHint
                      hintKey="division"
                      label="Division"
                      hint={tableColumnHelp.division}
                      activeHint={activeHint}
                      onToggle={(key) =>
                        setActiveHint((current) => (current === key ? null : key))
                      }
                    />
                  </th>
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
                    <td>{row.divisionName || "-"}</td>
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
            ‹ Previous
          </button>
          <div className="paginationPages" aria-label="เลือกหน้า">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="paginationEllipsis">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`pageNumberButton ${currentPage === item ? "active" : ""}`}
                  onClick={() => setCurrentPage(item)}
                  aria-current={currentPage === item ? "page" : undefined}
                >
                  {formatNumber(item)}
                </button>
              )
            )}
          </div>
          <div className="paginationSummary">
            แสดง {formatNumber(firstProjectIndex)}-{formatNumber(lastProjectIndex)}
            {" "}จาก {formatNumber(projectTotal)} sites
          </div>
          <button
            type="button"
            className="pagerButton"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next ›
          </button>
        </div>
      </section>

      {activeCalcContent ? (
        <div
          className="calcModalBackdrop"
          role="presentation"
          onClick={() => setActiveCalcHelp(null)}
        >
          <section
            className="calcModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calc-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calcModalHeader">
              <h2 id="calc-modal-title">{activeCalcContent.title}</h2>
              <button
                type="button"
                className="calcModalClose"
                aria-label="ปิดวิธีคำนวณ"
                onClick={() => setActiveCalcHelp(null)}
              >
                ปิด
              </button>
            </div>
            <div className="calcModalBody">
              {activeCalcContent.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
