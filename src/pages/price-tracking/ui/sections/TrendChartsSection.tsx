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

import { renderPercentBarLabel } from "../charts/PercentBarLabel";
import type {
  CalcHelpKey,
  PriceLadderMode,
  ShareTrendPoint,
  TrendGranularity,
  TrendPoint,
  TrendRange
} from "../../types";
import {
  formatBaht,
  formatDateRangeShort,
  formatNumber,
  formatPercentTick,
  formatShortDate,
  formatThaiDateShort
} from "../../utils/format";

const AVERAGE_INCREASE_Y_AXIS_TICKS = [0, 100, 200, 300, 600, 900, 1200, 1500];
const DAILY_POINT_WIDTH = 68;
const MIN_SCROLLABLE_CHART_WIDTH = 960;

type AveragePointLabelProps = {
  x?: unknown;
  y?: unknown;
  value?: unknown;
};

type TrendChartsSectionProps = {
  priceLadderMode: PriceLadderMode;
  trendGranularity: TrendGranularity;
  trendRange: TrendRange;
  activeTrendBucketSeries: ReadonlyArray<{ shareKey: string; name: string; fill: string }>;
  proportionTrendData: ShareTrendPoint[];
  discountDropSeries: ReadonlyArray<{ shareKey: string; name: string; fill: string }>;
  filteredAverageTrend: TrendPoint[];
  onSetPriceLadderMode: (mode: PriceLadderMode) => void;
  onSetTrendGranularity: (granularity: TrendGranularity) => void;
  onSetTrendRange: (range: TrendRange) => void;
  onOpenCalcHelp: (key: CalcHelpKey) => void;
};

export function TrendChartsSection({
  priceLadderMode,
  trendGranularity,
  trendRange,
  activeTrendBucketSeries,
  proportionTrendData,
  discountDropSeries,
  filteredAverageTrend,
  onSetPriceLadderMode,
  onSetTrendGranularity,
  onSetTrendRange,
  onOpenCalcHelp
}: TrendChartsSectionProps) {
  const isDailyGranularity = trendGranularity === "daily";
  const shouldShowEveryAverageTick = isDailyGranularity || filteredAverageTrend.length <= 14;
  const shouldShowEveryProportionTick = isDailyGranularity || proportionTrendData.length <= 14;
  const averageChartWidth = isDailyGranularity
    ? Math.max(MIN_SCROLLABLE_CHART_WIDTH, filteredAverageTrend.length * DAILY_POINT_WIDTH)
    : null;
  const proportionChartWidth = isDailyGranularity
    ? Math.max(MIN_SCROLLABLE_CHART_WIDTH, proportionTrendData.length * DAILY_POINT_WIDTH)
    : null;
  const formatTrendXAxis = (day: string, periodEnd?: string) =>
    trendGranularity === "weekly" ? formatDateRangeShort(day, periodEnd) : formatShortDate(day);

  const formatTrendTooltipLabel = (point: { day: string; periodEnd?: string }, siteCount?: number) =>
    `${formatDateRangeShort(point.day, point.periodEnd)}${
      typeof siteCount === "number" ? ` • ${formatNumber(siteCount)} โครงการ` : ""
    }`;

  const formatTrendTick = (
    tickDay: string | number,
    points: Array<{ day: string; periodEnd?: string }>
  ) => {
    const point = points.find((item) => item.day === String(tickDay));
    return point ? formatTrendXAxis(point.day, point.periodEnd) : formatShortDate(String(tickDay));
  };

  const renderAveragePointLabel = ({ x, y, value }: AveragePointLabelProps) => {
    if (typeof x !== "number" || typeof y !== "number" || value === null || value === undefined) {
      return null;
    }

    return (
      <text
        x={x}
        y={y - 12}
        fill="#fb7185"
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
      >
        {formatNumber(Number(value))}
      </text>
    );
  };

  return (
    <section className="chartStack sectionPanel">
      <article className="panel chartPanel">
        <div className="panelHeader">
          <div>
            <h2>ค่าเฉลี่ยการขึ้นราคาเทียบ Baseline รายวัน</h2>
            <p>
              เส้นนี้ยังคงช่วยดู momentum ว่าค่าเฉลี่ยการขึ้นราคาเคลื่อนไปทางไหน
              ภายใต้ฟิลเตอร์เดียวกับกราฟสัดส่วนด้านล่าง
            </p>
          </div>
          <div className="panelHeaderActions">
            <div className="segmentedControl" aria-label="ระดับช่วงเวลาของกราฟ">
              <button
                type="button"
                className={trendGranularity === "daily" ? "active" : ""}
                onClick={() => onSetTrendGranularity("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={trendGranularity === "weekly" ? "active" : ""}
                onClick={() => onSetTrendGranularity("weekly")}
              >
                Weekly
              </button>
            </div>
            <label className="chartRangeField">
              <span>เลือกช่วงเวลา</span>
              <select
                value={trendRange}
                onChange={(event) => onSetTrendRange(event.target.value as TrendRange)}
              >
                <option value="all">ทั้งหมด</option>
                <option value="post25">หลัง Baseline</option>
                <option value="last14">14 วันล่าสุด</option>
                <option value="last7">7 วันล่าสุด</option>
              </select>
            </label>
            <button
              type="button"
              className="calcHelpButton compact"
              onClick={() => onOpenCalcHelp("averageTrend")}
            >
              วิธีคำนวณ
            </button>
          </div>
        </div>

        <div className="chartWrap lineInsightChart">
          <div className={`chartScrollArea${isDailyGranularity ? " isScrollable" : ""}`}>
            <div
              className="chartScrollInner"
              style={averageChartWidth ? { width: `${averageChartWidth}px` } : undefined}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredAverageTrend}
                  margin={{ top: 36, right: 8, left: 0, bottom: isDailyGranularity ? 12 : 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(value) => formatTrendTick(value, filteredAverageTrend)}
                    stroke="#9fb0d0"
                    interval={shouldShowEveryAverageTick ? 0 : "preserveStartEnd"}
                    minTickGap={shouldShowEveryAverageTick ? 6 : 12}
                    height={36}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 1500]}
                    ticks={AVERAGE_INCREASE_Y_AXIS_TICKS}
                    interval={0}
                    stroke="#9fb0d0"
                    width={58}
                    tick={{ fontSize: 13 }}
                    tickFormatter={formatNumber}
                  />
                  <Tooltip
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as TrendPoint | undefined;
                      return point ? formatTrendTooltipLabel(point) : "";
                    }}
                    formatter={(value, name) => [formatBaht(Number(value ?? 0)), String(name)]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgIncrease"
                    stroke="#fb7185"
                    strokeWidth={3}
                    dot
                    label={renderAveragePointLabel}
                    name="Average increase"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </article>

      <article className="panel chartPanel">
        <div className="panelHeader">
          <div>
            <h2>% สัดส่วนโครงการตามระดับการขึ้นราคา</h2>
            <p>
              มุมมองนี้แสดงเป็น 100% stacked bar เพื่อให้เห็นสัดส่วนแต่ละ ladder ต่อวัน
              หลังช่วง Baseline และเปลี่ยนตามฟิลเตอร์ที่เลือก
            </p>
          </div>
          <div className="chartSummaryPills">
            <div className="segmentedControl" aria-label="ระดับช่วงเวลาของกราฟสัดส่วน">
              <button
                type="button"
                className={trendGranularity === "daily" ? "active" : ""}
                onClick={() => onSetTrendGranularity("daily")}
              >
                Daily
              </button>
              <button
                type="button"
                className={trendGranularity === "weekly" ? "active" : ""}
                onClick={() => onSetTrendGranularity("weekly")}
              >
                Weekly
              </button>
            </div>
            <div className="segmentedControl" aria-label="รูปแบบการแสดงช่วง 300 บาทขึ้นไป">
              <button
                type="button"
                className={priceLadderMode === "summary" ? "active" : ""}
                onClick={() => onSetPriceLadderMode("summary")}
              >
                สรุป 300+
              </button>
              <button
                type="button"
                className={priceLadderMode === "detail" ? "active" : ""}
                onClick={() => onSetPriceLadderMode("detail")}
              >
                แยก 300+
              </button>
            </div>
            <button
              type="button"
              className="calcHelpButton compact"
              onClick={() => onOpenCalcHelp("proportionChart")}
            >
              วิธีคำนวณ
            </button>
          </div>
        </div>

        <div className="chartWrap proportionChart">
          <div className={`chartScrollArea${isDailyGranularity ? " isScrollable" : ""}`}>
            <div
              className="chartScrollInner"
              style={proportionChartWidth ? { width: `${proportionChartWidth}px` } : undefined}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={proportionTrendData}
                  barCategoryGap="10%"
                  margin={{ top: 0, right: 0, left: 0, bottom: isDailyGranularity ? 12 : 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(value) => formatTrendTick(value, proportionTrendData)}
                    stroke="#9fb0d0"
                    interval={shouldShowEveryProportionTick ? 0 : "preserveStartEnd"}
                    minTickGap={shouldShowEveryProportionTick ? 6 : 12}
                    height={36}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={formatPercentTick} stroke="#9fb0d0" />
                  <Tooltip
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as ShareTrendPoint | undefined;
                      return point
                        ? formatTrendTooltipLabel(point, point.siteCount)
                        : formatThaiDateShort(String(label));
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
                        {activeTrendBucketSeries.map((series) => (
                          <span key={series.shareKey}>
                            <i style={{ backgroundColor: series.fill }} />
                            {series.name}
                          </span>
                        ))}
                      </div>
                    )}
                  />
                  {activeTrendBucketSeries.map((series) => (
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
          </div>
        </div>
      </article>

      <article className="panel chartPanel">
        <div className="panelHeader">
          <div>
            <h2>% สัดส่วน Disc ที่ลดลง</h2>
            <p>
              กราฟนี้แสดงสัดส่วนโครงการที่ Discount ลดลงจาก Baseline กี่ %
              แล้วแบ่งช่วงลดลงทีละ 3%; สีเทาคือโครงการที่ไม่มีข้อมูลก่อนปรับให้เทียบ
            </p>
          </div>
          <div className="chartSummaryPills">
            <button
              type="button"
              className="calcHelpButton compact"
              onClick={() => onOpenCalcHelp("discountDropChart")}
            >
              วิธีคำนวณ
            </button>
          </div>
        </div>

        <div className="chartWrap proportionChart">
          <div className={`chartScrollArea${isDailyGranularity ? " isScrollable" : ""}`}>
            <div
              className="chartScrollInner"
              style={proportionChartWidth ? { width: `${proportionChartWidth}px` } : undefined}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={proportionTrendData}
                  barCategoryGap="10%"
                  margin={{ top: 0, right: 0, left: 0, bottom: isDailyGranularity ? 12 : 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3e65" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(value) => formatTrendTick(value, proportionTrendData)}
                    stroke="#9fb0d0"
                    interval={shouldShowEveryProportionTick ? 0 : "preserveStartEnd"}
                    minTickGap={shouldShowEveryProportionTick ? 6 : 12}
                    height={36}
                    tickMargin={8}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={formatPercentTick} stroke="#9fb0d0" />
                  <Tooltip
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as ShareTrendPoint | undefined;
                      return point
                        ? formatTrendTooltipLabel(point, point.siteCount)
                        : formatThaiDateShort(String(label));
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
          </div>
        </div>
      </article>

    </section>
  );
}
