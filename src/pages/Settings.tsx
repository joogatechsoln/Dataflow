/**
 * Settings.tsx — DataFlow Suite (updated for Phase 6)
 * Adds 6th tab: Billing — plan management, license activation, referral, team billing.
 * Also adds analytics opt-in toggle in General section.
 * All other behaviour unchanged from Phase 5.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import PluginSettings from "./Settings/PluginSettings";
import BillingTab from "./Settings/BillingTab";
import { useLicenseStore } from "../store/licenseStore";

type TestStatus = "idle" | "testing" | "success" | "error";

export default function Settings() {
  const { user, openaiApiKey, setApiKey, setTheme, theme, logout, updateProfile } = useAuthStore();
  const [apiKey, setLocalApiKey] = useState(openaiApiKey);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.name ?? "");
  const [section, setSection] = useState<"general" | "ai" | "appearance" | "account" | "plugins" | "billing">("general");
  const { analyticsOptIn, setAnalyticsOptIn } = useLicenseStore();

  // Support deep-linking via ?tab=billing from other pages
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "billing") setSection("billing");
  }, [searchParams]);

  const saveApiKey = () => {
    setApiKey(apiKey.trim());
    setSaved(true);
    setTestStatus("idle");
    setTimeout(() => setSaved(false), 2000);
  };

  const testApiKey = async () => {
    const key = apiKey.trim();
    if (!key) {
      setTestMessage("Please enter an API key first.");
      setTestStatus("error");
      return;
    }
    setTestStatus("testing");
    setTestMessage("");
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const data = await res.json();
        const hasGpt4o = data.data?.some((m: { id: string }) => m.id.includes("gpt-4o"));
        setTestStatus("success");
        setTestMessage(
          hasGpt4o
            ? "✓ Connection successful! GPT-4o is available."
            : "✓ Key is valid, but GPT-4o may not be on your plan."
        );
        setApiKey(key);
      } else {
        const err = await res.json();
        setTestStatus("error");
        setTestMessage(err.error?.message ?? "Invalid API key or access denied.");
      }
    } catch {
      setTestStatus("error");
      setTestMessage("Network error — check your internet connection.");
    }
  };

  const saveName = () => {
    if (nameVal.trim() && user) {
      updateProfile({ name: nameVal.trim(), avatarInitials: nameVal.trim().slice(0, 2).toUpperCase() });
      setEditingName(false);
    }
  };

  const masked = apiKey
    ? apiKey.slice(0, 8) + "•".repeat(Math.max(0, Math.min(apiKey.length - 8, 24)))
    : "";

  const navItems = [
    { id: "general",    label: "General",    icon: "⚙️" },
    { id: "ai",         label: "AI & API",   icon: "✨" },
    { id: "appearance", label: "Appearance", icon: "🎨" },
    { id: "account",    label: "Account",    icon: "👤" },
    { id: "plugins",    label: "Plugins",    icon: "🧩" },
    { id: "billing",    label: "Billing",    icon: "💳" },
  ] as const;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left nav */}
      <div style={{
        width: 180, borderRight: "0.5px solid #e8e6e0",
        padding: "20px 10px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0,
        background: "#faf9f7",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#b0aea6", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 8px 10px" }}>
          Settings
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 7, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
              background: section === item.id ? "var(--brand-light)" : "transparent",
              color: section === item.id ? "var(--brand)" : "#3d3d3a",
              fontSize: 13, fontWeight: section === item.id ? 500 : 400,
              transition: "background 0.12s",
            }}
          >
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {/* ── General ── */}
        {section === "general" && (
          <div>
            <SectionHeader title="General" subtitle="Basic preferences and behaviour." />
            <div style={{ maxWidth: 480 }}>
              <Label>Default pipeline step on open</Label>
              <select style={{ padding: "7px 10px", borderRadius: 7, border: "0.5px solid #e8e6e0", fontSize: 13, marginBottom: 20, width: "100%" }}>
                {["Define","Collect","Clean","Analyze","Visualize","Report"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <Label>Language</Label>
              <select style={{ padding: "7px 10px", borderRadius: 7, border: "0.5px solid #e8e6e0", fontSize: 13, marginBottom: 20, width: "100%" }}>
                <option>English (default)</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
              <Label>Usage Analytics</Label>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Anonymous usage data</div>
                  <div style={{ fontSize: 11, color: "#73726c" }}>
                    Help us improve DataFlow by sharing anonymous event data. No PII is ever collected.
                  </div>
                </div>
                <div
                  onClick={() => setAnalyticsOptIn(!analyticsOptIn)}
                  style={{ width: 36, height: 20, borderRadius: 20, cursor: "pointer", position: "relative", transition: "background 0.2s", background: analyticsOptIn ? "#534AB7" : "#e8e6e0", flexShrink: 0, marginLeft: 12 }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "white", position: "absolute", top: 3, transition: "left 0.2s", left: analyticsOptIn ? 19 : 3 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AI & API ── */}
        {section === "ai" && (
          <div>
            <SectionHeader title="AI & API" subtitle="Configure your OpenAI API key for the AI assistant." />
            <div style={{ maxWidth: 480 }}>
              <Label>OpenAI API Key</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    placeholder="sk-..."
                    style={{ width: "100%", padding: "8px 36px 8px 10px", borderRadius: 8, border: "0.5px solid #e8e6e0", fontSize: 13, boxSizing: "border-box" }}
                  />
                  <button onClick={() => setShowKey((v) => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15 }}>
                    {showKey ? "🙈" : "👁"}
                  </button>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: 12, padding: "0 14px" }} onClick={saveApiKey}>
                  {saved ? "Saved ✓" : "Save"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={testApiKey} disabled={testStatus === "testing"}>
                  {testStatus === "testing" ? "Testing…" : "Test connection"}
                </button>
              </div>
              {testMessage && (
                <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 7, marginBottom: 12, background: testStatus === "success" ? "#e6f7f1" : "#FEE9E9", color: testStatus === "success" ? "#1D9E75" : "#E24B4A" }}>
                  {testMessage}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#b0aea6" }}>
                Your key is stored locally and never sent to DataFlow servers. Get one at{" "}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "#534AB7" }}>platform.openai.com</a>.
              </div>
              {openaiApiKey && (
                <div style={{ marginTop: 20, padding: "12px 14px", background: "#f9f8f6", borderRadius: 8, fontSize: 12 }}>
                  <Row label="Saved key" value={masked} />
                  <Row label="Model" value="gpt-4o" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Appearance ── */}
        {section === "appearance" && (
          <div>
            <SectionHeader title="Appearance" subtitle="Customise the look and feel of DataFlow." />
            <div style={{ maxWidth: 400 }}>
              <Label>Theme</Label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["light", "dark", "system"] as const).map((t) => (
                  <button key={t} onClick={() => setTheme(t)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1.5px solid ${theme === t ? "#534AB7" : "#e8e6e0"}`, background: theme === t ? "#EEEDFE" : "white", color: theme === t ? "#534AB7" : "#3d3d3a", fontSize: 12, cursor: "pointer", fontWeight: theme === t ? 600 : 400, textTransform: "capitalize" }}>
                    {t === "light" ? "☀️" : t === "dark" ? "🌙" : "💻"} {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Account ── */}
        {section === "account" && (
          <div>
            <SectionHeader title="Account" subtitle="Manage your profile and authentication." />
            <div style={{ maxWidth: 440 }}>
              <Label>Profile</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#534AB7", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                  {user?.avatarInitials ?? "?"}
                </div>
                <div style={{ flex: 1 }}>
                  {editingName ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={nameVal} onChange={(e) => setNameVal(e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "0.5px solid #e8e6e0", fontSize: 13, flex: 1 }} autoFocus onKeyDown={(e) => e.key === "Enter" && saveName()} />
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: "0 10px" }} onClick={saveName}>Save</button>
                      <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditingName(false)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{user?.name}</span>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => setEditingName(true)}>Edit</button>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#73726c" }}>{user?.email}</div>
                </div>
              </div>
              <button className="btn btn-danger" style={{ fontSize: 12 }} onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* ── Plugins ── */}
        {section === "plugins" && (
          <PluginSettings />
        )}

        {/* ── Billing (Phase 6) ── */}
        {section === "billing" && (
          <div>
            <SectionHeader title="Billing & Plans" subtitle="Manage your DataFlow plan, license key, and referrals." />
            <BillingTab />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 12, color: "#73726c", margin: "4px 0 0" }}>{subtitle}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "#73726c", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "0.5px solid #f0ede8" }}>
      <span>{label}</span>
      <span style={{ color: "#1a1a18", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
