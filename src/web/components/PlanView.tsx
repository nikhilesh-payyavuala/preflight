import React from "react";
import type { PlanMeta } from "../../types/index.ts";
import { renderMarkdownToHtml } from "../lib/markdown.ts";

interface PlanViewProps {
  meta: PlanMeta;
  content: string;
}

export function PlanView({ meta, content }: PlanViewProps) {
  const html = renderMarkdownToHtml(content);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="main-content">
      <div className="content-topbar">
        <div className="topbar-breadcrumb">
          <span className="topbar-slug">{meta.slug}</span>
          <span style={{ color: "var(--text-dim)" }}>/</span>
          <span className="topbar-title">{meta.title}</span>
        </div>
        <div className="topbar-right">
          <span className="topbar-date">{formatDate(meta.updated)}</span>
          <span className={`status-badge ${meta.status}`}>{meta.status}</span>
        </div>
      </div>

      <div className="meta-strip">
        {meta.tags.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="meta-label">Tags</span>
            {meta.tags.map((tag) => (
              <span key={tag} className="meta-tag">{tag}</span>
            ))}
          </div>
        )}
        {meta.repos.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="meta-label">Repos</span>
            {meta.repos.map((repo) => (
              <span key={repo} className="meta-value">{repo.replace(/^\/Users\/\w+\//, "~/")}</span>
            ))}
          </div>
        )}
        {meta.author && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="meta-label">Author</span>
            <span className="meta-value">{meta.author}</span>
          </div>
        )}
        {meta.prs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="meta-label">PRs</span>
            {meta.prs.map((pr) => (
              <span key={`${pr.repo}-${pr.number}`} className="meta-value">
                #{pr.number}
              </span>
            ))}
          </div>
        )}
        {meta["depends-on"].length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span className="meta-label">Depends on</span>
            {meta["depends-on"].map((dep) => (
              <span key={dep} className="meta-value">{dep}</span>
            ))}
          </div>
        )}
      </div>

      <div
        className="plan-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
