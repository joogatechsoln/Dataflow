/**
 * notifStore.ts — DataFlow Suite Phase 7
 * In-app notification store. Tracks cloud sync events, team activity,
 * and trial/license reminders.
 * Not persisted — rebuilt on each launch (sync events come in fresh).
 */

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────────

export type NotifCategory = "sync" | "team" | "billing" | "system" | "plugin";

export interface Notification {
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  /** ISO date string */
  createdAt: string;
  read: boolean;
  /** Optional CTA */
  actionLabel?: string;
  actionPath?: string;
  /** Emoji icon */
  icon?: string;
}

interface NotifState {
  notifications: Notification[];
  unreadCount: number;

  // ── Actions ────────────────────────────────────────────────────────────
  add: (notif: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

let notifCounter = 0;

export const useNotifStore = create<NotifState>()((set, get) => ({
  notifications: [
    // Seed with realistic demo notifications
    {
      id: "seed-1",
      category: "sync",
      title: "Project synced to cloud",
      body: "\"Sales Analysis Q2\" was synced to your team workspace successfully.",
      createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      read: false,
      icon: "☁️",
    },
    {
      id: "seed-2",
      category: "team",
      title: "New team member joined",
      body: "Alex Chen accepted your invite and joined the team as Editor.",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
      icon: "👥",
      actionLabel: "View team",
      actionPath: "/team",
    },
    {
      id: "seed-3",
      category: "billing",
      title: "Trial — 11 days remaining",
      body: "Your Pro trial expires in 11 days. Upgrade now to keep all Pro features.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      read: true,
      icon: "🎁",
      actionLabel: "Upgrade",
      actionPath: "/settings?tab=billing",
    },
    {
      id: "seed-4",
      category: "plugin",
      title: "Plugin update available",
      body: "BigQuery Connector v1.2.1 is available in the Marketplace.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      read: true,
      icon: "🧩",
      actionLabel: "View",
      actionPath: "/marketplace",
    },
  ],
  unreadCount: 2,

  add: (partial) => {
    const notif: Notification = {
      ...partial,
      id: `notif-${++notifCounter}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 100), // cap at 100
      unreadCount: s.unreadCount + 1,
    }));
  },

  markRead: (id) => {
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  remove: (id) => {
    set((s) => {
      const notifications = s.notifications.filter((n) => n.id !== id);
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatNotifTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const CATEGORY_ICONS: Record<NotifCategory, string> = {
  sync: "☁️",
  team: "👥",
  billing: "💳",
  system: "⚙️",
  plugin: "🧩",
};
