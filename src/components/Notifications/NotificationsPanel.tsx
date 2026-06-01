/**
 * NotificationsPanel.tsx — DataFlow Suite Phase 7
 * Slide-in notification centre panel.
 * Triggered by the 🔔 bell button in the TopBar.
 */

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifStore,
  Notification,
  NotifCategory,
  formatNotifTime,
  CATEGORY_ICONS,
} from "../../store/notifStore";

// ── Category filter chips ────────────────────────────────────────────────────

const FILTER_TABS: { key: "all" | NotifCategory; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "sync",    label: "Sync" },
  { key: "team",    label: "Team" },
  { key: "billing", label: "Billing" },
  { key: "plugin",  label: "Plugins" },
];

import { useState } from "react";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifStore();
  const [filter, setFilter] = useState<"all" | NotifCategory>("all");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const visible = filter === "all"
    ? notifications
    : notifications.filter((n) => n.category === filter);

  const handleAction = (n: Notification) => {
    markRead(n.id);
    if (n.actionPath) {
      navigate(n.actionPath);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop (subtle) */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 8998 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 52,
          right: 12,
          width: 360,
          maxHeight: "calc(100vh - 72px)",
          background: "white",
          border: "0.5px solid #e8e6e0",
          borderRadius: 14,
          boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
          zIndex: 8999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px 10px",
          borderBottom: "0.5px solid #f0ede8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: "2px 6px", borderRadius: 20,
                background: "#534AB7", color: "white",
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost"
                style={{ padding: "4px 8px", fontSize: 11 }}
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div style={{
          display: "flex", gap: 4, padding: "8px 12px",
          borderBottom: "0.5px solid #f0ede8", overflowX: "auto",
          flexShrink: 0,
        }}>
          {FILTER_TABS.map(({ key, label }) => {
            const count = key === "all"
              ? notifications.filter((n) => !n.read).length
              : notifications.filter((n) => n.category === key && !n.read).length;
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 11,
                  fontWeight: active ? 600 : 400, cursor: "pointer",
                  border: "0.5px solid",
                  borderColor: active ? "#534AB7" : "#e8e6e0",
                  background: active ? "#EEEDFE" : "transparent",
                  color: active ? "#534AB7" : "#73726c",
                  whiteSpace: "nowrap",
                  transition: "all 0.12s",
                }}
              >
                {label}
                {count > 0 && (
                  <span style={{
                    marginLeft: 4, fontSize: 9, fontWeight: 700,
                    background: active ? "#534AB7" : "#e8e6e0",
                    color: active ? "white" : "#73726c",
                    padding: "1px 4px", borderRadius: 10,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {visible.length === 0 ? (
            <div style={{
              padding: "48px 24px", textAlign: "center",
              fontSize: 13, color: "#b0aea6",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
              No notifications here yet
            </div>
          ) : (
            visible.map((n) => (
              <NotifItem
                key={n.id}
                notif={n}
                onRead={() => markRead(n.id)}
                onAction={() => handleAction(n)}
                onRemove={() => remove(n.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={{
            borderTop: "0.5px solid #f0ede8",
            padding: "8px 16px",
            flexShrink: 0,
          }}>
            <button
              className="btn btn-ghost"
              style={{ width: "100%", fontSize: 11, color: "#b0aea6" }}
              onClick={() => useNotifStore.getState().clear()}
            >
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Individual notification item ─────────────────────────────────────────────

function NotifItem({
  notif: n,
  onRead,
  onAction,
  onRemove,
}: {
  notif: Notification;
  onRead: () => void;
  onAction: () => void;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => { setHovered(true); if (!n.read) onRead(); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: n.read ? "transparent" : "#FDFCFF",
        borderBottom: "0.5px solid #f5f5f4",
        transition: "background 0.1s",
        cursor: "default",
        position: "relative",
      }}
    >
      {/* Unread dot */}
      {!n.read && (
        <div style={{
          position: "absolute", top: 14, left: 6,
          width: 5, height: 5, borderRadius: "50%",
          background: "#534AB7",
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: "#f5f5f4", border: "0.5px solid #e8e6e0",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 17, marginLeft: 8,
      }}>
        {n.icon ?? CATEGORY_ICONS[n.category]}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: n.read ? 400 : 600, color: "#1a1a18", marginBottom: 2 }}>
          {n.title}
        </div>
        <div style={{ fontSize: 11, color: "#73726c", lineHeight: 1.4 }}>
          {n.body}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "#b0aea6" }}>{formatNotifTime(n.createdAt)}</span>
          {n.actionLabel && (
            <button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              style={{
                fontSize: 10, fontWeight: 600, color: "#534AB7",
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
            >
              {n.actionLabel} →
            </button>
          )}
        </div>
      </div>

      {/* Remove button (on hover) */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position: "absolute", top: 8, right: 8,
            background: "none", border: "none",
            color: "#b0aea6", cursor: "pointer",
            fontSize: 13, padding: "2px 4px", borderRadius: 4,
          }}
          title="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
