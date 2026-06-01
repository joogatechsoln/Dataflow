/**
 * ErrorBoundary.tsx — DataFlow Suite Phase 7
 * Global React error boundary — catches unhandled render errors and shows
 * a friendly recovery UI instead of a blank screen.
 * Also fires a Tauri crash report event when running inside the desktop app.
 *
 * Usage:
 *   Wrap AppShell in <GlobalErrorBoundary> inside App.tsx.
 *
 *   Per-component (lighter):
 *   <ComponentErrorBoundary name="Clean Tab">
 *     <Clean />
 *   </ComponentErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

// ── Crash reporter ────────────────────────────────────────────────────────────

async function reportCrash(error: Error, info: ErrorInfo, context: string) {
  // Log to console — in web mode this is the primary crash record
  console.error(`[DataFlow ErrorBoundary] Error in "${context}":`, error);
  console.error("Component stack:", info.componentStack);

  // Persist to sessionStorage so the crash survives a page reload
  try {
    const report = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error.stack ?? "",
      componentStack: info.componentStack ?? "",
    };
    sessionStorage.setItem("dataflow_last_crash", JSON.stringify(report));
  } catch {
    // sessionStorage may be unavailable — ignore
  }
}

// ── State type ────────────────────────────────────────────────────────────────

interface BoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

// ── Global ErrorBoundary ──────────────────────────────────────────────────────

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, BoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    reportCrash(error, info, "GlobalApp");
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch { /* ignore */ }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo, showDetails } = this.state;

    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#f5f5f4",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 24,
      }}>
        <div style={{
          background: "white", borderRadius: 16,
          border: "0.5px solid #e8e6e0",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          padding: "40px 36px", maxWidth: 480, width: "100%",
          textAlign: "center",
        }}>
          {/* Icon */}
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a18", margin: "0 0 8px" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 13, color: "#73726c", margin: "0 0 24px", lineHeight: 1.5 }}>
            DataFlow encountered an unexpected error. Your data is safe —
            please try restarting the app.
          </p>

          {/* Error message pill */}
          {error && (
            <div style={{
              background: "#FCEBEB", border: "0.5px solid #F0A0A0",
              borderRadius: 8, padding: "8px 14px",
              fontSize: 12, color: "#791F1F",
              marginBottom: 20, textAlign: "left",
              fontFamily: "monospace",
              wordBreak: "break-word",
            }}>
              {error.message || "Unknown error"}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 13,
                fontWeight: 600, cursor: "pointer", border: "none",
                background: "#534AB7", color: "white",
                transition: "background 0.15s",
              }}
            >
              Try to recover
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: "10px 20px", borderRadius: 8, fontSize: 13,
                fontWeight: 500, cursor: "pointer",
                border: "0.5px solid #d0cec6", background: "white", color: "#3d3d3a",
              }}
            >
              Reload application
            </button>
            <button
              onClick={this.handleClearStorage}
              style={{
                padding: "8px 20px", borderRadius: 8, fontSize: 12,
                fontWeight: 400, cursor: "pointer",
                border: "none", background: "transparent", color: "#E24B4A",
              }}
            >
              Clear all local data and reload
            </button>
          </div>

          {/* Details toggle */}
          <button
            onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
            style={{
              background: "none", border: "none", color: "#b0aea6",
              fontSize: 11, cursor: "pointer",
            }}
          >
            {showDetails ? "Hide" : "Show"} technical details
          </button>

          {showDetails && (
            <pre style={{
              marginTop: 12, textAlign: "left", fontSize: 10,
              background: "#f5f5f4", borderRadius: 8, padding: 12,
              overflow: "auto", maxHeight: 200,
              color: "#5F5E5A", lineHeight: 1.6,
            }}>
              {error?.stack ?? "No stack trace available"}
              {"\n\n--- Component Stack ---\n"}
              {errorInfo?.componentStack ?? ""}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

// ── ComponentErrorBoundary (lighter, per-panel) ───────────────────────────────

interface ComponentBoundaryProps {
  /** Name of the component/tab for error reporting */
  name: string;
  /** Optional custom fallback */
  fallback?: ReactNode;
  children: ReactNode;
}

export class ComponentErrorBoundary extends Component<ComponentBoundaryProps, BoundaryState> {
  constructor(props: ComponentBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    reportCrash(error, info, this.props.name);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const { error, showDetails } = this.state;

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", padding: 32, gap: 12,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a18" }}>
          {this.props.name} failed to render
        </div>
        <div style={{ fontSize: 12, color: "#73726c", textAlign: "center", maxWidth: 320 }}>
          An error occurred in this panel. Other parts of the app are unaffected.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "7px 14px" }}
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Retry
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: "7px 14px" }}
            onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
          >
            Details
          </button>
        </div>
        {showDetails && error && (
          <pre style={{
            fontSize: 10, background: "#f5f5f4", borderRadius: 8,
            padding: 10, maxWidth: 480, maxHeight: 140, overflow: "auto",
            color: "#5F5E5A", marginTop: 4,
          }}>
            {error.message}
            {"\n"}
            {error.stack?.split("\n").slice(1, 6).join("\n")}
          </pre>
        )}
      </div>
    );
  }
}
