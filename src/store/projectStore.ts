import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PipelineStep = "define" | "collect" | "clean" | "analyze" | "visualize" | "report";
export type StepStatus = "pending" | "active" | "complete";

export interface DataSource {
  id: string;
  type: "csv" | "excel" | "postgresql" | "mysql" | "mongodb" | "api" | "sheets";
  name: string;
  connected: boolean;
  config?: Record<string, string>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  activeStep: PipelineStep;
  stepStatus: Record<PipelineStep, StepStatus>;
  dataSources: DataSource[];
  problemStatement: string;
  goals: string;
  stakeholders: string[];
  successCriteria: string;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  activePipelineTab: PipelineStep;
  createProject: (name: string, description?: string) => Project;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  setActivePipelineTab: (tab: PipelineStep) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateStepStatus: (projectId: string, step: PipelineStep, status: StepStatus) => void;
  addDataSource: (projectId: string, source: DataSource) => void;
  removeDataSource: (projectId: string, sourceId: string) => void;
}

const defaultStepStatus: Record<PipelineStep, StepStatus> = {
  define: "pending",
  collect: "pending",
  clean: "pending",
  analyze: "pending",
  visualize: "pending",
  report: "pending",
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProjectId: null,
      activePipelineTab: "define",

      createProject: (name, description = "") => {
        const project: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          activeStep: "define",
          stepStatus: { ...defaultStepStatus, define: "active" },
          dataSources: [],
          problemStatement: "",
          goals: "",
          stakeholders: [],
          successCriteria: "",
        };
        set((state) => ({ projects: [project, ...state.projects] }));
        return project;
      },

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        })),

      setActiveProject: (id) => set({ activeProjectId: id, activePipelineTab: "define" }),

      setActivePipelineTab: (tab) => set({ activePipelineTab: tab }),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      updateStepStatus: (projectId, step, status) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, stepStatus: { ...p.stepStatus, [step]: status }, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      addDataSource: (projectId, source) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, dataSources: [...p.dataSources, source], updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      removeDataSource: (projectId, sourceId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, dataSources: p.dataSources.filter((s) => s.id !== sourceId) }
              : p
          ),
        })),
    }),
    {
      name: "dataflow-projects",
    }
  )
);
