import { useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useNavigate } from "react-router-dom";
import { currentUserId, deleteCloudProject, pushProject, saveVersion } from "../../lib/supabase";

const STEP_LABELS = ["Define", "Collect", "Clean", "Analyze", "Visualize", "Report"];
const STEP_KEYS = ["define", "collect", "clean", "analyze", "visualize", "report"] as const;

export default function Dashboard() {
  const { projects, createProject, deleteProject, setActiveProject, setActivePipelineTab } = useProjectStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const project = createProject(newName.trim(), newDesc.trim());
    setActiveProject(project.id);
    setActivePipelineTab("define");
    setNewName(""); setNewDesc(""); setShowNew(false);
    navigate("/pipeline");

    try {
      const cloudUserId = await currentUserId();
      if (!cloudUserId) return;

      const data = project as unknown as Record<string, unknown>;
      await pushProject({
        id: project.id,
        team_id: null,
        owner_id: cloudUserId,
        name: project.name,
        description: project.description,
        data,
      });
      await saveVersion(project.id, data, cloudUserId, "Created project");
    } catch (err) {
      console.warn("Project created locally but cloud sync failed:", err);
    }
  };

  const openProject = (id: string) => {
    setActiveProject(id);
    navigate("/pipeline");
  };

  const handleDelete = async (id: string) => {
    deleteProject(id);
    try {
      const cloudUserId = await currentUserId();
      if (cloudUserId) await deleteCloudProject(id);
    } catch (err) {
      console.warn("Project deleted locally but cloud delete failed:", err);
    }
  };

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>My Projects</h1>
          <p style={{ fontSize: 12, color: "#73726c", margin: "3px 0 0" }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · pick up where you left off
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>
          + New project
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#AFA9EC" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>New project</div>
          <div style={{ marginBottom: 12 }}>
            <label className="label">Project name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Sales Q3 Analysis" autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Description (optional)</label>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What are you trying to find out?" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleCreate}>Create project</button>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          border: "1px dashed #d0cec6", borderRadius: 12,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No projects yet</div>
          <div style={{ fontSize: 12, color: "#73726c", marginBottom: 20 }}>
            Create your first project to start your analysis pipeline
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + Create first project
          </button>
        </div>
      )}

      {/* Project cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {projects.map((project) => {
          const completedSteps = STEP_KEYS.filter((k) => project.stepStatus[k] === "complete").length;
          const progress = Math.round((completedSteps / 6) * 100);

          return (
            <div key={project.id} className="card" style={{ cursor: "pointer", transition: "border-color 0.15s" }}
              onClick={() => openProject(project.id)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#AFA9EC"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e6e0"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{project.name}</div>
                  {project.description && (
                    <div style={{ fontSize: 12, color: "#73726c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                      {project.description}
                    </div>
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#d0cec6", fontSize: 16, padding: 2, lineHeight: 1 }}
                  title="Delete project">×</button>
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, background: "#f0ede8", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#534AB7", borderRadius: 2, transition: "width 0.3s" }} />
              </div>

              {/* Step pills */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {STEP_KEYS.map((key, i) => {
                  const status = project.stepStatus[key];
                  return (
                    <span key={key} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 20, fontWeight: 500,
                      background: status === "complete" ? "#E1F5EE" : status === "active" ? "#EEEDFE" : "#f0ede8",
                      color: status === "complete" ? "#085041" : status === "active" ? "#3C3489" : "#b0aea6",
                    }}>{STEP_LABELS[i]}</span>
                  );
                })}
              </div>

              <div style={{ fontSize: 11, color: "#b0aea6", marginTop: 10 }}>
                Updated {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
