import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const csvPath = path.resolve(rootDir, "data.csv");
const storageDir = path.resolve(rootDir, "storage");
const dbPath = path.resolve(storageDir, "pricing-monitor.db");

if (!fs.existsSync(csvPath)) {
  throw new Error(`Cannot find CSV file at ${csvPath}`);
}

fs.mkdirSync(storageDir, { recursive: true });

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  DROP TABLE IF EXISTS pricing_records;
  CREATE TABLE pricing_records (
    DIVISION_NAME TEXT,
    FC_NAME TEXT,
    SECT_NAME TEXT,
    SITE_NO TEXT,
    SITE_NAME TEXT,
    SEGMENT TEXT,
    CREATE_DATE TEXT,
    DISCOUNT_DATE TEXT,
    FUTURE_DISCOUNT_DATE TEXT,
    DP_DATE TEXT,
    DISCOUNT_TYPE TEXT,
    COUNTSITE REAL,
    SUMQ REAL,
    NP_AVG REAL,
    NETCON REAL,
    DC_AVG REAL,
    LP_AVG REAL,
    CHANNEL TEXT,
    CUSTOMER_NO TEXT,
    CUSTOMER_NAME TEXT,
    CUSTOMER_MEMBER_TYPE TEXT,
    SUBCUSTOMER_NO TEXT,
    SUBCUSTOMER_NAME TEXT,
    SUBCUSTOMER_MEMBER_TYPE TEXT
  );
  CREATE INDEX idx_pricing_site_date ON pricing_records (SITE_NO, DP_DATE);
  CREATE INDEX idx_pricing_date ON pricing_records (DP_DATE);
  CREATE INDEX idx_pricing_site_name ON pricing_records (SITE_NAME);
`);

const columns = [
  "DIVISION_NAME",
  "FC_NAME",
  "SECT_NAME",
  "SITE_NO",
  "SITE_NAME",
  "SEGMENT",
  "CREATE_DATE",
  "DISCOUNT_DATE",
  "FUTURE_DISCOUNT_DATE",
  "DP_DATE",
  "DISCOUNT_TYPE",
  "COUNTSITE",
  "SUMQ",
  "NP_AVG",
  "NETCON",
  "DC_AVG",
  "LP_AVG",
  "CHANNEL",
  "CUSTOMER_NO",
  "CUSTOMER_NAME",
  "CUSTOMER_MEMBER_TYPE",
  "SUBCUSTOMER_NO",
  "SUBCUSTOMER_NAME",
  "SUBCUSTOMER_MEMBER_TYPE"
] as const;

const numericColumns = new Set([
  "COUNTSITE",
  "SUMQ",
  "NP_AVG",
  "NETCON",
  "DC_AVG",
  "LP_AVG"
]);

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let index = 0;
  let inQuotes = false;

  while (index < line.length) {
    const character = line[index];

    if (inQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      current += character;
      index += 1;
      continue;
    }

    if (character === ",") {
      values.push(current);
      current = "";
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    current += character;
    index += 1;
  }

  values.push(current);
  return values;
}

function normalizeCell(column: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (numericColumns.has(column)) {
    const numberValue = Number(trimmed);
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  return trimmed;
}

const insert = db.prepare(
  `INSERT INTO pricing_records (${columns.join(", ")}) VALUES (${columns
    .map(() => "?")
    .join(", ")})`
);

const rows = fs
  .readFileSync(csvPath, "utf8")
  .replace(/^\ufeff/, "")
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0)
  .slice(1);

const importRows = db.transaction((inputRows: string[]) => {
  inputRows.forEach((line, lineIndex) => {
    const values = parseCsvLine(line);

    if (values.length !== columns.length) {
      throw new Error(
        `Unexpected column count at CSV line ${lineIndex + 2}: expected ${
          columns.length
        }, got ${values.length}`
      );
    }

    const normalized = values.map((value, valueIndex) =>
      normalizeCell(columns[valueIndex], value)
    );

    insert.run(normalized);
  });
});

importRows(rows);

console.log(`SQLite database created at ${dbPath}`);
