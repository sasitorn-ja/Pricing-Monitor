type OverviewSectionProps = {
  baselineStart: string;
  baselineEnd: string;
  campaignStart: string;
  avgIncreaseLabel: string;
  targetHitShareLabel: string;
  summaryDateRange: string;
  dashboardLoading: boolean;
  showDashboardSlowNotice: boolean;
  onOpenCalcHelp: (key: "baselineDefinition" | "totalIncrease" | "averageToTarget") => void;
};

export function OverviewSection({
  baselineStart,
  baselineEnd,
  campaignStart,
  avgIncreaseLabel,
  targetHitShareLabel,
  summaryDateRange,
  dashboardLoading,
  showDashboardSlowNotice,
  onOpenCalcHelp
}: OverviewSectionProps) {
  return (
    <>
      <header className="hero heroSingle">
        <div>
          <div className="heroTitleRow">
            <h1>Dashboard ติดตามการขึ้นราคา</h1>
            <p className="heroTitleNote">
              NP_AVG = net price | Baseline {baselineStart} ถึง {baselineEnd} | ติดตามตั้งแต่ {campaignStart}
            </p>
          </div>
        </div>
      </header>

      <section className="gridStats">
        <article className="statCard">
          <button
            type="button"
            className="calcHelpButton"
            onClick={() => onOpenCalcHelp("totalIncrease")}
          >
            วิธีคำนวณ
          </button>
          <span>Avg increase</span>
          <strong>{avgIncreaseLabel} บาท B/CU</strong>
          <p>คำนวณจากข้อมูล {summaryDateRange}</p>
        </article>
        <article className="statCard">
          <button
            type="button"
            className="calcHelpButton"
            onClick={() => onOpenCalcHelp("averageToTarget")}
          >
            วิธีคำนวณ
          </button>
          <span>Average to target</span>
          <strong>{targetHitShareLabel}</strong>
          <p>สัดส่วนโครงการที่ขึ้นถึง 300 บาท B/CU ขึ้นไป {summaryDateRange}</p>
        </article>
      </section>

      {dashboardLoading ? (
        <div className="slowDataNotice">
          {showDashboardSlowNotice
            ? "ข้อมูลกำลังคำนวณนานกว่าปกติ แสดงข้อมูลเดิมไว้ก่อนจนกว่าจะโหลดเสร็จ"
            : "กำลังอัปเดตข้อมูลตาม filter..."}
        </div>
      ) : null}
    </>
  );
}
