import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { PriceTrackingShell } from "./PriceTrackingShell";
import { CalcHelpModal } from "./ui/CalcHelpModal";
import { OverviewSection } from "./ui/sections/OverviewSection";
import { ProjectTrendSection } from "./ui/sections/ProjectTrendSection";
import { ProjectsTableSection } from "./ui/sections/ProjectsTableSection";
import { SharedFilterMenuBar } from "./ui/sections/SharedFilterMenuBar";
import { TrendChartsSection } from "./ui/sections/TrendChartsSection";
import {
  buildActiveTableFilters,
  buildProportionTrendData,
  buildSelectedTrendChartData,
  getActiveTrendBucketSeries,
  getFilteredAverageTrend,
  getPostCampaignTrendData,
  getTrendPointsByGranularity
} from "./calculations/priceTracking";
import { type TableColumnHelpKey, discountDropSeries, MULTI_LADDER_FETCH_SIZE, PAGE_SIZE, SEARCH_DEBOUNCE_MS } from "./constants";
import { buildCalcHelpContent } from "./content/calcHelp";
import type {
  CalcHelpKey,
  DashboardResponse,
  MetaResponse,
  TrendGranularity,
  PriceLadderMode,
  ProjectResponse,
  ProjectRow,
  ProjectTrendPoint,
  SummaryResponse,
  TrendPoint,
  TrendRange
} from "./types";
import { buildDashboardFilterQuery } from "./utils/filters";
import { formatNumber, formatSummaryDateRange, formatThaiDateShort, getPaginationItems } from "./utils/format";
import { useDelayedFlag } from "../../hooks/useDelayedFlag";
import { fetchJson } from "../../services/api/fetchJson";

type PriceTrackingPageProps = {
  themeMode: "dark" | "light";
  onToggleTheme: () => void;
};

export function PriceTrackingPage({ themeMode, onToggleTheme }: PriceTrackingPageProps) {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const defaultMetaRef = useRef<MetaResponse | null>(null);
  const defaultSummaryRef = useRef<SummaryResponse | null>(null);
  const defaultTrendRef = useRef<TrendPoint[]>([]);
  const defaultBaselineStartRef = useRef("");
  const defaultBaselineEndRef = useRef("");
  const dashboardRequestIdRef = useRef(0);
  const projectRequestIdRef = useRef(0);
  const selectedTrendRequestIdRef = useRef(0);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [selectedBuckets, setSelectedBuckets] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedFcNames, setSelectedFcNames] = useState<string[]>([]);
  const [selectedDiscountTypes, setSelectedDiscountTypes] = useState<string[]>([]);
  const [baselineStart, setBaselineStart] = useState("");
  const [baselineEnd, setBaselineEnd] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedTrend, setSelectedTrend] = useState<ProjectTrendPoint[]>([]);
  const [trendRange, setTrendRange] = useState<TrendRange>("all");
  const [priceLadderMode, setPriceLadderMode] = useState<PriceLadderMode>("summary");
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("daily");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [activeHint, setActiveHint] = useState<TableColumnHelpKey | null>(null);
  const [activeCalcHelp, setActiveCalcHelp] = useState<CalcHelpKey | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectError, setProjectError] = useState("");
  const showDashboardSlowNotice = useDelayedFlag(metaLoading || dashboardLoading, 1400);
  const showProjectSlowNotice = useDelayedFlag(projectLoading, 1400);

  const buildFilterQuery = () =>
    buildDashboardFilterQuery({
      divisions: selectedDivisions,
      segments: selectedSegments,
      channels: selectedChannels,
      fcNames: selectedFcNames,
      discountTypes: selectedDiscountTypes,
      baselineStart,
      baselineEnd
    });

  const toggleValue = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((items) =>
      items.includes(value) ? items.filter((item) => item !== value) : [...items, value]
    );
  };

  const clearDivisions = () => {
    setSelectedDivisions([]);
    setSelectedFcNames([]);
  };

  const toggleDivision = (value: string) => {
    toggleValue(value, setSelectedDivisions);
    setSelectedFcNames([]);
  };

  const clearSharedFilters = () => {
    clearDivisions();
    setSelectedSegments([]);
    setSelectedChannels([]);
    setSelectedFcNames([]);
    setSelectedDiscountTypes([]);
  };

  const resetTableFilters = () => {
    setSearch("");
    setSelectedDay("");
    setSelectedBuckets([]);
    clearSharedFilters();
    setCurrentPage(1);
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
        defaultMetaRef.current = dashboardResponse.meta;
        setBaselineStart(dashboardResponse.meta.config.baselineStart);
        setBaselineEnd(dashboardResponse.meta.config.baselineEnd);
        defaultBaselineStartRef.current = dashboardResponse.meta.config.baselineStart;
        defaultBaselineEndRef.current = dashboardResponse.meta.config.baselineEnd;
        setSummary(dashboardResponse.summary);
        setTrend(dashboardResponse.trend);
        defaultSummaryRef.current = dashboardResponse.summary;
        defaultTrendRef.current = dashboardResponse.trend;
        setHasLoadedSummary(true);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unknown error");
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

      const requestId = ++dashboardRequestIdRef.current;
      const isDefaultBaseline =
        baselineStart === defaultBaselineStartRef.current &&
        baselineEnd === defaultBaselineEndRef.current;
      const isDefaultDashboardView =
        !selectedDay &&
        selectedDivisions.length === 0 &&
        selectedSegments.length === 0 &&
        selectedChannels.length === 0 &&
        selectedFcNames.length === 0 &&
        selectedDiscountTypes.length === 0 &&
        isDefaultBaseline;

      if (hasLoadedSummary && isDefaultDashboardView) {
        if (requestId === dashboardRequestIdRef.current && defaultSummaryRef.current) {
          setSummary(defaultSummaryRef.current);
          setTrend(defaultTrendRef.current);
          if (defaultMetaRef.current) {
            setMeta(defaultMetaRef.current);
          }
          setDashboardLoading(false);
        }
        return;
      }

      try {
        setDashboardLoading(true);
        setError("");
        const params = buildFilterQuery();
        if (selectedDay) {
          params.set("day", selectedDay);
        }
        const query = params.toString();
        const suffix = query ? `?${query}` : "";

        const dashboardResponse = await fetchJson<DashboardResponse>(`/api/dashboard${suffix}`);

        if (requestId !== dashboardRequestIdRef.current) {
          return;
        }

        setMeta((currentMeta) => {
          if (
            currentMeta &&
            currentMeta.config.baselineStart === dashboardResponse.meta.config.baselineStart &&
            currentMeta.config.baselineEnd === dashboardResponse.meta.config.baselineEnd &&
            currentMeta.config.campaignStart === dashboardResponse.meta.config.campaignStart
          ) {
            return currentMeta;
          }

          return dashboardResponse.meta;
        });
        setBaselineStart(dashboardResponse.meta.config.baselineStart);
        setBaselineEnd(dashboardResponse.meta.config.baselineEnd);
        setSummary(dashboardResponse.summary);
        setTrend(dashboardResponse.trend);
        setHasLoadedSummary(true);
      } catch (requestError) {
        if (requestId !== dashboardRequestIdRef.current) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      } finally {
        if (requestId === dashboardRequestIdRef.current) {
          setDashboardLoading(false);
        }
      }
    }

    void loadFilteredDashboard();
  }, [
    hasLoadedSummary,
    meta,
    baselineStart,
    baselineEnd,
    selectedDay,
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes
  ]);

  useEffect(() => {
    async function loadProjects() {
      if (!hasLoadedSummary || !meta) {
        return;
      }

      const requestId = ++projectRequestIdRef.current;

      try {
        setProjectLoading(true);
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
              return fetchJson<ProjectResponse>(`/api/projects?${params.toString()}`);
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

        if (requestId !== projectRequestIdRef.current) {
          return;
        }

        setProjectRows(projectResponse.rows);
        setProjectTotal(projectResponse.total);
        setHasLoadedProjects(true);

        const stillExists = projectResponse.rows.some((row) => row.siteNo === selectedSite);
        if (!stillExists) {
          setSelectedSite(projectResponse.rows[0]?.siteNo ?? "");
        }
      } catch (requestError) {
        if (requestId !== projectRequestIdRef.current) {
          return;
        }

        setProjectError(requestError instanceof Error ? requestError.message : "Unknown error");
      } finally {
        if (requestId === projectRequestIdRef.current) {
          setProjectLoading(false);
        }
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
    baselineStart,
    baselineEnd,
    selectedDivisions,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes,
    selectedSegments
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedBuckets,
    selectedDay,
    baselineStart,
    baselineEnd,
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes
  ]);

  useEffect(() => {
    async function loadSelectedTrend() {
      if (!selectedSite) {
        selectedTrendRequestIdRef.current += 1;
        setSelectedTrend([]);
        return;
      }

      const requestId = ++selectedTrendRequestIdRef.current;

      try {
        const query = buildFilterQuery().toString();
        const projectTrend = await fetchJson<ProjectTrendPoint[]>(
          `/api/projects/${encodeURIComponent(selectedSite)}/trend${query ? `?${query}` : ""}`
        );

        if (requestId !== selectedTrendRequestIdRef.current) {
          return;
        }

        setSelectedTrend(projectTrend);
      } catch (requestError) {
        if (requestId !== selectedTrendRequestIdRef.current) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      }
    }

    void loadSelectedTrend();
  }, [
    selectedSite,
    baselineStart,
    baselineEnd,
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes
  ]);

  const selectedTrendChartData = useMemo(
    () => buildSelectedTrendChartData({ meta, selectedSite, selectedTrend }),
    [meta, selectedSite, selectedTrend]
  );
  const postCampaignTrendData = useMemo(
    () => getPostCampaignTrendData(meta, trend),
    [meta, trend]
  );
  const groupedPostCampaignTrendData = useMemo(
    () =>
      getTrendPointsByGranularity({
        trend: postCampaignTrendData,
        granularity: trendGranularity
      }),
    [postCampaignTrendData, trendGranularity]
  );
  const proportionTrendData = useMemo(
    () => buildProportionTrendData(groupedPostCampaignTrendData),
    [groupedPostCampaignTrendData]
  );
  const activeTrendBucketSeries = useMemo(
    () => getActiveTrendBucketSeries(priceLadderMode),
    [priceLadderMode]
  );
  const filteredAverageTrend = useMemo(
    () =>
      getTrendPointsByGranularity({
        trend: getFilteredAverageTrend({ meta, trend, trendRange }),
        granularity: trendGranularity
      }),
    [meta, trend, trendRange, trendGranularity]
  );
  const availableDays = useMemo(
    () => postCampaignTrendData.map((point) => point.day),
    [postCampaignTrendData]
  );

  const availableDivisions = meta?.filters?.divisions ?? [];
  const availableSegments = meta?.filters?.segments ?? [];
  const availableChannels = meta?.filters?.channels ?? [];
  const fcNamesByDivision = meta?.filters?.fcNamesByDivision ?? {};
  const availableDiscountTypes = meta?.filters?.discountTypes ?? [];

  const totalPages = Math.max(1, Math.ceil(projectTotal / PAGE_SIZE));
  const firstProjectIndex = projectTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastProjectIndex = Math.min(currentPage * PAGE_SIZE, projectTotal);
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const activeTableFilters = buildActiveTableFilters({
    selectedBuckets,
    selectedDayLabel: selectedDay ? formatThaiDateShort(selectedDay) : "",
    selectedDivisions,
    selectedSegments,
    selectedChannels,
    selectedFcNames,
    selectedDiscountTypes,
    search
  });

  if (!error && (metaLoading || !hasLoadedSummary)) {
    return (
      <PriceTrackingShell themeMode={themeMode} onToggleTheme={onToggleTheme}>
        <div className="shell">
          <div className="loadingScreen">
            <strong>กำลังโหลด dashboard...</strong>
            <span>
              {showDashboardSlowNotice
                ? "ข้อมูลชุดนี้ใช้เวลานานกว่าปกติ ระบบยังโหลดต่ออยู่"
                : "กำลังเตรียมข้อมูลล่าสุด"}
            </span>
          </div>
        </div>
      </PriceTrackingShell>
    );
  }

  if (error || !meta || !summary) {
    return (
      <PriceTrackingShell themeMode={themeMode} onToggleTheme={onToggleTheme}>
        <div className="shell">Cannot load dashboard: {error || "missing data"}</div>
      </PriceTrackingShell>
    );
  }

  const latestTrendDay = postCampaignTrendData.at(-1)?.day ?? meta.metadata.max_dp_date;
  const targetHitSites = summary.comparableSites - summary.belowTargetSites;
  const targetHitShare = Number.isFinite(summary.targetHitShare)
    ? summary.targetHitShare
    : summary.comparableSites > 0
      ? (targetHitSites / summary.comparableSites) * 100
      : 0;
  const summaryDateRange = formatSummaryDateRange(summary, latestTrendDay);
  const calcHelpContent = buildCalcHelpContent({
    summary,
    summaryDateRange,
    targetHitSites
  });
  const activeCalcContent = activeCalcHelp ? calcHelpContent[activeCalcHelp] : null;
  const sharedFilterMenu = (
    <SharedFilterMenuBar
      className="topbarSharedFilter"
      selectedBaselineStart={baselineStart}
      selectedBaselineEnd={baselineEnd}
      availableDivisions={availableDivisions}
      availableSegments={availableSegments}
      availableChannels={availableChannels}
      availableDiscountTypes={availableDiscountTypes}
      fcNamesByDivision={fcNamesByDivision}
      selectedDivisions={selectedDivisions}
      selectedSegments={selectedSegments}
      selectedChannels={selectedChannels}
      selectedFcNames={selectedFcNames}
      selectedDiscountTypes={selectedDiscountTypes}
      onOpenBaselineHelp={() => setActiveCalcHelp("baselineDefinition")}
      onBaselineStartChange={setBaselineStart}
      onBaselineEndChange={setBaselineEnd}
      onResetSharedFilters={clearSharedFilters}
      onToggleDivision={toggleDivision}
      onClearDivisions={clearDivisions}
      onToggleFcName={(value) => toggleValue(value, setSelectedFcNames)}
      onClearFcNames={() => setSelectedFcNames([])}
      onToggleSegment={(value) => toggleValue(value, setSelectedSegments)}
      onClearSegments={() => setSelectedSegments([])}
      onToggleChannel={(value) => toggleValue(value, setSelectedChannels)}
      onClearChannels={() => setSelectedChannels([])}
      onToggleDiscountType={(value) => toggleValue(value, setSelectedDiscountTypes)}
      onClearDiscountTypes={() => setSelectedDiscountTypes([])}
    />
  );

  return (
    <PriceTrackingShell
      themeMode={themeMode}
      onToggleTheme={onToggleTheme}
      filterMenu={sharedFilterMenu}
    >
      <div className="shell" onClick={() => setActiveHint(null)}>
        <section id="overview" className="sectionAnchor">
          <OverviewSection
            baselineStart={meta.config.baselineStart}
            baselineEnd={meta.config.baselineEnd}
            campaignStart={meta.config.campaignStart}
            avgIncreaseLabel={formatNumber(summary.avgIncrease)}
            targetHitShareLabel={`${formatNumber(targetHitShare)}%`}
            summaryDateRange={summaryDateRange}
            dashboardLoading={dashboardLoading}
            showDashboardSlowNotice={showDashboardSlowNotice}
            onOpenCalcHelp={setActiveCalcHelp}
          />
        </section>

        <section id="trends" className="sectionAnchor">
          <TrendChartsSection
            priceLadderMode={priceLadderMode}
            trendGranularity={trendGranularity}
            trendRange={trendRange}
            activeTrendBucketSeries={activeTrendBucketSeries}
            proportionTrendData={proportionTrendData}
            discountDropSeries={discountDropSeries}
            filteredAverageTrend={filteredAverageTrend}
            onSetPriceLadderMode={setPriceLadderMode}
            onSetTrendGranularity={setTrendGranularity}
            onSetTrendRange={setTrendRange}
            onOpenCalcHelp={setActiveCalcHelp}
          />
        </section>

        <section id="project-trend" className="sectionAnchor">
          <ProjectTrendSection
            meta={meta}
            selectedSite={selectedSite}
            selectedTrend={selectedTrend}
            selectedTrendChartData={selectedTrendChartData}
            onOpenCalcHelp={setActiveCalcHelp}
          />
        </section>

        <section id="projects" className="sectionAnchor">
          <ProjectsTableSection
            search={search}
            selectedDay={selectedDay}
            selectedBuckets={selectedBuckets}
            availableDays={availableDays}
            activeTableFilters={activeTableFilters}
            projectRows={projectRows}
            projectTotal={projectTotal}
            currentPage={currentPage}
            totalPages={totalPages}
            firstProjectIndex={firstProjectIndex}
            lastProjectIndex={lastProjectIndex}
            paginationItems={paginationItems}
            selectedSite={selectedSite}
            activeHint={activeHint}
            projectError={projectError}
            projectLoading={projectLoading}
            hasLoadedProjects={hasLoadedProjects}
            showProjectSlowNotice={showProjectSlowNotice}
            onOpenCalcHelp={setActiveCalcHelp}
            onSearchChange={setSearch}
            onSelectDay={setSelectedDay}
            onToggleBucket={(value) =>
              setSelectedBuckets((current) =>
                current.includes(value)
                  ? current.filter((key) => key !== value)
                  : [...current, value]
              )
            }
            onClearBuckets={() => setSelectedBuckets([])}
            onResetTableFilters={resetTableFilters}
            onSelectSite={setSelectedSite}
            onToggleHint={(key) => setActiveHint((current) => (current === key ? null : key))}
            onSetCurrentPage={setCurrentPage}
          />
        </section>

        <CalcHelpModal content={activeCalcContent} onClose={() => setActiveCalcHelp(null)} />
      </div>
    </PriceTrackingShell>
  );
}
