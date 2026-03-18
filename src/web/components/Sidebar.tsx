import React, { useEffect, useRef } from "react";
import type { PlanMeta, PlanStatus } from "../../types/index.ts";

const STATUS_OPTIONS: (PlanStatus | "all")[] = [
  "all", "draft", "in-review", "approved", "executing", "completed", "rejected", "archived",
];

interface SidebarProps {
  plans: PlanMeta[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: PlanStatus | "all";
  onStatusFilter: (status: PlanStatus | "all") => void;
}

export function Sidebar({
  plans,
  selectedSlug,
  onSelect,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilter,
}: SidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        onSearchChange("");
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <span>preflight</span>
      </div>

      <div className="sidebar-search">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search plans...  /"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="status-filters">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            className={`status-pill ${statusFilter === status ? "active" : ""}`}
            onClick={() => onStatusFilter(status)}
          >
            {status === "all" ? "All" : status}
          </button>
        ))}
      </div>

      <div className="plan-list">
        {plans.length === 0 ? (
          <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 12 }}>
            No plans found
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.slug}
              className={`plan-item ${selectedSlug === plan.slug ? "active" : ""}`}
              onClick={() => onSelect(plan.slug)}
            >
              <div className="plan-item-header">
                <span className="plan-item-title">{plan.title}</span>
                <span className={`status-badge ${plan.status}`}>{plan.status}</span>
              </div>
              <div className="plan-item-slug">{plan.slug}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
