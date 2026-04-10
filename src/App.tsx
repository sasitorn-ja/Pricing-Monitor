import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
};

type SummaryResponse = {
  comparableSites: number;
  ladder300: number;
  ladder200: number;
  ladder100: number;
  ladder0: number;
  belowTargetSites: number;
  avgIncrease: number;
  avgTargetPercent: number;
  minIncrease: number;
  maxIncrease: number;
};

type TrendPoint = {
  day: string;
  siteCount: number;
  ladder300: number;
  ladder200: number;
  ladder100: number;
  ladder0: number;
  avgIncrease: number;
  avgTargetPercent: number;
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
  leaderboard: ProjectRow[];
};

const bucketLabels = [
  { key: "300+", label: "300 บาทขึ้นไป", tone: "bg-emerald-400" },
  { key: "200-299", label: "200-299 บาท", tone: "bg-sky-400" },
  { key: "100-199", label: "100-199 บาท", tone: "bg-amber-400" },
  { key: "0-99", label: "ต่ำกว่า 100 บาท", tone: "bg-rose-400" }
] as const;

const PAGE_SIZE = 20;
const tableColumnHelp = {
  ladder: "ระดับการขึ้นราคาเทียบเป้า 300 บาท",
  baseline: "net price เฉลี่ยถ่วงน้ำหนักช่วงวันที่ 1-24",
  current: "net price ล่าสุดหลังวันที่ 25",
  increase: "Current - Baseline จึงอาจติดลบได้",
  target: "(Increase / 300) x 100",
  latestDay: "วันที่ใช้เป็นราคาล่าสุดของโครงการ"
} as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
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

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric"
  });
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
  const [leaderboard, setLeaderboard] = useState<ProjectRow[]>([]);
  const [selectedBucket, setSelectedBucket] = useState("");
  const [search, setSearch] = useState("");
  const [onlyBelowTarget, setOnlyBelowTarget] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedTrend, setSelectedTrend] = useState<ProjectTrendPoint[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeHint, setActiveHint] = useState<keyof typeof tableColumnHelp | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [metaResponse, summaryResponse, trendResponse, projectResponse] =
          await Promise.all([
            fetchJson<MetaResponse>("/api/meta"),
            fetchJson<SummaryResponse>("/api/summary"),
            fetchJson<TrendPoint[]>("/api/trend"),
            fetchJson<ProjectResponse>("/api/projects?onlyBelowTarget=true")
          ]);

        setMeta(metaResponse);
        setSummary(summaryResponse);
        setTrend(trendResponse);
        setProjectRows(projectResponse.rows);
        setLeaderboard(projectResponse.leaderboard);
        setSelectedSite(projectResponse.leaderboard[0]?.siteNo ?? "");
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      try {
        const params = new URLSearchParams();

        if (selectedBucket) {
          params.set("ladder", selectedBucket);
        }

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (onlyBelowTarget) {
          params.set("onlyBelowTarget", "true");
        }

        const projectResponse = await fetchJson<ProjectResponse>(
          `/api/projects?${params.toString()}`
        );

        setProjectRows(projectResponse.rows);
        setLeaderboard(projectResponse.leaderboard);

        const stillExists = projectResponse.rows.some(
          (row) => row.siteNo === selectedSite
        );

        if (!stillExists) {
          setSelectedSite(projectResponse.leaderboard[0]?.siteNo ?? "");
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadProjects();
  }, [search, selectedBucket, onlyBelowTarget]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBucket, onlyBelowTarget]);

  useEffect(() => {
    async function loadSelectedTrend() {
      if (!selectedSite) {
        setSelectedTrend([]);
        return;
      }

      try {
        const projectTrend = await fetchJson<ProjectTrendPoint[]>(
          `/api/project-trend?siteNo=${encodeURIComponent(selectedSite)}`
        );

        setSelectedTrend(projectTrend);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Unknown error"
        );
      }
    }

    void loadSelectedTrend();
  }, [selectedSite]);

  const ladderCards = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        key: "300+",
        title: "ถึงเป้า 300+",
        value: summary.ladder300
      },
      {
        key: "200-299",
        title: "ใกล้ถึงเป้า 200-299",
        value: summary.ladder200
      },
      {
        key: "100-199",
        title: "กลางทาง 100-199",
        value: summary.ladder100
      },
      {
        key: "0-99",
        title: "ยังต่ำกว่า 100",
        value: summary.ladder0
      }
    ];
  }, [summary]);

  const leaderboardChartData = useMemo(() => {
    return leaderboard.map((row) => ({
      name:
        row.siteName.length > 24 ? `${row.siteName.slice(0, 24)}...` : row.siteName,
      increaseAmount: row.increaseAmount,
      targetPercent: row.targetPercent,
      siteNo: row.siteNo
    }));
  }, [leaderboard]);

  const totalPages = Math.max(1, Math.ceil(projectRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return projectRows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, projectRows]);

  const pageStart = projectRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, projectRows.length);

  if (loading) {
    return <div className="shell">Loading dashboard...</div>;
  }

  if (error || !meta || !summary) {
    return <div className="shell">Cannot load dashboard: {error || "missing data"}</div>;
  }

  return (
    <div className="shell" onClick={() => setActiveHint(null)}>
      <header className="hero">
        <div>
          <p className="eyebrow">Pricing Monitor</p>
          <h1>Executive dashboard ติดตามการขึ้นราคาเทียบเป้า 300 บาท</h1>
          <p className="subtle">
            Baseline ใช้ช่วง {meta.config.baselineStart} ถึง {meta.config.baselineEnd}
            {" "}และติดตามผลตั้งแต่ {meta.config.campaignStart} เป็นต้นไป โดยใช้
            {" "}NP_AVG เป็น net price
          </p>
        </div>
        <div className="heroCard">
          <div>
            <span>ข้อมูลทั้งหมด</span>
            <strong>{formatNumber(meta.metadata.total_rows)} rows</strong>
          </div>
          <div>
            <span>จำนวนไซต์ทั้งหมด</span>
            <strong>{formatNumber(meta.metadata.total_sites)} sites</strong>
          </div>
          <div>
            <span>ไซต์ที่เทียบได้จริง</span>
            <strong>{formatNumber(summary.comparableSites)} sites</strong>
          </div>
          <div>
            <span>ต่ำกว่าเป้า 300</span>
            <strong>{formatNumber(summary.belowTargetSites)} sites</strong>
          </div>
        </div>
      </header>

      <section className="gridStats">
        <article className="statCard">
          <span>Average increase</span>
          <strong>{formatNumber(summary.avgIncrease)} บาท</strong>
          <p>เฉลี่ยการขึ้นราคาล่าสุดเทียบ baseline</p>
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

      <section className="ladderGrid">
        {ladderCards.map((card) => (
          <button
            key={card.key}
            className={`ladderCard ${selectedBucket === card.key ? "selected" : ""}`}
            onClick={() =>
              setSelectedBucket((current) => (current === card.key ? "" : card.key))
            }
            type="button"
          >
            <span>{card.title}</span>
            <strong>{formatNumber(card.value)}</strong>
            <small>คลิกเพื่อ filter ตาราง</small>
          </button>
        ))}
      </section>

      <section className="panel sectionPanel">
        <div className="panelHeader">
          <div>
            <h2>ภาพรวมหลังวันที่ 25</h2>
            <p>ดูว่าวันไหนมีโครงการขยับขึ้นราคาเข้าแต่ละขั้นบันไดมากน้อยแค่ไหน</p>
          </div>
        </div>
        <div className="chartWrap tall">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
              <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
              <YAxis stroke="#9fb0d0" />
              <Tooltip />
              <Legend />
              <Bar dataKey="ladder300" stackId="a" fill="#34d399" name="300+" />
              <Bar dataKey="ladder200" stackId="a" fill="#38bdf8" name="200-299" />
              <Bar dataKey="ladder100" stackId="a" fill="#fbbf24" name="100-199" />
              <Bar dataKey="ladder0" stackId="a" fill="#fb7185" name="0-99" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="twoColumn">
        <article className="panel">
          <div className="panelHeader">
            <div>
              <h2>Average progress to target</h2>
              <p>ค่าเฉลี่ยการขึ้นราคาเทียบเป้า 300 บาทในแต่ละวัน</p>
            </div>
          </div>
          <div className="chartWrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis dataKey="day" tickFormatter={formatShortDate} stroke="#9fb0d0" />
                <YAxis stroke="#9fb0d0" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgTargetPercent"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                  name="% to target"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <div>
              <h2>โครงการที่ยังต่ำกว่าเป้ามากที่สุด</h2>
              <p>เลือกโครงการเพื่อดู trend รายวันหลังวันที่ 25</p>
            </div>
          </div>
          <div className="chartWrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboardChartData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                <XAxis type="number" stroke="#9fb0d0" />
                <YAxis
                  type="category"
                  dataKey="siteNo"
                  width={80}
                  stroke="#9fb0d0"
                />
                <Tooltip />
                <Bar dataKey="targetPercent" fill="#f97316" name="% to target" />
              </BarChart>
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
                <YAxis stroke="#9fb0d0" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="increaseAmount"
                  stroke="#34d399"
                  strokeWidth={3}
                  dot
                  name="Increase (Baht)"
                />
                <Line
                  type="monotone"
                  dataKey="targetPercent"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  name="% to target"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel miniLegend">
          <div className="panelHeader">
            <div>
              <h2>หลักการคำนวณ</h2>
              <p>ยึด net price จาก `NP_AVG` และจัดขั้นบันไดจากราคาที่ขึ้นได้จริง</p>
            </div>
          </div>
          <div className="ruleList">
            <div>
              <strong>Baseline</strong>
              <span>weighted average net price ช่วงวันที่ 1-24</span>
            </div>
            <div>
              <strong>Post-25</strong>
              <span>ใช้ราคาล่าสุดของแต่ละไซต์ตั้งแต่วันที่ 25 เป็นต้นไป</span>
            </div>
            <div>
              <strong>Increase</strong>
              <span>current net price - baseline net price</span>
            </div>
            <div>
              <strong>Percent to target</strong>
              <span>(increase / 300) x 100</span>
            </div>
            <div className="bucketChips">
              {bucketLabels.map((bucket) => (
                <span key={bucket.key} className="chip">
                  <i className={bucket.tone} />
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="panel sectionPanel">
        <div className="panelHeader controls">
          <div>
            <h2>Project table</h2>
            <p>คลิกแถวเพื่อดูกราฟรายโครงการด้านบน และแสดงทีละ 20 รายการ</p>
          </div>
          <div className="controlRow">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา SITE_NAME, SITE_NO, division"
            />
            <label className="toggle">
              <input
                type="checkbox"
                checked={onlyBelowTarget}
                onChange={(event) => setOnlyBelowTarget(event.target.checked)}
              />
              <span>แสดงเฉพาะต่ำกว่าเป้า 300</span>
            </label>
          </div>
        </div>

        <div className="tableToolbar">
          <div className="bucketFilterGroup">
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
          <div className="paginationSummary">
            แสดง {pageStart}-{pageEnd} จาก {formatNumber(projectRows.length)} รายการ
          </div>
        </div>

        <div className="explanationBox">
          <strong>คำอธิบาย Increase และ % Target</strong>
          <p>
            `Increase` คือส่วนต่างระหว่าง net price ล่าสุดหลังวันที่ 25 กับ baseline
            ช่วงวันที่ 1-24 ดังนั้นถ้าค่าติดลบ แปลว่าราคาล่าสุดยังต่ำกว่า baseline
            ไม่ได้หมายถึงข้อมูลผิด
          </p>
          <p>
            `% Target` คิดจากสูตร `(Increase / 300) x 100` จึงสามารถติดลบได้เช่นกัน
            หากโครงการนั้นยังต่ำกว่าระดับ baseline เดิม
          </p>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>SITE_NO</th>
                <th>SITE_NAME</th>
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
                    hint={tableColumnHelp.current}
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
                    label="Latest day"
                    hint={tableColumnHelp.latestDay}
                    activeHint={activeHint}
                    onToggle={(key) =>
                      setActiveHint((current) => (current === key ? null : key))
                    }
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
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
