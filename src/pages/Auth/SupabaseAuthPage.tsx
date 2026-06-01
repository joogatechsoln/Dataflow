/**
 * SupabaseAuthPage.tsx — DataFlow Suite Phase 4
 * Cloud sign-in/sign-up screen: email/password + Google + GitHub OAuth.
 * This is an ADDITIONAL auth mode — the existing local ArgonAuth still works.
 * Triggered when user clicks "Sign in with cloud account" from AuthPage.
 * Drop into src/pages/Auth/
 */

import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithGitHub,
  getProfile,
} from "../../lib/supabase";
import type { User } from "../../store/authStore";

interface SupabaseAuthPageProps {
  onBack: () => void;
}

type Mode = "signin" | "signup";

export default function SupabaseAuthPage({ onBack }: SupabaseAuthPageProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const login = useAuthStore((s) => s.login);

  async function handleEmailSubmit() {
    setError(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "signup" && !name) { setError("Name is required."); return; }

    setLoading(true);
    try {
      let userId: string;

      if (mode === "signup") {
        const { user } = await signUpWithEmail(email, password, name);
        if (!user) {
          setEmailSent(true);
          setLoading(false);
          return;
        }
        userId = user.id;
      } else {
        const { user } = await signInWithEmail(email, password);
        if (!user) throw new Error("Sign in failed.");
        userId = user.id;
      }

      const profile = await getProfile(userId);
      const appUser: User = {
        id: userId,
        name: profile?.name ?? name ?? email.split("@")[0],
        email,
        role: (profile?.plan === "team" ? "team_member" : profile?.plan ?? "solo") as User["role"],
        avatarInitials: (profile?.name ?? email).slice(0, 2).toUpperCase(),
      };
      login(appUser);
    } catch (err) {
      setError((err as Error).message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>📬</div>
          <h2 style={styles.title}>Check your email</h2>
          <p style={styles.subtitle}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in here.
          </p>
          <button style={styles.btnPrimary} onClick={() => { setEmailSent(false); setMode("signin"); }}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#534AB7,#7c75d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 16 }}>⚡</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#1a1917" }}>DataFlow Suite</span>
        </div>

        <h2 style={styles.title}>{mode === "signin" ? "Sign in to cloud" : "Create cloud account"}</h2>
        <p style={styles.subtitle}>Sync projects across devices and collaborate with your team.</p>

        {/* OAuth buttons */}
        <button style={styles.oauthBtn} onClick={signInWithGoogle} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>

        <button style={{ ...styles.oauthBtn, marginBottom: 20 }} onClick={signInWithGitHub} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          Continue with GitHub
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#e8e6e0" }} />
          <span style={{ fontSize: 11, color: "#9e9b94" }}>or with email</span>
          <div style={{ flex: 1, height: 1, background: "#e8e6e0" }} />
        </div>

        {/* Form */}
        {mode === "signup" && (
          <div style={styles.field}>
            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#E24B4A", marginBottom: 12, padding: "8px 12px", background: "#fdf2f2", borderRadius: 6 }}>
            {error}
          </div>
        )}

        <button
          style={{ ...styles.btnPrimary, opacity: loading ? 0.6 : 1 }}
          onClick={handleEmailSubmit}
          disabled={loading}
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        {/* Toggle */}
        <p style={{ fontSize: 12, textAlign: "center", color: "#73726c", marginTop: 16 }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            style={{ background: "none", border: "none", cursor: "pointer", color: "#534AB7", fontWeight: 600, fontSize: 12 }}
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* Back to local */}
        <button style={{ ...styles.btnGhost, marginTop: 8 }} onClick={onBack}>
          ← Use local account instead
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#f5f3ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    background: "white",
    border: "0.5px solid #e8e6e0",
    borderRadius: 16,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  title: { fontSize: 20, fontWeight: 700, color: "#1a1917", margin: "0 0 6px", textAlign: "center" as const },
  subtitle: { fontSize: 13, color: "#73726c", margin: "0 0 20px", textAlign: "center" as const },
  oauthBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "10px 16px", border: "1px solid #e8e6e0", borderRadius: 8, background: "white",
    fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 10, color: "#1a1917",
  },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#3d3c38", marginBottom: 5 },
  input: {
    width: "100%", padding: "9px 12px", border: "1px solid #e8e6e0", borderRadius: 8,
    fontSize: 13, background: "#fafaf8", outline: "none", boxSizing: "border-box" as const,
  },
  btnPrimary: {
    width: "100%", padding: "11px 16px", background: "#534AB7", color: "white",
    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  btnGhost: {
    width: "100%", padding: "9px 16px", background: "none", color: "#73726c",
    border: "1px solid #e8e6e0", borderRadius: 8, fontSize: 12, cursor: "pointer",
  },
};
