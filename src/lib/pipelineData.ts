import { getFilesForProject } from "./db";
import { describeTable, getRowCount, previewTable, registerCSV, runQuery } from "./duckdb";
import type { Project } from "../store/projectStore";

export interface TableProfile {
  tableName: string;
  sourceName: string;
  columns: { name: string; type: string; nulls: number; unique: number; total: number }[];
  rows: Record<string, unknown>[];
  rowCount: number;
  numericColumns: string[];
  categoryColumns: string[];
}

const NUMERIC_TYPE = /(int|double|float|decimal|numeric|real|hugeint|bigint|smallint|tinyint)/i;

export async function loadProjectTableProfiles(project: Project | undefined): Promise<TableProfile[]> {
  if (!project) return [];

  const files = await getFilesForProject(project.id);
  await Promise.all(
    files.map(async (file) => {
      const source = project.dataSources.find((s) => s.id === file.id);
      const tableName = source?.config?.tableName ?? file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      await registerCSV(tableName, file.content);
    })
  );

  const profiles = await Promise.all(
    project.dataSources.map(async (source) => {
      const tableName = source.config?.tableName;
      if (!tableName) return null;

      const [schema, rowCount, preview] = await Promise.all([
        describeTable(tableName),
        getRowCount(tableName),
        previewTable(tableName, 100),
      ]);

      const columns = await Promise.all(
        schema.map(async (col) => {
          const nullRes = await runQuery(`SELECT COUNT(*) AS n FROM "${tableName}" WHERE "${col.column}" IS NULL OR CAST("${col.column}" AS VARCHAR) = ''`, { useCache: false });
          const uniqueRes = await runQuery(`SELECT COUNT(DISTINCT "${col.column}") AS n FROM "${tableName}"`, { useCache: false });
          return {
            name: col.column,
            type: col.type,
            nulls: Number(nullRes.rows[0]?.n ?? 0),
            unique: Number(uniqueRes.rows[0]?.n ?? 0),
            total: rowCount,
          };
        })
      );

      const numericColumns = columns.filter((c) => NUMERIC_TYPE.test(c.type)).map((c) => c.name);
      const categoryColumns = columns.filter((c) => !numericColumns.includes(c.name)).map((c) => c.name);

      return {
        tableName,
        sourceName: source.name,
        columns,
        rows: preview.rows,
        rowCount,
        numericColumns,
        categoryColumns: categoryColumns.length ? categoryColumns : columns.map((c) => c.name),
      };
    })
  );

  return profiles.filter((profile): profile is TableProfile => profile !== null);
}

export async function aggregateTable(
  tableName: string,
  xAxis: string,
  yAxis: string,
  aggFn: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX"
): Promise<{ x: string[]; y: number[] }> {
  const expression = aggFn === "COUNT" ? `COUNT("${yAxis}")` : `${aggFn}(TRY_CAST("${yAxis}" AS DOUBLE))`;
  const result = await runQuery(
    `SELECT CAST("${xAxis}" AS VARCHAR) AS x, ${expression} AS y
     FROM "${tableName}"
     GROUP BY 1
     ORDER BY y DESC NULLS LAST
     LIMIT 20`,
    { useCache: false }
  );

  return {
    x: result.rows.map((row) => String(row.x ?? "Unknown")),
    y: result.rows.map((row) => Number(row.y ?? 0)),
  };
}

export function inferReportInsights(profile: TableProfile | undefined) {
  if (!profile) return [];
  const totalNulls = profile.columns.reduce((sum, col) => sum + col.nulls, 0);
  const topColumns = [...profile.columns].sort((a, b) => b.unique - a.unique).slice(0, 3);
  const numeric = profile.numericColumns[0];

  return [
    {
      id: "rows",
      type: "highlight" as const,
      title: `${profile.sourceName} loaded successfully`,
      body: `The active dataset contains ${profile.rowCount.toLocaleString()} rows across ${profile.columns.length} columns and is available to every pipeline tab.`,
      metric: profile.rowCount.toLocaleString(),
      metricLabel: "rows",
      metricDir: "up" as const,
    },
    {
      id: "quality",
      type: totalNulls > 0 ? "warning" as const : "trend" as const,
      title: totalNulls > 0 ? `${totalNulls.toLocaleString()} missing values detected` : "No missing values detected",
      body: totalNulls > 0
        ? `Clean should review missing values before final reporting. The most affected columns are highlighted in the data quality view.`
        : "The profiled sample has no blank or null cells, so the dataset is ready for analysis.",
      metric: totalNulls.toLocaleString(),
      metricLabel: "missing",
      metricDir: totalNulls > 0 ? "down" as const : "neutral" as const,
    },
    {
      id: "schema",
      type: "highlight" as const,
      title: numeric ? `${numeric} is ready for aggregation` : "Schema is ready for review",
      body: `High-cardinality columns include ${topColumns.map((c) => c.name).join(", ") || "none yet"}. Use Visualize to group and compare these fields.`,
      metric: profile.columns.length.toLocaleString(),
      metricLabel: "columns",
      metricDir: "neutral" as const,
    },
  ];
}
