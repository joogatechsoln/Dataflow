import { useState } from "react";
import { useProjectStore } from "../../../store/projectStore";

const BEGINNER_PROMPTS = [
  "What question are you trying to answer with data?",
  "Who will use the results of this analysis?",
  "How will you know if your analysis was successful?",
  "What data do you think you'll need?",
];

export default function Define() {
  const { activeProjectId, projects, updateProject, updateStepStatus } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const [showPrompts, setShowPrompts] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stakeholderInput, setStakeholderInput] = useState("");

  if (!project) return null;

  const update = (field: string, value: string) => {
    updateProject(project.id, { [field]: value });
  };

  const addStakeholder = () => {
    if (!stakeholderInput.trim()) return;
    updateProject(project.id, { stakeholders: [...project.stakeholders, stakeholderInput.trim()] });
    setStakeholderInput("");
  };

  const removeStakeholder = (i: number) => {
    updateProject(project.id, { stakeholders: project.stakeholders.filter((_, idx) => idx !== i) });
  };

  const markComplete = () => {
    updateStepStatus(project.id, "define", "complete");
    updateStepStatus(project.id, "collect", "active");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isComplete = !!(project.problemStatement && project.goals && project.successCriteria);

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "100%" }}>
      <div style={{ maxWidth: 680 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Define your problem</h2>
          <button onClick={() => setShowPrompts(!showPrompts)} className="btn btn-ghost" style={{ fontSize: 12 }}>
            💡 {showPrompts ? "Hide" : "Show"} beginner prompts
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#73726c", marginTop: 0, marginBottom: 24 }}>
          Answer these questions to guide your entire project. You can come back and edit anytime.
        </p>

        {/* Beginner prompts */}
        {showPrompts && (
          <div style={{ background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#3C3489", marginBottom: 10 }}>💡 Prompts to get you thinking</div>
            {BEGINNER_PROMPTS.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: "#534AB7", marginBottom: 6, paddingLeft: 12, borderLeft: "2px solid #AFA9EC" }}>
                {p}
              </div>
            ))}
          </div>
        )}

        {/* Problem statement */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">What question are you trying to answer? *</label>
          <textarea
            value={project.problemStatement}
            onChange={(e) => update("problemStatement", e.target.value)}
            placeholder="e.g. Which product categories drove the most revenue growth between Q1 and Q3 2024, and which regions underperformed?"
            rows={3}
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Goals */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">What is the goal of this analysis? *</label>
          <textarea
            value={project.goals}
            onChange={(e) => update("goals", e.target.value)}
            placeholder="e.g. Identify top-performing regions to inform next quarter's sales strategy..."
            rows={2}
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Success criteria */}
        <div style={{ marginBottom: 20 }}>
          <label className="label">How will you know this was successful? *</label>
          <textarea
            value={project.successCriteria}
            onChange={(e) => update("successCriteria", e.target.value)}
            placeholder="e.g. A clear ranking of top 5 categories and a region comparison with variance thresholds..."
            rows={2}
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Stakeholders */}
        <div style={{ marginBottom: 28 }}>
          <label className="label">Who will see these results?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              value={stakeholderInput}
              onChange={(e) => setStakeholderInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStakeholder()}
              placeholder="e.g. Sales manager, Finance team..."
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={addStakeholder} style={{ flexShrink: 0 }}>Add</button>
          </div>
          {project.stakeholders.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {project.stakeholders.map((s, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, padding: "4px 10px",
                  background: "#EEEDFE", color: "#3C3489",
                  borderRadius: 20,
                }}>
                  {s}
                  <span onClick={() => removeStakeholder(i)} style={{ cursor: "pointer", opacity: 0.6 }}>×</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={markComplete}
            disabled={!isComplete}
            style={{ opacity: isComplete ? 1 : 0.5, cursor: isComplete ? "pointer" : "default" }}
          >
            {saved ? "✓ Saved — next: Collect data" : "Mark complete → Collect data"}
          </button>
          {project.stepStatus.define === "complete" && (
            <span style={{ fontSize: 12, color: "#1D9E75" }}>✓ Step complete</span>
          )}
        </div>
      </div>
    </div>
  );
}
