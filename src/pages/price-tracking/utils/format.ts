import type { SummaryResponse } from "../types";

export function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${formatNumber(value)}%`;
}

export function formatPercentTick(value: number) {
  return `${Math.round(value)}%`;
}

export function formatDiscountDropPoints(baselineDisc: number, currentDisc: number) {
  if (!Number.isFinite(baselineDisc) || baselineDisc <= 0) {
    return "-";
  }

  const dropPoints = Math.max(baselineDisc - currentDisc, 0);
  return formatNumber(dropPoints);
}

export function formatBaht(value: number) {
  return `${formatNumber(value)} บาท`;
}

export function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric"
  });
}

export function formatThaiDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function formatThaiDateShort(value: string) {
  return new Date(value).toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric"
  });
}

export function formatDateRangeShort(startDay: string, endDay?: string) {
  if (!endDay || startDay === endDay) {
    return formatThaiDateShort(startDay);
  }

  return `${formatThaiDateShort(startDay)} - ${formatThaiDateShort(endDay)}`;
}

export function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getDateRange(startDay: string, endDay: string) {
  const days: string[] = [];

  for (let day = startDay; day <= endDay; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

export function formatSummaryDateRange(summary: SummaryResponse, fallbackDay?: string) {
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

export function getPaginationItems(currentPage: number, totalPages: number) {
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
