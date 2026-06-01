import { useState, useMemo } from "react";
import { useProjectStore } from "../../../store/projectStore";

// ── Types ──────────────────────────────────────────────────────────────────

type IssueType = "null" | "duplicate" | "type_error" | "outlier" | "whitespace";
type IssueSeverity = "high" | "medium" | "low";
type AuditAction = "auto_fix" | "manual_fix" | "ignored" | "detected";

interface ColumnIssue {
  id: string;
  column: string;
  type: IssueType;
  severity: IssueSeverity;
  count: number;
  description: string;
  suggestion: string;
  fixed: boolean;
  ignored: boolean;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  description: string;
  column?: string;
  affectedRows: number;
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_COLUMNS = [
  { name: "customer_id",  type: "INTEGER",  nulls: 0,   unique: 1200, total: 1200 },
  { name: "name",         type: "VARCHAR",  nulls: 3,   unique: 1195, total: 1200 },
  { name: "email",        type: "VARCHAR",  nulls: 17,  unique: 1182, total: 1200 },
  { name: "revenue",      type: "FLOAT",    nulls: 8,   unique: 840,  total: 1200 },
  { name: "signup_date",  type: "VARCHAR",  nulls: 0,   unique: 365,  total: 1200 },
  { name: "region",       type: "VARCHAR",  nulls: 22,  unique: 5,    total: 1200 },
  { name: "plan",         type: "VARCHAR",  nulls: 0,   unique: 3,    total: 1200 },
  { name: "score",        type: "FLOAT",    nulls: 31,  unique: 200,  total: 1200 },
];

const INITIAL_ISSUES: ColumnIssue[] = [
  { id: "i1",  column: "email",       type: "null",       severity: "high",   count: 17,  description: "17 rows missing email address",             suggestion: "Fill with placeholder or remove rows",    fixed: false, ignored: false },
  { id: "i2",  column: "region",      type: "null",       severity: "high",   count: 22,  description: "22 rows have no region assigned",           suggestion: "Fill with 'Unknown' or infer from data",  fixed: false, ignored: false },
  { id: "i3",  column: "score",       type: "null",       severity: "medium", count: 31,  description: "31 null values in score column",            suggestion: "Fill with column median (42.7)",          fixed: false, ignored: false },
  { id: "i4",  column: "revenue",     type: "outlier",    severity: "high",   count: 4,   description: "4 revenue values exceed 3σ from mean",      suggestion: "Cap at $48,200 or investigate manually",  fixed: false, ignored: false },
  { id: "i5",  column: "signup_date", type: "type_error", severity: "medium", count: 1,   description: "signup_date stored as VARCHAR not DATE",     suggestion: "Cast to DATE type",                       fixed: false, ignored: false },
  { id: "i6",  column: "name",        type: "null",       severity: "low",    count: 3,   description: "3 rows have no customer name",              suggestion: "Fill with 'Unknown Customer'",            fixed: false, ignored: false },
  { id: "i7",  column: "name",        type: "whitespace", severity: "low",    count: 28,  description: "28 names have leading/trailing whitespace", suggestion: "TRIM() all name values",                  fixed: false, ignored: false },
  { id: "i8",  column: "customer_id", type: "duplicate",  severity: "high",   count: 6,   description: "6 duplicate customer_id values found",      suggestion: "Keep first occurrence, flag duplicates",  fixed: false, ignored: false },
];

const INITIAL_AUDIT: AuditEntry[] = [
  { id: "a0", timestamp: "10:41:02", action: "detected", description: "Auto-scan complete — 8 issues found across 6 columns", affectedRows: 112 },
];

const ISSUE_ICONS: Record<IssueType, string> = {
  null: "○",
  duplicate: "⊕",
  type_error: "⚠",
  outlier: "◈",
  whitespace: "⌦",
};

const ISSUE_LABELS: Record<IssueType, string> = {
  null: "Null / Missing",
  duplicate: "Duplicate",
  type_error: "Type Error",
  outlier: "Outlier",
  whitespace: "Whitespace",
};

const SEV_COLORS: Record<IssueSeverity, { bg: string; text: string; dot: string }> = {
  high:   { bg: "#FCEBEB", text: "#791F1F", dot: "#E24B4A" },
  medium: { bg: "#FAEEDA", text: "#633806", dot: "#BA7517" },
  low:    { bg: "#f0ede8", text: "#5F5E5A", dot: "#b0aea6" },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function Clean() {
  const { activeProjectId, projects, updateStepStatus } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);

  const [issues, setIssues] = useState<ColumnIssue[]>(INITIAL_ISSUES);
  const [audit, setAudit] = useState<AuditEntry[]>(INITIAL_AUDIT);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(true);
  const [fixingAll, setFixingAll] = useState(false);
  const [activeView, setActiveView] = useState<"issues" | "preview" | "audit">("issues");
  const [filterSev, setFilterSev] = useState<IssueSeverity | "all">("all");
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const hasSource = project && project.dataSources.length > 0;

  const visibleIssues = useMemo(() =>
    issues.filter(i =>
      !i.fixed && !i.ignored &&
      (filterSev === "all" || i.severity === filterSev)
    ), [issues, filterSev]);

  const fixedCount = issues.filter(i => i.fixed).length;
  const ignoredCount = issues.filter(i => i.ignored).length;
  const openCount = issues.filter(i => !i.fixed && !i.ignored).length;
  const totalRows = 1200;
  const affectedRows = 112;
  const cleanness = Math.round(((totalRows - affectedRows + fixedCount * 10) / totalRows) * 100);

  const addAudit = (action: AuditAction, description: string, column?: string, rows = 0) => {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      action,
      description,
      column,
      affectedRows: rows,
    };
    setAudit(prev => [entry, ...prev]);
  };

  const fixIssue = (id: string) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;
    setIssues(prev => prev.map(i => i.id === id ? { ...i, fixed: true } : i));
    addAudit("auto_fix", `Fixed: ${issue.description}`, issue.column, issue.count);
    if (activeProjectId) updateStepStatus(activeProjectId, "clean", "active");
  };

  const ignoreIssue = (id: string) => {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;
    setIssues(prev => prev.map(i => i.id === id ? { ...i, ignored: true } : i));
    addAudit("ignored", `Ignored: ${issue.description}`, issue.column, 0);
  };

  const fixAll = async () => {
    setFixingAll(true);
    const open = issues.filter(i => !i.fixed && !i.ignored);
    for (let i = 0; i < open.length; i++) {
      await new Promise(r => setTimeout(r, 220));
      fixIssue(open[i].id);
    }
    setFixingAll(false);
    if (activeProjectId) updateStepStatus(activeProjectId, "clean", "complete");
  };

  const rescan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 1400));
    setScanning(false);
    setScanned(true);
    addAudit("detected", "Re-scan complete — no new issues found", undefined, 0);
  };

  if (!hasSource) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 40 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No data to clean yet</div>
          <div style={{ fontSize: 13, color: "#73726c", lineHeight: 1.6 }}>
            Connect a data source in the <strong>Collect</strong> tab first, then come back here to clean it.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left panel — issue list */}
      <div style={{ width: 320, borderRight: "0.5px solid #e8e6e0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e8e6e0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Data Quality</div>
            <button className="btn btn-ghost" onClick={rescan} disabled={scanning}
              style={{ fontSize: 11, padding: "3px 10px" }}>
              {scanning ? "Scanning…" : "↺ Re-scan"}
            </button>
          </div>

          {/* Cleanness bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "#73726c" }}>Cleanness score</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: cleanness > 85 ? "#1D9E75" : cleanness > 60 ? "#BA7517" : "#E24B4A" }}>
                {cleanness}%
              </span>
            </div>
            <div style={{ height: 6, background: "#f0ede8", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, transition: "width 0.5s ease",
                width: `${cleanness}%`,
                background: cleanness > 85 ? "#1D9E75" : cleanness > 60 ? "#BA7517" : "#E24B4A"
              }} />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { label: "Open", val: openCount, color: openCount > 0 ? "#E24B4A" : "#1D9E75" },
              { label: "Fixed", val: fixedCount, color: "#1D9E75" },
              { label: "Ignored", val: ignoredCount, color: "#73726c" },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, textAlign: "center", padding: "6px 0", background: "#f8f7f5", borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#73726c" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters + fix-all */}
        <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #e8e6e0", display: "flex", alignItems: "center", gap: 6 }}>
          {(["all", "high", "medium", "low"] as const).map(f => (
            <button key={f} onClick={() => setFilterSev(f)}
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 12, cursor: "pointer", border: "none",
                fontWeight: filterSev === f ? 600 : 400,
                background: filterSev === f ? (f === "all" ? "#534AB7" : SEV_COLORS[f as IssueSeverity]?.bg ?? "#534AB7") : "#f0ede8",
                color: filterSev === f ? (f === "all" ? "white" : SEV_COLORS[f as IssueSeverity]?.text ?? "white") : "#73726c",
              }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {openCount > 0 && (
            <button className="btn btn-primary" onClick={fixAll} disabled={fixingAll}
              style={{ fontSize: 10, padding: "3px 10px" }}>
              {fixingAll ? "Fixing…" : `Fix all (${openCount})`}
            </button>
          )}
        </div>

        {/* Issue list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {visibleIssues.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1D9E75" }}>All issues resolved</div>
              <div style={{ fontSize: 11, color: "#73726c", marginTop: 4 }}>
                {fixedCount > 0 ? `${fixedCount} issues fixed` : "No issues found"}
              </div>
            </div>
          ) : (
            visibleIssues.map(issue => {
              const sev = SEV_COLORS[issue.severity];
              const isSelected = selectedIssue === issue.id;
              return (
                <div key={issue.id}
                  onClick={() => setSelectedIssue(isSelected ? null : issue.id)}
                  style={{
                    padding: "10px 16px", cursor: "pointer",
                    borderLeft: isSelected ? "3px solid #534AB7" : "3px solid transparent",
                    background: isSelected ? "#EEEDFE" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f8f7f5"; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, flexShrink: 0, color: sev.dot }}>{ISSUE_ICONS[issue.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#1a1a18" }}>
                          {issue.column}
                        </span>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: sev.bg, color: sev.text }}>
                          {ISSUE_LABELS[issue.type]}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#5F5E5A", lineHeight: 1.4 }}>{issue.description}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: sev.text, flexShrink: 0 }}>
                      {issue.count}
                    </span>
                  </div>

                  {/* Actions shown when selected */}
                  {isSelected && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "0.5px solid #d6d3f0" }}>
                      <div style={{ fontSize: 10, color: "#534AB7", marginBottom: 6, fontWeight: 500 }}>
                        💡 {issue.suggestion}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fixIssue(issue.id); setSelectedIssue(null); }}
                          style={{ fontSize: 10, padding: "4px 10px" }}>
                          ✓ Apply fix
                        </button>
                        <button className="btn btn-secondary" onClick={e => { e.stopPropagation(); ignoreIssue(issue.id); setSelectedIssue(null); }}
                          style={{ fontSize: 10, padding: "4px 10px" }}>
                          Ignore
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Fixed items (collapsed) */}
          {fixedCount > 0 && (
            <div style={{ padding: "8px 16px", borderTop: "0.5px solid #e8e6e0", marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "#1D9E75", fontWeight: 600, marginBottom: 6 }}>
                ✓ {fixedCount} FIXED
              </div>
              {issues.filter(i => i.fixed).map(issue => (
                <div key={issue.id} style={{ fontSize: 11, color: "#9b9992", padding: "3px 0", textDecoration: "line-through" }}>
                  {issue.column} — {issue.description}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid #e8e6e0", padding: "0 20px" }}>
          {(["issues", "preview", "audit"] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              style={{
                padding: "10px 14px", fontSize: 12, fontWeight: activeView === v ? 600 : 400,
                color: activeView === v ? "#534AB7" : "#73726c",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: activeView === v ? "2px solid #534AB7" : "2px solid transparent",
                transition: "all 0.15s",
              }}>
              {v === "issues" ? "Issues" : v === "preview" ? "Data Preview" : "Audit Log"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {activeView === "issues" && <IssuesOverview columns={MOCK_COLUMNS} issues={issues} />}
          {activeView === "preview" && <DataPreview columns={MOCK_COLUMNS} issues={issues} />}
          {activeView === "audit" && <AuditLog entries={audit} />}
        </div>
      </div>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────

function IssuesOverview({ columns, issues }: { columns: typeof MOCK_COLUMNS; issues: ColumnIssue[] }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Column Summary</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 16 }}>
        {columns.length} columns · 1,200 total rows · {issues.filter(i => !i.fixed && !i.ignored).length} open issues
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {columns.map(col => {
          const colIssues = issues.filter(i => i.column === col.name && !i.fixed && !i.ignored);
          const fixedIssues = issues.filter(i => i.column === col.name && i.fixed);
          const nullPct = Math.round((col.nulls / col.total) * 100);
          return (
            <div key={col.name} className="card" style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: colIssues.length > 0 ? 10 : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{col.name}</span>
                    <span style={{ fontSize: 10, color: "#73726c", background: "#f0ede8", padding: "1px 6px", borderRadius: 4 }}>{col.type}</span>
                    {fixedIssues.length > 0 && <span style={{ fontSize: 10, color: "#1D9E75" }}>✓ Fixed</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#73726c", marginTop: 3 }}>
                    {col.nulls > 0 ? <span style={{ color: "#BA7517" }}>{col.nulls} nulls ({nullPct}%) · </span> : ""}
                    {col.unique.toLocaleString()} unique · {col.total.toLocaleString()} total
                  </div>
                </div>
                {/* Null fill bar */}
                <div style={{ width: 80, textAlign: "right" }}>
                  <div style={{ height: 4, background: "#f0ede8", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${100 - nullPct}%`, background: nullPct === 0 ? "#1D9E75" : "#534AB7", borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 10, color: "#73726c", marginTop: 2 }}>{100 - nullPct}% complete</div>
                </div>
              </div>
              {colIssues.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {colIssues.map(issue => {
                    const sev = SEV_COLORS[issue.severity];
                    return (
                      <span key={issue.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: sev.bg, color: sev.text }}>
                        {ISSUE_ICONS[issue.type]} {ISSUE_LABELS[issue.type]} · {issue.count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DataPreview({ columns, issues }: { columns: typeof MOCK_COLUMNS; issues: ColumnIssue[] }) {
  const rows = [
    { customer_id: 1001, name: "Alice Johnson", email: "alice@example.com", revenue: 8420.50, signup_date: "2023-03-15", region: "North", plan: "Pro", score: 87.2 },
    { customer_id: 1002, name: "  Bob Smith  ", email: null,                revenue: 2340.00, signup_date: "2023-07-22", region: null,    plan: "Solo", score: 42.0 },
    { customer_id: 1003, name: "Carlos Ruiz",   email: "carlos@corp.io",    revenue: 98450.00,signup_date: "2022-11-08", region: "West",  plan: "Team", score: null },
    { customer_id: 1004, name: "Diana Lee",     email: "diana@mail.net",    revenue: 5120.75, signup_date: "2024-01-30", region: "East",  plan: "Pro",  score: 73.5 },
    { customer_id: 1001, name: "Alice Johnson", email: "alice@example.com", revenue: 8420.50, signup_date: "2023-03-15", region: "North", plan: "Pro",  score: 87.2 },
    { customer_id: 1005, name: null,            email: "e@x.com",           revenue: 310.00,  signup_date: "2024-06-01", region: "South", plan: "Solo", score: 21.3 },
  ] as Record<string, string | number | null>[];

  const flagged = (col: string, val: string | number | null) => {
    if (val === null) return { bg: "#FCEBEB", border: "#E24B4A" };
    if (col === "customer_id" && val === 1001) return { bg: "#FAEEDA", border: "#BA7517" };
    if (col === "name" && typeof val === "string" && val !== val.trim()) return { bg: "#FAEEDA", border: "#BA7517" };
    if (col === "revenue" && typeof val === "number" && val > 90000) return { bg: "#FAEEDA", border: "#BA7517" };
    return null;
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Data Preview</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 16 }}>
        First 6 rows — highlighted cells have detected issues
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.name} style={{
                  padding: "8px 10px", background: "#f8f7f5", border: "0.5px solid #e8e6e0",
                  fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", color: "#3d3d3a"
                }}>
                  {c.name}
                  <div style={{ fontWeight: 400, color: "#b0aea6", fontSize: 10 }}>{c.type}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {columns.map(col => {
                  const val = row[col.name];
                  const flag = flagged(col.name, val);
                  return (
                    <td key={col.name} style={{
                      padding: "7px 10px", border: "0.5px solid #e8e6e0",
                      background: flag ? flag.bg : "white",
                      outline: flag ? `1px solid ${flag.border}` : undefined,
                      maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {val === null
                        ? <span style={{ color: "#E24B4A", fontStyle: "italic" }}>NULL</span>
                        : <span style={{ color: "#3d3d3a" }}>{String(val)}</span>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 11, color: "#73726c" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "#FCEBEB", border: "1px solid #E24B4A", borderRadius: 2, display: "inline-block" }} />
          Null value
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "#FAEEDA", border: "1px solid #BA7517", borderRadius: 2, display: "inline-block" }} />
          Duplicate / Outlier / Whitespace
        </span>
      </div>
    </div>
  );
}

function AuditLog({ entries }: { entries: AuditEntry[] }) {
  const actionStyle: Record<AuditAction, { color: string; icon: string }> = {
    detected:   { color: "#534AB7", icon: "🔍" },
    auto_fix:   { color: "#1D9E75", icon: "✓" },
    manual_fix: { color: "#1D9E75", icon: "✎" },
    ignored:    { color: "#73726c", icon: "—" },
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Audit Log</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 16 }}>
        Every change is recorded. You can restore any state from project history.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.map(entry => {
          const s = actionStyle[entry.action];
          return (
            <div key={entry.id} className="card" style={{ padding: "10px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#1a1a18" }}>{entry.description}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: s.color, fontWeight: 600, textTransform: "uppercase" }}>
                    {entry.action.replace("_", " ")}
                  </span>
                  {entry.column && <span style={{ fontSize: 10, color: "#73726c" }}>Column: {entry.column}</span>}
                  {entry.affectedRows > 0 && <span style={{ fontSize: 10, color: "#73726c" }}>{entry.affectedRows} rows</span>}
                </div>
              </div>
              <span style={{ fontSize: 10, color: "#b0aea6", flexShrink: 0, fontFamily: "monospace" }}>{entry.timestamp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
