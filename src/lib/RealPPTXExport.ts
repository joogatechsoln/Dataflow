/**
 * RealPPTXExport.ts — DataFlow Suite Phase 7
 * Real PowerPoint export for the Report tab using pptxgenjs.
 * This is a Pro-gated feature.
 *
 * Install: npm install pptxgenjs
 *
 * Usage (inside Report.tsx, wrapped in <ProGate>):
 *   import { exportReportToPPTX } from "../../../lib/RealPPTXExport";
 *   await exportReportToPPTX({ title, summary, findings, kpis, chartImageUrl });
 */

export interface PPTXExportData {
  title: string;
  projectName?: string;
  summary: string;
  kpis: { label: string; value: string; dir?: "up" | "down" | "neutral" }[];
  findings: { title: string; body: string }[];
  recommendations: string[];
  /** Optional PNG chart image (base64 data URL) */
  chartImageUrl?: string;
}

// ── Brand colours ─────────────────────────────────────────────────────────────

const BRAND   = "534AB7";
const TEAL    = "1D9E75";
const DANGER  = "E24B4A";
const AMBER   = "BA7517";
const SUBTEXT = "73726C";
const BORDER  = "E8E6E0";
const BG_LIGHT= "F5F5F4";
const WHITE   = "FFFFFF";

// ── pptxgenjs helper types (minimal, to avoid needing @types/pptxgenjs) ───────
type Presentation = {
  layout: string;
  defineSlideMaster: (opts: unknown) => void;
  addSlide: (opts?: { masterName?: string }) => Slide;
  writeFile: (opts: { fileName: string }) => Promise<void>;
};
type Slide = {
  addText: (text: string | TextItem[], opts: unknown) => void;
  addShape: (shape: string, opts: unknown) => void;
  addImage: (opts: unknown) => void;
  addTable: (rows: unknown[], opts: unknown) => void;
};
type TextItem = { text: string; options?: Record<string, unknown> };

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportReportToPPTX(data: PPTXExportData): Promise<void> {
  // Lazy-load pptxgenjs so it's not in the initial bundle
  const PptxGenJS = (await import(/* webpackChunkName: "pptxgenjs" */ "pptxgenjs")).default;

  const prs = new PptxGenJS() as unknown as Presentation;
  prs.layout = "LAYOUT_WIDE"; // 13.33 × 7.5 in

  // ── Slide master ──────────────────────────────────────────────────────────
  prs.defineSlideMaster({
    title: "DATAFLOW_MASTER",
    background: { color: WHITE },
    objects: [
      // Left brand strip
      { rect: { x: 0, y: 0, w: 0.12, h: "100%", fill: { color: BRAND } } },
      // Bottom bar
      { rect: { x: 0, y: 6.9, w: "100%", h: 0.35, fill: { color: BG_LIGHT } } },
      { text: {
        text: "DataFlow Suite",
        options: {
          x: 0.2, y: 7.0, w: 4, h: 0.2,
          fontSize: 8, color: SUBTEXT, fontFace: "Arial",
        },
      }},
    ],
  });

  // ── Slide 1: Cover ────────────────────────────────────────────────────────
  {
    const slide = prs.addSlide({ masterName: "DATAFLOW_MASTER" });

    // Background header block
    slide.addShape("rect", {
      x: 0, y: 0, w: "100%", h: 3.8,
      fill: { color: BRAND },
    });

    slide.addText("DataFlow Suite Report", {
      x: 0.5, y: 0.6, w: 12, h: 0.5,
      fontSize: 11, color: "AAAAEE", bold: false, fontFace: "Arial",
    });
    slide.addText(data.title || "Analytics Report", {
      x: 0.5, y: 1.2, w: 12, h: 1.2,
      fontSize: 36, color: WHITE, bold: true, fontFace: "Arial",
      wrap: true,
    });
    if (data.projectName) {
      slide.addText(`Project: ${data.projectName}`, {
        x: 0.5, y: 2.6, w: 8, h: 0.4,
        fontSize: 11, color: "CCCCFF", fontFace: "Arial",
      });
    }
    slide.addText(
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      { x: 0.5, y: 3.0, w: 8, h: 0.3, fontSize: 10, color: "AAAAEE", fontFace: "Arial" }
    );

    // Summary below header
    slide.addText("Executive Summary", {
      x: 0.5, y: 4.1, w: 12, h: 0.4, fontSize: 13, color: BRAND, bold: true, fontFace: "Arial",
    });
    slide.addText(data.summary || "No summary provided.", {
      x: 0.5, y: 4.6, w: 12, h: 2.0, fontSize: 10, color: SUBTEXT, fontFace: "Arial",
      wrap: true, valign: "top",
    });
  }

  // ── Slide 2: KPIs ─────────────────────────────────────────────────────────
  if (data.kpis.length > 0) {
    const slide = prs.addSlide({ masterName: "DATAFLOW_MASTER" });

    slide.addText("Key Metrics", {
      x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 20, color: BRAND, bold: true, fontFace: "Arial",
    });
    slide.addShape("line", {
      x: 0.5, y: 0.85, w: 12.3, h: 0, line: { color: BORDER, width: 1 },
    });

    const cols = Math.min(data.kpis.length, 3);
    const cardW = 12.3 / cols - 0.1;

    data.kpis.slice(0, 6).forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = 0.5 + col * (cardW + 0.12);
      const cy = 1.1 + row * 2.2;
      const dirColor = kpi.dir === "up" ? TEAL : kpi.dir === "down" ? DANGER : BRAND;

      slide.addShape("rect", {
        x: cx, y: cy, w: cardW, h: 1.9,
        fill: { color: BG_LIGHT }, line: { color: BORDER, width: 0.5 },
        shadow: { type: "outer", color: "000000", opacity: 0.06, blur: 4, offset: 2, angle: 270 },
      });
      // Brand accent left edge
      slide.addShape("rect", { x: cx, y: cy, w: 0.06, h: 1.9, fill: { color: dirColor } });

      slide.addText(kpi.value, {
        x: cx + 0.2, y: cy + 0.3, w: cardW - 0.3, h: 0.7,
        fontSize: 28, color: dirColor, bold: true, fontFace: "Arial",
      });
      slide.addText(kpi.label, {
        x: cx + 0.2, y: cy + 1.15, w: cardW - 0.3, h: 0.4,
        fontSize: 9, color: SUBTEXT, fontFace: "Arial",
      });
    });
  }

  // ── Slide 3: Chart ────────────────────────────────────────────────────────
  if (data.chartImageUrl?.startsWith("data:image/png")) {
    const slide = prs.addSlide({ masterName: "DATAFLOW_MASTER" });

    slide.addText("Chart", {
      x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 20, color: BRAND, bold: true, fontFace: "Arial",
    });

    try {
      slide.addImage({
        data: data.chartImageUrl,
        x: 0.5, y: 1.0, w: 12.3, h: 5.5,
      });
    } catch {
      slide.addText("Chart could not be embedded.", {
        x: 0.5, y: 3.5, w: 12, h: 0.5, fontSize: 11, color: SUBTEXT, fontFace: "Arial", align: "center",
      });
    }
  }

  // ── Slide 4: Key Findings ─────────────────────────────────────────────────
  if (data.findings.length > 0) {
    // Split into pages of 4 findings each
    const pages = [];
    for (let i = 0; i < data.findings.length; i += 4) {
      pages.push(data.findings.slice(i, i + 4));
    }

    pages.forEach((group, pi) => {
      const slide = prs.addSlide({ masterName: "DATAFLOW_MASTER" });

      slide.addText(`Key Findings${pages.length > 1 ? ` (${pi + 1}/${pages.length})` : ""}`, {
        x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 20, color: BRAND, bold: true, fontFace: "Arial",
      });
      slide.addShape("line", {
        x: 0.5, y: 0.85, w: 12.3, h: 0, line: { color: BORDER, width: 1 },
      });

      group.forEach((finding, i) => {
        const fy = 1.0 + i * 1.4;
        slide.addShape("rect", {
          x: 0.5, y: fy, w: 12.3, h: 1.25,
          fill: { color: BG_LIGHT }, line: { color: BORDER, width: 0.5 },
        });
        slide.addShape("rect", { x: 0.5, y: fy, w: 0.06, h: 1.25, fill: { color: BRAND } });

        slide.addText(finding.title, {
          x: 0.75, y: fy + 0.1, w: 11.8, h: 0.35,
          fontSize: 11, color: "1A1A18", bold: true, fontFace: "Arial",
        });
        slide.addText(finding.body, {
          x: 0.75, y: fy + 0.5, w: 11.8, h: 0.65,
          fontSize: 9, color: SUBTEXT, fontFace: "Arial", wrap: true,
        });
      });
    });
  }

  // ── Slide 5: Recommendations ──────────────────────────────────────────────
  if (data.recommendations.length > 0) {
    const slide = prs.addSlide({ masterName: "DATAFLOW_MASTER" });

    slide.addText("Recommendations", {
      x: 0.5, y: 0.3, w: 12, h: 0.5, fontSize: 20, color: BRAND, bold: true, fontFace: "Arial",
    });
    slide.addShape("line", {
      x: 0.5, y: 0.85, w: 12.3, h: 0, line: { color: BORDER, width: 1 },
    });

    const rows = data.recommendations.slice(0, 8).map((rec, i) => [
      { text: `${i + 1}`, options: { bold: true, fontSize: 10, align: "center", color: WHITE, fill: { color: BRAND } } },
      { text: rec, options: { fontSize: 10, color: "1A1A18", wrap: true } },
    ]);

    slide.addTable(rows, {
      x: 0.5, y: 1.0, w: 12.3,
      colW: [0.4, 11.9],
      border: { type: "solid", color: BORDER, pt: 0.5 },
      rowH: 0.55,
    });
  }

  // ── Write file ────────────────────────────────────────────────────────────
  const fileName = `${(data.title || "report").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pptx`;
  await prs.writeFile({ fileName });
}
