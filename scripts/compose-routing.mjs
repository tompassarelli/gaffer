#!/usr/bin/env node
import { loadStaffingCatalog } from "./staffing-catalog.mjs";

const usage = `usage: node scripts/compose-routing.mjs <role> [options]

Options (each axis overrides independently):
  --taskGrade <grade>       novice|junior|mid|senior|staff|principal|research-grade
  --domain <name[,name]>    repeatable domain requirement
  --topology <kind>         worker|verifier|orchestrator
  --tier <tier>             economy|standard|senior|frontier
  --deliberation <level>    low|medium|high|xhigh (emitted as reasoning)
  --posture <posture>       explore|deliver|preserve
  --nearest <preset>        nearest standard template for a bespoke role
  --rationale <reason>      required when <role> is not a preset or alias
  --promotion-candidate     explicitly nominate a bespoke composition for review

Prints one provider-neutral GAFFER_ROUTING JSON payload.`;

function die(message) { console.error(message); console.error(usage); process.exit(1); }

function argumentsOf(argv) {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) {
    console.log(usage);
    process.exit(argv.length ? 0 : 1);
  }
  const role = argv[0];
  if (role.startsWith("-")) die("role must be the first argument");
  const values = { domains: [], promotionCandidate: false };
  const names = {
    "--taskGrade": "taskGrade", "--task-grade": "taskGrade", "--domain": "domain",
    "--topology": "topology", "--tier": "tier", "--deliberation": "deliberation",
    "--posture": "posture", "--nearest": "nearest", "--rationale": "rationale",
    "--promotion-candidate": "promotionCandidate",
  };
  for (let index = 1; index < argv.length; index++) {
    const [rawName, inline] = argv[index].split(/=(.*)/s, 2);
    const name = names[rawName];
    if (!name) die(`unknown option: ${rawName}`);
    if (name === "promotionCandidate") { values.promotionCandidate = true; continue; }
    const value = inline ?? argv[++index];
    if (!value || value.startsWith("--")) die(`${rawName} requires a value`);
    if (name === "domain") values.domains.push(...value.split(",").map((part) => part.trim()).filter(Boolean));
    else values[name] = value;
  }
  return { role, ...values };
}

const catalog = loadStaffingCatalog();
const args = argumentsOf(process.argv.slice(2));
const alias = catalog.aliases.find(({ name }) => name === args.role);
const canonicalRole = alias?.target ?? args.role;
const preset = catalog.recipes.find(({ name }) => name === canonicalRole);
const nearest = args.nearest && catalog.recipes.find(({ name }) => name === args.nearest);
if (args.nearest && !nearest) die(`unknown nearest preset: ${args.nearest}`);
if (!preset && !args.rationale?.trim()) die(`bespoke role ${JSON.stringify(args.role)} requires --rationale`);

const template = preset ?? nearest ?? catalog.defaults;
const selected = {
  taskGrade: args.taskGrade ?? template.taskGrade,
  tier: args.tier ?? template.tier,
  deliberation: args.deliberation ?? template.deliberation,
  topology: args.topology ?? template.topology,
  posture: args.posture ?? template.posture ?? catalog.defaults.posture,
};
for (const [field, axis] of [["taskGrade", "taskGrades"], ["tier", "semanticTiers"], ["deliberation", "deliberations"], ["topology", "topologies"], ["posture", "postures"]])
  if (!catalog.vocabulary[axis].includes(selected[field])) die(`invalid ${field}: ${selected[field]}`);

const payload = {
  role: canonicalRole,
  ...(alias ? { invokedAs: args.role } : {}),
  taskGrade: selected.taskGrade,
  domainRequirements: [...new Set(args.domains)],
  topology: selected.topology,
  tier: selected.tier,
  posture: selected.posture,
  provider: "auto",
  reasoning: selected.deliberation,
  composition: preset
    ? { kind: "preset", id: canonicalRole }
    : {
        kind: "bespoke", id: args.role,
        ...(nearest ? { nearestPreset: nearest.name } : {}),
        bespokeReason: args.rationale.trim(),
        promotionCandidate: args.promotionCandidate,
      },
};

console.log(JSON.stringify(payload));
