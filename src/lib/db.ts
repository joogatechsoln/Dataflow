/**
 * db.ts — DataFlow Suite Web
 * Browser-side persistence using IndexedDB (via the `idb` library).
 * Replaces the SQLite/Tauri backend from the desktop version.
 *
 * Stores:
 *   projects   — full project state blobs
 *   files      — uploaded file metadata + raw text (CSV/JSON)
 *   queryCache — DuckDB query result cache
 *   settings   — app-level key/value settings
 *
 * All Zustand stores use `persist` with localStorage for small state,
 * and call this module for large blobs (files, query results).
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";

// ── Schema ────────────────────────────────────────────────────────────────────

interface DataFlowDB extends DBSchema {
  projects: {
    key: string; // project id
    value: {
      id: string;
      name: string;
      updatedAt: string;
      data: unknown; // full project state snapshot
    };
    indexes: { "by-updated": string };
  };
  files: {
    key: string; // file id
    value: {
      id: string;
      projectId: string;
      name: string;
      type: "csv" | "excel" | "json";
      sizeBytes: number;
      uploadedAt: string;
      content: string; // raw text content (CSV/JSON) or base64 for Excel
    };
    indexes: { "by-project": string };
  };
  queryCache: {
    key: string; // hash of SQL query + file id
    value: {
      key: string;
      sql: string;
      result: unknown;
      cachedAt: string;
    };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
}

// ── DB singleton ──────────────────────────────────────────────────────────────

let _db: IDBPDatabase<DataFlowDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<DataFlowDB>> {
  if (_db) return _db;

  _db = await openDB<DataFlowDB>("dataflow-suite", 1, {
    upgrade(db) {
      // projects store
      const projectStore = db.createObjectStore("projects", { keyPath: "id" });
      projectStore.createIndex("by-updated", "updatedAt");

      // files store
      const fileStore = db.createObjectStore("files", { keyPath: "id" });
      fileStore.createIndex("by-project", "projectId");

      // query cache
      db.createObjectStore("queryCache", { keyPath: "key" });

      // settings
      db.createObjectStore("settings", { keyPath: "key" });
    },
  });

  return _db;
}

// ── Project helpers ───────────────────────────────────────────────────────────

export async function saveProject(project: {
  id: string;
  name: string;
  updatedAt: string;
  data: unknown;
}): Promise<void> {
  const db = await getDB();
  await db.put("projects", project);
}

export async function loadProject(id: string) {
  const db = await getDB();
  return db.get("projects", id);
}

export async function loadAllProjects() {
  const db = await getDB();
  return db.getAllFromIndex("projects", "by-updated");
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("projects", id);
  // Also delete associated files
  const files = await db.getAllFromIndex("files", "by-project", id);
  await Promise.all(files.map((f) => db.delete("files", f.id)));
}

// ── File helpers ──────────────────────────────────────────────────────────────

export interface StoredFile {
  id: string;
  projectId: string;
  name: string;
  type: "csv" | "excel" | "json";
  sizeBytes: number;
  uploadedAt: string;
  content: string;
}

export async function saveFile(file: StoredFile): Promise<void> {
  const db = await getDB();
  await db.put("files", file);
}

export async function getFilesForProject(projectId: string): Promise<StoredFile[]> {
  const db = await getDB();
  return db.getAllFromIndex("files", "by-project", projectId) as Promise<StoredFile[]>;
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  const db = await getDB();
  return db.get("files", id) as Promise<StoredFile | undefined>;
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("files", id);
}

// ── Query cache helpers ───────────────────────────────────────────────────────

export async function getCachedQuery(cacheKey: string) {
  const db = await getDB();
  const entry = await db.get("queryCache", cacheKey);
  if (!entry) return null;
  // Expire after 10 minutes
  const age = Date.now() - new Date(entry.cachedAt).getTime();
  if (age > 10 * 60 * 1000) {
    await db.delete("queryCache", cacheKey);
    return null;
  }
  return entry.result;
}

export async function setCachedQuery(
  cacheKey: string,
  sql: string,
  result: unknown
): Promise<void> {
  const db = await getDB();
  await db.put("queryCache", {
    key: cacheKey,
    sql,
    result,
    cachedAt: new Date().toISOString(),
  });
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const entry = await db.get("settings", key);
  return entry ? (entry.value as T) : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key, value });
}

// ── Storage usage estimate ────────────────────────────────────────────────────

export async function getStorageUsage(): Promise<{ usedMB: number; quotaMB: number }> {
  try {
    const estimate = await navigator.storage.estimate();
    return {
      usedMB:  Math.round((estimate.usage  ?? 0) / 1024 / 1024),
      quotaMB: Math.round((estimate.quota  ?? 0) / 1024 / 1024),
    };
  } catch {
    return { usedMB: 0, quotaMB: 0 };
  }
}

// ── Clear all data (for error recovery) ──────────────────────────────────────

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear("projects"),
    db.clear("files"),
    db.clear("queryCache"),
    db.clear("settings"),
  ]);
}
