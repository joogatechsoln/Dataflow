import { useState, useEffect, useRef } from "react";
import { useProjectStore, PipelineStep } from "../../store/projectStore";

interface TooltipDef {
  id: string;
  title: string;
  body: string;
  step: PipelineStep | "all";
  position?: "top" | "bottom" | "left" | "right";
}

// Guided hints per pipeline step
const STEP_HINTS: Record<PipelineStep | "all", TooltipDef[]> = {
  all: [],
  define: [
    {
      id: "define-1",
      title: "Start with a clear question",
      body: "The most important part of any analysis is knowing exactly what you're trying to find out. A vague question leads to a vague (useless) answer.",
      step: "define",
    },
    {
      id: "define-2",
      title: "Think about your audience",
      body: "Who will read your findings? A CEO needs a 1-page summary. A data engineer wants the details. Define this now so you know how to frame your report.",
      step: "define",
    },
  ],
  collect: [
    {
      id: "collect-1",
      title: "Start small with your data",
      body: "Don't try to connect everything at once. Start with one CSV or one database table. You can add more sources once your pipeline is working.",
      step: "collect",
    },
    {
      id: "collect-2",
      title: "Check your permissions",
      body: "Before connecting a live database, make sure you have read-only access. Never run analysis on a production database with write access.",
      step: "collect",
    },
  ],
  clean: [
    {
      id: "clean-1",
      title: "Run Auto-Scan first",
      body: "Click 'Auto-Scan' to let DataFlow find all issues automatically. It checks for nulls, duplicates, type mismatches, and outliers in seconds.",
      step: "clean",
    },
    {
      id: "clean-2",
      title: "Review before fixing",
      body: "Don't click 'Fix All' without reviewing the issues list. Sometimes what looks like an error is actually valid data — for example, a null might mean 'not applicable', not 'missing'.",
      step: "clean",
    },
    {
      id: "clean-3",
      title: "The audit log is your friend",
      body: "Every change is recorded. If you accidentally fix something you shouldn't have, the audit log shows exactly what changed and when.",
      step: "clean",
    },
  ],
  analyze: [
    {
      id: "analyze-1",
      title: "Start with simple queries",
      body: "Before writing complex JOINs, start by exploring individual tables: SELECT * FROM your_table LIMIT 100. Understand the shape of your data first.",
      step: "analyze",
    },
    {
      id: "analyze-2",
      title: "Use the AI assistant for SQL help",
      body: "Stuck on a query? Open the AI assistant (top right) and describe what you want in plain English. It will write the SQL for you and explain how it works.",
      step: "analyze",
    },
  ],
  visualize: [
    {
      id: "viz-1",
      title: "Choose the right chart type",
      body: "Bar charts compare categories. Line charts show trends over time. Scatter plots reveal correlations. Pie charts show parts of a whole (use sparingly — max 5 slices).",
      step: "visualize",
    },
    {
      id: "viz-2",
      title: "Less is more",
      body: "A good chart has one clear message. If you're trying to show too many things at once, split into multiple charts.",
      step: "visualize",
    },
  ],
  report: [
    {
      id: "report-1",
      title: "Lead with the conclusion",
      body: "Put your most important finding at the top. Most readers won't get past the first section — make sure they leave knowing your key insight.",
      step: "report",
    },
    {
      id: "report-2",
      title: "Use specific numbers",
      body: "\"Revenue increased significantly\" is weak. \"Revenue increased 34% in Q3\" is strong. Always quantify your findings.",
      step: "report",
    },
  ],
};

interface GuidedModeProps {
  enabled: boolean;
  onDisable: () => void;
}

export function GuidedModeOverlay({ enabled, onDisable }: GuidedModeProps) {
  const { activePipelineTab } = useProjectStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentHintIdx, setCurrentHintIdx] = useState(0);

  const hints = STEP_HINTS[activePipelineTab] ?? [];
  const activeHints = hints.filter((h) => !dismissed.has(h.id));
  const currentHint = activeHints[currentHintIdx];

  useEffect(() => {
    setCurrentHintIdx(0);
  }, [activePipelineTab]);

  if (!enabled || !currentHint) return null;

  const dismissHint = () => {
    setDismissed((d) => new Set([...d, currentHint.id]));
    setCurrentHintIdx(0);
  };

  const nextHint = () => {
    if (currentHintIdx < activeHints.length - 1) {
      setCurrentHintIdx((i) => i + 1);
    } else {
      dismissHint();
    }
  };

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      width: 300, zIndex: 1000,
      animation: "slideUp 0.25s ease",
    }}>
      <div style={{
        background: "white",
        border: "0.5px solid var(--brand-border)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(83,74,183,0.18), 0 2px 8px rgba(0,0,0,0.08)",
      }}>
        {/* Header */}
        <div style={{
          padding: "10px 14px",
          background: "linear-gradient(135deg, #534AB7, #7C6FE0)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "white" }}>Guided Mode</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>
              Hint {currentHintIdx + 1} of {activeHints.length} for {activePipelineTab}
            </div>
          </div>
          <button
            onClick={onDisable}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              color: "white", cursor: "pointer", padding: "3px 8px",
              borderRadius: 6, fontSize: 11, fontWeight: 500,
            }}
          >
            Turn off
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1a1a18" }}>
            {currentHint.title}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.65, color: "#3d3d3a" }}>
            {currentHint.body}
          </div>
        </div>

        {/* Progress dots */}
        {activeHints.length > 1 && (
          <div style={{ padding: "0 16px", display: "flex", gap: 5 }}>
            {activeHints.map((_, i) => (
              <div key={i} style={{
                width: i === currentHintIdx ? 16 : 6,
                height: 6, borderRadius: 3,
                background: i === currentHintIdx ? "var(--brand)" : "#e8e6e0",
                transition: "all 0.2s",
                cursor: "pointer",
              }} onClick={() => setCurrentHintIdx(i)} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{
          padding: "12px 16px",
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button
            onClick={dismissHint}
            style={{
              fontSize: 11.5, color: "#73726c", background: "none",
              border: "none", cursor: "pointer", fontWeight: 500,
              padding: "5px 8px",
            }}
          >
            Dismiss
          </button>
          <button
            onClick={nextHint}
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "6px 14px" }}
          >
            {currentHintIdx < activeHints.length - 1 ? "Next tip →" : "Got it ✓"}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}

// Inline tooltip — wrap any element with this for a hover tooltip
interface InlineTooltipProps {
  children: React.ReactNode;
  tip: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ children, tip, position = "top" }: InlineTooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const offsets: Record<string, React.CSSProperties> = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  };

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: "absolute",
          ...offsets[position],
          background: "#1a1a18",
          color: "white",
          fontSize: 11.5,
          lineHeight: 1.5,
          padding: "6px 10px",
          borderRadius: 7,
          maxWidth: 240,
          whiteSpace: "normal" as React.CSSProperties["whiteSpace"],
          zIndex: 9999,
          pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          animation: "tooltipFade 0.12s ease",
        }}>
          {tip}
          <style>{`@keyframes tooltipFade { from { opacity:0; } to { opacity:1; } }`}</style>
        </div>
      )}
    </div>
  );
}

// Beginner mode toggle + guided mode manager
interface GuidedModeBannerProps {
  guidedMode: boolean;
  onToggle: () => void;
}

export function GuidedModeBanner({ guidedMode, onToggle }: GuidedModeBannerProps) {
  if (guidedMode) return null;
  return (
    <div style={{
      padding: "8px 16px",
      background: "var(--brand-light)",
      borderBottom: "0.5px solid var(--brand-border)",
      display: "flex", alignItems: "center", gap: 10, fontSize: 12,
    }}>
      <span>💡</span>
      <span style={{ flex: 1, color: "#2d2870" }}>
        <strong>New to data analysis?</strong> Turn on guided mode for step-by-step tips as you work.
      </span>
      <button
        onClick={onToggle}
        style={{
          background: "var(--brand)", color: "white", border: "none",
          borderRadius: 6, padding: "4px 12px", fontSize: 11.5,
          fontWeight: 600, cursor: "pointer",
        }}
      >
        Turn on guided mode
      </button>
      <button
        onClick={onToggle}
        style={{ background: "none", border: "none", color: "#b0aea6", fontSize: 11, cursor: "pointer" }}
      >
        Dismiss
      </button>
    </div>
  );
}
