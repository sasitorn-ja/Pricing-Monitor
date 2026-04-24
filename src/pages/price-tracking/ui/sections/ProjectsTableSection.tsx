import { SingleSelectDropdown } from "../filters/SingleSelectDropdown";
import { HeaderWithHint } from "../table/HeaderWithHint";
import { bucketLabels, tableColumnHelp, type TableColumnHelpKey } from "../../constants";
import type { CalcHelpKey, ProjectRow } from "../../types";
import {
  formatDiscountDropPoints,
  formatNumber,
  formatPercent,
  formatThaiDate
} from "../../utils/format";

type ProjectsTableSectionProps = {
  search: string;
  selectedDay: string;
  selectedBuckets: string[];
  availableDays: string[];
  activeTableFilters: Array<{ label: string; value: string }>;
  projectRows: ProjectRow[];
  projectTotal: number;
  currentPage: number;
  totalPages: number;
  firstProjectIndex: number;
  lastProjectIndex: number;
  paginationItems: Array<number | "ellipsis">;
  selectedSite: string;
  activeHint: TableColumnHelpKey | null;
  projectError: string;
  projectLoading: boolean;
  hasLoadedProjects: boolean;
  showProjectSlowNotice: boolean;
  onOpenCalcHelp: (key: CalcHelpKey) => void;
  onSearchChange: (value: string) => void;
  onSelectDay: (value: string) => void;
  onToggleBucket: (value: string) => void;
  onClearBuckets: () => void;
  onResetTableFilters: () => void;
  onSelectSite: (siteNo: string) => void;
  onToggleHint: (key: TableColumnHelpKey) => void;
  onSetCurrentPage: (page: number) => void;
};

export function ProjectsTableSection({
  search,
  selectedDay,
  selectedBuckets,
  availableDays,
  activeTableFilters,
  projectRows,
  projectTotal,
  currentPage,
  totalPages,
  firstProjectIndex,
  lastProjectIndex,
  paginationItems,
  selectedSite,
  activeHint,
  projectError,
  projectLoading,
  hasLoadedProjects,
  showProjectSlowNotice,
  onOpenCalcHelp,
  onSearchChange,
  onSelectDay,
  onToggleBucket,
  onClearBuckets,
  onResetTableFilters,
  onSelectSite,
  onToggleHint,
  onSetCurrentPage
}: ProjectsTableSectionProps) {
  return (
    <section className="panel sectionPanel">
      <div className="panelHeader controls">
        <div>
          <h2>Project table</h2>
          <p>คลิกแถวเพื่อดูกราฟรายโครงการ และกรองข้อมูลด้วยวันร่วมกับ ladder ได้</p>
        </div>
        <div className="tableHeaderActions">
          <button
            type="button"
            className="calcHelpButton compact"
            onClick={() => onOpenCalcHelp("projectTable")}
          >
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
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ค้นหา SITE_NAME, SITE_NO, division, segment"
            />
          </div>

          <div className="tableFilterInputs tableFilterControls">
            <SingleSelectDropdown
              label="วันที่"
              options={availableDays.map((day) => ({
                value: day,
                label: formatThaiDate(day)
              }))}
              selectedValue={selectedDay}
              fallbackLabel="ทุกวัน"
              onSelect={onSelectDay}
            />
            <div className="tableFilterLadder">
              <span className="tableFilterLadderLabel">LADDER</span>
              <div className="bucketFilterGroup tableBucketRow">
                <button
                  type="button"
                  className={`bucketFilter ${selectedBuckets.length === 0 ? "selected" : ""}`}
                  onClick={onClearBuckets}
                >
                  ทั้งหมด
                </button>
                {bucketLabels.map((bucket) => (
                  <button
                    key={bucket.key}
                    type="button"
                    className={`bucketFilter ${selectedBuckets.includes(bucket.key) ? "selected" : ""}`}
                    onClick={() => onToggleBucket(bucket.key)}
                  >
                    {bucket.key}
                  </button>
                ))}
              </div>
            </div>
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
            <div className="tableActiveFiltersHint">ยังไม่ได้เลือก filter ตาราง</div>
          )}
          <button type="button" className="clearFilterButton" onClick={onResetTableFilters}>
            รีเซ็ต filter ตาราง
          </button>
        </div>
      </div>

      <div className="tableWrap">
        {projectError ? (
          <div className="tableLoadingState">โหลดรายการโครงการไม่สำเร็จ: {projectError}</div>
        ) : hasLoadedProjects ? (
          <>
            {projectLoading ? (
              <div className="tableRefreshNotice">
                {showProjectSlowNotice
                  ? "รายการโครงการใช้เวลานานกว่าปกติ กำลังโหลดต่อ..."
                  : "กำลังอัปเดตรายการโครงการ..."}
              </div>
            ) : null}
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
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="segment"
                      label="Segment"
                      hint={tableColumnHelp.segment}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="ladder"
                      label="Ladder"
                      hint={tableColumnHelp.ladder}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="baseline"
                      label="Baseline"
                      hint={tableColumnHelp.baseline}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="current"
                      label="Current"
                      hint={selectedDay ? "net price ของโครงการในวันที่เลือก" : tableColumnHelp.current}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="increase"
                      label="Increase vs Baseline"
                      hint={tableColumnHelp.increase}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="baselineDisc"
                      label="Disc Baseline (%)"
                      hint={tableColumnHelp.baselineDisc}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="currentDisc"
                      label="Disc Current (%)"
                      hint={tableColumnHelp.currentDisc}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="discount"
                      label="Discount Drop (%)"
                      hint={tableColumnHelp.discount}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                  <th>
                    <HeaderWithHint
                      hintKey="latestDay"
                      label={selectedDay ? "Selected day" : "Day"}
                      hint={selectedDay ? "วันที่ที่ใช้กรองในตารางนี้" : tableColumnHelp.latestDay}
                      activeHint={activeHint}
                      onToggle={onToggleHint}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectRows.map((row) => (
                  <tr
                    key={row.siteNo}
                    onClick={() => onSelectSite(row.siteNo)}
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
                    <td>{formatPercent(row.baselineDisc)}</td>
                    <td>{formatPercent(row.currentDisc)}</td>
                    <td>{formatDiscountDropPoints(row.baselineDisc, row.currentDisc)}</td>
                    <td>{row.latestDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="tableLoadingState">
            {showProjectSlowNotice
              ? "กำลังโหลดรายการโครงการ ข้อมูลชุดนี้อาจใช้เวลานาน"
              : "กำลังโหลดรายการโครงการ..."}
          </div>
        )}
      </div>

      <div className="paginationBar">
        <button
          type="button"
          className="pagerButton"
          onClick={() => onSetCurrentPage(Math.max(1, currentPage - 1))}
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
                onClick={() => onSetCurrentPage(item)}
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
          onClick={() => onSetCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next ›
        </button>
      </div>
    </section>
  );
}
