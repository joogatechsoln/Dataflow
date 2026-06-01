/**
 * duckdb.ts — DataFlow Suite Web
 * DuckDB-WASM engine — replaces the native DuckDB sidecar from the Tauri version.
 * Runs fully in the browser using WebAssembly + SharedArrayBuffer.
 *
 * Usage:
 *   const result = await runQuery("SELECT * FROM data LIMIT 100");
 *   await registerCSV("data", csvString);
 *   await registerParquet("sales", arrayBuffer);
 */

import * as duckdb from "@duckdb/duckdb-wasm";
import { getCachedQuery, setCachedQuery } from "./db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  error?: string;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _db: duckdb.AsyncDuckDB | null = null;
let _conn: duckdb.AsyncDuckDBConnection | null = null;
let _initPromise: Promise<void> | null = null;

/**
 * Initialise DuckDB-WASM. Safe to call multiple times — only runs once.
 * Uses the jsdelivr CDN bundles for WASM files.
 */
export async function initDuckDB(): Promise<void> {
  if (_db) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

    // Pick the best bundle for this browser (mvp = widest support, eh = faster)
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const workerUrl = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {
        type: "text/javascript",
      })
    );

    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(workerUrl);

    _db = db;
    _conn = await db.connect();

    // Set sensible defaults
    await _conn.query("SET threads=2");
    await _conn.query("SET memory_limit='256MB'");

    console.log("[DuckDB-WASM] Initialised successfully");
  })();

  return _initPromise;
}

async function getConn(): Promise<duckdb.AsyncDuckDBConnection> {
  await initDuckDB();
  if (!_conn) throw new Error("DuckDB connection not initialised");
  return _conn;
}

// ── CSV registration ──────────────────────────────────────────────────────────

/**
 * Register a CSV string as a DuckDB table.
 * The file is written to DuckDB's virtual filesystem then read.
 */
export async function registerCSV(
  tableName: string,
  csvContent: string
): Promise<void> {
  const db = _db;
  if (!db) { await initDuckDB(); }

  const fileName = `${tableName}.csv`;
  await _db!.registerFileText(fileName, csvContent);

  const conn = await getConn();
  // Drop if exists, then create from CSV
  await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
  await conn.query(
    `CREATE TABLE "${tableName}" AS SELECT * FROM read_csv_auto('${fileName}', header=true, sample_size=1000)`
  );
}

/**
 * Register an ArrayBuffer (Excel/Parquet) as a DuckDB table.
 */
export async function registerBuffer(
  tableName: string,
  buffer: ArrayBuffer,
  format: "parquet" | "json" = "parquet"
): Promise<void> {
  await initDuckDB();
  const fileName = `${tableName}.${format}`;
  await _db!.registerFileBuffer(fileName, new Uint8Array(buffer));

  const conn = await getConn();
  await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
  if (format === "parquet") {
    await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_parquet('${fileName}')`);
  } else {
    await conn.query(`CREATE TABLE "${tableName}" AS SELECT * FROM read_json_auto('${fileName}')`);
  }
}

// ── Query execution ───────────────────────────────────────────────────────────

/**
 * Run a SQL query and return structured results.
 * Results are cached in IndexedDB for 10 minutes by default.
 */
export async function runQuery(
  sql: string,
  { useCache = true }: { useCache?: boolean } = {}
): Promise<QueryResult> {
  const start = performance.now();

  // Check cache
  if (useCache) {
    const cacheKey = btoa(sql).slice(0, 64);
    const cached = await getCachedQuery(cacheKey);
    if (cached) {
      return cached as QueryResult;
    }
  }

  try {
    const conn = await getConn();
    const arrowResult = await conn.query(sql);

    const columns = arrowResult.schema.fields.map((f) => f.name);
    const rows: Record<string, unknown>[] = [];

    for (const batch of arrowResult.batches) {
      for (let i = 0; i < batch.numRows; i++) {
        const row: Record<string, unknown> = {};
        columns.forEach((col, ci) => {
          row[col] = batch.getChildAt(ci)?.get(i) ?? null;
        });
        rows.push(row);
      }
    }

    const result: QueryResult = {
      columns,
      rows,
      rowCount: rows.length,
      durationMs: Math.round(performance.now() - start),
    };

    // Cache the result
    if (useCache) {
      const cacheKey = btoa(sql).slice(0, 64);
      await setCachedQuery(cacheKey, sql, result).catch(() => {});
    }

    return result;
  } catch (err) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * List all registered tables in DuckDB.
 */
export async function listTables(): Promise<string[]> {
  const result = await runQuery("SHOW TABLES", { useCache: false });
  return result.rows.map((r) => String(Object.values(r)[0]));
}

/**
 * Describe a table's columns and types.
 */
export async function describeTable(tableName: string): Promise<{ column: string; type: string }[]> {
  const result = await runQuery(`DESCRIBE "${tableName}"`, { useCache: false });
  return result.rows.map((r) => ({
    column: String(r["column_name"] ?? r["Field"] ?? ""),
    type:   String(r["column_type"] ?? r["Type"]  ?? ""),
  }));
}

/**
 * Get row count for a table.
 */
export async function getRowCount(tableName: string): Promise<number> {
  const result = await runQuery(`SELECT COUNT(*) AS n FROM "${tableName}"`, { useCache: false });
  return Number(result.rows[0]?.n ?? 0);
}

/**
 * Preview first N rows of a table.
 */
export async function previewTable(
  tableName: string,
  limit = 100
): Promise<QueryResult> {
  return runQuery(`SELECT * FROM "${tableName}" LIMIT ${limit}`);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export async function closeDuckDB(): Promise<void> {
  if (_conn) { await _conn.close(); _conn = null; }
  if (_db)   { await _db.terminate(); _db = null; }
  _initPromise = null;
}

// ── DuckDB status ─────────────────────────────────────────────────────────────

export function isDuckDBReady(): boolean {
  return _db !== null && _conn !== null;
}
