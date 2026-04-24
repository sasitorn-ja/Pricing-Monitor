import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { bucketColors } from "../../constants";
import type {
  CalcHelpKey,
  MetaResponse,
  ProjectTrendChartPoint,
  ProjectTrendPoint
} from "../../types";
import { formatBaht, formatNumber, formatShortDate } from "../../utils/format";

type ProjectTrendSectionProps = {
  meta: MetaResponse | null;
  selectedSite: string;
  selectedTrend: ProjectTrendPoint[];
  selectedTrendChartData: ProjectTrendChartPoint[];
  onOpenCalcHelp: (key: CalcHelpKey) => void;
};

export function ProjectTrendSection({
  meta,
  selectedSite,
  selectedTrend,
  selectedTrendChartData,
  onOpenCalcHelp
}: ProjectTrendSectionProps) {
  return (
    <section className="twoColumn">
      <article className="panel">
        <div className="panelHeader">
          <div>
            <h2>แนวโน้มรายโครงการ</h2>
            <p>
              {selectedTrend[0]?.siteName ?? "เลือกไซต์จากตารางด้านล่าง"}{" "}
              {selectedSite ? `(${selectedSite})` : ""}
            </p>
            <p className="chartNote">
              {meta
                ? `${meta.config.baselineStart} ถึง ${meta.config.baselineEnd} = ช่วง Baseline; หลัง ${meta.config.baselineEnd} = ช่วงติดตามผล`
                : "ช่วง Baseline = ช่วงราคาอ้างอิง; หลัง Baseline = ช่วงติดตามผล"}
            </p>
          </div>
          <button
            type="button"
            className="calcHelpButton compact"
            onClick={() => onOpenCalcHelp("projectTrend")}
          >
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
                stroke="#7dd3fc"
                tick={{ fill: "#7dd3fc", fontWeight: 700 }}
                tickFormatter={formatNumber}
                width={84}
                tickCount={5}
                allowDecimals={false}
                label={{
                  value: "ราคาขาย",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#7dd3fc",
                  fontSize: 12,
                  fontWeight: 700
                }}
              />
              <YAxis
                yAxisId="increase"
                orientation="right"
                stroke={bucketColors.top}
                tick={{ fill: bucketColors.top, fontWeight: 700 }}
                tickFormatter={formatNumber}
                width={84}
                tickCount={5}
                allowDecimals={false}
                label={{
                  value: "ขึ้นราคา",
                  angle: 90,
                  position: "insideRight",
                  fill: bucketColors.top,
                  fontSize: 12,
                  fontWeight: 700
                }}
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
                    value: formatShortDate(meta.config.baselineEnd),
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
  );
}
