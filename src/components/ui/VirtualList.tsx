/**
 * VirtualList.tsx — DataFlow Suite Phase 7
 * Lightweight virtualised list for rendering large datasets without DOM overload.
 * Used in: Clean tab issue list, audit log, and any list > 200 rows.
 *
 * No external dependencies — pure React + CSS.
 *
 * Usage:
 *   <VirtualList
 *     items={issues}
 *     itemHeight={52}
 *     height={400}
 *     renderItem={(item, idx) => <IssueRow key={item.id} issue={item} />}
 *   />
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

interface VirtualListProps<T> {
  items: T[];
  /** Fixed height of each row in px */
  itemHeight: number;
  /** Visible container height in px */
  height: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Extra rows to render above/below viewport (default: 5) */
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  className,
  style,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;

  const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
  const endIdx = Math.min(items.length, startIdx + visibleCount);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleItems = items.slice(startIdx, endIdx);
  const offsetY = startIdx * itemHeight;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height,
        overflowY: "auto",
        position: "relative",
        ...style,
      }}
      className={className}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Positioned visible window */}
        <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => (
            <div key={startIdx + i} style={{ height: itemHeight, overflow: "hidden" }}>
              {renderItem(item, startIdx + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Variable-height virtualised list (for audit logs with variable row heights) ─

interface VariableVirtualListProps<T> {
  items: T[];
  /** Estimated row height — used for initial scroll calculations */
  estimatedItemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  style?: React.CSSProperties;
}

export function VariableVirtualList<T>({
  items,
  estimatedItemHeight,
  height,
  renderItem,
  overscan = 3,
  style,
}: VariableVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const measuredHeights = useRef<Map<number, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const getHeight = (i: number) => measuredHeights.current.get(i) ?? estimatedItemHeight;

  // Calculate offsets
  const offsets: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    offsets.push(cumulative);
    cumulative += getHeight(i);
  }
  const totalHeight = cumulative;

  // Find visible range
  let startIdx = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] >= scrollTop - overscan * estimatedItemHeight) { startIdx = i; break; }
  }
  startIdx = Math.max(0, startIdx - overscan);

  let endIdx = startIdx;
  for (let i = startIdx; i < items.length; i++) {
    if (offsets[i] > scrollTop + height + overscan * estimatedItemHeight) { endIdx = i; break; }
    endIdx = i + 1;
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const measureRef = useCallback((el: HTMLDivElement | null, idx: number) => {
    if (el) {
      const h = el.getBoundingClientRect().height;
      if (h > 0 && measuredHeights.current.get(idx) !== h) {
        measuredHeights.current.set(idx, h);
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height, overflowY: "auto", position: "relative", ...style }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.slice(startIdx, endIdx).map((item, i) => {
          const globalIdx = startIdx + i;
          return (
            <div
              key={globalIdx}
              ref={(el) => measureRef(el, globalIdx)}
              style={{
                position: "absolute",
                top: offsets[globalIdx] ?? globalIdx * estimatedItemHeight,
                left: 0, right: 0,
              }}
            >
              {renderItem(item, globalIdx)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Convenience: paginated fallback (when list < 500 items) ───────────────────

interface PaginatedListProps<T> {
  items: T[];
  pageSize?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  style?: React.CSSProperties;
}

export function PaginatedList<T>({
  items,
  pageSize = 50,
  renderItem,
  style,
}: PaginatedListProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const visible = items.slice(0, page * pageSize);

  return (
    <div style={style}>
      {visible.map((item, i) => renderItem(item, i))}
      {page < totalPages && (
        <button
          onClick={() => setPage((p) => p + 1)}
          style={{
            width: "100%", padding: "10px", fontSize: 12,
            background: "#f5f5f4", border: "0.5px solid #e8e6e0",
            borderRadius: 8, cursor: "pointer", color: "#73726c",
            marginTop: 4,
          }}
        >
          Show more ({(totalPages - page) * pageSize} remaining)
        </button>
      )}
    </div>
  );
}

// ── Smart auto-selector: picks the right component based on list size ──────────

interface SmartListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  style?: React.CSSProperties;
}

export function SmartList<T>({
  items, itemHeight, containerHeight, renderItem, style
}: SmartListProps<T>) {
  if (items.length > 200) {
    return (
      <VirtualList
        items={items}
        itemHeight={itemHeight}
        height={containerHeight}
        renderItem={renderItem}
        style={style}
      />
    );
  }
  return (
    <div style={{ maxHeight: containerHeight, overflowY: "auto", ...style }}>
      {items.map((item, i) => renderItem(item, i))}
    </div>
  );
}
