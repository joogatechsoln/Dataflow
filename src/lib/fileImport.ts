/**
 * fileImport.ts — DataFlow Suite Web
 * Handles browser file uploads → DuckDB table registration.
 * Supports CSV, TSV, Excel (.xlsx/.xls), and JSON.
 *
 * Usage:
 *   const result = await importFile(file, "sales_data");
 *   // DuckDB table "sales_data" is now queryable
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { registerCSV, registerBuffer } from "./duckdb";
import { saveFile } from "./db";

export interface ImportResult {
  fileId?: string;
  tableName: string;
  fileName: string;
  rowCount: number;
  columns: string[];
  sizeBytes: number;
  durationMs: number;
  error?: string;
}

/**
 * Import a File from the browser into DuckDB.
 * Automatically handles CSV, TSV, Excel, and JSON.
 */
export async function importFile(
  file: File,
  tableName?: string,
  projectId?: string
): Promise<ImportResult> {
  const start = performance.now();
  const name = tableName ?? sanitiseTableName(file.name);
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "";

  try {
    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      return await importCSV(file, name, projectId);
    } else if (ext === "xlsx" || ext === "xls") {
      return await importExcel(file, name, projectId);
    } else if (ext === "json") {
      return await importJSON(file, name, projectId);
    } else {
      throw new Error(`Unsupported file type: .${ext}. Use CSV, Excel, or JSON.`);
    }
  } catch (err) {
    return {
      tableName: name,
      fileName: file.name,
      rowCount: 0,
      columns: [],
      sizeBytes: file.size,
      durationMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── CSV import ────────────────────────────────────────────────────────────────

async function importCSV(
  file: File,
  tableName: string,
  projectId?: string
): Promise<ImportResult> {
  const start = performance.now();
  const text  = await file.text();

  // Parse headers only to get column names quickly
  const preview = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    preview: 5,
    skipEmptyLines: true,
  });

  const columns = preview.meta.fields ?? [];

  // Register with DuckDB
  await registerCSV(tableName, text);

  // Persist raw content in IndexedDB for later use
  let fileId: string | undefined;
  if (projectId) {
    fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await saveFile({
      id:         fileId,
      projectId,
      name:       file.name,
      type:       "csv",
      sizeBytes:  file.size,
      uploadedAt: new Date().toISOString(),
      content:    text,
    });
  }

  // Get actual row count from DuckDB
  const { runQuery } = await import("./duckdb");
  const countResult = await runQuery(`SELECT COUNT(*) AS n FROM "${tableName}"`, { useCache: false });
  const rowCount = Number(countResult.rows[0]?.n ?? preview.data.length);

  return {
    fileId,
    tableName,
    fileName:    file.name,
    rowCount,
    columns,
    sizeBytes:   file.size,
    durationMs:  Math.round(performance.now() - start),
  };
}

// ── Excel import ──────────────────────────────────────────────────────────────

async function importExcel(
  file: File,
  tableName: string,
  projectId?: string
): Promise<ImportResult> {
  const start      = performance.now();
  const buffer     = await file.arrayBuffer();
  const workbook   = XLSX.read(buffer, { type: "array" });

  // Use the first sheet
  const sheetName  = workbook.SheetNames[0];
  const worksheet  = workbook.Sheets[sheetName];

  // Convert to CSV for DuckDB (most reliable path)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const jsonData   = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
  const columns    = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  await registerCSV(tableName, csvContent);

  let fileId: string | undefined;
  if (projectId) {
    fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await saveFile({
      id:         fileId,
      projectId,
      name:       file.name,
      type:       "excel",
      sizeBytes:  file.size,
      uploadedAt: new Date().toISOString(),
      content:    csvContent, // store as CSV text
    });
  }

  return {
    fileId,
    tableName,
    fileName:   file.name,
    rowCount:   jsonData.length,
    columns,
    sizeBytes:  file.size,
    durationMs: Math.round(performance.now() - start),
  };
}

// ── JSON import ───────────────────────────────────────────────────────────────

async function importJSON(
  file: File,
  tableName: string,
  projectId?: string
): Promise<ImportResult> {
  const start   = performance.now();
  const text    = await file.text();
  const parsed  = JSON.parse(text);
  const arr     = Array.isArray(parsed) ? parsed : [parsed];
  const columns = arr.length > 0 ? Object.keys(arr[0]) : [];

  // Convert to CSV for DuckDB
  const csvContent = [
    columns.join(","),
    ...arr.map((row: Record<string, unknown>) =>
      columns.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(",")
    ),
  ].join("\n");

  await registerCSV(tableName, csvContent);

  let fileId: string | undefined;
  if (projectId) {
    fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await saveFile({
      id:         fileId,
      projectId,
      name:       file.name,
      type:       "json",
      sizeBytes:  file.size,
      uploadedAt: new Date().toISOString(),
      content:    csvContent,
    });
  }

  return {
    fileId,
    tableName,
    fileName:   file.name,
    rowCount:   arr.length,
    columns,
    sizeBytes:  file.size,
    durationMs: Math.round(performance.now() - start),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function sanitiseTableName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")          // remove extension
    .replace(/[^a-zA-Z0-9_]/g, "_")   // replace non-alphanumeric with _
    .replace(/^[0-9]/, "t_$&")        // can't start with a digit
    .toLowerCase()
    .slice(0, 64);                     // DuckDB identifier limit
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
