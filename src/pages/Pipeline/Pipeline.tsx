import React from "react";
import { useProjectStore } from "../../store/projectStore";
import Define from "./Define/Define";
import Collect from "./Collect/Collect";
import Clean from "./Clean/Clean";
import Analyze from "./Analyze/Analyze";
import Visualize from "./Visualize/Visualize";
import Report from "./Report/Report";

export default function Pipeline() {
  const { activePipelineTab, activeProjectId, projects } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  if (!activeProject) {
    return (
      <div style={{ padding: 28, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No project open</div>
          <div style={{ fontSize: 12, color: "#73726c" }}>Create or open a project from My Projects</div>
        </div>
      </div>
    );
  }

  const steps: Record<string, React.ReactElement> = {
    define:    <Define />,
    collect:   <Collect />,
    clean:     <Clean />,
    analyze:   <Analyze />,
    visualize: <Visualize />,
    report:    <Report />,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {steps[activePipelineTab]}
    </div>
  );
}
