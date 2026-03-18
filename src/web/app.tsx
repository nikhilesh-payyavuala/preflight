import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./components/Sidebar.tsx";
import { PlanView } from "./components/PlanView.tsx";
import { fetchPlans, fetchPlan } from "./lib/api.ts";
import type { PlanMeta, PlanStatus } from "../types/index.ts";
import "./styles.css";

function App() {
  const [plans, setPlans] = useState<PlanMeta[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [planContent, setPlanContent] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<PlanMeta | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");

  // Load plans
  useEffect(() => {
    loadPlans();
  }, [statusFilter]);

  async function loadPlans() {
    const filters: { status?: string } = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    const data = await fetchPlans(filters);
    setPlans(data);

    // Check hash for initial selection
    const hash = window.location.hash;
    if (hash.startsWith("#/plans/")) {
      const slug = hash.replace("#/plans/", "");
      selectPlan(slug);
    } else if (data.length > 0 && !selectedSlug) {
      selectPlan(data[0].slug);
    }
  }

  async function selectPlan(slug: string) {
    setSelectedSlug(slug);
    window.location.hash = `#/plans/${slug}`;
    try {
      const detail = await fetchPlan(slug);
      setSelectedMeta(detail.meta);
      setPlanContent(detail.content);
    } catch {
      setPlanContent("(Could not load plan)");
    }
  }

  // Listen for hash changes
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash;
      if (hash.startsWith("#/plans/")) {
        const slug = hash.replace("#/plans/", "");
        if (slug !== selectedSlug) selectPlan(slug);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [selectedSlug]);

  // Filter plans by search query (client-side)
  const filtered = plans.filter(
    (p) =>
      p.slug.includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <Sidebar
        plans={filtered}
        selectedSlug={selectedSlug}
        onSelect={selectPlan}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
      />
      {selectedMeta && planContent !== null ? (
        <PlanView meta={selectedMeta} content={planContent} />
      ) : (
        <div className="empty-state">Select a plan to view</div>
      )}
    </>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
