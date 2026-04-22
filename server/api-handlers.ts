import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASELINE_END,
  BASELINE_START,
  CAMPAIGN_START,
  TARGET_INCREASE
} from "./queries.js";
import { buildAnalytics, type PricingRecord, type ProjectRow } from "./analytics.js";

type AnalyticsSnapshot = ReturnType<typeof buildAnalytics>;

type FilterParams = {
  divisions?: string[];
  segments?: string[];
  day?: string;
};

type CachedFilteredSnapshot = {
  expiresAt: number;
  snapshot: AnalyticsSnapshot;
};

const DEFAULT_REMOTE_FETCH_TIMEOUT_MS = 30_000;
const parsedRemoteFetchTimeoutMs = Number(process.env.DATAOCEAN_TIMEOUT_MS ?? "");
const REMOTE_FETCH_TIMEOUT_MS =
  Number.isFinite(parsedRemoteFetchTimeoutMs) && parsedRemoteFetchTimeoutMs > 0
    ? parsedRemoteFetchTimeoutMs
    : DEFAULT_REMOTE_FETCH_TIMEOUT_MS;
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;
const REMOTE_FETCH_MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 1_000;
const PERSISTED_CACHE_PATH = path.join(
  process.cwd(),
  ".cache",
  "pricing-monitor-records.json"
);

const remoteCache = {
  expiresAt: 0,
  snapshot: null as AnalyticsSnapshot | null,
  records: null as PricingRecord[] | null,
  fetchedAt: 0
};
const filteredSnapshotCache = new Map<string, CachedFilteredSnapshot>();
let pendingRemoteSnapshot:
  | Promise<{
      snapshot: AnalyticsSnapshot;
      records: PricingRecord[];
    }>
  | null = null;
let pendingCacheHydration: Promise<void> | null = null;
let hasHydratedPersistedCache = false;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRemoteRecords() {
  const apiUrl = process.env.DATAOCEAN_API_URL ?? "";
  const apiToken = process.env.DATAOCEAN_API_TOKEN ?? "";

  if (!apiUrl || !apiToken) {
    throw new Error(
      "Missing DATAOCEAN_API_URL or DATAOCEAN_API_TOKEN for remote analytics mode."
    );
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= REMOTE_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS)
      });

      if (!response.ok) {
        throw new Error(`Remote API request failed with status ${response.status}`);
      }

      const body = (await response.json()) as unknown;

      if (!Array.isArray(body)) {
        throw new Error("Remote API response is not an array");
      }

      return body as PricingRecord[];
    } catch (error) {
      lastError = error;

      if (attempt < REMOTE_FETCH_MAX_RETRIES) {
        await wait(RETRY_BACKOFF_MS * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown remote fetch error");
}

async function persistRemoteRecords(records: PricingRecord[]) {
  await mkdir(path.dirname(PERSISTED_CACHE_PATH), { recursive: true });
  await writeFile(
    PERSISTED_CACHE_PATH,
    JSON.stringify({
      fetchedAt: Date.now(),
      records
    })
  );
}

function applyRemoteCache(records: PricingRecord[], fetchedAt = Date.now()) {
  const snapshot = buildAnalytics(records);
  filteredSnapshotCache.clear();
  remoteCache.records = records;
  remoteCache.snapshot = snapshot;
  remoteCache.fetchedAt = fetchedAt;
  remoteCache.expiresAt = fetchedAt + MEMORY_CACHE_TTL_MS;
  return { snapshot, records };
}

async function hydratePersistedCache() {
  if (hasHydratedPersistedCache) {
    return;
  }

  if (!pendingCacheHydration) {
    pendingCacheHydration = (async () => {
      try {
        const raw = await readFile(PERSISTED_CACHE_PATH, "utf8");
        const parsed = JSON.parse(raw) as {
          fetchedAt?: number;
          records?: unknown;
        };

        if (!Array.isArray(parsed.records) || parsed.records.length === 0) {
          return;
        }

        applyRemoteCache(
          parsed.records as PricingRecord[],
          typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : Date.now()
        );
      } catch {
        // Ignore missing or invalid persisted cache and fall back to remote fetch.
      } finally {
        hasHydratedPersistedCache = true;
      }
    })();

    void pendingCacheHydration.then(
      () => {
        pendingCacheHydration = null;
      },
      () => {
        pendingCacheHydration = null;
      }
    );
  }

  await pendingCacheHydration;
}

async function refreshRemoteSnapshot() {
  const records = await fetchRemoteRecords();
  const result = applyRemoteCache(records);
  await persistRemoteRecords(records);
  return result;
}

function toReadableError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message;
    const cause =
      typeof error.cause === "object" && error.cause !== null
        ? String((error.cause as { code?: string; message?: string }).code ?? "") +
          " " +
          String((error.cause as { code?: string; message?: string }).message ?? "")
        : "";
    const combined = `${message} ${cause}`;

    if (combined.includes("ENOTFOUND")) {
      return "Cannot resolve DataOcean host. Check internet/DNS or corporate VPN access.";
    }

    if (combined.includes("401")) {
      return "DataOcean token was rejected. Check DATAOCEAN_API_TOKEN.";
    }

    if (combined.includes("timed out") || combined.includes("TimeoutError")) {
      return `DataOcean did not respond within ${REMOTE_FETCH_TIMEOUT_MS / 1000} seconds.`;
    }

    if (combined.includes("fetch failed")) {
      return "Cannot reach DataOcean API. Check internet connection, VPN, or API URL.";
    }

    return message;
  }

  return "Unknown remote data error";
}

async function getRemoteSnapshot() {
  await hydratePersistedCache();

  const now = Date.now();
  if (remoteCache.snapshot && remoteCache.records && remoteCache.expiresAt > now) {
    return {
      snapshot: remoteCache.snapshot,
      records: remoteCache.records
    };
  }

  if (!pendingRemoteSnapshot) {
    pendingRemoteSnapshot = refreshRemoteSnapshot();

    void pendingRemoteSnapshot.then(
      () => {
        pendingRemoteSnapshot = null;
      },
      () => {
        pendingRemoteSnapshot = null;
      }
    );
  }

  if (remoteCache.snapshot && remoteCache.records) {
    return {
      snapshot: remoteCache.snapshot,
      records: remoteCache.records
    };
  }

  try {
    return await pendingRemoteSnapshot;
  } catch (error) {
    if (remoteCache.snapshot && remoteCache.records) {
      return {
        snapshot: remoteCache.snapshot,
        records: remoteCache.records
      };
    }

    throw error;
  }
}

function normalizeFilterValues(values: string[] = []) {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

function filterRecords(records: PricingRecord[], filters: FilterParams) {
  const divisions = new Set(normalizeFilterValues(filters.divisions));
  const segments = new Set(normalizeFilterValues(filters.segments));

  if (divisions.size === 0 && segments.size === 0) {
    return records;
  }

  return records.filter((record) => {
    const matchesDivision =
      divisions.size === 0 || divisions.has(String(record.DIVISION_NAME ?? ""));
    const matchesSegment =
      segments.size === 0 || segments.has(String(record.SEGMENT ?? ""));

    return matchesDivision && matchesSegment;
  });
}

function buildFilterCacheKey(filters: FilterParams) {
  const divisions = normalizeFilterValues(filters.divisions).sort();
  const segments = normalizeFilterValues(filters.segments).sort();

  return JSON.stringify({ divisions, segments });
}

async function getFilteredSnapshot(filters: FilterParams = {}) {
  const { snapshot, records } = await getRemoteSnapshot();
  const cacheKey = buildFilterCacheKey(filters);
  const cached = filteredSnapshotCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const filteredRecords = filterRecords(records, filters);

  if (filteredRecords === records) {
    return snapshot;
  }

  const filteredSnapshot = buildAnalytics(filteredRecords);
  filteredSnapshotCache.set(cacheKey, {
    snapshot: filteredSnapshot,
    expiresAt: remoteCache.expiresAt
  });

  return filteredSnapshot;
}

export async function getMeta() {
  const { snapshot, records } = await getRemoteSnapshot();
  const divisions = [
    ...new Set(
      records
        .map((record) => String(record.DIVISION_NAME ?? "").trim())
        .filter(Boolean)
    )
  ].sort();
  const segments = [
    ...new Set(
      records.map((record) => String(record.SEGMENT ?? "").trim()).filter(Boolean)
    )
  ].sort();

  return {
    metadata: snapshot.metadata,
    config: {
      baselineStart: BASELINE_START,
      baselineEnd: BASELINE_END,
      campaignStart: CAMPAIGN_START,
      targetIncrease: TARGET_INCREASE
    },
    filters: {
      divisions,
      segments
    }
  };
}

export async function getDashboard(filters: FilterParams = {}) {
  const { snapshot, records } = await getRemoteSnapshot();
  const filteredSnapshot =
    normalizeFilterValues(filters.divisions).length > 0 ||
    normalizeFilterValues(filters.segments).length > 0
      ? await getFilteredSnapshot(filters)
      : snapshot;
  const divisions = [
    ...new Set(
      records
        .map((record) => String(record.DIVISION_NAME ?? "").trim())
        .filter(Boolean)
    )
  ].sort();
  const segments = [
    ...new Set(
      records.map((record) => String(record.SEGMENT ?? "").trim()).filter(Boolean)
    )
  ].sort();
  const latestDay = filteredSnapshot.trend.at(-1)?.day;
  const summary = filters.day
    ? filteredSnapshot.summaryByDay.get(filters.day)
    : latestDay
      ? filteredSnapshot.summaryByDay.get(latestDay)
      : null;

  return {
    meta: {
      metadata: filteredSnapshot.metadata,
      config: {
        baselineStart: BASELINE_START,
        baselineEnd: BASELINE_END,
        campaignStart: CAMPAIGN_START,
        targetIncrease: TARGET_INCREASE
      },
      filters: {
        divisions,
        segments
      }
    },
    summary:
      summary ??
      (filters.day
        ? {
            comparableSites: 0,
            ladder500: 0,
            ladder400: 0,
            ladder300: 0,
            ladder250: 0,
            ladder200: 0,
            ladder100: 0,
            ladder0: 0,
            belowTargetSites: 0,
            totalIncrease: 0,
            avgIncrease: 0,
            avgTargetPercent: 0,
            targetHitShare: 0,
            minIncrease: 0,
            maxIncrease: 0,
            latestDayMin: filters.day,
            latestDayMax: filters.day
          }
        : filteredSnapshot.summary),
    trend: filteredSnapshot.trend
  };
}

export async function getSummary(filters: FilterParams = {}) {
  const snapshot = await getFilteredSnapshot(filters);
  if (filters.day) {
    return snapshot.summaryByDay.get(filters.day) ?? {
      comparableSites: 0,
      ladder500: 0,
      ladder400: 0,
      ladder300: 0,
      ladder250: 0,
      ladder200: 0,
      ladder100: 0,
      ladder0: 0,
      belowTargetSites: 0,
      totalIncrease: 0,
      avgIncrease: 0,
      avgTargetPercent: 0,
      targetHitShare: 0,
      minIncrease: 0,
      maxIncrease: 0,
      latestDayMin: filters.day,
      latestDayMax: filters.day
    };
  }

  const latestDay = snapshot.trend.at(-1)?.day;
  return latestDay ? (snapshot.summaryByDay.get(latestDay) ?? snapshot.summary) : snapshot.summary;
}

export async function getTrend(filters: FilterParams = {}) {
  const snapshot = await getFilteredSnapshot(filters);
  return snapshot.trend;
}

export async function getProjects(params: {
  search?: string;
  ladder?: string;
  day?: string;
  divisions?: string[];
  segments?: string[];
  page?: number;
  pageSize?: number;
}) {
  const {
    search = "",
    ladder = "",
    day = "",
    divisions = [],
    segments = [],
    page = 1,
    pageSize = 20
  } = params;
  const normalizedSearch = search.trim().toLowerCase();
  const ladders = ladder
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const ladderSet = new Set(ladders);
  let rows: ProjectRow[];

  const snapshot = await getFilteredSnapshot({ divisions, segments });
  rows = day
    ? snapshot.dailyProjects.filter((row) => row.latestDay === day)
    : [...snapshot.projects];

  if (normalizedSearch) {
    rows = rows.filter((row) => {
      return (
        row.siteNo.toLowerCase().includes(normalizedSearch) ||
        row.siteName.toLowerCase().includes(normalizedSearch) ||
        row.divisionName.toLowerCase().includes(normalizedSearch) ||
        row.fcName.toLowerCase().includes(normalizedSearch) ||
        row.segment.toLowerCase().includes(normalizedSearch)
      );
    });
  }

  if (ladderSet.size > 0) {
    rows = rows.filter((row) => ladderSet.has(row.ladder));
  }

  const total = rows.length;
  const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, pageSize) : 20;
  const normalizedPage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const startIndex = (normalizedPage - 1) * normalizedPageSize;
  const pagedRows = rows.slice(startIndex, startIndex + normalizedPageSize);

  return {
    rows: pagedRows,
    total
  };
}

export async function getProjectTrend(siteNo: string, filters: FilterParams = {}) {
  const snapshot = await getFilteredSnapshot(filters);
  return snapshot.projectTrendMap.get(siteNo) ?? [];
}

export function formatHandlerError(error: unknown) {
  return {
    error: toReadableError(error)
  };
}

export function warmRemoteSnapshot() {
  void getRemoteSnapshot().catch(() => {
    // Warm-up should never crash the server; request handlers still surface errors.
  });
}
