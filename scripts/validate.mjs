#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadStaffingCatalog, validateStaffingCatalog } from "./staffing-catalog.mjs";
import {
  loadProviderCatalog, modelDeltaFor, validateProviderCatalog,
  providerCatalogFreshness, resolvableDeliberations, resolveModelAlias,
} from "./provider-catalog.mjs";
import { ROUTING_FIELDS, validateRoutingRequest } from "./routing-request.mjs";
import {
  canonicalRoleId, containedLeaf, RETIRED_ROLE_IDS, ROLE_ID_PATTERN_SOURCE,
} from "./role-id.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staffing = loadStaffingCatalog();
const tiers = staffing.vocabulary.semanticTiers;
const grades = staffing.vocabulary.taskGrades;
const staffingSchema = JSON.parse(readFileSync(resolve(root, "staffing/catalog.schema.json"), "utf8"));
const routingSchema = JSON.parse(readFileSync(resolve(root, "contracts/routing-request.schema.json"), "utf8"));
if (JSON.stringify([...routingSchema.required].sort()) !== JSON.stringify([...ROUTING_FIELDS].sort()))
  throw new Error("canonical routing schema must require exactly the eight Gaffer fields");

// Role/composition identity is one safe namespace across catalog, routing,
// schemas, UI projection, and generated filenames. Schema copies are checked
// against the executable source constant so the duplicated JSON cannot drift.
const roleIdSchemas = [staffingSchema.$defs?.roleId, routingSchema.$defs?.roleId];
const retiredRoleIds = [...RETIRED_ROLE_IDS].sort();
function roleIdSchemaAccepts(schema, value) {
  if (schema?.type !== "string" || schema.pattern !== ROLE_ID_PATTERN_SOURCE ||
      JSON.stringify([...(schema.not?.enum ?? [])].sort()) !== JSON.stringify(retiredRoleIds))
    throw new Error("role ID JSON Schema must match the canonical executable pattern and retired set");
  return typeof value === "string" && new RegExp(schema.pattern).test(value) &&
    !schema.not.enum.includes(value);
}
const roleIdCases = [
  ["migration-forensics", true], ["role2", true],
  ["../outside", false], ["foo/bar", false], ["x:y", false],
  ["migration forensics", false], ["foo\nbar", false], ["foo\n", false],
  ["Migration-Forensics", false], ["researcher", false],
];
for (const [value, expected] of roleIdCases) {
  let runtimeAccepted = true;
  try { canonicalRoleId(value); } catch { runtimeAccepted = false; }
  const schemasAccepted = roleIdSchemas.every((schema) => roleIdSchemaAccepts(schema, value));
  if (runtimeAccepted !== expected || schemasAccepted !== expected || runtimeAccepted !== schemasAccepted)
    throw new Error(`runtime/schema role ID parity drift for ${JSON.stringify(value)}`);
}
const agentsRoot = resolve(root, "agents");
if (containedLeaf(agentsRoot, "migration-forensics.md") !== resolve(agentsRoot, "migration-forensics.md"))
  throw new Error("contained generated-agent path did not preserve a safe leaf");
for (const leaf of ["../outside.md", "nested/outside.md", ""]) {
  try { containedLeaf(agentsRoot, leaf); throw new Error("unsafe generated-agent path was accepted"); }
  catch (error) { if (error.message === "unsafe generated-agent path was accepted") throw error; }
}

// Exercise the actual capability-array fragments from both JSON Schemas. This
// is deliberately narrow rather than pretending that parsing a schema validates
// instances: enum, non-empty, uniqueness, and type semantics are all probed,
// then their enum is compared byte-for-byte with the canonical catalog vocab.
const capabilitySchemas = [staffingSchema.$defs?.capabilities, routingSchema.$defs?.capabilities];
const canonicalCapabilities = [...staffing.vocabulary.capabilities].sort();
function capabilitySchemaAccepts(schema, value) {
  if (schema?.type !== "array" || schema.minItems !== 1 || schema.uniqueItems !== true || !Array.isArray(schema.items?.enum))
    throw new Error("capability JSON Schema fragment must enforce non-empty unique canonical arrays");
  return Array.isArray(value) && value.length >= schema.minItems &&
    (!schema.uniqueItems || new Set(value).size === value.length) &&
    value.every((item) => schema.items.enum.includes(item));
}
for (const schema of capabilitySchemas) {
  if (JSON.stringify([...schema.items.enum].sort()) !== JSON.stringify(canonicalCapabilities))
    throw new Error("capability JSON Schema enum drifted from staffing vocabulary");
  for (const [value, expected] of [
    [["filesystem.read"], true],
    [[], false],
    [["filesystem.read", "filesystem.read"], false],
    [["filesystem.telepathy"], false],
    [[42], false],
  ]) {
    if (capabilitySchemaAccepts(schema, value) !== expected)
      throw new Error(`capability JSON Schema parity probe failed for ${JSON.stringify(value)}`);
  }
}
for (const recipe of staffing.recipes)
  for (const schema of capabilitySchemas)
    if (!capabilitySchemaAccepts(schema, recipe.capabilities))
      throw new Error(`${recipe.name}: canonical capabilities fail a JSON Schema capability fragment`);
// Negative schema-level probes exercise the validators used by the generators;
// parsing a JSON Schema file alone is not validation.
for (const invalid of [
  { ...staffing, defaults: { ...staffing.defaults, topology: "manager" } },
  { ...staffing, recipes: [{ ...staffing.recipes[0], tier: "cheap" }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: [{ ...staffing.recipes[0], name: { bad: true } }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: [{ ...staffing.recipes[0], capabilities: ["filesystem.telepathy"] }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: [{ ...staffing.recipes[0], capabilities: [] }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: [{ ...staffing.recipes[0], capabilities: ["filesystem.read", "filesystem.read"] }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: [{ ...staffing.recipes[0], capabilities: [42] }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: staffing.recipes.map((recipe) => recipe.name === "designer"
    ? { ...recipe, topology: "orchestrator" } : recipe) },
  { ...staffing, recipes: staffing.recipes.map((recipe) => recipe.name === "director"
    ? { ...recipe, capabilities: [...recipe.capabilities, "filesystem.write"] } : recipe) },
  { ...staffing, recipes: staffing.recipes.map((recipe) => recipe.name === "director"
    ? { ...recipe, capabilities: recipe.capabilities.map((capability) => capability === "shell.readonly" ? "shell" : capability) } : recipe) },
  { ...staffing, recipes: [{ ...staffing.recipes[0], capabilities: [...staffing.recipes[0].capabilities, "coordination"] }, ...staffing.recipes.slice(1)] },
  { ...staffing, recipes: [{ ...staffing.recipes[0], capabilities: [...staffing.recipes[0].capabilities, "shell.readonly"] }, ...staffing.recipes.slice(1)] },
]) {
  try { validateStaffingCatalog(invalid); throw new Error("invalid staffing catalog was accepted"); }
  catch (error) { if (error.message === "invalid staffing catalog was accepted") throw error; }
}
for (const [capabilities, expected] of [
  [["filesystem.read"], true],
  [[], false],
  [["filesystem.read", "filesystem.read"], false],
  [["filesystem.telepathy"], false],
  [[42], false],
]) {
  const probe = { ...staffing, recipes: [
    { ...staffing.recipes[0], capabilities }, ...staffing.recipes.slice(1),
  ] };
  let runtimeAccepted = true;
  try { validateStaffingCatalog(probe); } catch { runtimeAccepted = false; }
  const schemaAccepted = capabilitySchemas.every((schema) => capabilitySchemaAccepts(schema, capabilities));
  if (runtimeAccepted !== expected || schemaAccepted !== expected || runtimeAccepted !== schemaAccepted)
    throw new Error(`runtime/schema capability parity drift for ${JSON.stringify(capabilities)}`);
}
for (const [field, makeProbe] of [
  ["recipe", (name) => ({ ...staffing, recipes: [
    { ...staffing.recipes[0], name }, ...staffing.recipes.slice(1),
  ] })],
  ["alias", (name) => ({ ...staffing, aliases: [{ name, target: staffing.recipes[0].name }] })],
  ["alias target", (target) => ({ ...staffing, aliases: [{ name: "safe-alias", target }] })],
]) {
  for (const [name, expected] of roleIdCases) {
    let accepted = true;
    try { validateStaffingCatalog(makeProbe(name)); } catch { accepted = false; }
    // A safe alias target still has to exist; use recipe validation only for
    // positive target grammar and require rejection for every unsafe target.
    if (field === "alias target" && expected) continue;
    if (accepted !== expected)
      throw new Error(`staffing ${field} ID policy drift for ${JSON.stringify(name)}`);
  }
}
const providerCatalogs = Object.fromEntries(["anthropic", "openai"]
  .map((name) => [name, loadProviderCatalog(name)]));
for (const catalog of Object.values(providerCatalogs)) {
  const freshness = providerCatalogFreshness(catalog);
  if (freshness.status === "overdue") console.warn(`WARNING: ${freshness.message}`);
  for (const [alias, exact] of Object.entries(catalog.modelAliases)) {
    if (resolveModelAlias(catalog, alias) !== exact || resolveModelAlias(catalog, exact) !== exact)
      throw new Error(`${catalog.provider}: model alias resolution drifted for ${alias}`);
    modelDeltaFor(catalog, exact);
  }
}
const fable = resolveModelAlias(providerCatalogs.anthropic, "fable");
if (fable === "fable" || Object.values(providerCatalogs.anthropic.tiers).some(({ model }) => model === fable) ||
    modelDeltaFor(providerCatalogs.anthropic, fable).kind !== "none")
  throw new Error("temporary Fable promotion must resolve catalog alias → runtime-only exact model with explicit-none delta");
try { modelDeltaFor(providerCatalogs.anthropic, "unlisted-runtime-model"); throw new Error("missing exact model delta was inherited"); }
catch (error) { if (error.message === "missing exact model delta was inherited") throw error; }
const providerNames = /\b(?:sonnet|opus|luna|terra|sol)\b/i;
for (const recipe of staffing.recipes) {
  if (providerNames.test(recipe.description)) throw new Error(`${recipe.name}: provider model leaked into neutral staffing description`);
}
if (staffing.aliases.some(({ name }) => name === "researcher") ||
    !staffing.recipes.find(({ name, taskGrade }) => name === "scout" && taskGrade === "junior") ||
    !staffing.recipes.find(({ name, taskGrade }) => name === "research-scientist" && taskGrade === "research-grade"))
  throw new Error("research assistant/scout and cutting-edge research-scientist must remain distinct");
const openaiFixture = providerCatalogs.openai;
const missingModelDeltas = { ...openaiFixture.modelDeltas };
delete missingModelDeltas[openaiFixture.tiers.senior.model];
for (const [label, invalid] of [
  ["unknown tier field", { ...openaiFixture, tiers: { ...openaiFixture.tiers,
    economy: { ...openaiFixture.tiers.economy, price: 1 },
  } }],
  ["unsupported default", { ...openaiFixture, tiers: { ...openaiFixture.tiers,
    economy: { ...openaiFixture.tiers.economy, defaultReasoning: "high" },
  } }],
  ["duplicate transports", { ...openaiFixture, transports: ["codex-cli", "codex-cli"] }],
  ["missing model delta", { ...openaiFixture, modelDeltas: missingModelDeltas }],
  ["reversed review chronology", { ...openaiFixture, provenance: { ...openaiFixture.provenance, reviewAfter: "2000-01-01" } }],
  ["unsupported provenance scope", { ...openaiFixture, provenance: { ...openaiFixture.provenance,
    sources: [{ ...openaiFixture.provenance.sources[0], scopes: ["model-family", "rung-economics"] }],
  } }],
  ["unofficial provenance source", { ...openaiFixture, provenance: { ...openaiFixture.provenance,
    sources: [{ ...openaiFixture.provenance.sources[0], url: "https://example.com/models" }],
  } }],
  ["alias without exact delta", { ...openaiFixture, modelAliases: { ...openaiFixture.modelAliases, ghost: "gpt-ghost" } }],
]) {
  try { validateProviderCatalog(invalid, "openai"); throw new Error(`${label} provider catalog was accepted`); }
  catch (error) { if (error.message === `${label} provider catalog was accepted`) throw error; }
}
const overdueFixture = { ...openaiFixture, provenance: {
  ...openaiFixture.provenance, asOf: "2000-01-01", reviewAfter: "2000-02-01",
} };
validateProviderCatalog(overdueFixture, "openai");
const overdueFreshness = providerCatalogFreshness(overdueFixture, "2000-03-01");
if (overdueFreshness.status !== "overdue" || !overdueFreshness.message.includes("review overdue"))
  throw new Error("overdue provider review must be a surfaced nonfatal freshness status");
try {
  validateProviderCatalog({ ...openaiFixture, provenance: {
    ...openaiFixture.provenance, asOf: "2026-07-16", reviewAfter: "2026-07-15",
  } }, "openai");
  throw new Error("reversed provider review chronology was accepted");
} catch (error) {
  if (error.message === "reversed provider review chronology was accepted" ||
      !error.message.includes("reviewAfter must not precede asOf")) throw error;
}

// Canonical cross-harness fixtures exercise semantics the JSON Schema cannot
// express by itself (preset diffs, director invariants, catalog membership).
const routingFixtures = JSON.parse(readFileSync(resolve(root, "contracts/routing-request.fixtures.json"), "utf8"));
for (const fixture of routingFixtures.valid) {
  try { validateRoutingRequest(fixture.request, staffing); }
  catch (error) { throw new Error(`valid routing fixture '${fixture.name}' failed: ${error.message}`); }
}
for (const fixture of routingFixtures.invalid) {
  try { validateRoutingRequest(fixture.request, staffing); throw new Error("invalid routing fixture was accepted"); }
  catch (error) {
    if (error.message === "invalid routing fixture was accepted" || !error.message.includes(fixture.errorContains))
      throw new Error(`invalid routing fixture '${fixture.name}' produced wrong error: ${error.message}`);
  }
}
const safeBespoke = routingFixtures.valid.find(({ name }) => name === "complete bespoke contract")?.request;
if (!safeBespoke) throw new Error("safe bespoke routing fixture is missing");
validateRoutingRequest(safeBespoke, staffing);
for (const [id, expected] of roleIdCases) {
  const request = structuredClone(safeBespoke);
  request.role = id;
  request.composition.id = id;
  let accepted = true;
  try { validateRoutingRequest(request, staffing); } catch { accepted = false; }
  if (accepted !== expected)
    throw new Error(`routing role/composition ID policy drift for ${JSON.stringify(id)}`);
}
for (const badId of roleIdCases.filter(([, expected]) => !expected).map(([id]) => id)) {
  const request = structuredClone(safeBespoke);
  request.composition.id = badId;
  try { validateRoutingRequest(request, staffing); throw new Error("unsafe composition.id was accepted"); }
  catch (error) { if (error.message === "unsafe composition.id was accepted") throw error; }
}
{
  const request = structuredClone(safeBespoke);
  request.composition.nearestPreset = "bad/preset";
  try { validateRoutingRequest(request, staffing); throw new Error("unsafe nearestPreset was accepted"); }
  catch (error) { if (error.message === "unsafe nearestPreset was accepted") throw error; }
}

// The generator owns recipe validation so its rules cannot drift from what it
// renders. Importing it with --check validates every recipe's independent task
// grade and semantic tier, then proves all generated adapter artifacts current.
if (new Set(grades).size !== grades.length || new Set(tiers).size !== tiers.length) {
  throw new Error("validation vocabulary contains duplicates");
}

const built = spawnSync(process.execPath, [resolve(root, "scripts/build-agents.mjs"), "--check"], { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);

// Parse every generated agent with the runtime's real YAML implementation
// (PyYAML), then consume that parsed structure below. Regex-only frontmatter
// checks missed valid-looking scalars whose `: ` punctuation changed YAML shape.
const generatedAgentPaths = [
  ...staffing.recipes.map(({ name }) => resolve(root, `agents/${name}.md`)),
  ...staffing.aliases.map(({ name }) => resolve(root, `agents/${name}.md`)),
];
const yamlProbe = spawnSync("python3", ["-c", String.raw`
import json, pathlib, sys, yaml
result = {}
required = {"name": str, "description": str, "model": str, "effort": str, "tools": str}
for raw_path in sys.argv[1:]:
    path = pathlib.Path(raw_path)
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "---":
        raise ValueError(f"{path}: missing opening YAML frontmatter delimiter")
    try:
        end = lines.index("---", 1)
    except ValueError:
        raise ValueError(f"{path}: missing closing YAML frontmatter delimiter")
    data = yaml.safe_load("\n".join(lines[1:end]))
    if not isinstance(data, dict) or set(data) != set(required):
        raise ValueError(f"{path}: frontmatter keys must be exactly {sorted(required)}; got {data!r}")
    for key, expected_type in required.items():
        if not isinstance(data[key], expected_type) or not data[key]:
            raise TypeError(f"{path}: {key} must parse as a non-empty {expected_type.__name__}")
    result[str(path)] = data
print(json.dumps(result))
`, ...generatedAgentPaths], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
if (yamlProbe.status !== 0)
  throw new Error(`generated agent YAML parse failed:\n${yamlProbe.error?.message || yamlProbe.stderr || yamlProbe.stdout}`);
const parsedAgentFrontmatter = JSON.parse(yamlProbe.stdout);
for (const path of generatedAgentPaths) {
  const raw = readFileSync(path, "utf8");
  for (const field of ["name", "description", "model", "effort", "tools"])
    if (!new RegExp(`^${field}: "`, "m").test(raw))
      throw new Error(`${path}: generated free-string frontmatter field ${field} must be YAML-quoted`);
}

// ---- composition matrix ----
// Drive the real composition CLI over every preset, alias, a bespoke role, and
// independent single-axis overrides. Every request retains exactly eight
// top-level fields while composition records why its shape differs from a preset.
const compose = (argv) => {
  const r = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), ...argv], { encoding: "utf8" });
  return { status: r.status, stderr: r.stderr, payload: r.status === 0 ? JSON.parse(r.stdout) : null };
};
const hasExactRoutingFields = (payload) =>
  JSON.stringify(Object.keys(payload).sort()) === JSON.stringify([...ROUTING_FIELDS].sort());

// Topology is coordination authority only: worker|orchestrator. verifier and
// judge are worker-topology ROLES, never a third topology.
if (staffing.vocabulary.topologies.length !== 2 ||
    !["worker", "orchestrator"].every((t) => staffing.vocabulary.topologies.includes(t)))
  throw new Error("topology vocabulary must be exactly worker|orchestrator");
for (const role of ["verifier", "judge"])
  if (staffing.recipes.find((r) => r.name === role)?.topology !== "worker")
    throw new Error(`${role} must be a worker-topology role, not a topology`);
const director = staffing.recipes.find(({ name }) => name === "director");
if (!director || director.taskGrade !== "staff" || director.tier !== "frontier" ||
    director.deliberation !== "xhigh" || director.topology !== "orchestrator" || director.posture !== "deliver")
  throw new Error("director must remain the staff/frontier/xhigh orchestrator preset");
const judge = staffing.recipes.find(({ name }) => name === "judge");
if (!judge || judge.taskGrade !== "staff" || judge.tier !== "frontier" || judge.deliberation !== "xhigh" || judge.topology !== "worker")
  throw new Error("judge must remain the staff/frontier/xhigh high-leverage verdict preset");
for (const recipe of staffing.recipes.filter(({ name }) => name !== "director"))
  if (recipe.topology !== "worker") throw new Error(`${recipe.name} unexpectedly grants orchestrator topology`);
const nonAuthoringPresets = ["designer", "director", "scout", "analyst", "verifier", "judge", "research-scientist"];
for (const name of nonAuthoringPresets) {
  const recipe = staffing.recipes.find((candidate) => candidate.name === name);
  if (!recipe || recipe.capabilities.includes("filesystem.write") || recipe.capabilities.includes("shell") ||
      !recipe.capabilities.includes("shell.readonly"))
    throw new Error(`${name} must remain a mechanically non-authoring preset`);
}
for (const name of ["executor", "implementer", "integrator"])
  if (!staffing.recipes.find((recipe) => recipe.name === name)?.capabilities.includes("filesystem.write") ||
      !staffing.recipes.find((recipe) => recipe.name === name)?.capabilities.includes("shell") ||
      staffing.recipes.find((recipe) => recipe.name === name)?.capabilities.includes("shell.readonly"))
    throw new Error(`${name} must retain its authoring capability`);
if (!director.capabilities.includes("coordination"))
  throw new Error("director must retain provider-neutral coordination capability");
for (const recipe of staffing.recipes)
  if (recipe.topology === "worker" && recipe.capabilities.includes("coordination"))
    throw new Error(`${recipe.name}: worker topology must not carry coordination capability`);

// Every preset composes; its payload matches its recipe, resolves, and carries
// only the canonical routing fields.
for (const recipe of staffing.recipes) {
  const { status, payload, stderr } = compose([recipe.name]);
  if (status !== 0 || !payload) throw new Error(`preset ${recipe.name} failed to compose: ${stderr}`);
  if (payload.role !== recipe.name || payload.taskGrade !== recipe.taskGrade || payload.tier !== recipe.tier ||
      payload.reasoning !== recipe.deliberation || payload.topology !== recipe.topology ||
      payload.composition?.kind !== "preset" || payload.composition?.id !== recipe.name ||
      payload.composition?.overrides?.length !== 0 || payload.composition?.overrideReason !== undefined)
    throw new Error(`preset ${recipe.name} payload drifts from its recipe`);
  if (!resolvableDeliberations(payload.tier).has(payload.reasoning))
    throw new Error(`preset ${recipe.name} emits an unresolvable tier/deliberation pair`);
  if (!hasExactRoutingFields(payload))
    throw new Error(`preset ${recipe.name} payload must contain exactly the eight routing fields`);
  const generated = readFileSync(resolve(root, `agents/${recipe.name}.md`), "utf8");
  const marker = generated.match(/<!-- GAFFER_ROUTING (\{.*\}) -->/);
  if (!marker) throw new Error(`generated ${recipe.name} is missing GAFFER_ROUTING`);
  validateRoutingRequest(JSON.parse(marker[1]), staffing);
  const posture = recipe.posture ?? staffing.defaults.posture;
  if (!generated.includes(`TASK GRADE: ${recipe.taskGrade.toUpperCase()}`) ||
      !generated.includes(`TOPOLOGY: ${recipe.topology.toUpperCase()}`) ||
      !generated.includes(`POSTURE: ${posture.toUpperCase()}`))
    throw new Error(`generated ${recipe.name} must include task-grade, topology, and effective-posture blocks`);
  const frontmatter = parsedAgentFrontmatter[resolve(root, `agents/${recipe.name}.md`)];
  if (frontmatter?.name !== recipe.name || !frontmatter.description.endsWith(`Task grade: ${recipe.taskGrade}.`))
    throw new Error(`generated ${recipe.name} YAML frontmatter identity/grade drifted`);
  const tools = frontmatter.tools.split(/,\s*/).filter(Boolean);
  const hasAllAuthoringTools = ["Edit", "Write"].every((tool) => tools.includes(tool));
  const hasAnyAuthoringTool = ["Edit", "Write"].some((tool) => tools.includes(tool));
  if (recipe.capabilities.includes("filesystem.write") ? !hasAllAuthoringTools : hasAnyAuthoringTool)
    throw new Error(`generated ${recipe.name} authoring tools drift from canonical capabilities`);
  if (recipe.capabilities.includes("shell.readonly") && tools.includes("Bash"))
    throw new Error(`generated ${recipe.name} exposes unrestricted Bash for shell.readonly`);
  if (recipe.capabilities.includes("shell") !== tools.includes("Bash"))
    throw new Error(`generated ${recipe.name} shell tool drifts from canonical capabilities`);
  if (recipe.capabilities.includes("coordination") !== tools.includes("Agent"))
    throw new Error(`generated ${recipe.name} coordination tool drifts from canonical capabilities`);
  if (!generated.includes("## Output norms"))
    throw new Error(`generated ${recipe.name} omits the universal communication block`);
}

{
  const generatedDirector = readFileSync(resolve(root, "agents/director.md"), "utf8");
  const doctrine = readFileSync(resolve(root, "doctrine.md"), "utf8");
  const topologies = readFileSync(resolve(root, "docs/topologies.md"), "utf8");
  if (!generatedDirector.includes("TOPOLOGY: ORCHESTRATOR") ||
      !generatedDirector.includes("TASK GRADE: STAFF") ||
      generatedDirector.includes("TOPOLOGY: WORKER") || generatedDirector.includes("INTERNED WORKER") ||
      /orchestrator[\s\S]{0,240}drops? to worker behavior/i.test(doctrine) ||
      /worker[\s\S]{0,160}(?:exception|may spawn)[\s\S]{0,80}verifier/i.test(`${doctrine}\n${topologies}`))
    throw new Error("generated director carries a worker/orchestrator contradiction");
}

// Every alias composes to its canonical preset without adding a ninth wire
// field. The canonical composition id is sufficient provenance for execution.
for (const alias of staffing.aliases) {
  const { status, payload, stderr } = compose([alias.name]);
  if (status !== 0 || payload?.role !== alias.target || payload?.composition?.id !== alias.target ||
      !hasExactRoutingFields(payload) || !resolvableDeliberations(payload.tier).has(payload.reasoning))
    throw new Error(`alias ${alias.name} did not compose to target ${alias.target}: ${stderr}`);
}

{
  const retired = compose(["researcher"]);
  if (retired.status === 0 || !retired.stderr.includes("role 'researcher' is retired because it was ambiguous"))
    throw new Error("ambiguous researcher role must fail with a teaching migration");
}

// Bespoke composition: complete authority contract plus explicit promotion decision.
{
  const missing = compose(["migration-forensics"]);
  if (missing.status === 0 || !missing.stderr.includes("requires --rationale"))
    throw new Error("bespoke rationale gate is not enforced");
  const contract = JSON.stringify({
    responsibility: "trace migrations", deliverable: "evidence-linked timeline",
    capabilities: ["filesystem.read", "filesystem.search", "shell.readonly"],
    mayDecide: ["read-only probes"], mustEscalate: ["destructive recovery"],
    doneWhen: ["every transition is sourced"], report: "timeline, evidence, and gaps",
  });
  const badCapabilities = compose(["migration-forensics", "--rationale", "invalid capability probe",
    "--contract", JSON.stringify({ ...JSON.parse(contract), capabilities: ["filesystem.telepathy"] })]);
  if (badCapabilities.status === 0 || !badCapabilities.stderr.includes("unknown canonical capability"))
    throw new Error("bespoke contract accepted a capability outside the canonical vocabulary");
  for (const [label, topology, capabilities, error] of [
    ["worker coordination", "worker", ["filesystem.read", "coordination"], "worker topology forbids coordination"],
    ["orchestrator missing coordination", "orchestrator", ["filesystem.read", "shell.readonly"], "orchestrator topology requires coordination"],
    ["orchestrator authoring", "orchestrator", ["filesystem.read", "filesystem.write", "coordination"], "orchestrator topology forbids filesystem.write"],
    ["orchestrator unrestricted shell", "orchestrator", ["filesystem.read", "shell", "coordination"], "orchestrator topology forbids unrestricted shell"],
    ["dual shell authority", "worker", ["filesystem.read", "shell", "shell.readonly"], "shell and shell.readonly are mutually exclusive"],
  ]) {
    const result = compose([`${label.replaceAll(" ", "-")}-probe`, "--topology", topology,
      "--rationale", label, "--contract", JSON.stringify({ ...JSON.parse(contract), capabilities })]);
    if (result.status === 0 || !result.stderr.includes(error))
      throw new Error(`${label} capability/topology invariant was not enforced: ${result.stderr}`);
  }
  const orchestratorContract = JSON.stringify({ ...JSON.parse(contract),
    capabilities: ["filesystem.read", "shell.readonly", "coordination"],
  });
  const validOrchestrator = compose(["migration-director", "--topology", "orchestrator",
    "--rationale", "bespoke coordination", "--contract", orchestratorContract]);
  if (validOrchestrator.status !== 0)
    throw new Error(`valid bespoke orchestrator contract was rejected: ${validOrchestrator.stderr}`);
  const nominated = compose(["migration-forensics", "--nearest", "analyst", "--rationale", "specialized trace",
    "--contract", contract, "--promotion-candidate"]);
  if (nominated.status !== 0 || nominated.payload.composition.kind !== "bespoke" ||
      nominated.payload.composition.promotionCandidate !== true || nominated.payload.composition.contract.doneWhen.length !== 1)
    throw new Error(`bespoke contract/promotion decision failed: ${nominated.stderr}`);
  const novel = compose(["novel-systems-inquiry", "--rationale", "no existing recipe is a truthful reference",
    "--contract", contract]);
  if (novel.status !== 0 || novel.payload.composition.nearestPreset !== undefined ||
      novel.payload.composition.promotionCandidate !== false)
    throw new Error(`truly novel bespoke composition must not invent nearest-preset provenance: ${novel.stderr}`);
  const directory = mkdtempSync(resolve(tmpdir(), "gaffer-contract-"));
  try {
    const path = resolve(directory, "contract.json");
    writeFileSync(path, contract);
    const ordinary = compose(["migration-forensics", "--nearest", "analyst", "--rationale", "specialized trace",
      "--contract", `@${path}`, "--no-promotion-candidate"]);
    if (ordinary.status !== 0 || ordinary.payload.composition.promotionCandidate !== false ||
        ordinary.payload.composition.nearestPreset !== "analyst")
      throw new Error(`bespoke @file contract or explicit false promotion failed: ${ordinary.stderr}`);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

// Independent single-axis overrides change ONLY their axis (no orthogonal collapse).
const base = compose(["integrator"]).payload;
for (const [flag, value, field] of [["--taskGrade", "principal", "taskGrade"], ["--posture", "preserve", "posture"], ["--domain", "Nix", "domainRequirements"], ["--tier", "frontier", "tier"], ["--deliberation", "xhigh", "reasoning"]]) {
  const { status, payload, stderr } = compose(["integrator", flag, value, "--override-reason", `test ${field} override`]);
  if (status !== 0) throw new Error(`single-axis override ${flag} failed: ${stderr}`);
  const expected = field === "domainRequirements" ? ["Nix"] : value;
  if (JSON.stringify(payload[field]) !== JSON.stringify(expected)) throw new Error(`override ${flag} was not honored`);
  if (JSON.stringify(payload.composition.overrides) !== JSON.stringify([field]) || !payload.composition.overrideReason)
    throw new Error(`override ${flag} did not record its changed axis and reason`);
  for (const axis of ROUTING_FIELDS.filter((axis) => axis !== "composition")) {
    if (axis === field || JSON.stringify(payload[axis]) === JSON.stringify(base[axis])) continue;
    throw new Error(`override ${flag} collapsed orthogonal axis ${axis}`);
  }
}
{
  const incompatibleTopology = compose(["integrator", "--topology", "orchestrator",
    "--override-reason", "topology invariant probe"]);
  if (incompatibleTopology.status === 0 ||
      !incompatibleTopology.stderr.includes("orchestrator topology requires coordination"))
    throw new Error("preset topology override silently projected incompatible capabilities");
}
// In-tier deliberation override (frontier resolves xhigh AND max) is a valid single-axis move.
{
  const { status, payload } = compose(["designer", "--deliberation", "max", "--override-reason", "maximum design deliberation"]);
  if (status !== 0 || payload.tier !== "frontier" || payload.reasoning !== "max")
    throw new Error("in-tier deliberation override (frontier xhigh→max) must pass");
}
// tier+deliberation overridden together to a valid pair: both move, other axes hold.
{
  const { status, payload } = compose(["integrator", "--domain", "Nix", "--tier", "frontier", "--deliberation", "xhigh",
    "--override-reason", "foundational Nix contract"]);
  if (status !== 0 || payload.tier !== "frontier" || payload.reasoning !== "xhigh" ||
      payload.taskGrade !== "senior" || payload.topology !== "worker" || payload.domainRequirements?.[0] !== "Nix")
    throw new Error("independent tier+deliberation override to a valid pair must preserve the other axes");
}

// Exhaust the 4×5 semantic matrix: a pair composes iff at least one provider
// catalog resolves it. This prevents producer/catalog drift and proves that
// independence means separately chosen axes, not an unchecked Cartesian product.
for (const tier of staffing.vocabulary.semanticTiers) {
  const supported = resolvableDeliberations(tier);
  for (const deliberation of staffing.vocabulary.deliberations) {
    const args = ["integrator", "--tier", tier, "--deliberation", deliberation];
    if (tier !== base.tier || deliberation !== base.reasoning)
      args.push("--override-reason", "matrix probe");
    const { status, stderr } = compose(args);
    if (supported.has(deliberation) && status !== 0)
      throw new Error(`supported route ${tier}/${deliberation} failed to compose: ${stderr}`);
    if (!supported.has(deliberation) && (status === 0 || !/unsupported route/.test(stderr)))
      throw new Error(`unsupported route ${tier}/${deliberation} was not rejected before dispatch`);
  }
}

// verifier is a role, not a topology: --topology verifier is rejected.
{
  const { status, stderr } = compose(["implementer", "--topology", "verifier"]);
  if (status === 0 || !/invalid topology: verifier/.test(stderr))
    throw new Error("verifier must not be accepted as a topology");
}

// Preset deltas are never silent or decorated with inapplicable bespoke facts.
{
  const missingReason = compose(["integrator", "--tier", "frontier"]);
  if (missingReason.status === 0 || !missingReason.stderr.includes("requires --override-reason"))
    throw new Error("preset override without a reason was accepted");
  const fakeReason = compose(["integrator", "--override-reason", "no actual change"]);
  if (fakeReason.status === 0 || !fakeReason.stderr.includes("must not carry --override-reason"))
    throw new Error("unchanged preset accepted a fake override reason");
  for (const args of [
    ["integrator", "--nearest", "analyst"],
    ["integrator", "--rationale", "not applicable"],
    ["integrator", "--promotion-candidate"],
  ]) {
    const result = compose(args);
    if (result.status === 0 || !result.stderr.includes("apply only to bespoke roles"))
      throw new Error(`preset accepted bespoke-only flag: ${args.slice(1).join(" ")}`);
  }
  const contradictoryDirector = compose(["director", "--topology", "worker", "--override-reason", "contradiction probe"]);
  if (contradictoryDirector.status === 0 || !contradictoryDirector.stderr.includes("director cannot use worker topology"))
    throw new Error("director topology contradiction was accepted");
}

// Documented-but-unaccepted planner inputs never masquerade as executable request fields.
for (const unsupported of ["--leverage", "--quality-floor", "--dependency-shape"]) {
  const { status, stderr } = compose(["integrator", unsupported, "high"]);
  if (status === 0 || !stderr.includes("unknown option"))
    throw new Error(`${unsupported} must fail until it has executable runtime semantics`);
}

// Provider-neutral docs and generated blocks must not regress into adapter
// vocabulary or claim metadata has effects no consumer implements.
{
  const roles = readFileSync(resolve(root, "docs/roles.md"), "utf8");
  const routing = readFileSync(resolve(root, "docs/routing.md"), "utf8");
  const doctrine = readFileSync(resolve(root, "doctrine.md"), "utf8");
  const composeSkill = readFileSync(resolve(root, "skills/compose/SKILL.md"), "utf8");
  const readme = readFileSync(resolve(root, "README.md"), "utf8");
  const providerMatrix = readFileSync(resolve(root, "docs/provider-matrix.md"), "utf8");
  const northAdapter = readFileSync(resolve(root, "docs/adapters/north.md"), "utf8");
  if (/root CLAUDE\.md/.test(roles)) throw new Error("role blocks must route to canonical AGENTS.md");
  if (/\b(?:Fable|Sonnet|Opus|Terra|Luna|Sol)\b/.test(routing))
    throw new Error("provider-neutral routing prose leaked a concrete model name");
  const methodSection = readme.split("## The payload method")[1]?.split("## Install")[0] ?? "";
  if (/\b(?:Sonnet|Opus)\b/.test(methodSection))
    throw new Error("shared calibration method must not hardcode Anthropic model names");
  for (const field of ROUTING_FIELDS)
    if (!doctrine.includes(field)) throw new Error(`doctrine spawn contract omits ${field}`);
  for (const block of ["gradeBlock", "topologyBlock", "commsBlock"])
    if (!composeSkill.includes(block)) throw new Error(`compose example omits ${block}`);
  if (!/gaffer:judge[\s\S]{0,180}frontier\/xhigh/.test(roles))
    throw new Error("verifier must explicitly escalate high-leverage verdicts to frontier/xhigh judge");
  if (!providerMatrix.includes("sources do not") || !providerMatrix.includes("exact rung economics"))
    throw new Error("generated provider matrix must distinguish official provenance from Gaffer calibration judgments");
  if (!providerMatrix.includes("advisory freshness signals") ||
      !providerMatrix.includes("warning but remains reproducible and nonfatal"))
    throw new Error("generated provider matrix must explain nonfatal review freshness");
  for (const enforcement of ["shell.readonly", "--sandbox read-only", "failIfUnavailable=true",
    "allowUnsandboxedCommands=false", "filesystem.denyWrite", "withholds Bash"])
    if (!northAdapter.includes(enforcement))
      throw new Error(`North adapter omits fail-closed non-authoring enforcement: ${enforcement}`);
  for (const provenanceState of ["gaffer:<preset>", "gaffer:<preset>+override", "gaffer:bespoke:<id>",
    "gaffer:not-selected", "gaffer:legacy-debt"])
    if (!northAdapter.includes(provenanceState) || !routing.includes(provenanceState))
      throw new Error(`composition provenance state is not documented across adapters: ${provenanceState}`);
  if (!northAdapter.includes("Never collapse these states to `gaffer:none`") ||
      !routing.includes("`gaffer:none` is not a valid display state"))
    throw new Error("ambiguous gaffer:none display state was not explicitly retired");
  for (const catalog of Object.values(providerCatalogs)) {
    for (const value of [catalog.provenance.asOf, catalog.provenance.reviewAfter,
      ...catalog.provenance.sources.flatMap(({ url, scopes }) => [url, ...scopes]),
      ...Object.keys(catalog.modelDeltas), ...Object.keys(catalog.modelAliases)])
      if (!providerMatrix.includes(value))
        throw new Error(`generated provider matrix omits catalog-owned provenance/resolution fact: ${value}`);
  }
}

console.log("validate: catalogs, routing schema/fixtures, compositions, docs, and generated artifacts current");
