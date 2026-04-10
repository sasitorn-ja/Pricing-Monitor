import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDatabaseFromCsv,
  getCsvPath
} from "../server/database-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dbPath = path.resolve(rootDir, "storage/pricing-monitor.db");

const outputPath = createDatabaseFromCsv(Database, getCsvPath(), dbPath);

console.log(`SQLite database created at ${outputPath}`);
