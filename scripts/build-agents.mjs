#!/usr/bin/env node
// Compiles agents/*.md from the source blocks in docs/.
// Axes stay sharp at the source layer (one block per axis value); this
// script does the flattening the plugin format requires. Run after editing
// any block: node scripts/build-agents.mjs   (--check verifies, no writes)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

// heading -> first fenced block after it (same extraction praxis consumers use)
function block(text, heading) {
  const lines = text.split("\n");
  const h = `## ${heading.toLowerCase()}`;
  let at = lines.findIndex((l) => l.trim().toLowerCase() === h);
  if (at === -1) throw new Error(`heading not found: ${heading}`);
  let open = -1;
  for (let i = at + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (open === -1 && t.startsWith("## ")) break;
    if (open === -1 && t.startsWith("```")) { open = i + 1; continue; }
    if (open !== -1 && t.startsWith("```")) return lines.slice(open, i).join("\n");
  }
  throw new Error(`no fence under heading: ${heading}`);
}
const firstFence = (text) => {
  const m = text.match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error("no fence in delta doc");
  return m[1];
};

const roles = read("docs/roles.md");
const postures = read("docs/postures.md");
const comms = block(read("docs/comms.md"), "universal");
const deltas = {
  sonnet: firstFence(read("docs/deltas/sonnet.md")),
  opus: firstFence(read("docs/deltas/opus.md")),
};

const RECIPES = [
  {
    name: "executor", model: "sonnet", effort: "low", posture: "deliver",
    tagline: "the specified change, applied exactly",
    description: "Execute-shaped tasks — bounded, mechanical, fully specified. Apply a patch, rename a symbol, add obvious tests, fix lint. Cheapest squad member (sonnet, low effort). Do NOT use when any judgment call is needed (→ implementer), or on foundational/library/architecture code (layer floor → integrator).",
  },
  {
    name: "implementer", model: "sonnet", effort: "medium", posture: "deliver",
    tagline: "a working feature or fix inside existing patterns",
    description: "Implement-shaped tasks — one feature or fix inside known patterns, in well-trodden non-foundational code. The junior/mid-level dev of the squad (sonnet, medium effort). Do NOT use on foundational/library/architecture layers however mechanical the task looks (layer floor → integrator), for ambiguous debugging (→ integrator), or for anything designing something new (→ designer).",
  },
  {
    name: "integrator", model: "opus", effort: "high", posture: "deliver",
    tagline: "a working change across seams, with the map of what moved",
    description: "Integrate-shaped tasks — cross-file changes, ambiguous debugging, refactors with behavior at stake, and ANY work on foundational/library/architecture code (the layer floor routes such work here even when it looks mechanical). Senior engineer of the squad (opus, high effort). For choosing a new design shape rather than working within one, use designer instead.",
  },
  {
    name: "designer", model: "opus", effort: "xhigh",
    tools: "Read, Grep, Glob, Bash",
    tagline: "a decision with trade-offs, not code",
    description: "Design-shaped tasks — choosing the shape of things: APIs, data models, decomposition, lifecycle semantics, naming that commits the system. Also small-looking decisions with large blast radius (a one-line naming choice that shapes an API is design, not execute). Tech-lead grade (opus, xhigh effort). Produces a DECISION with trade-offs, not code — read-only tools by design.",
  },
  {
    name: "researcher", model: "sonnet", effort: "low", posture: "explore",
    tools: "Read, Grep, Glob, Bash, WebSearch, WebFetch",
    tagline: "gathered findings, with provenance",
    description: "Research SCOUT tier — locate, map, gather: where is X, what calls Y, sweep a codebase or the web for sources, map unknown territory. Read-only, cheap fan-out unit (sonnet, low effort) — spawn several in parallel for multi-angle sweeps. GATHERS and reports; does not deep-synthesize or conclude. For deep analysis / root-cause / grounding a design in real behavior, use analyst instead.",
  },
  {
    name: "analyst", model: "opus", effort: "high", posture: "explore",
    tools: "Read, Grep, Glob, Bash, WebSearch, WebFetch",
    tagline: "understanding, grounded in real behavior",
    description: "Research DEEP-DIVE tier — how a system actually works, why it behaves as it does, root-cause, or grounding a proposed design against real behavior. Read-only, opus/high: depth over breadth, traces to ground truth rather than simulating from the text. Produces UNDERSTANDING, not a decision (→ designer) or a change (→ integrator). Fan out multiple analysts over distinct subsystems when the analysis needs more than one held at once. Do NOT use for mere location/gathering (→ researcher).",
  },
  {
    name: "verifier", model: "opus", effort: "high",
    tools: "Read, Grep, Glob, Bash",
    tagline: "one claim in, one adversarial verdict out",
    description: "Adversarial verification of a specific claim or finding — \"is this bug real\", \"does this fix actually hold\", \"try to refute this\". The standard fan-out unit for workflow verify stages (opus, high; for a single make-or-break verdict use judge instead). Never reuses the finder's model tier below opus.",
  },
  {
    name: "judge", model: "opus", effort: "high",
    tools: "Read, Grep, Glob, Bash",
    tagline: "competing alternatives in, a ranked decision out",
    description: "Scoring and selection among competing alternatives — judge panels over N design attempts, ranking findings by severity, choosing a winner and synthesizing from runners-up. Also the single-verdict escalation above verifier when one make-or-break call decides the work (opus, high). Produces a ranked judgment, not code — read-only tools by design.",
  },
];

function render(r) {
  const fm = [
    "---",
    `name: ${r.name}`,
    `description: ${r.description}`,
    `model: ${r.model}`,
    `effort: ${r.effort}`,
    ...(r.tools ? [`tools: ${r.tools}`] : []),
    "---",
  ].join("\n");
  const parts = [
    fm,
    "",
    "<!-- GENERATED by scripts/build-agents.mjs — edit docs/ blocks + script recipes, then rebuild. Do not edit by hand. -->",
    "",
    `You are the ${r.name}: ${r.tagline}.`,
    "",
    "## Role",
    block(roles, r.name),
  ];
  if (r.posture) parts.push("", `## Posture: ${r.posture}`, block(postures, r.posture));
  parts.push("", "## Output norms", comms);
  parts.push("", "## Delta protocol — tuned to this model's documented tendencies", deltas[r.model]);
  return parts.join("\n") + "\n";
}

const check = process.argv.includes("--check");
let dirty = 0;
for (const r of RECIPES) {
  const path = resolve(ROOT, `agents/${r.name}.md`);
  const out = render(r);
  const cur = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (cur === out) continue;
  if (check) { console.error(`STALE: agents/${r.name}.md`); dirty++; }
  else { writeFileSync(path, out); console.log(`wrote agents/${r.name}.md`); }
}
if (check && dirty) process.exit(1);
console.log(check ? "check: all agents current" : "build: done");
