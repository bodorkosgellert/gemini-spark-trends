/**
 * Offline-friendly demo export: Radar signals (if reachable) + AI gaps + hand edges.
 * Open the HTML file in a browser — no separate hosting required for a pitch prop.
 *
 *   npx tsx scripts/export-demo-snapshot.ts
 *   → server/demo-snapshot.json + server/demo-graph.html
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "server");
mkdirSync(outDir, { recursive: true });

type Gap = {
  slug: string;
  keyword: string;
  gap: string;
  status: string;
  prompt: string;
  cited: string[];
  localCited: boolean;
  note: string;
};

const gapsFile = join(root, "src/data/ai-citation-gaps.json");
const gaps = existsSync(gapsFile)
  ? (JSON.parse(readFileSync(gapsFile, "utf8")) as { gaps: Gap[] }).gaps
  : [];

/** Same map as /graph EDGES — demo until signal_edges is loaded live. */
const EDGES: Record<string, string[]> = {
  agents: ["ai agent", "rag chatbot", "note taking ai"],
  climate: ["balcony solar", "heat pump", "ev charging", "public transport", "repair cafe"],
  hardware: ["balcony solar", "heat pump", "ev charging", "energy tracker"],
  finance: ["budget tracking", "receipt scanner"],
  local: ["local events", "public transport", "repair cafe", "cycling navigation", "dog walking"],
  smb: ["invoice freelancer", "receipt scanner"],
  compliance: ["receipt scanner", "invoice freelancer"],
};

const edgeList = Object.entries(EDGES).flatMap(([from, tos]) =>
  tos.map((to) => ({ from, to, type: "SHIPS_INTO" })),
);

const snapshot = {
  generatedAt: new Date().toISOString(),
  note:
    "Local export for demo. Live scores need npm run dev + ingest. iTunes ratings affect supply only after re-ingest on a host that has this code.",
  aiCitationGaps: gaps,
  graphEdges: edgeList,
  howToRead: {
    rings: "Tag → App Store market (SHIPS_INTO). Deterministic Approach C edges.",
    cognee: "NL ask over dated signal docs — not the same as the ring SVG.",
    itunes:
      "In code: count + shelf_satisfaction (weighted stars). Not on Lovable live until push + redeploy + ingest.",
  },
};

writeFileSync(join(outDir, "demo-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);

const gapRows = gaps
  .map(
    (g) =>
      `<tr><td>${esc(g.keyword)}</td><td><b>${esc(g.gap)}</b> ${g.status === "demo" ? "(demo)" : ""}</td><td>${esc(g.note)}</td><td>${esc(g.cited.join(", ") || "—")}</td></tr>`,
  )
  .join("\n");

const edgeRows = edgeList
  .map((e) => `<tr><td>${esc(e.from)}</td><td>${esc(e.type)}</td><td>${esc(e.to)}</td></tr>`)
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<title>TrendSpark demo snapshot</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#111;background:#fafafa}
  h1{font-size:1.75rem;margin:0}
  .meta{color:#666;font-size:0.85rem;margin:0.5rem 0 1.5rem}
  table{width:100%;border-collapse:collapse;background:#fff;margin-bottom:2rem}
  th,td{border:1px solid #ddd;padding:0.5rem 0.65rem;text-align:left;font-size:0.9rem;vertical-align:top}
  th{background:#f0f0f0}
  svg{background:#fff;border:1px solid #ddd;width:100%;max-width:640px;display:block;margin:1rem 0}
  .tag{fill:#1e40af;font:11px ui-monospace,monospace}
  .mkt{fill:#b91c1c;font:10px ui-monospace,monospace}
  line{stroke:#94a3b8;stroke-width:1}
</style>
<h1>TrendSpark — graph + AI-gap snapshot</h1>
<p class="meta">Generated ${esc(snapshot.generatedAt)}. Open this file in any browser. Not the Lovable live app.</p>
<p>${esc(snapshot.note)}</p>

<h2>AI citation gaps</h2>
<table>
<thead><tr><th>Keyword</th><th>Gap</th><th>Note</th><th>Cited</th></tr></thead>
<tbody>
${gapRows || "<tr><td colspan=4>No gaps JSON found</td></tr>"}
</tbody>
</table>

<h2>Ring edges (Approach C shape)</h2>
<svg viewBox="-320 -320 640 640" aria-label="tag to market edges">
${renderSvg(edgeList)}
</svg>
<table>
<thead><tr><th>From tag</th><th>Edge</th><th>To market</th></tr></thead>
<tbody>${edgeRows}</tbody>
</table>
</html>
`;

writeFileSync(join(outDir, "demo-graph.html"), html);
console.log("Wrote server/demo-snapshot.json");
console.log("Wrote server/demo-graph.html — open in browser");

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderSvg(edges: { from: string; to: string }[]) {
  const tags = [...new Set(edges.map((e) => e.from))];
  const markets = [...new Set(edges.map((e) => e.to))];
  const pos = (i: number, n: number, r: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  };
  const tagP = Object.fromEntries(tags.map((t, i) => [t, pos(i, tags.length, 220)]));
  const mktP = Object.fromEntries(markets.map((m, i) => [m, pos(i, markets.length, 110)]));
  const lines = edges
    .map((e) => {
      const a = tagP[e.from];
      const b = mktP[e.to];
      if (!a || !b) return "";
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    })
    .join("\n");
  const tagLabels = tags
    .map((t) => {
      const p = tagP[t]!;
      return `<text class="tag" x="${p.x}" y="${p.y}" text-anchor="middle">${esc(t)}</text>`;
    })
    .join("\n");
  const mktLabels = markets
    .map((m) => {
      const p = mktP[m]!;
      return `<text class="mkt" x="${p.x}" y="${p.y}" text-anchor="middle">${esc(m)}</text>`;
    })
    .join("\n");
  return `${lines}\n${tagLabels}\n${mktLabels}`;
}
