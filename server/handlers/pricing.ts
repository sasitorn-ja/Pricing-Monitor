import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASELINE_END,
  BASELINE_START,
  TARGET_INCREASE
} from "../config/pricing.js";
import {
  buildAnalytics,
  getAnalyticsConfig,
  type PricingRecord,
  type ProjectRow
} from "../services/analytics/index.js";

type AnalyticsSnapshot = ReturnType<typeof buildAnalytics>;

type FilterParams = {
  divisions?: string[];
  segments?: string[];
  channels?: string[];
  fcNames?: string[];
  discountTypes?: string[];
  day?: string;
  baselineStart?: string;
  baselineEnd?: string;
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
const DEFAULT_MEMORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const parsedMemoryCacheTtlMs = Number(process.env.DATA_CACHE_TTL_MS ?? "");
const MEMORY_CACHE_TTL_MS =
  Number.isFinite(parsedMemoryCacheTtlMs) && parsedMemoryCacheTtlMs > 0
    ? parsedMemoryCacheTtlMs
    : DEFAULT_MEMORY_CACHE_TTL_MS;
const DEFAULT_CACHE_PRELOAD_INTERVAL_MS = 24 * 60 * 60 * 1000;
const parsedCachePreloadIntervalMs = Number(process.env.DATA_CACHE_PRELOAD_INTERVAL_MS ?? "");
const CACHE_PRELOAD_INTERVAL_MS =
  Number.isFinite(parsedCachePreloadIntervalMs) && parsedCachePreloadIntervalMs > 0
    ? parsedCachePreloadIntervalMs
    : DEFAULT_CACHE_PRELOAD_INTERVAL_MS;
const REMOTE_FETCH_MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 1_000;
const PERSISTED_CACHE_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), ".cache");
const PERSISTED_CACHE_PATH = path.join(
  PERSISTED_CACHE_DIR,
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
let cachePreloadTimer: ReturnType<typeof setInterval> | null = null;

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

function buildSnapshot(records: PricingRecord[], filters: Pick<FilterParams, "baselineStart" | "baselineEnd"> = {}) {
  return buildAnalytics(records, {
    baselineStart: filters.baselineStart,
    baselineEnd: filters.baselineEnd
  });
}

function applyRemoteCache(records: PricingRecord[], fetchedAt = Date.now()) {
  const snapshot = buildSnapshot(records);
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

export async function forceRefreshRemoteSnapshot() {
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

  return pendingRemoteSnapshot;
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

  const refreshPromise = forceRefreshRemoteSnapshot();

  if (remoteCache.snapshot && remoteCache.records) {
    return {
      snapshot: remoteCache.snapshot,
      records: remoteCache.records
    };
  }

  try {
    return await refreshPromise;
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
  const channels = new Set(normalizeFilterValues(filters.channels));
  const fcNames = new Set(normalizeFilterValues(filters.fcNames));
  const discountTypes = new Set(normalizeFilterValues(filters.discountTypes));

  if (
    divisions.size === 0 &&
    segments.size === 0 &&
    channels.size === 0 &&
    fcNames.size === 0 &&
    discountTypes.size === 0
  ) {
    return records;
  }

  return records.filter((record) => {
    const matchesDivision =
      divisions.size === 0 || divisions.has(String(record.DIVISION_NAME ?? ""));
    const matchesSegment =
      segments.size === 0 || segments.has(String(record.SEGMENT ?? ""));
    const matchesChannel =
      channels.size === 0 || channels.has(String(record.CHANNEL ?? ""));
    const matchesFcName =
      fcNames.size === 0 || fcNames.has(String(record.FC_NAME ?? ""));
    const matchesDiscountType =
      discountTypes.size === 0 || discountTypes.has(String(record.DISCOUNT_TYPE ?? ""));

    return (
      matchesDivision &&
      matchesSegment &&
      matchesChannel &&
      matchesFcName &&
      matchesDiscountType
    );
  });
}

function buildFilterCacheKey(filters: FilterParams) {
  const divisions = normalizeFilterValues(filters.divisions).sort();
  const segments = normalizeFilterValues(filters.segments).sort();
  const channels = normalizeFilterValues(filters.channels).sort();
  const fcNames = normalizeFilterValues(filters.fcNames).sort();
  const discountTypes = normalizeFilterValues(filters.discountTypes).sort();
  const analyticsConfig = getAnalyticsConfig({
    baselineStart: filters.baselineStart,
    baselineEnd: filters.baselineEnd
  });

  return JSON.stringify({
    divisions,
    segments,
    channels,
    fcNames,
    discountTypes,
    baselineStart: analyticsConfig.baselineStart,
    baselineEnd: analyticsConfig.baselineEnd
  });
}

function getAvailableFilters(records: PricingRecord[]) {
  const divisions = new Set<string>();
  const segments = new Set<string>();
  const channels = new Set<string>();
  const discountTypes = new Set<string>();
  const fcNamesByDivision: Record<string, string[]> = {};

  for (const record of records) {
    const division = String(record.DIVISION_NAME ?? "").trim();
    const segment = String(record.SEGMENT ?? "").trim();
    const channel = String(record.CHANNEL ?? "").trim();
    const discountType = String(record.DISCOUNT_TYPE ?? "").trim();
    const fcName = String(record.FC_NAME ?? "").trim();

    if (division) divisions.add(division);
    if (segment) segments.add(segment);
    if (channel) channels.add(channel);
    if (discountType) discountTypes.add(discountType);

    if (division && fcName) {
      fcNamesByDivision[division] = fcNamesByDivision[division] ?? [];
      if (!fcNamesByDivision[division].includes(fcName)) {
        fcNamesByDivision[division].push(fcName);
      }
    }
  }

  for (const names of Object.values(fcNamesByDivision)) {
    names.sort();
  }

  return {
    divisions: [...divisions].sort(),
    segments: [...segments].sort(),
    channels: [...channels].sort(),
    discountTypes: [...discountTypes].sort(),
    fcNamesByDivision
  };
}

async function getFilteredSnapshot(filters: FilterParams = {}) {
  const { snapshot, records } = await getRemoteSnapshot();
  const cacheKey = buildFilterCacheKey(filters);
  const cached = filteredSnapshotCache.get(cacheKey);
  const analyticsConfig = getAnalyticsConfig({
    baselineStart: filters.baselineStart,
    baselineEnd: filters.baselineEnd
  });
  const isDefaultBaseline =
    analyticsConfig.baselineStart === BASELINE_START && analyticsConfig.baselineEnd === BASELINE_END;

  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  const filteredRecords = filterRecords(records, filters);

  if (filteredRecords === records && isDefaultBaseline) {
    return snapshot;
  }

  const filteredSnapshot = buildSnapshot(filteredRecords, analyticsConfig);
  filteredSnapshotCache.set(cacheKey, {
    snapshot: filteredSnapshot,
    expiresAt: remoteCache.expiresAt
  });

  return filteredSnapshot;
}

export async function getMeta() {
  const { snapshot, records } = await getRemoteSnapshot();
  const filters = getAvailableFilters(records);
  const analyticsConfig = getAnalyticsConfig();

  return {
    metadata: snapshot.metadata,
    config: {
      baselineStart: analyticsConfig.baselineStart,
      baselineEnd: analyticsConfig.baselineEnd,
      campaignStart: analyticsConfig.campaignStart,
      targetIncrease: TARGET_INCREASE
    },
    filters: {
      ...filters
    }
  };
}

export async function getDashboard(filters: FilterParams = {}) {
  const { snapshot, records } = await getRemoteSnapshot();
  const analyticsConfig = getAnalyticsConfig({
    baselineStart: filters.baselineStart,
    baselineEnd: filters.baselineEnd
  });
  const isDefaultBaseline =
    analyticsConfig.baselineStart === BASELINE_START && analyticsConfig.baselineEnd === BASELINE_END;
  const filteredSnapshot =
    normalizeFilterValues(filters.divisions).length > 0 ||
    normalizeFilterValues(filters.segments).length > 0 ||
    normalizeFilterValues(filters.channels).length > 0 ||
    normalizeFilterValues(filters.fcNames).length > 0 ||
    normalizeFilterValues(filters.discountTypes).length > 0 ||
    !isDefaultBaseline
      ? await getFilteredSnapshot(filters)
      : snapshot;
  const availableFilters = getAvailableFilters(records);
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
        baselineStart: analyticsConfig.baselineStart,
        baselineEnd: analyticsConfig.baselineEnd,
        campaignStart: analyticsConfig.campaignStart,
        targetIncrease: TARGET_INCREASE
      },
      filters: {
        ...availableFilters
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
  channels?: string[];
  fcNames?: string[];
  discountTypes?: string[];
  baselineStart?: string;
  baselineEnd?: string;
  page?: number;
  pageSize?: number;
}) {
  const {
    search = "",
    ladder = "",
    day = "",
    divisions = [],
    segments = [],
    channels = [],
    fcNames = [],
    discountTypes = [],
    baselineStart = "",
    baselineEnd = "",
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

  const snapshot = await getFilteredSnapshot({
    divisions,
    segments,
    channels,
    fcNames,
    discountTypes,
    baselineStart,
    baselineEnd
  });
  rows = day
    ? snapshot.dailyProjects.filter((row) => row.latestDay === day)
    : [...snapshot.dailyProjects];

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
  void forceRefreshRemoteSnapshot().catch(() => {
    // Warm-up should never crash the server; request handlers still surface errors.
  });
}

export function scheduleRemoteSnapshotRefresh() {
  if (cachePreloadTimer) {
    return;
  }

  warmRemoteSnapshot();
  cachePreloadTimer = setInterval(() => {
    warmRemoteSnapshot();
  }, CACHE_PRELOAD_INTERVAL_MS);
  cachePreloadTimer.unref?.();
}

export function getCacheStatus() {
  return {
    hasCache: Boolean(remoteCache.snapshot && remoteCache.records),
    fetchedAt: remoteCache.fetchedAt || null,
    expiresAt: remoteCache.expiresAt || null,
    cacheTtlMs: MEMORY_CACHE_TTL_MS,
    preloadIntervalMs: CACHE_PRELOAD_INTERVAL_MS,
    isRefreshing: Boolean(pendingRemoteSnapshot)
  };
}
