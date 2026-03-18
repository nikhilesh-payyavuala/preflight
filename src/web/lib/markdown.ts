import { marked } from "marked";

const renderer = new marked.Renderer();

// Custom checkbox rendering for list items
renderer.listitem = function ({ text, checked }) {
  if (checked !== undefined) {
    const icon = checked
      ? '<svg class="checkbox-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5"><path d="M9 11l3 3L22 4"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>'
      : '<svg class="checkbox-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>';
    const cls = checked ? "checkbox checked" : "checkbox";
    // Strip the default checkbox that marked inserts
    const cleanText = text.replace(/^<input[^>]*>\s*/, "").replace(/<p>|<\/p>/g, "");
    return `<div class="${cls}">${icon}<span>${cleanText}</span></div>`;
  }
  return `<li>${text}</li>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
});

export function renderMarkdownToHtml(content: string): string {
  return marked.parse(content) as string;
}
