#!/usr/bin/env node
// Compiles agents/*.md from the source blocks in docs/.
// Axes stay sharp at the source layer (one block per axis value); this
// script does the flattening the plugin format requires. Run after editing
// any block: node scripts/build-agents.mjs   (--check verifies, no writes)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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
const anthropic = JSON.parse(read("providers/anthropic.json"));
const deltas = {
  sonnet: firstFence(read("docs/deltas/sonnet.md")),
  opus: firstFence(read("docs/deltas/opus.md")),
};

export const TASK_GRADES = ["novice", "junior", "mid", "senior", "staff", "principal", "research-grade"];
export const SEMANTIC_TIERS = ["economy", "standard", "senior", "frontier"];

const RECIPES = [
  {
    name: "executor", taskGrade: "novice", tier: "economy", posture: "deliver",
    tagline: "the specified change, applied exactly",
    description: "Execute-shaped tasks — bounded, mechanical, fully specified. Apply a patch, rename a symbol, add obvious tests, fix lint. Cheapest squad member (sonnet, low effort). Do NOT use when any judgment call is needed (→ implementer), or on foundational/library/architecture code (layer floor → integrator).",
  },
  {
    name: "implementer", taskGrade: "mid", tier: "standard", posture: "deliver",
    tagline: "a working feature or fix inside existing patterns",
    description: "Implement-shaped tasks — one feature or fix inside known patterns, in well-trodden non-foundational code. The junior/mid-level dev of the squad (sonnet, medium effort). Do NOT use on foundational/library/architecture layers however mechanical the task looks (layer floor → integrator), for ambiguous debugging (→ integrator), or for anything designing something new (→ designer).",
  },
  {
    name: "integrator", taskGrade: "senior", tier: "senior", posture: "deliver",
    tagline: "a working change across seams, with the map of what moved",
    description: "Integrate-shaped tasks — cross-file changes, ambiguous debugging, refactors with behavior at stake, and ANY work on foundational/library/architecture code (the layer floor routes such work here even when it looks mechanical). Senior engineer of the squad (opus, high effort). For choosing a new design shape rather than working within one, use designer instead.",
  },
  {
    name: "designer", taskGrade: "staff", tier: "frontier",
    tools: "Read, Grep, Glob, Bash",
    tagline: "a decision with trade-offs, not code",
    description: "Design-shaped tasks — choosing the shape of things: APIs, data models, decomposition, lifecycle semantics, naming that commits the system. Also small-looking decisions with large blast radius (a one-line naming choice that shapes an API is design, not execute). Tech-lead grade (opus, xhigh effort). Produces a DECISION with trade-offs, not code — read-only tools by design.",
  },
  {
    name: "scout", taskGrade: "junior", tier: "economy", posture: "explore",
    tools: "Read, Grep, Glob, Bash, WebSearch, WebFetch",
    tagline: "gathered findings, with provenance",
    description: "Research SCOUT tier — locate, map, gather: where is X, what calls Y, sweep a codebase or the web for sources, map unknown territory. Read-only, cheap fan-out unit (sonnet, low effort) — spawn several in parallel for multi-angle sweeps. GATHERS and reports; does not deep-synthesize or conclude. For deep analysis / root-cause / grounding a design in real behavior, use analyst instead.",
  },
  {
    name: "analyst", taskGrade: "senior", tier: "senior", posture: "explore",
    tools: "Read, Grep, Glob, Bash, WebSearch, WebFetch",
    tagline: "understanding, grounded in real behavior",
    description: "Research DEEP-DIVE tier — how a system actually works, why it behaves as it does, root-cause, or grounding a proposed design against real behavior. Read-only, opus/high: depth over breadth, traces to ground truth rather than simulating from the text. Produces UNDERSTANDING, not a decision (→ designer) or a change (→ integrator). Fan out multiple analysts over distinct subsystems when the analysis needs more than one held at once. Do NOT use for mere location/gathering (→ scout).",
  },
  {
    name: "verifier", taskGrade: "senior", tier: "senior",
    tools: "Read, Grep, Glob, Bash",
    tagline: "one claim in, one adversarial verdict out",
    description: "Adversarial verification of a specific claim or finding — \"is this bug real\", \"does this fix actually hold\", \"try to refute this\". The standard fan-out unit for workflow verify stages (opus, high; for a single make-or-break verdict use judge instead). Never reuses the finder's model tier below opus.",
  },
  {
    name: "judge", taskGrade: "staff", tier: "senior",
    tools: "Read, Grep, Glob, Bash",
    tagline: "competing alternatives in, a ranked decision out",
    description: "Scoring and selection among competing alternatives — judge panels over N design attempts, ranking findings by severity, choosing a winner and synthesizing from runners-up. Also the single-verdict escalation above verifier when one make-or-break call decides the work (opus, high). Produces a ranked judgment, not code — read-only tools by design.",
  },
  {
    name: "research-scientist", taskGrade: "research-grade", tier: "frontier", posture: "explore",
    tools: "Read, Grep, Glob, Bash, WebSearch, WebFetch",
    tagline: "a tested hypothesis at the edge of what is known",
    description: "Research-grade inquiry — open solution class, novel method, or cutting-edge computer-science work. Frames hypotheses, designs discriminating experiments, and synthesizes new understanding. Frontier capability with high deliberation; do NOT use for source gathering (→ scout), ordinary root-cause analysis (→ analyst), or selecting among known designs (→ designer).",
  },
];

// Compatibility is intentionally outside RECIPES: aliases are accepted adapter
// spellings, never canonical routing identities.
const COMPAT_ALIASES = [{ name: "researcher", target: "scout" }];

function validateRecipes() {
  const seen = new Set();
  for (const recipe of RECIPES) {
    if (seen.has(recipe.name)) throw new Error(`duplicate recipe: ${recipe.name}`);
    seen.add(recipe.name);
    if (!TASK_GRADES.includes(recipe.taskGrade)) {
      throw new Error(`${recipe.name}: invalid taskGrade ${JSON.stringify(recipe.taskGrade)}`);
    }
    if (!SEMANTIC_TIERS.includes(recipe.tier)) {
      throw new Error(`${recipe.name}: invalid semantic tier ${JSON.stringify(recipe.tier)}`);
    }
  }
  for (const alias of COMPAT_ALIASES) {
    if (seen.has(alias.name)) throw new Error(`compat alias is canonical: ${alias.name}`);
    if (!seen.has(alias.target)) throw new Error(`compat alias target is missing: ${alias.target}`);
  }
}

validateRecipes();

// Generated Claude Code agents are an adapter artifact. Resolve their concrete
// pins from the Anthropic catalog while keeping recipes provider-neutral.
for (const recipe of RECIPES) {
  const resolved = anthropic.tiers[recipe.tier];
  if (!resolved) throw new Error(`Anthropic catalog does not resolve tier: ${recipe.tier}`);
  recipe.model = resolved.model;
  recipe.effort = resolved.defaultEffort;
}

function render(r) {
  const routingPayload = JSON.stringify({
    role: r.routingRole || r.name,
    ...(r.routingRole ? { invokedAs: r.name } : {}),
    taskGrade: r.taskGrade,
    tier: r.tier,
    posture: r.posture || "explore",
    composition: { kind: "preset", id: r.routingRole || r.name },
  });
  const fm = [
    "---",
    `name: ${r.name}`,
    `description: ${r.description} Task grade: ${r.taskGrade}.`,
    `model: ${r.model}`,
    `effort: ${r.effort}`,
    ...(r.tools ? [`tools: ${r.tools}`] : []),
    "---",
  ].join("\n");
  const parts = [
    fm,
    "",
    "<!-- GENERATED by scripts/build-agents.mjs — edit docs/ blocks + script recipes, then rebuild. Do not edit by hand. -->",
    `<!-- GAFFER_ROUTING ${routingPayload} -->`,
    "",
    `You are the ${r.name}: ${r.tagline}.`,
    "",
    "## Role",
    block(roles, r.roleBlock || r.name),
  ];
  if (r.posture) parts.push("", `## Posture: ${r.posture}`, block(postures, r.posture));
  parts.push("", "## Output norms", comms);
  parts.push("", "## Delta protocol — tuned to this model's documented tendencies", deltas[r.model]);
  return parts.join("\n") + "\n";
}

function renderAlias(alias) {
  const target = RECIPES.find((r) => r.name === alias.target);
  return render({
    ...target,
    name: alias.name,
    routingRole: alias.target,
    roleBlock: alias.target,
    description: `Deprecated compatibility alias for gaffer:${alias.target}. ${target.description}`,
  });
}

// The north spawn-adapter's SPAWN SURFACES doctrine block — generated from the
// SAME RECIPES so the dials never drift from the agents. scripts/inject-doctrine.sh
// swaps this in for the native block when GAFFER_SPAWN_ADAPTER=north (legacy tern accepted, or
// dispatch=north). North-native roles pass a north `role` block; other roles
// ride in the prompt until the runtime contract supports them directly.
const NORTH_ROLE = new Set(["executor", "implementer", "integrator", "designer", "scout", "research-scientist"]);
function renderNorthAdapter() {
  const rows = RECIPES.map((r) => ({
    role: r.name, grade: r.taskGrade, tier: r.tier, claude: `${r.model}/${r.effort}`,
    northRole: NORTH_ROLE.has(r.name) ? r.name : "—",
    posture: r.posture || "explore",
  }));
  const cols = [["gaffer role", "role"], ["task grade", "grade"], ["tier", "tier"], ["Claude bridge", "claude"], ["north role", "northRole"], ["posture", "posture"]];
  const w = cols.map(([h, k]) => Math.max(h.length, ...rows.map((r) => String(r[k]).length)));
  const fmt = (cells) => ("  " + cells.map((c, i) => String(c).padEnd(w[i])).join("  ")).replace(/\s+$/, "");
  const table = [
    fmt(cols.map(([h]) => h)),
    fmt(w.map((n) => "-".repeat(n))),
    ...rows.map((r) => fmt(cols.map(([, k]) => r[k]))),
  ].join("\n");
  return `SPAWN SURFACES (adapter: north) — a squad member is a semantic routing
tuple, delivered on the north substrate. Native Agent/Task/Workflow are DENIED
here (dispatch=north) — the harness still advertises gaffer:* + native agent
types, IGNORE that and go STRAIGHT to north; never let the advertised list bait a
native call (that is the recurring misfire).
- contract-v2 job → mcp__north__spawn {prompt, provider, tier, role, posture}
- current/legacy North bridge → resolve the catalog first, then
  mcp__north__spawn {prompt, model, effort, role, posture}; Claude resolutions
  are included below so existing North behavior is unchanged
- fan-out → one mcp__north__spawn per lane in the SAME turn; observe at web :8088
- thread-driven → capture the thread, then mcp__north__dispatch (posture from claims)
The North-native roles pass a north \`role\` block; the remaining read-only roles
have none → pin task grade+tier+posture, role rides in the
prompt. Use provider=auto unless policy or the caller explicitly overrides it.
Contract v2 makes North resolve tier through a provider catalog and record the
concrete model and reasoning/effort. Until North advertises v2, use its legacy
shape and resolve before the call. Routing (canonical — generated from RECIPES,
do not hand-edit):

${table}

Compatibility: \`gaffer:researcher\` remains an adapter alias for
\`gaffer:scout\`; it is not a canonical routing role.

ORCHESTRATION (two-tier law, see doctrine.md): the delegated fork is the
ORCHESTRATOR when the task decomposes (≥2 independent subtasks ⇒ MUST fan out
one mcp__north__spawn per subtask, same turn, then own the seams + verify) and
the interned WORKER when it is atomic (⇒ MUST NOT sub-delegate, except ONE
verifier for its own deliverable). No worker spawns workers; depth caps at two.
STOP-RULE: subdivide only while it buys more independence, certainty, or
verifiability than integration cost; a unit with a clear objective, bounded
scope, known I/O, and a verification path is TERMINAL (a worker's atom), so
each sub-spawn carries that LOCAL contract. The orchestrator OWNS REDUCTION —
child outputs reconcile in it, never flat fan-in; deliverables return UP,
never sideways. Over-parallelize EXPLORATION, converge EXECUTION; width and
sequential waves (explore → reconcile → execute) are unbounded, depth stays two.

If a native call slips through, the agent-spawn-guard hook denies with the exact
mcp__north__spawn call pre-resolved for that role and tier — one-paste recovery. A native
denial is a routing instruction, never a wall: translate, never abandon the
squad pick or drop to an unrouted spawn.`;
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
for (const alias of COMPAT_ALIASES) {
  const path = resolve(ROOT, `agents/${alias.name}.md`);
  const out = renderAlias(alias);
  const cur = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (cur === out) continue;
  if (check) { console.error(`STALE: agents/${alias.name}.md (compat alias)`); dirty++; }
  else { writeFileSync(path, out); console.log(`wrote agents/${alias.name}.md (compat alias)`); }
}

// Generated spawn-adapter blocks (same drift-check contract as the agents).
const ADAPTERS = [{ path: "docs/adapters/north.md", render: renderNorthAdapter }];
for (const a of ADAPTERS) {
  const path = resolve(ROOT, a.path);
  const out = a.render() + "\n";
  const cur = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (cur === out) continue;
  if (check) { console.error(`STALE: ${a.path}`); dirty++; }
  else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, out); console.log(`wrote ${a.path}`); }
}

if (check && dirty) process.exit(1);
console.log(check ? "check: all current" : "build: done");
