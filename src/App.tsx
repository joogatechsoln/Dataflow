/**
 * App.tsx — DataFlow Suite Web
 * Pure browser version — no Tauri dependencies.
 */

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useLicenseStore } from "./store/licenseStore";
import { useProjectStore, PipelineStep } from "./store/projectStore";
import { useShortcuts, ShortcutHintsOverlay } from "./lib/useShortcuts";
import { getSupabase } from "./lib/supabase";
import CommandPalette from "./components/CommandPalette/CommandPalette";
import NotificationsPanel from "./components/Notifications/NotificationsPanel";
import { GlobalErrorBoundary, ComponentErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import Sidebar from "./components/Sidebar/Sidebar";
import TopBar from "./components/TopBar/TopBar";
import AIAssistant from "./components/AIAssistant/AIAssistant";
import { GuidedModeOverlay } from "./components/GuidedMode/GuidedMode";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Dashboard from "./pages/Dashboard/Dashboard";
import Pipeline from "./pages/Pipeline/Pipeline";
import Settings from "./pages/Settings";
import LearnHub from "./pages/Learn/LearnHub";
import TeamWorkspace from "./pages/Team/TeamWorkspace";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import PluginMarketplace from "./pages/Marketplace/PluginMarketplace";
import AuthPage from "./pages/Auth/AuthPage";
import "./index.css";

// ── Supabase session sync (safe — works with or without Supabase configured) ──

function useSupabaseSessionSync() {
  const login = useAuthStore((s) => s.login);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return; // Supabase not configured — local-only mode, skip

    sb.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session) return;
      const u = session.user;
      login({
        id: u.id,
        name: u.user_metadata?.name ?? u.email?.split("@")[0] ?? "User",
        email: u.email ?? "",
        role: "solo",
        avatarInitials: (u.user_metadata?.name ?? u.email ?? "?").slice(0, 2).toUpperCase(),
      });
    });

    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session) { useAuthStore.getState().logout(); return; }
      const u = session.user;
      login({
        id: u.id,
        name: u.user_metadata?.name ?? u.email?.split("@")[0] ?? "User",
        email: u.email ?? "",
        role: "solo",
        avatarInitials: (u.user_metadata?.name ?? u.email ?? "?").slice(0, 2).toUpperCase(),
      });
    });

    return () => listener.subscription.unsubscribe();
  }, [login]);
}

// ── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const onboardingComplete = useLicenseStore((s) => s.onboardingComplete);
  const { setActivePipelineTab } = useProjectStore();

  useSupabaseSessionSync();

  useEffect(() => {
    const handler = () => setAiOpen((o) => !o);
    window.addEventListener("dataflow:toggle-ai", handler);
    return () => window.removeEventListener("dataflow:toggle-ai", handler);
  }, []);

  useShortcuts([
    { keys: ["ctrl+k", "meta+k"], action: () => setPaletteOpen(true), description: "Open command palette", ignoreInInput: false },
    { keys: ["ctrl+/"], action: () => setShortcutsOpen((o) => !o), description: "Show keyboard shortcuts" },
    { keys: ["ctrl+shift+a"], action: () => setAiOpen((o) => !o), description: "Toggle AI Assistant" },
    { keys: ["ctrl+1"], action: () => setActivePipelineTab("define" as PipelineStep),    description: "Define tab" },
    { keys: ["ctrl+2"], action: () => setActivePipelineTab("collect" as PipelineStep),   description: "Collect tab" },
    { keys: ["ctrl+3"], action: () => setActivePipelineTab("clean" as PipelineStep),     description: "Clean tab" },
    { keys: ["ctrl+4"], action: () => setActivePipelineTab("analyze" as PipelineStep),   description: "Analyze tab" },
    { keys: ["ctrl+5"], action: () => setActivePipelineTab("visualize" as PipelineStep), description: "Visualize tab" },
    { keys: ["ctrl+6"], action: () => setActivePipelineTab("report" as PipelineStep),    description: "Report tab" },
    { keys: ["escape"], action: () => {
      if (paletteOpen) setPaletteOpen(false);
      else if (shortcutsOpen) setShortcutsOpen(false);
      else if (notifsOpen) setNotifsOpen(false);
      else if (aiOpen) setAiOpen(false);
    }, description: "Close" },
  ], { scope: "global" });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <TopBar
          onToggleAI={() => setAiOpen((o) => !o)}
          aiOpen={aiOpen}
          onOpenPalette={() => setPaletteOpen(true)}
          onToggleNotifications={() => setNotifsOpen((o) => !o)}
          notifsOpen={notifsOpen}
        />
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
          <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
            <Routes>
              <Route path="/"            element={<ComponentErrorBoundary name="Dashboard"><Dashboard /></ComponentErrorBoundary>} />
              <Route path="/projects"    element={<ComponentErrorBoundary name="Dashboard"><Dashboard /></ComponentErrorBoundary>} />
              <Route path="/pipeline"    element={<ComponentErrorBoundary name="Pipeline"><Pipeline /></ComponentErrorBoundary>} />
              <Route path="/settings"    element={<ComponentErrorBoundary name="Settings"><Settings /></ComponentErrorBoundary>} />
              <Route path="/learn"       element={<ComponentErrorBoundary name="Learn Hub"><LearnHub /></ComponentErrorBoundary>} />
              <Route path="/team"        element={<ComponentErrorBoundary name="Team"><TeamWorkspace /></ComponentErrorBoundary>} />
              <Route path="/admin"       element={<ComponentErrorBoundary name="Admin"><AdminDashboard /></ComponentErrorBoundary>} />
              <Route path="/marketplace" element={<ComponentErrorBoundary name="Marketplace"><PluginMarketplace /></ComponentErrorBoundary>} />
              <Route path="*"            element={<Navigate to="/" />} />
            </Routes>
          </div>
          <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
      </div>

      <GuidedModeOverlay enabled={false} onDisable={() => {}} />
      {!onboardingComplete && <OnboardingWizard />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutHintsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <NotificationsPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return (
    <BrowserRouter>
      <GlobalErrorBoundary>
        {isAuthenticated ? <AppShell /> : <AuthPage />}
      </GlobalErrorBoundary>
    </BrowserRouter>
  );
}
