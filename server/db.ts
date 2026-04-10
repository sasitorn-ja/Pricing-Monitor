import Database from "better-sqlite3";
import fs from "node:fs";
import {
  createDatabaseFromCsv,
  getCsvPath,
  getDefaultDbPath
} from "./database-utils.js";

const dbPath = getDefaultDbPath();

if (!fs.existsSync(dbPath)) {
  createDatabaseFromCsv(Database, getCsvPath(), dbPath);
}

export const db = new Database(dbPath, {
  readonly: false,
  fileMustExist: true
});

db.pragma("journal_mode = WAL");
