/**
 * OnboardingWizard.tsx — DataFlow Suite Phase 6
 * First-run 3-step flow shown to new users:
 *   Step 1: Choose plan (Solo / try Pro / buy Pro / Team)
 *   Step 2: Connect your first data source
 *   Step 3: Create your first chart
 *
 * Rendered as a full-screen overlay. Dismissed by completeOnboarding().
 */

import { useState } from "react";
import { useLicenseStore } from "../../store/licenseStore";
import { useNavigate } from "react-router-dom";

const STEPS = ["Choose Plan", "Connect Data", "First Chart"];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<"solo" | "pro_trial" | "pro_buy" | "team">("solo");
  const completeOnboarding = useLicenseStore((s) => s.completeOnboarding);
  const startTrial = useLicenseStore((s) => s.startTrial);
  const navigate = useNavigate();

  const handleFinish = () => {
    if (selectedPlan === "pro_trial") startTrial();
    completeOnboarding();
    if (selectedPlan === "pro_buy" || selectedPlan === "team") {
      navigate("/settings?tab=billing");
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleFinish();
  };
  const back = () => setStep((s) => s - 1);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(26,25,22,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "white", borderRadius: 16,
        width: 540, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "#534AB7", padding: "28px 32px 20px" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 6 }}>
            Welcome to DataFlow Suite 👋
          </div>
          <div style={{ fontSize: 13, color: "#c5c2f0" }}>
            Let's get you set up in 3 quick steps.
          </div>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {STEPS.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: i < step ? "#1D9E75" : i === step ? "white" : "rgba(255,255,255,0.3)",
                  color: i === step ? "#534AB7" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i === step ? "white" : "rgba(255,255,255,0.6)" }}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.3)" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px" }}>
          {step === 0 && (
            <StepPlan selected={selectedPlan} onSelect={setSelectedPlan} />
          )}
          {step === 1 && <StepConnect />}
          {step === 2 && <StepChart />}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 32px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "0.5px solid #f0ede8",
        }}>
          {step > 0 ? (
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={back}>
              ← Back
            </button>
          ) : (
            <button
              style={{ background: "none", border: "none", fontSize: 12, color: "#b0aea6", cursor: "pointer" }}
              onClick={handleFinish}
            >
              Skip setup
            </button>
          )}
          <button
            className="btn btn-primary"
            style={{ fontSize: 13, padding: "9px 22px" }}
            onClick={next}
          >
            {step === STEPS.length - 1
              ? selectedPlan === "pro_buy" || selectedPlan === "team"
                ? "Go to Checkout →"
                : "Start Using DataFlow →"
              : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Choose plan ───────────────────────────────────────────────────────

type PlanChoice = "solo" | "pro_trial" | "pro_buy" | "team";

const PLANS: { id: PlanChoice; icon: string; name: string; price: string; features: string[] }[] = [
  {
    id: "solo",
    icon: "🆓",
    name: "Solo (Free)",
    price: "Free forever",
    features: ["All 6 pipeline steps", "CSV & Excel import", "3 saved charts", "Basic AI prompts"],
  },
  {
    id: "pro_trial",
    icon: "✨",
    name: "Pro Trial",
    price: "14 days free",
    features: ["Everything in Solo", "All chart types + Power BI", "PDF / PPT / Word export", "Advanced AI reports"],
  },
  {
    id: "pro_buy",
    icon: "⚡",
    name: "Pro",
    price: "$49 one-time",
    features: ["Everything in trial", "Lifetime Pro access", "Priority support", "All future updates"],
  },
  {
    id: "team",
    icon: "👥",
    name: "Team",
    price: "$99/seat",
    features: ["Everything in Pro", "Team workspaces", "Role-based access", "Admin dashboard"],
  },
];

function StepPlan({ selected, onSelect }: { selected: PlanChoice; onSelect: (p: PlanChoice) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Choose your plan</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 18 }}>
        You can change this any time from Settings.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PLANS.map((p) => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              border: `1.5px solid ${selected === p.id ? "#534AB7" : "#e8e6e0"}`,
              borderRadius: 10, padding: "14px 14px 12px",
              cursor: "pointer", transition: "all 0.12s",
              background: selected === p.id ? "#F5F4FE" : "white",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1916" }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "#534AB7", fontWeight: 500, marginBottom: 8 }}>{p.price}</div>
            <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: "#73726c", lineHeight: "1.7" }}>
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Connect data ──────────────────────────────────────────────────────

function StepConnect() {
  const [chosen, setChosen] = useState<string | null>(null);
  const sources = [
    { id: "csv", icon: "📄", name: "Upload a CSV or Excel file" },
    { id: "db", icon: "🗄️", name: "Connect a database (PostgreSQL, MySQL…)" },
    { id: "api", icon: "🌐", name: "Fetch from a REST API" },
    { id: "later", icon: "⏭️", name: "I'll do this later" },
  ];
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Connect your first data source</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 18 }}>
        This just picks where you'll start — you can add more later in the Collect tab.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sources.map((s) => (
          <div
            key={s.id}
            onClick={() => setChosen(s.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${chosen === s.id ? "#534AB7" : "#e8e6e0"}`,
              background: chosen === s.id ? "#F5F4FE" : "white",
              transition: "all 0.12s",
            }}
          >
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{ fontSize: 13, color: "#1a1916" }}>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: First chart ───────────────────────────────────────────────────────

function StepChart() {
  const [chosen, setChosen] = useState<string | null>(null);
  const charts = [
    { id: "bar", icon: "📊", name: "Bar chart", desc: "Compare categories" },
    { id: "line", icon: "📈", name: "Line chart", desc: "Show trends over time" },
    { id: "pie", icon: "🥧", name: "Pie chart", desc: "Show proportions" },
    { id: "scatter", icon: "✦", name: "Scatter plot", desc: "Explore correlations" },
  ];
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>What kind of chart do you want first?</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 18 }}>
        No pressure — you can build any chart type in the Visualize tab.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {charts.map((c) => (
          <div
            key={c.id}
            onClick={() => setChosen(c.id)}
            style={{
              padding: "16px 14px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${chosen === c.id ? "#534AB7" : "#e8e6e0"}`,
              background: chosen === c.id ? "#F5F4FE" : "white",
              textAlign: "center", transition: "all 0.12s",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "#73726c" }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
