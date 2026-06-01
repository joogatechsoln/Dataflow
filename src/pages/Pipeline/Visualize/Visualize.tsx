import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "../../../store/projectStore";
import PowerBIEmbed from "./PowerBIEmbed";

// ── Types ──────────────────────────────────────────────────────────────────

type ChartType = "bar" | "line" | "pie" | "scatter" | "area" | "heatmap";
type AggFn = "SUM" | "AVG" | "COUNT" | "MIN" | "MAX";

interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string;
  aggFn: AggFn;
  colorScheme: number;
  showLegend: boolean;
  showGrid: boolean;
  stacked: boolean;
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_COLUMNS = ["region", "plan", "revenue", "score", "signup_date", "customer_id", "name", "email"];
const NUMERIC_COLS = ["revenue", "score", "customer_id"];
const CATEGORY_COLS = ["region", "plan", "signup_date"];

const COLOR_SCHEMES = [
  ["#534AB7", "#1D9E75", "#BA7517", "#E24B4A", "#3B82F6", "#8B5CF6"],
  ["#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"],
  ["#6366F1", "#14B8A6", "#F97316", "#EF4444", "#84CC16", "#A855F7"],
  ["#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"],
];

const CHART_DATA: Record<string, { x: string[]; y: number[] }> = {
  "region/revenue/SUM": {
    x: ["North", "East", "West", "South", "Central"],
    y: [142300, 98200, 87500, 54100, 43800],
  },
  "plan/revenue/SUM": {
    x: ["Team", "Pro", "Solo"],
    y: [312000, 187500, 68000],
  },
  "region/score/AVG": {
    x: ["North", "East", "West", "South", "Central"],
    y: [71.2, 68.4, 74.8, 59.3, 65.1],
  },
  "signup_date/revenue/SUM": {
    x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    y: [38200, 42100, 55400, 61200, 48700, 72300],
  },
  "region/customer_id/COUNT": {
    x: ["North", "East", "West", "South", "Central"],
    y: [312, 256, 228, 187, 217],
  },
};

const CHART_ICONS: Record<ChartType, string> = {
  bar: "▌", line: "⌇", pie: "◕", scatter: "⁘", area: "▲", heatmap: "▦",
};

const CHART_LABELS: Record<ChartType, string> = {
  bar: "Bar", line: "Line", pie: "Pie", scatter: "Scatter", area: "Area", heatmap: "Heatmap",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getChartData(cfg: ChartConfig) {
  const key = `${cfg.xAxis}/${cfg.yAxis}/${cfg.aggFn}`;
  return CHART_DATA[key] || CHART_DATA["region/revenue/SUM"];
}

// ── SVG Chart Renderers ────────────────────────────────────────────────────

function BarChart({ data, colors, stacked, showGrid }: { data: { x: string[]; y: number[] }; colors: string[]; stacked: boolean; showGrid: boolean }) {
  const W = 480, H = 260, PAD = { t: 16, r: 16, b: 48, l: 56 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...data.y) * 1.1;
  const bW = (cW / data.x.length) * 0.65;
  const gap = (cW / data.x.length) * 0.35;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {/* Grid lines */}
      {showGrid && [0.25, 0.5, 0.75, 1].map(f => (
        <line key={f}
          x1={PAD.l} y1={PAD.t + cH * (1 - f)}
          x2={PAD.l + cW} y2={PAD.t + cH * (1 - f)}
          stroke="#e8e6e0" strokeWidth="0.5" />
      ))}
      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={PAD.l - 8} y={PAD.t + cH * (1 - f) + 4}
          textAnchor="end" fontSize="9" fill="#b0aea6">
          {f === 0 ? "0" : Math.round(max * f).toLocaleString()}
        </text>
      ))}
      {/* Bars */}
      {data.x.map((label, i) => {
        const barH = (data.y[i] / max) * cH;
        const x = PAD.l + i * (cW / data.x.length) + gap / 2;
        const y = PAD.t + cH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={barH}
              fill={colors[i % colors.length]} rx="2" opacity="0.9" />
            <text x={x + bW / 2} y={PAD.t + cH + 16}
              textAnchor="middle" fontSize="9" fill="#73726c">
              {label.length > 7 ? label.slice(0, 7) + "…" : label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, colors, showGrid }: { data: { x: string[]; y: number[] }; colors: string[]; showGrid: boolean }) {
  const W = 480, H = 260, PAD = { t: 16, r: 16, b: 48, l: 56 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...data.y) * 1.1;
  const pts = data.x.map((_, i) => ({
    x: PAD.l + (i / (data.x.length - 1)) * cW,
    y: PAD.t + cH - (data.y[i] / max) * cH,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = pathD + ` L${pts[pts.length - 1].x},${PAD.t + cH} L${pts[0].x},${PAD.t + cH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors[0]} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colors[0]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid && [0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.l} y1={PAD.t + cH * (1 - f)} x2={PAD.l + cW} y2={PAD.t + cH * (1 - f)}
          stroke="#e8e6e0" strokeWidth="0.5" />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={PAD.l - 8} y={PAD.t + cH * (1 - f) + 4} textAnchor="end" fontSize="9" fill="#b0aea6">
          {Math.round(max * f).toLocaleString()}
        </text>
      ))}
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={pathD} stroke={colors[0]} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill={colors[0]} />
          <text x={p.x} y={PAD.t + cH + 16} textAnchor="middle" fontSize="9" fill="#73726c">
            {data.x[i].length > 5 ? data.x[i].slice(0, 5) + "…" : data.x[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({ data, colors }: { data: { x: string[]; y: number[] }; colors: string[] }) {
  const W = 320, H = 260, cx = 130, cy = 125, r = 95, ir = 45;
  const total = data.y.reduce((a, b) => a + b, 0);
  let startAngle = -Math.PI / 2;
  const slices = data.x.map((label, i) => {
    const angle = (data.y[i] / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + ir * Math.cos(startAngle);
    const yi1 = cy + ir * Math.sin(startAngle);
    const xi2 = cx + ir * Math.cos(endAngle);
    const yi2 = cy + ir * Math.sin(endAngle);
    const midAngle = startAngle + angle / 2;
    const labelR = r + 18;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${xi2},${yi2} A${ir},${ir} 0 ${large} 0 ${xi1},${yi1} Z`;
    const pct = Math.round((data.y[i] / total) * 100);
    startAngle = endAngle;
    return { path, color: colors[i % colors.length], label, pct, lx, ly };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} opacity="0.9" />
        </g>
      ))}
      {/* Legend */}
      {slices.map((s, i) => (
        <g key={i}>
          <rect x={240} y={30 + i * 24} width={10} height={10} fill={s.color} rx="2" />
          <text x={255} y={40 + i * 24} fontSize="10" fill="#3d3d3a">{s.label}</text>
          <text x={255} y={52 + i * 24} fontSize="9" fill="#73726c">{s.pct}%</text>
        </g>
      ))}
    </svg>
  );
}

function ScatterChart({ data, colors, showGrid }: { data: { x: string[]; y: number[] }; colors: string[]; showGrid: boolean }) {
  const W = 480, H = 260, PAD = { t: 16, r: 16, b: 48, l: 56 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...data.y) * 1.1;
  // Generate scatter points from data
  const points = data.y.map((y, i) => ({
    x: PAD.l + (i / (data.y.length - 1)) * cW + (Math.random() - 0.5) * 30,
    y: PAD.t + cH - (y / max) * cH + (Math.random() - 0.5) * 20,
    color: colors[i % colors.length],
    label: data.x[i],
    val: y,
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {showGrid && [0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PAD.l} y1={PAD.t + cH * (1 - f)} x2={PAD.l + cW} y2={PAD.t + cH * (1 - f)}
          stroke="#e8e6e0" strokeWidth="0.5" />
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <text key={f} x={PAD.l - 8} y={PAD.t + cH * (1 - f) + 4} textAnchor="end" fontSize="9" fill="#b0aea6">
          {Math.round(max * f).toLocaleString()}
        </text>
      ))}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="6" fill={p.color} opacity="0.8" />
      ))}
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Visualize() {
  const { activeProjectId, projects } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);

  const [vizMode, setVizMode] = useState<"builder" | "powerbi">("builder");
  const [config, setConfig] = useState<ChartConfig>({
    type: "bar",
    title: "Revenue by Region",
    xAxis: "region",
    yAxis: "revenue",
    aggFn: "SUM",
    colorScheme: 0,
    showLegend: true,
    showGrid: true,
    stacked: false,
  });

  const [savedCharts, setSavedCharts] = useState<(ChartConfig & { id: string })[]>([]);
  const [activeChartId, setActiveChartId] = useState<string | null>(null);

  const upd = (patch: Partial<ChartConfig>) => setConfig(c => ({ ...c, ...patch }));
  const colors = COLOR_SCHEMES[config.colorScheme];
  const chartData = getChartData(config);

  const saveChart = () => {
    const id = crypto.randomUUID();
    const saved = { ...config, id, title: config.title || "Untitled chart" };
    setSavedCharts(prev => [saved, ...prev]);
    setActiveChartId(id);
  };

  const renderChart = () => {
    switch (config.type) {
      case "bar":     return <BarChart data={chartData} colors={colors} stacked={config.stacked} showGrid={config.showGrid} />;
      case "line":
      case "area":    return <LineChart data={chartData} colors={colors} showGrid={config.showGrid} />;
      case "pie":     return <PieChart data={chartData} colors={colors} />;
      case "scatter": return <ScatterChart data={chartData} colors={colors} showGrid={config.showGrid} />;
      default:        return <BarChart data={chartData} colors={colors} stacked={config.stacked} showGrid={config.showGrid} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "0.5px solid #e8e6e0", background: "white", flexShrink: 0 }}>
        {[
          { key: "builder", label: "📊 Chart Builder" },
          { key: "powerbi", label: "🖥️ Power BI Embed" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setVizMode(key as "builder" | "powerbi")}
            style={{
              padding: "10px 20px", border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: vizMode === key ? 600 : 400,
              color: vizMode === key ? "#534AB7" : "#73726c",
              background: "none",
              borderBottom: vizMode === key ? "2px solid #534AB7" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {vizMode === "powerbi" ? (
        <div style={{ flex: 1, overflow: "hidden" }}><PowerBIEmbed /></div>
      ) : (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* Left — chart type + config */}
      <div style={{ width: 260, borderRight: "0.5px solid #e8e6e0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e8e6e0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Chart Type</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {(Object.keys(CHART_ICONS) as ChartType[]).map(t => (
              <button key={t} onClick={() => upd({ type: t })}
                style={{
                  padding: "8px 4px", border: "0.5px solid",
                  borderColor: config.type === t ? "#534AB7" : "#e8e6e0",
                  borderRadius: 8, cursor: "pointer", textAlign: "center",
                  background: config.type === t ? "#EEEDFE" : "white",
                  transition: "all 0.15s",
                }}>
                <div style={{ fontSize: 16, marginBottom: 2, color: config.type === t ? "#534AB7" : "#73726c" }}>
                  {CHART_ICONS[t]}
                </div>
                <div style={{ fontSize: 10, fontWeight: config.type === t ? 600 : 400, color: config.type === t ? "#534AB7" : "#73726c" }}>
                  {CHART_LABELS[t]}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {/* Chart title */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Chart title</label>
            <input value={config.title} onChange={e => upd({ title: e.target.value })}
              placeholder="Enter chart title…" />
          </div>

          {/* Axes */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">X Axis (Category)</label>
            <select value={config.xAxis} onChange={e => upd({ xAxis: e.target.value })}>
              {CATEGORY_COLS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Y Axis (Value)</label>
            <select value={config.yAxis} onChange={e => upd({ yAxis: e.target.value })}>
              {NUMERIC_COLS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Aggregation</label>
            <select value={config.aggFn} onChange={e => upd({ aggFn: e.target.value as AggFn })}>
              {(["SUM", "AVG", "COUNT", "MIN", "MAX"] as AggFn[]).map(fn => (
                <option key={fn} value={fn}>{fn}</option>
              ))}
            </select>
          </div>

          <div className="divider" />

          {/* Color scheme */}
          <div style={{ marginBottom: 14 }}>
            <label className="label">Color Palette</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLOR_SCHEMES.map((scheme, si) => (
                <button key={si} onClick={() => upd({ colorScheme: si })}
                  style={{
                    display: "flex", gap: 1.5, padding: 3, borderRadius: 6, cursor: "pointer",
                    border: "1.5px solid", borderColor: config.colorScheme === si ? "#534AB7" : "#e8e6e0",
                    background: "white",
                  }}>
                  {scheme.slice(0, 4).map((c, ci) => (
                    <div key={ci} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                  ))}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          {[
            { key: "showGrid", label: "Show grid lines" },
            { key: "showLegend", label: "Show legend" },
            { key: "stacked", label: "Stacked (bar/area)" },
          ].map(opt => (
            <div key={opt.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#3d3d3a" }}>{opt.label}</span>
              <div onClick={() => upd({ [opt.key]: !config[opt.key as keyof ChartConfig] })}
                style={{
                  width: 32, height: 18, borderRadius: 18, cursor: "pointer", position: "relative",
                  transition: "background 0.2s",
                  background: config[opt.key as keyof ChartConfig] ? "#534AB7" : "#e8e6e0",
                }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%", background: "white",
                  position: "absolute", top: 3, transition: "left 0.2s",
                  left: config[opt.key as keyof ChartConfig] ? 17 : 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center — preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "0.5px solid #e8e6e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Preview</span>
            <span style={{ fontSize: 11, color: "#73726c", marginLeft: 8 }}>
              {config.aggFn}({config.yAxis}) by {config.xAxis}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" style={{ fontSize: 11 }}>⬇ Export PNG</button>
            <button className="btn btn-secondary" style={{ fontSize: 11 }}>⬇ Export HTML</button>
            <button className="btn btn-primary" onClick={saveChart} style={{ fontSize: 11 }}>+ Save chart</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Chart preview */}
          <div className="card" style={{ padding: "20px 24px" }}>
            {config.title && (
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#1a1a18" }}>{config.title}</div>
            )}
            {renderChart()}
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#f8f7f5", borderRadius: 8, fontSize: 11, color: "#73726c" }}>
              Data: {chartData.x.length} data points · {config.aggFn}({config.yAxis}) · Source: {project?.dataSources?.[0]?.name || "Sample data"}
            </div>
          </div>

          {/* Data table under chart */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#73726c", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Underlying Data
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 10px", background: "#f8f7f5", textAlign: "left", border: "0.5px solid #e8e6e0", fontWeight: 600 }}>{config.xAxis}</th>
                  <th style={{ padding: "6px 10px", background: "#f8f7f5", textAlign: "right", border: "0.5px solid #e8e6e0", fontWeight: 600 }}>{config.aggFn}({config.yAxis})</th>
                </tr>
              </thead>
              <tbody>
                {chartData.x.map((x, i) => (
                  <tr key={i}>
                    <td style={{ padding: "6px 10px", border: "0.5px solid #e8e6e0", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
                      {x}
                    </td>
                    <td style={{ padding: "6px 10px", border: "0.5px solid #e8e6e0", textAlign: "right", fontWeight: 500 }}>
                      {chartData.y[i].toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right — saved charts */}
      <div style={{ width: 220, borderLeft: "0.5px solid #e8e6e0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #e8e6e0" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Saved Charts</div>
          <div style={{ fontSize: 11, color: "#73726c", marginTop: 2 }}>{savedCharts.length} charts</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {savedCharts.length === 0 ? (
            <div style={{ padding: "20px 12px", textAlign: "center", color: "#b0aea6", fontSize: 11 }}>
              No saved charts yet. Click "Save chart" to add one.
            </div>
          ) : (
            savedCharts.map(c => (
              <div key={c.id}
                onClick={() => { setConfig(c); setActiveChartId(c.id); }}
                style={{
                  padding: "10px 12px", borderRadius: 8, marginBottom: 4, cursor: "pointer",
                  background: activeChartId === c.id ? "#EEEDFE" : "transparent",
                  border: "0.5px solid", borderColor: activeChartId === c.id ? "#AFA9EC" : "transparent",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (activeChartId !== c.id) (e.currentTarget as HTMLElement).style.background = "#f8f7f5"; }}
                onMouseLeave={e => { if (activeChartId !== c.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16, color: activeChartId === c.id ? "#534AB7" : "#73726c" }}>
                    {CHART_ICONS[c.type]}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{c.title || "Untitled"}</span>
                </div>
                <div style={{ fontSize: 10, color: "#73726c" }}>
                  {CHART_LABELS[c.type]} · {c.aggFn}({c.yAxis}) by {c.xAxis}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
    )}
    </div>
  );
}
