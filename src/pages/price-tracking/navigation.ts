export type PriceTrackingMenuItem = {
  label: string;
  href: string;
  description: string;
};

export const priceTrackingMenuItems: PriceTrackingMenuItem[] = [
  {
    label: "ภาพรวม",
    href: "#overview",
    description: "Baseline และ KPI หลัก"
  },
  {
    label: "กราฟแนวโน้ม",
    href: "#trends",
    description: "ค่าเฉลี่ยและสัดส่วนรายวัน"
  },
  {
    label: "แนวโน้มรายโครงการ",
    href: "#project-trend",
    description: "ดูเส้นราคาของ site ที่เลือก"
  },
  {
    label: "Project table",
    href: "#projects",
    description: "ตารางรายการโครงการและตัวกรอง"
  }
];
