import { useState } from "react";
import { useProjectStore } from "../../../store/projectStore";

// ── Types ──────────────────────────────────────────────────────────────────

type ExportFormat = "pdf" | "excel" | "powerpoint" | "notion" | "word";
type ReportSection = "summary" | "findings" | "charts" | "recommendations" | "appendix";

interface InsightCard {
  id: string;
  type: "trend" | "anomaly" | "highlight" | "warning";
  title: string;
  body: string;
  metric?: string;
  metricLabel?: string;
  metricDir?: "up" | "down" | "neutral";
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_INSIGHTS: InsightCard[] = [
  {
    id: "i1", type: "highlight",
    title: "North region leads revenue",
    body: "North accounts for 26.8% of total revenue ($142,300), outpacing East by $44,100. Electronics is the dominant category in this region.",
    metric: "$142,300", metricLabel: "North revenue", metricDir: "up",
  },
  {
    id: "i2", type: "trend",
    title: "Consistent growth in H1",
    body: "Monthly revenue grew from $38,200 in January to $72,300 in June — a 89% increase over 6 months, with accelerating momentum from April.",
    metric: "+89%", metricLabel: "H1 growth", metricDir: "up",
  },
  {
    id: "i3", type: "warning",
    title: "South region declining",
    body: "South is the only region showing negative growth at -18%. Home goods underperformance is the primary driver. Recommend targeted intervention.",
    metric: "-18%", metricLabel: "South growth", metricDir: "down",
  },
  {
    id: "i4", type: "anomaly",
    title: "4 revenue outliers detected",
    body: "4 transactions exceed 3 standard deviations from the mean (>$48,200). These may represent enterprise deals or data entry errors — verify before reporting.",
    metric: "4", metricLabel: "outliers", metricDir: "neutral",
  },
  {
    id: "i5", type: "highlight",
    title: "Team plan drives 55% of revenue",
    body: "Despite being the smallest group by count, Team plan customers generate $312,000 — more than Pro and Solo combined. Upsell opportunity is significant.",
    metric: "55%", metricLabel: "Team share", metricDir: "up",
  },
];

const SECTION_LABELS: Record<ReportSection, string> = {
  summary: "Executive Summary",
  findings: "Key Findings",
  charts: "Charts & Visualizations",
  recommendations: "Recommendations",
  appendix: "Data Appendix",
};

const EXPORT_CONFIG: Record<ExportFormat, { icon: string; label: string; desc: string; pro?: boolean }> = {
  pdf:        { icon: "📄", label: "PDF",        desc: "Portable, print-ready report" },
  excel:      { icon: "📊", label: "Excel",      desc: "Data + charts in .xlsx format" },
  powerpoint: { icon: "📽", label: "PowerPoint", desc: "Slide deck for presentations",  pro: true },
  notion:     { icon: "◻", label: "Notion",     desc: "Push directly to a Notion page", pro: true },
  word:       { icon: "📝", label: "Word",       desc: "Editable .docx report",          pro: true },
};

const TYPE_COLORS = {
  highlight:  { bg: "#EEEDFE", border: "#AFA9EC", text: "#3C3489", dot: "#534AB7" },
  trend:      { bg: "#E1F5EE", border: "#7DCFB6", text: "#085041", dot: "#1D9E75" },
  warning:    { bg: "#FCEBEB", border: "#F0A0A0", text: "#791F1F", dot: "#E24B4A" },
  anomaly:    { bg: "#FAEEDA", border: "#E8C77A", text: "#633806", dot: "#BA7517" },
};

const TYPE_LABELS = { highlight: "Highlight", trend: "Trend", warning: "Warning", anomaly: "Anomaly" };

// ── Component ──────────────────────────────────────────────────────────────

export default function Report() {
  const { activeProjectId, projects } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [activeSection, setActiveSection] = useState<ReportSection>("summary");
  const [includedSections, setIncludedSections] = useState<Set<ReportSection>>(
    new Set(["summary", "findings", "charts", "recommendations"])
  );
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [editingInsight, setEditingInsight] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightCard[]>(MOCK_INSIGHTS);
  const [reportTitle, setReportTitle] = useState(project?.name ? `${project.name} — Analysis Report` : "Data Analysis Report");
  const [authorName, setAuthorName] = useState("DataFlow User");
  const [executiveSummary] = useState("This report presents a comprehensive analysis of the dataset, highlighting key trends, anomalies, and actionable recommendations.");
  const [recommendations] = useState(["Invest further in North region marketing.", "Investigate South region decline.", "Pursue upsell campaigns targeting Pro users.", "Review revenue outliers before board reporting."]);
  const KPI_DATA = [{label:"Total Revenue",value:"$567,400",dir:"up" as const},{label:"H1 Growth",value:"+89%",dir:"up" as const},{label:"Top Region",value:"North",dir:"neutral" as const},{label:"South Growth",value:"-18%",dir:"down" as const}];

  const toggleSection = (s: ReportSection) => {
    setIncludedSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const generateReport = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2200));
    setGenerating(false);
    setGenerated(true);
  };

  const simulateExport = async (fmt: ExportFormat) => {
    setExportingFormat(fmt);
    try {
      if (fmt === "pdf") {
        const { exportReportToPDF } = await import("../../../lib/RealPDFExport");
        await exportReportToPDF({
          title: reportTitle,
          projectName: projects.find(p => p.id === activeProjectId)?.name,
          summary: executiveSummary,
          kpis: KPI_DATA,
          findings: insights.map(i => ({ title: i.title, body: i.body })),
          recommendations,
        });
      } else if (fmt === "powerpoint") {
        const { exportReportToPPTX } = await import("../../../lib/RealPPTXExport");
        await exportReportToPPTX({
          title: reportTitle,
          projectName: projects.find(p => p.id === activeProjectId)?.name,
          summary: executiveSummary,
          kpis: KPI_DATA,
          findings: insights.map(i => ({ title: i.title, body: i.body })),
          recommendations,
        });
      } else if (fmt === "excel") {
        const { utils, writeFile } = await import("xlsx");
        const rows = insights.map(i => ({ Finding: i.title, Detail: i.body }));
        const ws = utils.json_to_sheet(rows);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Findings");
        writeFile(wb, `${reportTitle.replace(/\s+/g, "_")}.xlsx`);
      } else {
        // word / notion — show coming soon
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportingFormat(null);
    }
  };

  const updateInsight = (id: string, body: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, body } : i));
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left — report config */}
      <div style={{ width: 260, borderRight: "0.5px solid #e8e6e0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e8e6e0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Report Settings</div>

          <div style={{ marginBottom: 12 }}>
            <label className="label">Report title</label>
            <input value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="label">Author</label>
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label className="label">Date</label>
            <input value={new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} readOnly
              style={{ color: "#73726c" }} />
          </div>
        </div>

        {/* Sections */}
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e8e6e0" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#73726c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Include Sections
          </div>
          {(Object.entries(SECTION_LABELS) as [ReportSection, string][]).map(([s, label]) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}
              onClick={() => toggleSection(s)}>
              <div style={{
                width: 16, height: 16, borderRadius: 4, border: "1.5px solid",
                borderColor: includedSections.has(s) ? "#534AB7" : "#d0cec6",
                background: includedSections.has(s) ? "#534AB7" : "white",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {includedSections.has(s) && <span style={{ color: "white", fontSize: 9, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 12, color: includedSections.has(s) ? "#1a1a18" : "#73726c" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Generate button */}
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e8e6e0" }}>
          <button className="btn btn-primary" onClick={generateReport} disabled={generating}
            style={{ width: "100%", justifyContent: "center", gap: 6 }}>
            {generating ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                Generating…
              </>
            ) : (
              <>{generated ? "↺ Regenerate" : "✨ Generate with AI"}</>
            )}
          </button>
          {generated && (
            <div style={{ fontSize: 10, color: "#1D9E75", textAlign: "center", marginTop: 6 }}>
              ✓ Report generated — {insights.length} insights found
            </div>
          )}
        </div>

        {/* Export */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#73726c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Export As
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(Object.entries(EXPORT_CONFIG) as [ExportFormat, typeof EXPORT_CONFIG[ExportFormat]][]).map(([fmt, cfg]) => (
              <button key={fmt}
                onClick={() => !cfg.pro && simulateExport(fmt)}
                disabled={!!cfg.pro || exportingFormat !== null}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  background: cfg.pro ? "#f8f7f5" : "white",
                  border: "0.5px solid #e8e6e0", borderRadius: 8, cursor: cfg.pro ? "default" : "pointer",
                  opacity: cfg.pro ? 0.7 : 1, textAlign: "left", transition: "border-color 0.15s",
                }}
                onMouseEnter={e => { if (!cfg.pro) (e.currentTarget as HTMLElement).style.borderColor = "#AFA9EC"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e8e6e0"; }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{cfg.label}</span>
                    {cfg.pro && <span className="pill pill-amber" style={{ fontSize: 9 }}>Pro</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#73726c" }}>{cfg.desc}</div>
                </div>
                {exportingFormat === fmt && <span style={{ fontSize: 11 }}>…</span>}
                {exportingFormat !== fmt && !cfg.pro && <span style={{ fontSize: 11, color: "#b0aea6" }}>↓</span>}
              </button>
            ))}
          </div>

          {/* Shareable link */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#73726c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Shareable Link
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input readOnly value="https://dataflow.app/r/xK9mQ2" style={{ flex: 1, fontSize: 11, color: "#73726c" }} />
              <button className="btn btn-secondary" style={{ fontSize: 11, flexShrink: 0, padding: "6px 10px" }}>Copy</button>
            </div>
            <div style={{ fontSize: 10, color: "#73726c", marginTop: 4 }}>
              <span className="pill pill-amber" style={{ fontSize: 9 }}>Pro</span> — Upgrade to enable sharing
            </div>
          </div>
        </div>
      </div>

      {/* Center — report preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Section tabs */}
        <div style={{ display: "flex", borderBottom: "0.5px solid #e8e6e0", padding: "0 20px", overflowX: "auto" }}>
          {(Object.entries(SECTION_LABELS) as [ReportSection, string][])
            .filter(([s]) => includedSections.has(s))
            .map(([s, label]) => (
              <button key={s} onClick={() => setActiveSection(s)}
                style={{
                  padding: "10px 14px", fontSize: 12, whiteSpace: "nowrap",
                  fontWeight: activeSection === s ? 600 : 400,
                  color: activeSection === s ? "#534AB7" : "#73726c",
                  background: "none", border: "none", cursor: "pointer",
                  borderBottom: activeSection === s ? "2px solid #534AB7" : "2px solid transparent",
                  transition: "all 0.15s",
                }}>
                {label}
              </button>
            ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px", maxWidth: 800 }}>
          {!generated ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Ready to generate your report</div>
                <div style={{ fontSize: 13, color: "#73726c", lineHeight: 1.6, maxWidth: 360 }}>
                  DataFlow will scan your analysis, charts, and cleaned data to write an AI-powered insight report.
                  Configure the sections on the left, then click <strong>Generate with AI</strong>.
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeSection === "summary" && <SummarySection title={reportTitle} author={authorName} insights={insights} />}
              {activeSection === "findings" && <FindingsSection insights={insights} editingId={editingInsight} setEditingId={setEditingInsight} onUpdate={updateInsight} />}
              {activeSection === "charts" && <ChartsSection />}
              {activeSection === "recommendations" && <RecommendationsSection insights={insights} />}
              {activeSection === "appendix" && <AppendixSection />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section views ──────────────────────────────────────────────────────────

function SummarySection({ title, author, insights }: { title: string; author: string; insights: InsightCard[] }) {
  const highlights = insights.filter(i => i.type === "highlight" || i.type === "trend");
  const warnings = insights.filter(i => i.type === "warning" || i.type === "anomaly");

  return (
    <div>
      {/* Report header */}
      <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: "0.5px solid #e8e6e0" }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#73726c" }}>
          Prepared by {author} · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Revenue", val: "$425,900", dir: "up", change: "+23%" },
          { label: "Active Customers", val: "1,194",   dir: "up", change: "+11%" },
          { label: "Avg Revenue / Customer", val: "$356", dir: "up", change: "+8%" },
          { label: "Data Quality Score", val: "94%",   dir: "up", change: "+6pts" },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{kpi.val}</div>
            <div style={{ fontSize: 10, color: "#73726c", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#1D9E75" }}>↑ {kpi.change}</div>
          </div>
        ))}
      </div>

      {/* Summary text */}
      <div style={{ fontSize: 13, lineHeight: 1.8, color: "#2d2d2a", marginBottom: 24 }}>
        This report summarises the data analysis performed on <strong>1,200 customer records</strong> across
        five regions and three subscription plans. The dataset was cleaned and validated — reducing null values
        from 9.3% to under 0.5% — before analysis. Key findings indicate strong growth momentum in H1,
        with North and West regions outperforming targets, while South requires strategic attention.
      </div>

      {/* Highlights + warnings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#1D9E75", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            ✓ Key Highlights
          </div>
          {highlights.map(i => (
            <div key={i.id} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "#3d3d3a" }}>
              <span style={{ color: "#1D9E75", flexShrink: 0 }}>•</span>
              <span>{i.title}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#BA7517", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            ⚠ Attention Required
          </div>
          {warnings.map(i => (
            <div key={i.id} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "#3d3d3a" }}>
              <span style={{ color: "#BA7517", flexShrink: 0 }}>•</span>
              <span>{i.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FindingsSection({ insights, editingId, setEditingId, onUpdate }: {
  insights: InsightCard[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onUpdate: (id: string, body: string) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Key Findings</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 24, lineHeight: 1.6 }}>
        AI-generated insights from your data. Click any finding to edit the copy.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {insights.map((insight, idx) => {
          const c = TYPE_COLORS[insight.type];
          const isEditing = editingId === insight.id;
          return (
            <div key={insight.id} style={{ border: "0.5px solid", borderColor: c.border, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: c.bg, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>Finding {idx + 1}</span>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "white", color: c.text, fontWeight: 500 }}>
                  {TYPE_LABELS[insight.type]}
                </span>
                {insight.metric && (
                  <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: c.dot }}>
                    {insight.metricDir === "up" ? "↑ " : insight.metricDir === "down" ? "↓ " : ""}{insight.metric}
                    <span style={{ fontSize: 10, fontWeight: 400, color: c.text, marginLeft: 4 }}>{insight.metricLabel}</span>
                  </span>
                )}
              </div>
              <div style={{ padding: "14px 16px", background: "white" }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{insight.title}</div>
                {isEditing ? (
                  <div>
                    <textarea
                      defaultValue={insight.body}
                      onBlur={e => { onUpdate(insight.id, e.target.value); setEditingId(null); }}
                      autoFocus
                      style={{ width: "100%", minHeight: 80, fontSize: 12, lineHeight: 1.6, resize: "vertical" }}
                    />
                    <div style={{ fontSize: 10, color: "#73726c", marginTop: 4 }}>Click outside to save</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: "#3d3d3a", cursor: "text" }}
                    onClick={() => setEditingId(insight.id)}>
                    {insight.body}
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#b0aea6" }}>✎ edit</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartsSection() {
  const charts = [
    { title: "Revenue by Region", type: "Bar chart", x: ["North", "East", "West", "South", "Central"], y: [142300, 98200, 87500, 54100, 43800] },
    { title: "Revenue Trend (H1)", type: "Line chart", x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], y: [38200, 42100, 55400, 61200, 48700, 72300] },
  ];
  const colors = ["#534AB7", "#1D9E75", "#BA7517", "#E24B4A", "#3B82F6"];

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Charts & Visualizations</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 24 }}>
        Charts saved in the Visualize tab are automatically included here.
      </div>
      {charts.map((chart, ci) => {
        const W = 480, H = 200, PAD = { t: 10, r: 10, b: 36, l: 50 };
        const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;
        const max = Math.max(...chart.y) * 1.1;
        const bW = (cW / chart.x.length) * 0.6;
        const gap = (cW / chart.x.length) * 0.4;

        return (
          <div key={ci} className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{chart.title}</div>
            <div style={{ fontSize: 10, color: "#73726c", marginBottom: 12 }}>{chart.type}</div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
              {[0.25, 0.5, 0.75, 1].map(f => (
                <line key={f} x1={PAD.l} y1={PAD.t + cH * (1 - f)} x2={PAD.l + cW} y2={PAD.t + cH * (1 - f)}
                  stroke="#e8e6e0" strokeWidth="0.5" />
              ))}
              {chart.x.map((label, i) => {
                const barH = (chart.y[i] / max) * cH;
                const x = PAD.l + i * (cW / chart.x.length) + gap / 2;
                return (
                  <g key={i}>
                    <rect x={x} y={PAD.t + cH - barH} width={bW} height={barH}
                      fill={colors[i % colors.length]} rx="2" opacity="0.85" />
                    <text x={x + bW / 2} y={PAD.t + cH + 14} textAnchor="middle" fontSize="9" fill="#73726c">
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
}

function RecommendationsSection({ insights }: { insights: InsightCard[] }) {
  const recs = [
    { priority: "High", icon: "🎯", title: "Investigate South region underperformance", body: "Home goods are down -18% YoY. Conduct a root-cause analysis and consider targeted promotions or product mix adjustments." },
    { priority: "High", icon: "💼", title: "Double down on Team plan upsell", body: "Team customers generate 55% of revenue from <20% of the base. Build a dedicated onboarding path and success program to convert Pro users." },
    { priority: "Medium", icon: "🔍", title: "Review and validate 4 revenue outliers", body: "Confirm whether the 4 transactions exceeding $48,200 represent enterprise deals (keep) or data errors (correct before next report cycle)." },
    { priority: "Low", icon: "📅", title: "Monitor April–June growth plateau", body: "Revenue dipped in May relative to the trendline. Track whether this was seasonal or the start of a slowdown." },
  ];
  const priorityColor: Record<string, string> = { High: "#E24B4A", Medium: "#BA7517", Low: "#534AB7" };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Recommendations</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 24 }}>
        Suggested next actions based on the findings above, prioritised by expected impact.
      </div>
      {recs.map((rec, i) => (
        <div key={i} className="card" style={{ marginBottom: 12, padding: "14px 16px", display: "flex", gap: 14 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>{rec.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{rec.title}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                background: `${priorityColor[rec.priority]}18`, color: priorityColor[rec.priority] }}>
                {rec.priority}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.6 }}>{rec.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AppendixSection() {
  const cols = ["customer_id", "name", "email", "revenue", "signup_date", "region", "plan", "score"];
  const stats = [
    { col: "revenue",     min: "$310",  max: "$98,450", mean: "$356.58", nulls: "8",  type: "FLOAT"   },
    { col: "score",       min: "12.1",  max: "99.4",    mean: "62.3",    nulls: "31", type: "FLOAT"   },
    { col: "customer_id", min: "1001",  max: "2200",    mean: "1600.5",  nulls: "0",  type: "INTEGER" },
  ];
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Data Appendix</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 24 }}>
        Source schema, descriptive statistics, and data quality notes.
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Schema ({cols.length} columns)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {cols.map(c => (
          <span key={c} style={{ fontSize: 11, padding: "4px 10px", background: "#f0ede8", borderRadius: 6, fontFamily: "monospace" }}>{c}</span>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Numeric column statistics</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>
            {["Column", "Type", "Min", "Max", "Mean", "Nulls"].map(h => (
              <th key={h} style={{ padding: "8px 10px", background: "#f8f7f5", border: "0.5px solid #e8e6e0", textAlign: "left", fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.col}>
              <td style={{ padding: "7px 10px", border: "0.5px solid #e8e6e0", fontFamily: "monospace", fontWeight: 500 }}>{s.col}</td>
              <td style={{ padding: "7px 10px", border: "0.5px solid #e8e6e0", color: "#73726c" }}>{s.type}</td>
              <td style={{ padding: "7px 10px", border: "0.5px solid #e8e6e0" }}>{s.min}</td>
              <td style={{ padding: "7px 10px", border: "0.5px solid #e8e6e0" }}>{s.max}</td>
              <td style={{ padding: "7px 10px", border: "0.5px solid #e8e6e0" }}>{s.mean}</td>
              <td style={{ padding: "7px 10px", border: "0.5px solid #e8e6e0", color: parseInt(s.nulls) > 0 ? "#BA7517" : "#1D9E75" }}>{s.nulls}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20, padding: "12px 14px", background: "#f8f7f5", borderRadius: 10, fontSize: 11, color: "#73726c", lineHeight: 1.6 }}>
        <strong>Data quality note:</strong> Dataset was scanned automatically on load. 8 issues were detected (nulls, 1 duplicate group, 1 type error, 4 outliers). All issues were resolved before analysis. Final clean dataset: 1,194 rows, 0 nulls, 0 duplicates.
      </div>
    </div>
  );
}
