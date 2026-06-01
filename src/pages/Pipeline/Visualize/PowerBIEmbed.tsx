/**
 * PowerBIEmbed.tsx — DataFlow Suite Phase 5
 * Dedicated Power BI embed panel in the Visualize tab.
 * Uses Microsoft's Power BI Embedded iframe approach with auth token flow.
 * Users paste their embed URL + access token from the Power BI service.
 */

import { useState, useRef } from "react";

interface EmbedConfig {
  embedUrl: string;
  accessToken: string;
  reportId: string;
  groupId: string;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: "#73726c", minWidth: 100, paddingTop: 1 }}>{label}</span>
      <div style={{ flex: 1, fontSize: 12 }}>{children}</div>
    </div>
  );
}

export default function PowerBIEmbed() {
  const [config, setConfig] = useState<EmbedConfig>({
    embedUrl: "",
    accessToken: "",
    reportId: "",
    groupId: "",
  });
  const [embedded, setEmbedded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function handleEmbed() {
    if (!config.embedUrl || !config.accessToken) return;
    setEmbedded(true);
  }

  function handleDisconnect() {
    setEmbedded(false);
    // Clear the iframe src
    if (iframeRef.current) iframeRef.current.src = "about:blank";
  }

  // Build the embed URL with token param
  const fullEmbedUrl = config.embedUrl
    ? `${config.embedUrl}${config.embedUrl.includes("?") ? "&" : "?"}accessToken=${encodeURIComponent(config.accessToken)}&embedType=report&autoAuth=false`
    : "";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#faf9f6" }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: "0.5px solid #e8e6e0", background: "white",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#f2c811",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          📊
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Power BI Embed</div>
          <div style={{ fontSize: 11, color: "#73726c" }}>Embed live Power BI reports from your Microsoft 365 workspace</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowHelp((h) => !h)} style={{ fontSize: 12 }}>
            {showHelp ? "Hide help" : "How to get embed URL"}
          </button>
          {embedded && (
            <button className="btn btn-secondary" onClick={handleDisconnect} style={{ fontSize: 12 }}>
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div style={{
          padding: "16px 24px", background: "#fffbf5", borderBottom: "0.5px solid #e8d89f",
          fontSize: 12, color: "#3d3c36", lineHeight: 1.7,
        }}>
          <strong>How to get your embed URL and access token:</strong>
          <ol style={{ margin: "8px 0 0 18px", padding: 0 }}>
            <li>Open <strong>Power BI Service</strong> (app.powerbi.com) and navigate to your report.</li>
            <li>Click <strong>File → Embed report → Website or portal</strong>.</li>
            <li>Copy the <strong>embed URL</strong> from the dialog.</li>
            <li>For the access token, use <strong>Power BI REST API</strong> or the <em>GenerateToken</em> endpoint with your Azure AD credentials. For internal use, you can also use your personal access token from developer tools.</li>
            <li>Paste both values below and click <strong>Embed Report</strong>.</li>
          </ol>
          <p style={{ marginTop: 8, color: "#73726c" }}>
            Note: For production deployments, use Azure AD service principal auth. Tokens expire — refresh as needed.
          </p>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Config sidebar */}
        {!embedded && (
          <div style={{ width: 320, borderRight: "0.5px solid #e8e6e0", padding: 20, background: "white", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600 }}>Connection Settings</h3>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Embed URL</label>
              <input
                className="input"
                placeholder="https://app.powerbi.com/reportEmbed?reportId=..."
                value={config.embedUrl}
                onChange={(e) => setConfig({ ...config, embedUrl: e.target.value })}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 12,
                  border: "0.5px solid #e8e6e0", outline: "none", boxSizing: "border-box",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Access Token</label>
              <textarea
                placeholder="eyJ0eXAiOiJKV1Q..."
                value={config.accessToken}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                rows={4}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 11,
                  border: "0.5px solid #e8e6e0", outline: "none", resize: "vertical",
                  boxSizing: "border-box", fontFamily: "monospace",
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="label">Report ID (optional)</label>
              <input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={config.reportId}
                onChange={(e) => setConfig({ ...config, reportId: e.target.value })}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 12,
                  border: "0.5px solid #e8e6e0", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Workspace (Group) ID (optional)</label>
              <input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={config.groupId}
                onChange={(e) => setConfig({ ...config, groupId: e.target.value })}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 12,
                  border: "0.5px solid #e8e6e0", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleEmbed}
              disabled={!config.embedUrl || !config.accessToken}
              style={{ width: "100%" }}
            >
              Embed Report
            </button>

            <div style={{ marginTop: 20, padding: 14, background: "#f0ede8", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>Why embed Power BI?</div>
              <InfoRow label="Live data">Reports update in real-time from your Power BI workspace.</InfoRow>
              <InfoRow label="Interactive">Full filter, drill-down, and cross-highlight support.</InfoRow>
              <InfoRow label="Shareable">Save the embed config to your DataFlow project.</InfoRow>
            </div>
          </div>
        )}

        {/* Embed area */}
        <div style={{ flex: 1, position: "relative", background: "#1a1a2e" }}>
          {embedded ? (
            <iframe
              ref={iframeRef}
              src={fullEmbedUrl}
              title="Power BI Report"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : (
            <div style={{
              height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.5)",
            }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "rgba(255,255,255,0.8)" }}>
                Power BI Report
              </div>
              <div style={{ fontSize: 13, maxWidth: 320, textAlign: "center", lineHeight: 1.6 }}>
                Enter your embed URL and access token on the left to display your live Power BI report here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
