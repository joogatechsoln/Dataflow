/**
 * ChartEnhancements.tsx — DataFlow Suite Phase 7
 * Adds to the Visualize tab:
 *   - Data labels toggle (show values on bars/lines/pie slices)
 *   - Chart annotations (horizontal reference lines with labels)
 *   - Zoom / pan controls (reset, zoom in/out via ECharts dataZoom)
 *   - Download as PNG or SVG
 *
 * This exports a <ChartToolbar> component that wraps the chart canvas,
 * and a <AnnotationPanel> for managing reference lines.
 *
 * Usage in Visualize.tsx:
 *   import { ChartToolbar, AnnotationPanel, ChartEnhancementsState, useChartEnhancements }
 *     from "./ChartEnhancements";
 */

import { useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Annotation {
  id: string;
  value: number;
  label: string;
  color: string;
  style: "solid" | "dashed" | "dotted";
}

export interface ChartEnhancementsState {
  showDataLabels: boolean;
  annotations: Annotation[];
  zoomLevel: number; // 0 = full view, 1–100 = dataZoom start %
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChartEnhancements() {
  const [state, setState] = useState<ChartEnhancementsState>({
    showDataLabels: false,
    annotations: [],
    zoomLevel: 0,
  });

  const toggleDataLabels = useCallback(() => {
    setState((s) => ({ ...s, showDataLabels: !s.showDataLabels }));
  }, []);

  const addAnnotation = useCallback((ann: Omit<Annotation, "id">) => {
    setState((s) => ({
      ...s,
      annotations: [
        ...s.annotations,
        { ...ann, id: `ann-${Date.now()}` },
      ],
    }));
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      annotations: s.annotations.filter((a) => a.id !== id),
    }));
  }, []);

  const setZoom = useCallback((level: number) => {
    setState((s) => ({ ...s, zoomLevel: level }));
  }, []);

  const resetZoom = useCallback(() => {
    setState((s) => ({ ...s, zoomLevel: 0 }));
  }, []);

  return {
    state,
    toggleDataLabels,
    addAnnotation,
    removeAnnotation,
    setZoom,
    resetZoom,
  };
}

// ── buildEChartsOptions helper ────────────────────────────────────────────────
// Call this to merge enhancement state into existing ECharts option objects.

export function applyEnhancements(
  baseOption: Record<string, unknown>,
  enhancements: ChartEnhancementsState
): Record<string, unknown> {
  const option = { ...baseOption };

  // ── Data labels ──────────────────────────────────────────────────────────
  if (enhancements.showDataLabels && Array.isArray(option.series)) {
    option.series = (option.series as Record<string, unknown>[]).map((s) => ({
      ...s,
      label: {
        show: true,
        position: "top",
        fontSize: 10,
        color: "#5F5E5A",
        formatter: (params: { value: number }) =>
          typeof params.value === "number"
            ? params.value >= 1000
              ? `${(params.value / 1000).toFixed(1)}k`
              : String(params.value)
            : "",
      },
    }));
  }

  // ── Annotations (markLine) ───────────────────────────────────────────────
  if (enhancements.annotations.length > 0 && Array.isArray(option.series)) {
    const firstSeries = (option.series as Record<string, unknown>[])[0];
    if (firstSeries) {
      const markLines = enhancements.annotations.map((ann) => ({
        yAxis: ann.value,
        lineStyle: {
          color: ann.color,
          type: ann.style,
          width: 1.5,
        },
        label: {
          show: true,
          position: "end",
          formatter: ann.label,
          fontSize: 10,
          color: ann.color,
        },
      }));

      (option.series as Record<string, unknown>[])[0] = {
        ...firstSeries,
        markLine: {
          silent: true,
          symbol: ["none", "none"],
          data: markLines,
        },
      };
    }
  }

  // ── Zoom ─────────────────────────────────────────────────────────────────
  if (enhancements.zoomLevel > 0) {
    const start = Math.max(0, enhancements.zoomLevel);
    const end = Math.min(100, enhancements.zoomLevel + 40);
    option.dataZoom = [
      { type: "inside", start, end },
      { type: "slider", start, end, height: 20, bottom: 4 },
    ];
  } else {
    option.dataZoom = [];
  }

  return option;
}

// ── ChartToolbar ──────────────────────────────────────────────────────────────

interface ChartToolbarProps {
  state: ChartEnhancementsState;
  onToggleDataLabels: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  /** echarts instance ref for export */
  echartsInstance?: { getDataURL: (opts: { type: string; pixelRatio: number; backgroundColor: string }) => string } | null;
  onShowAnnotations: () => void;
}

export function ChartToolbar({
  state,
  onToggleDataLabels,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  echartsInstance,
  onShowAnnotations,
}: ChartToolbarProps) {
  const handleDownloadPNG = () => {
    if (!echartsInstance) return;
    const url = echartsInstance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = "chart.png";
    a.click();
  };

  const handleDownloadSVG = () => {
    if (!echartsInstance) return;
    const url = echartsInstance.getDataURL({ type: "svg", pixelRatio: 1, backgroundColor: "#fff" });
    const blob = new Blob([atob(url.split(",")[1])], { type: "image/svg+xml" });
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = "chart.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  };

  const BtnStyle = (active = false): React.CSSProperties => ({
    padding: "5px 9px", borderRadius: 6, fontSize: 11,
    cursor: "pointer", border: "0.5px solid",
    borderColor: active ? "#534AB7" : "#e8e6e0",
    background: active ? "#EEEDFE" : "white",
    color: active ? "#534AB7" : "#73726c",
    fontWeight: active ? 600 : 400,
    transition: "all 0.12s",
    display: "flex", alignItems: "center", gap: 4,
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 10px", borderBottom: "0.5px solid #f0ede8",
      background: "#fafaf9", flexWrap: "wrap",
    }}>
      {/* Data labels */}
      <button style={BtnStyle(state.showDataLabels)} onClick={onToggleDataLabels}>
        <span>🏷️</span> Labels
      </button>

      {/* Annotations */}
      <button style={BtnStyle(state.annotations.length > 0)} onClick={onShowAnnotations}>
        <span>📏</span> Annotations
        {state.annotations.length > 0 && (
          <span style={{
            fontSize: 9, background: "#534AB7", color: "white",
            borderRadius: 10, padding: "0 4px",
          }}>
            {state.annotations.length}
          </span>
        )}
      </button>

      <div style={{ width: 1, height: 16, background: "#e8e6e0" }} />

      {/* Zoom controls */}
      <div style={{ display: "flex", gap: 2 }}>
        <button style={BtnStyle()} onClick={onZoomOut} title="Zoom out">−</button>
        <button style={BtnStyle()} onClick={onResetZoom} title="Reset zoom">⊡</button>
        <button style={BtnStyle()} onClick={onZoomIn} title="Zoom in">+</button>
      </div>

      <div style={{ width: 1, height: 16, background: "#e8e6e0" }} />

      {/* Download */}
      <div style={{ display: "flex", gap: 4 }}>
        <button
          style={BtnStyle()}
          onClick={handleDownloadPNG}
          title={echartsInstance ? "Download PNG" : "Render a chart first"}
          disabled={!echartsInstance}
        >
          ⬇ PNG
        </button>
        <button
          style={BtnStyle()}
          onClick={handleDownloadSVG}
          title={echartsInstance ? "Download SVG" : "Render a chart first"}
          disabled={!echartsInstance}
        >
          ⬇ SVG
        </button>
      </div>
    </div>
  );
}

// ── AnnotationPanel ───────────────────────────────────────────────────────────

const ANNOTATION_COLORS = ["#534AB7", "#1D9E75", "#E24B4A", "#BA7517", "#3B82F6"];

interface AnnotationPanelProps {
  open: boolean;
  onClose: () => void;
  annotations: Annotation[];
  onAdd: (ann: Omit<Annotation, "id">) => void;
  onRemove: (id: string) => void;
}

export function AnnotationPanel({ open, onClose, annotations, onAdd, onRemove }: AnnotationPanelProps) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(ANNOTATION_COLORS[0]);
  const [style, setStyle] = useState<Annotation["style"]>("dashed");

  if (!open) return null;

  const handleAdd = () => {
    const num = parseFloat(value);
    if (isNaN(num) || !label.trim()) return;
    onAdd({ value: num, label: label.trim(), color, style });
    setValue("");
    setLabel("");
  };

  return (
    <div style={{
      position: "absolute", top: 48, right: 12, zIndex: 100,
      background: "white", border: "0.5px solid #e8e6e0",
      borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      padding: 16, width: 260,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Reference Lines</span>
        <button className="btn btn-ghost" style={{ padding: "3px 6px", fontSize: 12 }} onClick={onClose}>✕</button>
      </div>

      {/* Existing annotations */}
      {annotations.length === 0 ? (
        <div style={{ fontSize: 11, color: "#b0aea6", marginBottom: 12, textAlign: "center" }}>
          No reference lines yet
        </div>
      ) : (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {annotations.map((ann) => (
            <div key={ann.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 8px", background: "#f5f5f4", borderRadius: 6,
            }}>
              <div style={{
                width: 24, height: 3, borderRadius: 2,
                background: ann.color,
                borderBottom: ann.style === "dashed" ? `2px dashed ${ann.color}` : undefined,
              }} />
              <span style={{ flex: 1, fontSize: 11 }}>{ann.label} ({ann.value})</span>
              <button
                onClick={() => onRemove(ann.id)}
                style={{ background: "none", border: "none", color: "#b0aea6", cursor: "pointer", fontSize: 12 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="number"
          placeholder="Y value (e.g. 50000)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ fontSize: 11, padding: "6px 8px" }}
        />
        <input
          placeholder="Label (e.g. Target)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ fontSize: 11, padding: "6px 8px" }}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {ANNOTATION_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 16, height: 16, borderRadius: "50%", background: c,
                border: color === c ? "2px solid #1a1a18" : "2px solid transparent",
                cursor: "pointer",
              }}
            />
          ))}
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as Annotation["style"])}
            style={{ fontSize: 10, padding: "3px 5px", flex: 1 }}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </div>
        <button
          className="btn btn-primary"
          style={{ fontSize: 11, padding: "6px 10px" }}
          onClick={handleAdd}
          disabled={!value || !label}
        >
          Add reference line
        </button>
      </div>
    </div>
  );
}
