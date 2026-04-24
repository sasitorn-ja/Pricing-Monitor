export const bucketLabels = [
  { key: "ไม่มี baseline", label: "ไม่มี baseline", tone: "bg-slate-400" },
  { key: "500+", label: "500 บาทขึ้นไป", tone: "bg-green-600" },
  { key: "400-499", label: "400-499 บาท", tone: "bg-green-500" },
  { key: "300-399", label: "300-399 บาท", tone: "bg-emerald-400" },
  { key: "250-299", label: "250-299 บาท", tone: "bg-cyan-400" },
  { key: "200-249", label: "200-249 บาท", tone: "bg-sky-400" },
  { key: "100-199", label: "100-199 บาท", tone: "bg-amber-400" },
  { key: "0-99", label: "ต่ำกว่า 100 บาท", tone: "bg-rose-400" }
] as const;

export const bucketColors = {
  topMax: "#16a34a",
  topHigh: "#22c55e",
  top: "#34d399",
  high: "#22d3ee",
  bridge: "#38bdf8",
  mid: "#fbbf24",
  low: "#fb7185",
  missing: "#94a3b8"
} as const;

export const trendBucketSeries = [
  { shareKey: "noBaselineShare", countKey: "noBaseline", name: "ไม่มี baseline", fill: bucketColors.missing },
  { shareKey: "ladder0Share", countKey: "ladder0", name: "0-99", fill: bucketColors.low },
  { shareKey: "ladder100Share", countKey: "ladder100", name: "100-199", fill: bucketColors.mid },
  { shareKey: "ladder200Share", countKey: "ladder200", name: "200-249", fill: bucketColors.bridge },
  { shareKey: "ladder250Share", countKey: "ladder250", name: "250-299", fill: bucketColors.high },
  { shareKey: "ladder300PlusShare", countKey: "ladder300Plus", name: "300+", fill: bucketColors.topMax }
] as const;

export const trendBucketDetailSeries = [
  { shareKey: "noBaselineShare", countKey: "noBaseline", name: "ไม่มี baseline", fill: bucketColors.missing },
  { shareKey: "ladder0Share", countKey: "ladder0", name: "0-99", fill: bucketColors.low },
  { shareKey: "ladder100Share", countKey: "ladder100", name: "100-199", fill: bucketColors.mid },
  { shareKey: "ladder200Share", countKey: "ladder200", name: "200-249", fill: bucketColors.bridge },
  { shareKey: "ladder250Share", countKey: "ladder250", name: "250-299", fill: bucketColors.high },
  { shareKey: "ladder300Share", countKey: "ladder300", name: "300-399", fill: bucketColors.top },
  { shareKey: "ladder400Share", countKey: "ladder400", name: "400-499", fill: bucketColors.topHigh },
  { shareKey: "ladder500Share", countKey: "ladder500", name: "500+", fill: bucketColors.topMax }
] as const;

export const discountDropSeries = [
  { shareKey: "noBaselineShare", countKey: "noBaseline", name: "ไม่มี baseline", fill: bucketColors.missing },
  { shareKey: "disc0Share", countKey: "disc0", name: "0-2.9%", fill: bucketColors.low },
  { shareKey: "disc3Share", countKey: "disc3", name: "3.0-5.9%", fill: bucketColors.mid },
  { shareKey: "disc6Share", countKey: "disc6", name: "6.0-8.9%", fill: bucketColors.bridge },
  { shareKey: "disc9Share", countKey: "disc9", name: "9.0-11.9%", fill: bucketColors.high },
  { shareKey: "disc12Share", countKey: "disc12", name: "12.0-14.9%", fill: bucketColors.top },
  { shareKey: "disc15Share", countKey: "disc15", name: "15%+", fill: bucketColors.topMax }
] as const;

export const PAGE_SIZE = 20;
export const MULTI_LADDER_FETCH_SIZE = 100_000;
export const SEARCH_DEBOUNCE_MS = 250;

export const tableColumnHelp = {
  division: "พื้นที่ขายหรือหน่วยงานที่โครงการนี้อยู่ ใช้สำหรับกรองและดูภาพรวมแยกตามพื้นที่",
  segment: "กลุ่มขนาดของโครงการ เช่น tiny, small, medium ใช้ตัวเดียวกับตัวกรอง Segment ด้านบน",
  ladder: "ช่วงของราคาที่เพิ่มขึ้นเทียบกับ Baseline เช่น 0-99, 100-199, 200-249 หรือ 300 บาทขึ้นไป",
  baseline: "ราคาอ้างอิงก่อนเริ่มติดตาม คำนวณจาก NP_AVG เฉลี่ยถ่วงปริมาณขายช่วง Baseline ที่เลือก",
  current: "ราคา NP_AVG ของวันที่แสดงในแถวนี้ ถ้าไม่ได้เลือกวัน ตารางจะแสดงข้อมูลรายวันทั้งหมด",
  increase: "ราคาที่เพิ่มขึ้น = Current - Baseline ถ้าราคาปัจจุบันต่ำกว่า Baseline จะนับเป็น 0",
  baselineDisc: "Disc Baseline (%) คือส่วนลดอ้างอิงก่อนเริ่มติดตาม คำนวณจาก DC_AVG เฉลี่ยถ่วงปริมาณขายช่วง Baseline ที่เลือก",
  currentDisc: "Disc Current (%) คือส่วนลดของวันที่แสดงในแถวนี้ ถ้าไม่ได้เลือกวัน ตารางจะแสดงข้อมูลรายวันทั้งหมด",
  discount: "Discount Drop (%) คือส่วนต่างของส่วนลดแบบตรง ๆ คำนวณจาก Disc Baseline - Disc Current ถ้า Current สูงกว่า Baseline จะนับเป็น 0",
  latestDay: "วันที่ของข้อมูลราคาที่ใช้คำนวณแถวนี้"
} as const;

export type TableColumnHelpKey = keyof typeof tableColumnHelp;
