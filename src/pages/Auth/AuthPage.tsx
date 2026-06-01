import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { User } from "../../store/authStore";
import { isSupabaseConfigured } from "../../lib/supabase";
import SupabaseAuthPage from "./SupabaseAuthPage";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [authProvider, setAuthProvider] = useState<"local" | "cloud">("local");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const cloudAuthAvailable = isSupabaseConfigured();

  const getInitials = (n: string) =>
    n.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "register" && !name) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    // Simulate auth (in production: hash password with Argon2 via Tauri command, store in SQLite)
    await new Promise((r) => setTimeout(r, 600));

    const user: User = {
      id: crypto.randomUUID(),
      name: mode === "register" ? name : email.split("@")[0],
      email,
      role: "solo",
      avatarInitials: getInitials(mode === "register" ? name : email.split("@")[0]),
    };
    login(user);
    setLoading(false);
  };

  if (authProvider === "cloud") {
    return <SupabaseAuthPage onBack={() => setAuthProvider("local")} />;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#f5f5f4",
    }}>
      <div style={{ width: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: "#534AB7",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#1a1a18" }}>DataFlow Suite</h1>
          <p style={{ fontSize: 13, color: "#73726c", margin: "4px 0 0" }}>
            {mode === "login" ? "Sign in to your workspace" : "Create your free account"}
          </p>
        </div>

        <div className="card" style={{ padding: 24 }}>
          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Kamau" />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="label">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>

          {error && (
            <div style={{
              background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: 8,
              padding: "8px 12px", fontSize: 12, color: "#791F1F", marginBottom: 14,
            }}>{error}</div>
          )}

          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", justifyContent: "center", height: 40 }}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <div className="divider" />

          <p style={{ textAlign: "center", fontSize: 12, color: "#73726c", margin: 0 }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={{ color: "#534AB7", cursor: "pointer", fontWeight: 500 }}>
              {mode === "login" ? "Sign up free" : "Sign in"}
            </span>
          </p>

          {cloudAuthAvailable && (
            <>
              <div className="divider" />
              <button
                className="btn btn-secondary"
                onClick={() => setAuthProvider("cloud")}
                style={{ width: "100%", justifyContent: "center", height: 38 }}
              >
                Sign in with cloud account
              </button>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#b0aea6", marginTop: 16 }}>
          {cloudAuthAvailable
            ? "Local accounts stay on this device. Cloud accounts sync with Supabase."
            : "Your data stays on your device. Configure Supabase to enable cloud sync."}
        </p>
      </div>
    </div>
  );
}
