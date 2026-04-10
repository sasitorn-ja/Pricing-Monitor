# Pricing Monitor Dashboard

Dashboard สำหรับวิเคราะห์ว่าโครงการไหนยังขึ้นราคาไม่ถึงเป้า `300 บาท` โดยใช้ `NP_AVG` เป็น `net price` และเปลี่ยน data layer จาก CSV ตรง ๆ ไปเป็น SQLite เพื่อให้โหลดเร็วขึ้น

## Logic ที่ใช้

- Baseline: ใช้ข้อมูลวันที่ `2026-03-01` ถึง `2026-03-24`
- Campaign tracking: ใช้ข้อมูลตั้งแต่ `2026-03-25` เป็นต้นไป
- Metric หลัก: `increaseAmount = current net price - baseline net price`
- เปอร์เซ็นต์ความสำเร็จ: `(increaseAmount / 300) * 100`
- Step ladder:
  - `300+`
  - `200-299`
  - `100-199`
  - `0-99` รวมทั้งกรณีที่ยังต่ำกว่า baseline

ค่า baseline และ post-campaign net price ถูกคำนวณแบบ weighted average โดยใช้ `SUMQ` เป็นน้ำหนัก

## Run

1. ติดตั้งแพ็กเกจ
   `npm install`
2. โหลด `data.csv` เข้า SQLite
   `npm run import-data`
3. รัน dashboard
   `npm run dev`

Frontend จะอยู่ที่ `http://localhost:5173`
Backend API จะอยู่ที่ `http://localhost:8787`

หมายเหตุสำหรับ Vercel:
- `npm run build` จะสร้าง SQLite จาก `data.csv` ให้อัตโนมัติ
- API จะถูกรันผ่าน Vercel Serverless Functions ที่ path `/api/*`
