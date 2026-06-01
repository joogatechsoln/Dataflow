import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "solo" | "pro" | "team_owner" | "team_member" | "team_viewer";
  teamId?: string;
  avatarInitials: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  openaiApiKey: string;
  theme: "light" | "dark" | "system";
  login: (user: User) => void;
  logout: () => void;
  setApiKey: (key: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      openaiApiKey: "",
      theme: "system",

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      setApiKey: (key) => set({ openaiApiKey: key }),

      setTheme: (theme) => set({ theme }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "dataflow-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        openaiApiKey: state.openaiApiKey,
        theme: state.theme,
      }),
    }
  )
);
