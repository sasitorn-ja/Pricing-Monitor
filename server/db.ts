import Database from "better-sqlite3";
import path from "node:path";
 
const dbPath = path.resolve(process.cwd(), "storage/pricing-monitor.db");

export const db = new Database(dbPath, {
  readonly: false,
  fileMustExist: true
});

db.pragma("journal_mode = WAL");
