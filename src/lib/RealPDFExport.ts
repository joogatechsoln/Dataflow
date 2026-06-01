/**
 * RealPDFExport.ts — DataFlow Suite Phase 7
 * Real PDF generation for the Report tab using pdf-lib.
 * Replaces the Phase 2 stub that only showed a toast.
 *
 * Install: npm install pdf-lib
 *
 * Usage:
 *   import { exportReportToPDF } from "../../../lib/RealPDFExport";
 *   await exportReportToPDF({ title, summary, findings, recommendations, kpis });
 */

// pdf-lib is lazy-imported so it doesn't block initial bundle load.
// The types below match what pdf-lib exposes at runtime.

export interface ReportExportData {
  title: string;
  projectName?: string;
  summary: string;
  kpis: { label: string; value: string; dir?: "up" | "down" | "neutral" }[];
  findings: { title: string; body: string }[];
  recommendations: string[];
  /** Optional chart image (base64 data URL) */
  chartImageUrl?: string;
  generatedBy?: string;
}

// ── Colour palette (matches DataFlow design system) ──────────────────────────

const BRAND     = { r: 83/255,  g: 74/255,  b: 183/255 } as const; // #534AB7
const TEAL      = { r: 29/255,  g: 158/255, b: 117/255 } as const; // #1D9E75
const DANGER    = { r: 226/255, g: 75/255,  b: 74/255  } as const; // #E24B4A
const AMBER     = { r: 186/255, g: 117/255, b: 23/255  } as const; // #BA7517
const TEXT      = { r: 26/255,  g: 26/255,  b: 24/255  } as const;
const SUBTEXT   = { r: 115/255, g: 114/255, b: 108/255 } as const;
const BORDER    = { r: 232/255, g: 230/255, b: 224/255 } as const;
const BG        = { r: 245/255, g: 245/255, b: 244/255 } as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hex(r: number, g: number, b: number) {
  return { r, g, b };
}

/** Wrap text to lines of maxChars width */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Main export function ──────────────────────────────────────────────────────

export async function exportReportToPDF(data: ReportExportData): Promise<void> {
  // Lazy-load pdf-lib
  const { PDFDocument, rgb, StandardFonts, LineCapStyle } = await import(
    /* webpackChunkName: "pdf-lib" */ "pdf-lib"
  );

  const doc = await PDFDocument.create();
  const font      = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold  = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;   // A4 width pt
  const PAGE_H = 842;   // A4 height pt
  const MARGIN  = 48;
  const COL_W   = PAGE_W - MARGIN * 2;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // ── Helper: ensure we have space or add a new page ──────────────────────
  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 20) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawText = (
    text: string,
    opts: {
      x?: number; size?: number; bold?: boolean;
      color?: { r: number; g: number; b: number };
      maxWidth?: number;
    } = {}
  ) => {
    const {
      x = MARGIN, size = 11, bold = false,
      color = TEXT, maxWidth,
    } = opts;
    const f = bold ? fontBold : font;
    const drawn = maxWidth
      ? text.slice(0, Math.floor(maxWidth / (size * 0.55)))
      : text;
    page.drawText(drawn, { x, y, size, font: f, color: rgb(color.r, color.g, color.b) });
    y -= size + 4;
  };

  const drawLine = (alpha = 1) => {
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5, color: rgb(BORDER.r, BORDER.g, BORDER.b), opacity: alpha,
    });
    y -= 8;
  };

  const drawRect = (
    rx: number, ry: number, rw: number, rh: number,
    color: { r: number; g: number; b: number }, opacity = 1
  ) => {
    page.drawRectangle({ x: rx, y: ry - rh, width: rw, height: rh, color: rgb(color.r, color.g, color.b), opacity });
  };

  // ── Cover header ─────────────────────────────────────────────────────────
  drawRect(0, PAGE_H, PAGE_W, 120, BRAND);
  y = PAGE_H - 28;
  drawText("DataFlow Suite", { x: MARGIN, size: 10, color: { r: 0.7, g: 0.7, b: 1 }, bold: false });
  y += 4 + 10;
  drawText(data.title || "Analytics Report", { x: MARGIN, size: 22, bold: true, color: { r: 1, g: 1, b: 1 } });
  y -= 2;
  if (data.projectName) {
    drawText(`Project: ${data.projectName}`, { x: MARGIN, size: 10, color: { r: 0.8, g: 0.8, b: 0.95 } });
  }
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  drawText(`Generated ${dateStr}${data.generatedBy ? " · " + data.generatedBy : ""}`, {
    x: MARGIN, size: 9, color: { r: 0.7, g: 0.7, b: 0.9 },
  });

  y = PAGE_H - 140;

  // ── Executive Summary ─────────────────────────────────────────────────────
  y -= 16;
  drawText("Executive Summary", { size: 14, bold: true });
  drawLine();
  const summaryLines = wrapText(data.summary || "No summary provided.", 90);
  summaryLines.forEach((line) => {
    ensureSpace(18);
    drawText(line, { size: 10, color: SUBTEXT });
    y += 4;
  });
  y -= 12;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  if (data.kpis.length > 0) {
    ensureSpace(80);
    drawText("Key Metrics", { size: 14, bold: true });
    drawLine();

    const kpiW = (COL_W - 8 * (data.kpis.length - 1)) / Math.min(data.kpis.length, 3);
    const kpiH = 52;
    const kpiRowY = y;

    data.kpis.slice(0, 6).forEach((kpi, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const kx = MARGIN + col * (kpiW + 8);
      const ky = kpiRowY - row * (kpiH + 8);

      drawRect(kx, ky, kpiW, kpiH, BG, 1);
      page.drawRectangle({
        x: kx, y: ky - kpiH, width: 3, height: kpiH,
        color: rgb(BRAND.r, BRAND.g, BRAND.b),
      });

      const dirColor = kpi.dir === "up" ? TEAL : kpi.dir === "down" ? DANGER : SUBTEXT;
      page.drawText(kpi.value, {
        x: kx + 10, y: ky - 20, size: 14, font: fontBold, color: rgb(dirColor.r, dirColor.g, dirColor.b),
      });
      page.drawText(kpi.label, {
        x: kx + 10, y: ky - 36, size: 8, font, color: rgb(SUBTEXT.r, SUBTEXT.g, SUBTEXT.b),
      });
    });

    const kpiRows = Math.ceil(Math.min(data.kpis.length, 6) / 3);
    y = kpiRowY - kpiRows * (kpiH + 8) - 12;
  }

  // ── Chart image (if provided) ─────────────────────────────────────────────
  if (data.chartImageUrl?.startsWith("data:image/png")) {
    try {
      ensureSpace(220);
      y -= 8;
      drawText("Charts", { size: 14, bold: true });
      drawLine();

      const base64 = data.chartImageUrl.split(",")[1];
      const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const pdfImg = await doc.embedPng(imgBytes);
      const imgH = Math.min(180, (pdfImg.height / pdfImg.width) * COL_W);
      ensureSpace(imgH + 16);
      page.drawImage(pdfImg, { x: MARGIN, y: y - imgH, width: COL_W, height: imgH });
      y -= imgH + 16;
    } catch {
      // Ignore chart embedding errors — image may be SVG or invalid
    }
  }

  // ── Key Findings ──────────────────────────────────────────────────────────
  if (data.findings.length > 0) {
    ensureSpace(60);
    y -= 8;
    drawText("Key Findings", { size: 14, bold: true });
    drawLine();

    data.findings.forEach((finding, i) => {
      ensureSpace(50);
      drawRect(MARGIN, y + 4, COL_W, 24, BG);
      drawText(`${i + 1}.  ${finding.title}`, { x: MARGIN + 8, size: 10, bold: true, color: TEXT });
      y -= 2;
      const bodyLines = wrapText(finding.body, 95);
      bodyLines.slice(0, 3).forEach((line) => {
        ensureSpace(16);
        drawText(line, { x: MARGIN + 14, size: 9, color: SUBTEXT });
        y += 3;
      });
      y -= 10;
    });
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (data.recommendations.length > 0) {
    ensureSpace(60);
    y -= 8;
    drawText("Recommendations", { size: 14, bold: true });
    drawLine();

    data.recommendations.forEach((rec, i) => {
      ensureSpace(30);
      page.drawCircle({ x: MARGIN + 6, y: y + 1, size: 3, color: rgb(BRAND.r, BRAND.g, BRAND.b) });
      const recLines = wrapText(`${i + 1}. ${rec}`, 92);
      recLines.forEach((line, li) => {
        ensureSpace(16);
        drawText(line, { x: MARGIN + 16, size: 10, color: li === 0 ? TEXT : SUBTEXT });
        y += 3;
      });
      y -= 8;
    });
  }

  // ── Footer on each page ───────────────────────────────────────────────────
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`DataFlow Suite  ·  Page ${i + 1} of ${pages.length}`, {
      x: MARGIN, y: 24, size: 8, font,
      color: rgb(SUBTEXT.r, SUBTEXT.g, SUBTEXT.b),
    });
    p.drawLine({
      start: { x: MARGIN, y: 36 }, end: { x: PAGE_W - MARGIN, y: 36 },
      thickness: 0.5, color: rgb(BORDER.r, BORDER.g, BORDER.b),
    });
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  const bytes = await doc.save();
  const pdfBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(data.title || "report").replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
