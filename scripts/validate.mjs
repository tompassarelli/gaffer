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
import { OVERRIDE_FIELDS, ROUTING_FIELDS, validateRoutingRequest } from "./routing-request.mjs";
import {
  canonicalRoleId, containedLeaf, RETIRED_ROLE_IDS, ROLE_ID_PATTERN_SOURCE,
} from "./role-id.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staffing = loadStaffingCatalog();
const tiers = staffing.vocabulary.semanticTiers;
const grades = staffing.vocabulary.taskGrades;
const staffingSchema = JSON.parse(readFileSync(resolve(root, "staffing/catalog.schema.json"), "utf8"));
const routingSchema = JSON.parse(readFileSync(resolve(root, "contracts/routing-request.schema.json"), "utf8"));
const staffingKeys = ["$schema", "version", "vocabulary", "defaults", "presets", "aliases"];
const staffingDefinitionKeys = ["uniqueStrings", "capabilities", "preset", "alias", "roleId"];
const staffingPresetKeys = [
  "name", "taskGrade", "tier", "deliberation", "topology", "posture",
  "capabilities", "tagline", "description",
];
const stockTemplateNames = [
  "executor", "implementer", "integrator", "designer", "director",
  "scout", "analyst", "reviewer", "verifier", "judge", "research-scientist",
];
if (staffing.version !== 2 || staffingSchema.properties?.version?.const !== 2 ||
    JSON.stringify(Object.keys(staffing).sort()) !== JSON.stringify([...staffingKeys].sort()) ||
    JSON.stringify([...staffingSchema.required].sort()) !== JSON.stringify(staffingKeys.filter((key) => key !== "$schema").sort()) ||
    JSON.stringify(Object.keys(staffingSchema.properties ?? {}).sort()) !== JSON.stringify([...staffingKeys].sort()) ||
    JSON.stringify(Object.keys(staffingSchema.$defs ?? {}).sort()) !== JSON.stringify([...staffingDefinitionKeys].sort()) ||
    JSON.stringify([...(staffingSchema.$defs?.preset?.required ?? [])].sort()) !== JSON.stringify([...staffingPresetKeys].sort()) ||
    JSON.stringify(Object.keys(staffingSchema.$defs?.preset?.properties ?? {}).sort()) !== JSON.stringify([...staffingPresetKeys].sort()))
  throw new Error("canonical staffing catalog/schema must use the exact v2 preset shape");
if (JSON.stringify([...routingSchema.required].sort()) !== JSON.stringify([...ROUTING_FIELDS].sort()))
  throw new Error("canonical routing schema must require exactly the eight Gaffer fields");
if (JSON.stringify(staffing.presets.map(({ name }) => name).sort()) !==
    JSON.stringify([...stockTemplateNames].sort()))
  throw new Error("stock-template library changed without an explicit catalog/validator review");
if (JSON.stringify([...(routingSchema.properties?.posture?.enum ?? [])].sort()) !==
    JSON.stringify([...staffing.vocabulary.postures].sort()))
  throw new Error("routing JSON Schema posture enum must match the staffing vocabulary");
if (JSON.stringify([...(routingSchema.$defs?.overrideField?.enum ?? [])].sort()) !==
    JSON.stringify([...OVERRIDE_FIELDS].sort()) ||
    OVERRIDE_FIELDS.includes("topology"))
  throw new Error("routing JSON Schema/runtime preset override fields must exclude topology");

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
for (const preset of staffing.presets)
  for (const schema of capabilitySchemas)
    if (!capabilitySchemaAccepts(schema, preset.capabilities))
      throw new Error(`${preset.name}: canonical capabilities fail a JSON Schema capability fragment`);
// Negative schema-level probes exercise the validators used by the generators;
// parsing a JSON Schema file alone is not validation.
for (const invalid of [
  { ...staffing, version: 1 },
  { ...staffing, defaults: { ...staffing.defaults, topology: "manager" } },
  { ...staffing, presets: [{ ...staffing.presets[0], posture: undefined }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], tier: "cheap" }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], name: { bad: true } }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], capabilities: ["filesystem.telepathy"] }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], capabilities: [] }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], capabilities: ["filesystem.read", "filesystem.read"] }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], capabilities: [42] }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: staffing.presets.map((preset) => preset.name === "designer"
    ? { ...preset, topology: "orchestrator" } : preset) },
  { ...staffing, presets: staffing.presets.map((preset) => preset.name === "director"
    ? { ...preset, capabilities: [...preset.capabilities, "filesystem.write"] } : preset) },
  { ...staffing, presets: staffing.presets.map((preset) => preset.name === "director"
    ? { ...preset, capabilities: preset.capabilities.map((capability) => capability === "shell.readonly" ? "shell" : capability) } : preset) },
  { ...staffing, presets: [{ ...staffing.presets[0], capabilities: [...staffing.presets[0].capabilities, "coordination"] }, ...staffing.presets.slice(1)] },
  { ...staffing, presets: [{ ...staffing.presets[0], capabilities: [...staffing.presets[0].capabilities, "shell.readonly"] }, ...staffing.presets.slice(1)] },
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
  const probe = { ...staffing, presets: [
    { ...staffing.presets[0], capabilities }, ...staffing.presets.slice(1),
  ] };
  let runtimeAccepted = true;
  try { validateStaffingCatalog(probe); } catch { runtimeAccepted = false; }
  const schemaAccepted = capabilitySchemas.every((schema) => capabilitySchemaAccepts(schema, capabilities));
  if (runtimeAccepted !== expected || schemaAccepted !== expected || runtimeAccepted !== schemaAccepted)
    throw new Error(`runtime/schema capability parity drift for ${JSON.stringify(capabilities)}`);
}
for (const [field, makeProbe] of [
  ["preset", (name) => ({ ...staffing, presets: [
    { ...staffing.presets[0], name }, ...staffing.presets.slice(1),
  ] })],
  ["alias", (name) => ({ ...staffing, aliases: [{ name, target: staffing.presets[0].name }] })],
  ["alias target", (target) => ({ ...staffing, aliases: [{ name: "safe-alias", target }] })],
]) {
  for (const [name, expected] of roleIdCases) {
    let accepted = true;
    try { validateStaffingCatalog(makeProbe(name)); } catch { accepted = false; }
    // A safe alias target still has to exist; use preset validation only for
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
// A catalog may advertise exact runtime candidates without making them a
// default semantic-tier mapping. Every such candidate still needs its own
// exact delta decision; it may never inherit a neighboring model's prompt.
const runtimeCandidates = Object.values(providerCatalogs).flatMap((catalog) => {
  const defaultModels = new Set(Object.values(catalog.tiers).map(({ model }) => model));
  return [...new Set(Object.values(catalog.modelAliases))]
    .filter((model) => !defaultModels.has(model))
    .map((model) => ({ catalog, model }));
});
for (const { catalog, model } of runtimeCandidates) {
  if (!Object.hasOwn(catalog.modelDeltas, model) || !["calibrated", "none"].includes(modelDeltaFor(catalog, model).kind))
    throw new Error(`${catalog.provider}: runtime-only candidate ${model} lacks an exact delta decision`);
}
for (const catalog of Object.values(providerCatalogs)) {
  try { modelDeltaFor(catalog, "unlisted-runtime-model"); throw new Error("missing exact model delta was inherited"); }
  catch (error) { if (error.message === "missing exact model delta was inherited") throw error; }
}
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const providerModelTokens = [...new Set(Object.values(providerCatalogs).flatMap((catalog) => [
  ...Object.keys(catalog.modelAliases),
  ...Object.keys(catalog.modelDeltas),
]))].sort((left, right) => right.length - left.length);
const providerModelToken = new RegExp(
  `(?:^|[^a-z0-9_])(${providerModelTokens.map(escapeRegex).join("|")})(?=$|[^a-z0-9_])`,
  "i",
);
function validateProviderNeutralPresetProse(candidate) {
  for (const preset of candidate.presets) {
    for (const field of ["tagline", "description"]) {
      const match = preset[field].match(providerModelToken);
      if (match)
        throw new Error(`${preset.name}: provider model token ${match[1]} leaked into neutral staffing ${field}`);
    }
  }
}
validateProviderNeutralPresetProse(staffing);
const fableDescriptionLeakFixture = { ...staffing, presets: staffing.presets.map((preset, index) =>
  index === 0 ? { ...preset, description: `${preset.description} Fable.` } : preset) };
try {
  validateProviderNeutralPresetProse(fableDescriptionLeakFixture);
  throw new Error("Fable provider-model description leak fixture was accepted");
} catch (error) {
  if (error.message === "Fable provider-model description leak fixture was accepted" ||
      !error.message.includes("provider model token Fable leaked into neutral staffing description")) throw error;
}
const fableTaglineLeakFixture = { ...staffing, presets: staffing.presets.map((preset, index) =>
  index === 0 ? { ...preset, tagline: `${preset.tagline} Fable` } : preset) };
try {
  validateProviderNeutralPresetProse(fableTaglineLeakFixture);
  throw new Error("Fable provider-model tagline leak fixture was accepted");
} catch (error) {
  if (error.message === "Fable provider-model tagline leak fixture was accepted" ||
      !error.message.includes("provider model token Fable leaked into neutral staffing tagline")) throw error;
}
const unrelatedProseFixture = { ...staffing, presets: staffing.presets.map((preset, index) =>
  index === 0 ? { ...preset, description: `${preset.description} Consolidated, fabled resolution.` } : preset) };
validateProviderNeutralPresetProse(unrelatedProseFixture);
if (staffing.aliases.some(({ name }) => name === "researcher") ||
    !staffing.presets.find(({ name, taskGrade }) => name === "scout" && taskGrade === "junior") ||
    !staffing.presets.find(({ name, taskGrade }) => name === "research-scientist" && taskGrade === "research-grade"))
  throw new Error("research assistant/scout and cutting-edge research-scientist must remain distinct");
const openaiFixture = providerCatalogs.openai;
const missingModelDeltas = { ...openaiFixture.modelDeltas };
delete missingModelDeltas[openaiFixture.tiers.senior.model];
const provenanceScopes = ["model-family", "availability", "effort-support"];
function withoutModelScope(catalog, model, scope) {
  const sources = catalog.provenance.sources.map((source) =>
      source.scopes.includes(scope) && source.modelFamilies.includes(model)
        ? { ...source, modelFamilies: source.modelFamilies.filter((candidate) => candidate !== model) }
        : { ...source, modelFamilies: [...source.modelFamilies], scopes: [...source.scopes] });
  const fallbackIndex = sources.findIndex((source) => source.modelFamilies.includes(model));
  if (fallbackIndex === -1) throw new Error(`cannot build ${model} missing-${scope} fixture without retaining model coverage`);
  const retainedScopes = new Set(sources
    .filter((source) => source.modelFamilies.includes(model))
    .flatMap((source) => source.scopes));
  for (const retainedScope of provenanceScopes.filter((candidate) => candidate !== scope && !retainedScopes.has(candidate))) {
    sources[fallbackIndex] = {
      ...sources[fallbackIndex],
      scopes: [...sources[fallbackIndex].scopes, retainedScope],
    };
  }
  return { ...catalog, provenance: { ...catalog.provenance, sources } };
}
function expectPerModelScopeGap(label, catalog, provider, model, scope) {
  const providerWideScopes = new Set(catalog.provenance.sources.flatMap((source) => source.scopes));
  if (!provenanceScopes.every((candidate) => providerWideScopes.has(candidate)))
    throw new Error(`${label} fixture does not preserve provider-wide union coverage`);
  const modelScopes = new Set(catalog.provenance.sources
    .filter((source) => source.modelFamilies.includes(model))
    .flatMap((source) => source.scopes));
  if (modelScopes.has(scope) ||
      !provenanceScopes.filter((candidate) => candidate !== scope).every((candidate) => modelScopes.has(candidate)))
    throw new Error(`${label} fixture must isolate exactly the ${model}/${scope} gap`);
  try {
    validateProviderCatalog(catalog, provider);
    throw new Error(`${label} provider catalog was accepted`);
  } catch (error) {
    if (error.message === `${label} provider catalog was accepted` ||
        !error.message.includes(`${model} missing ${scope}`)) throw error;
  }
}
const openaiScopeModel = openaiFixture.tiers.economy.model;
for (const scope of provenanceScopes)
  expectPerModelScopeGap(
    `per-model missing ${scope}`,
    withoutModelScope(openaiFixture, openaiScopeModel, scope),
    "openai",
    openaiScopeModel,
    scope,
  );
const fableModel = providerCatalogs.anthropic.modelAliases.fable;
expectPerModelScopeGap(
  "Fable per-model missing effort-support",
  withoutModelScope(providerCatalogs.anthropic, fableModel, "effort-support"),
  "anthropic",
  fableModel,
  "effort-support",
);
for (const [label, invalid] of [
  ["unknown tier field", { ...openaiFixture, tiers: { ...openaiFixture.tiers,
    economy: { ...openaiFixture.tiers.economy, price: 1 },
  } }],
  ["unsupported default", { ...openaiFixture, tiers: { ...openaiFixture.tiers,
    economy: { ...openaiFixture.tiers.economy, defaultReasoning: "high" },
  } }],
  ["duplicate concrete rung", { ...openaiFixture, tiers: { ...openaiFixture.tiers,
    frontier: {
      ...openaiFixture.tiers.frontier,
      reasoning: [...openaiFixture.tiers.frontier.reasoning, "high"],
    },
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
{
  const request = structuredClone(routingFixtures.valid.find(
    ({ name }) => name === "unchanged preset",
  )?.request);
  if (!request) throw new Error("unchanged preset routing fixture is missing");
  request.composition.overrides = ["topology"];
  try {
    validateRoutingRequest(request, staffing);
    throw new Error("topology was accepted as a preset override field");
  } catch (error) {
    if (error.message === "topology was accepted as a preset override field" ||
        !error.message.includes("composition.overrides may contain only")) throw error;
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

// The generator owns preset validation so its rules cannot drift from what it
// renders. Importing it with --check validates every preset's independent task
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
  ...staffing.presets.map(({ name }) => resolve(root, `agents/${name}.md`)),
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

// Topology is coordination authority only: worker|orchestrator. Reviewer,
// verifier, and judge are worker-topology ROLES, never a third topology.
if (staffing.vocabulary.topologies.length !== 2 ||
    !["worker", "orchestrator"].every((t) => staffing.vocabulary.topologies.includes(t)))
  throw new Error("topology vocabulary must be exactly worker|orchestrator");
for (const role of ["reviewer", "verifier", "judge"])
  if (staffing.presets.find((r) => r.name === role)?.topology !== "worker")
    throw new Error(`${role} must be a worker-topology role, not a topology`);
const director = staffing.presets.find(({ name }) => name === "director");
if (!director || director.taskGrade !== "staff" || director.tier !== "frontier" ||
    director.deliberation !== "xhigh" || director.topology !== "orchestrator" || director.posture !== "deliver")
  throw new Error("director must remain the staff/frontier/xhigh orchestrator preset");
const judge = staffing.presets.find(({ name }) => name === "judge");
if (!judge || judge.taskGrade !== "staff" || judge.tier !== "frontier" ||
    judge.deliberation !== "xhigh" || judge.topology !== "worker" || judge.posture !== "evaluate")
  throw new Error("judge must remain the staff/frontier/xhigh evaluate stock template");
const verifier = staffing.presets.find(({ name }) => name === "verifier");
if (!verifier || verifier.topology !== "worker" || verifier.posture !== "evaluate")
  throw new Error("verifier must remain a worker/evaluate stock template");
const reviewer = staffing.presets.find(({ name }) => name === "reviewer");
if (!reviewer || reviewer.taskGrade !== "senior" || reviewer.tier !== "senior" ||
    reviewer.deliberation !== "high" || reviewer.topology !== "worker" ||
    reviewer.posture !== "evaluate" ||
    JSON.stringify(reviewer.capabilities) !== JSON.stringify([
      "filesystem.read", "filesystem.search", "shell.readonly",
    ]))
  throw new Error("reviewer must remain the senior/senior/high read-only worker/evaluate stock template");
for (const preset of staffing.presets.filter(({ name }) => name !== "director"))
  if (preset.topology !== "worker") throw new Error(`${preset.name} unexpectedly grants orchestrator topology`);
const nonAuthoringPresets = [
  "designer", "director", "scout", "analyst", "reviewer", "verifier", "judge",
  "research-scientist",
];
for (const name of nonAuthoringPresets) {
  const preset = staffing.presets.find((candidate) => candidate.name === name);
  if (!preset || preset.capabilities.includes("filesystem.write") || preset.capabilities.includes("shell") ||
      !preset.capabilities.includes("shell.readonly"))
    throw new Error(`${name} must remain a mechanically non-authoring preset`);
}
for (const name of ["executor", "implementer", "integrator"])
  if (!staffing.presets.find((preset) => preset.name === name)?.capabilities.includes("filesystem.write") ||
      !staffing.presets.find((preset) => preset.name === name)?.capabilities.includes("shell") ||
      staffing.presets.find((preset) => preset.name === name)?.capabilities.includes("shell.readonly"))
    throw new Error(`${name} must retain its authoring capability`);
if (!director.capabilities.includes("coordination"))
  throw new Error("director must retain provider-neutral coordination capability");
for (const preset of staffing.presets)
  if (preset.topology === "worker" && preset.capabilities.includes("coordination"))
    throw new Error(`${preset.name}: worker topology must not carry coordination capability`);

// Every preset composes; its payload matches its preset, resolves, and carries
// only the canonical routing fields.
for (const preset of staffing.presets) {
  const { status, payload, stderr } = compose([preset.name]);
  if (status !== 0 || !payload) throw new Error(`preset ${preset.name} failed to compose: ${stderr}`);
  if (payload.role !== preset.name || payload.taskGrade !== preset.taskGrade || payload.tier !== preset.tier ||
      payload.reasoning !== preset.deliberation || payload.topology !== preset.topology ||
      payload.composition?.kind !== "preset" || payload.composition?.id !== preset.name ||
      payload.composition?.overrides?.length !== 0 || payload.composition?.overrideReason !== undefined)
    throw new Error(`preset ${preset.name} payload drifts from its preset`);
  if (!resolvableDeliberations(payload.tier).has(payload.reasoning))
    throw new Error(`preset ${preset.name} emits an unresolvable tier/deliberation pair`);
  if (!hasExactRoutingFields(payload))
    throw new Error(`preset ${preset.name} payload must contain exactly the eight routing fields`);
  const generated = readFileSync(resolve(root, `agents/${preset.name}.md`), "utf8");
  const marker = generated.match(/<!-- GAFFER_ROUTING (\{.*\}) -->/);
  if (!marker) throw new Error(`generated ${preset.name} is missing GAFFER_ROUTING`);
  validateRoutingRequest(JSON.parse(marker[1]), staffing);
  const posture = preset.posture ?? staffing.defaults.posture;
  if (!generated.includes(`TASK GRADE: ${preset.taskGrade.toUpperCase()}`) ||
      !generated.includes(`TOPOLOGY: ${preset.topology.toUpperCase()}`) ||
      !generated.includes(`POSTURE: ${posture.toUpperCase()}`))
    throw new Error(`generated ${preset.name} must include task-grade, topology, and effective-posture blocks`);
  const frontmatter = parsedAgentFrontmatter[resolve(root, `agents/${preset.name}.md`)];
  if (frontmatter?.name !== preset.name || !frontmatter.description.endsWith(`Task grade: ${preset.taskGrade}.`))
    throw new Error(`generated ${preset.name} YAML frontmatter identity/grade drifted`);
  const tools = frontmatter.tools.split(/,\s*/).filter(Boolean);
  const hasAllAuthoringTools = ["Edit", "Write"].every((tool) => tools.includes(tool));
  const hasAnyAuthoringTool = ["Edit", "Write"].some((tool) => tools.includes(tool));
  if (preset.capabilities.includes("filesystem.write") ? !hasAllAuthoringTools : hasAnyAuthoringTool)
    throw new Error(`generated ${preset.name} authoring tools drift from canonical capabilities`);
  if (preset.capabilities.includes("shell.readonly") && tools.includes("Bash"))
    throw new Error(`generated ${preset.name} exposes unrestricted Bash for shell.readonly`);
  if (preset.capabilities.includes("shell") !== tools.includes("Bash"))
    throw new Error(`generated ${preset.name} shell tool drifts from canonical capabilities`);
  if (preset.capabilities.includes("coordination") !== tools.includes("Agent"))
    throw new Error(`generated ${preset.name} coordination tool drifts from canonical capabilities`);
  if (!generated.includes("## Output norms"))
    throw new Error(`generated ${preset.name} omits the universal communication block`);
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
  const badCapabilities = compose(["migration-forensics", "--nearest", "analyst",
    "--rationale", "invalid capability probe",
    "--contract", JSON.stringify({ ...JSON.parse(contract), capabilities: ["filesystem.telepathy"] })]);
  if (badCapabilities.status === 0 || !badCapabilities.stderr.includes("unknown canonical capability"))
    throw new Error("bespoke contract accepted a capability outside the canonical vocabulary");
  const mutatingEvaluation = compose(["evaluation-author", "--task-grade", "mid",
    "--topology", "worker", "--tier", "standard", "--deliberation", "medium",
    "--posture", "evaluate", "--rationale", "posture authority probe",
    "--contract", JSON.stringify({ ...JSON.parse(contract),
      capabilities: ["filesystem.read", "filesystem.write", "shell"],
    })]);
  if (mutatingEvaluation.status !== 0 ||
      mutatingEvaluation.payload.posture !== "evaluate" ||
      !mutatingEvaluation.payload.composition.contract.capabilities.includes("filesystem.write"))
    throw new Error(`evaluate posture was incorrectly fused to capability authority: ${mutatingEvaluation.stderr}`);
  for (const [label, topology, capabilities, error] of [
    ["worker coordination", "worker", ["filesystem.read", "coordination"], "worker topology forbids coordination"],
    ["orchestrator missing coordination", "orchestrator", ["filesystem.read", "shell.readonly"], "orchestrator topology requires coordination"],
    ["orchestrator authoring", "orchestrator", ["filesystem.read", "filesystem.write", "coordination"], "orchestrator topology forbids filesystem.write"],
    ["orchestrator unrestricted shell", "orchestrator", ["filesystem.read", "shell", "coordination"], "orchestrator topology forbids unrestricted shell"],
    ["dual shell authority", "worker", ["filesystem.read", "shell", "shell.readonly"], "shell and shell.readonly are mutually exclusive"],
  ]) {
    const result = compose([`${label.replaceAll(" ", "-")}-probe`, "--nearest", "analyst", "--topology", topology,
      "--rationale", label, "--contract", JSON.stringify({ ...JSON.parse(contract), capabilities })]);
    if (result.status === 0 || !result.stderr.includes(error))
      throw new Error(`${label} capability/topology invariant was not enforced: ${result.stderr}`);
  }
  const orchestratorContract = JSON.stringify({ ...JSON.parse(contract),
    capabilities: ["filesystem.read", "shell.readonly", "coordination"],
  });
  const validOrchestrator = compose(["migration-director", "--task-grade", "staff",
    "--topology", "orchestrator", "--tier", "frontier", "--deliberation", "xhigh",
    "--posture", "deliver",
    "--rationale", "bespoke coordination", "--contract", orchestratorContract]);
  if (validOrchestrator.status !== 0)
    throw new Error(`valid bespoke orchestrator contract was rejected: ${validOrchestrator.stderr}`);
  const nominated = compose(["migration-forensics", "--nearest", "analyst", "--rationale", "specialized trace",
    "--contract", contract, "--promotion-candidate"]);
  if (nominated.status !== 0 || nominated.payload.composition.kind !== "bespoke" ||
      nominated.payload.composition.promotionCandidate !== true || nominated.payload.composition.contract.doneWhen.length !== 1)
    throw new Error(`bespoke contract/promotion decision failed: ${nominated.stderr}`);
  const explicitAxes = ["--task-grade", "research-grade", "--topology", "worker",
    "--tier", "frontier", "--deliberation", "xhigh", "--posture", "explore"];
  const novel = compose(["novel-systems-inquiry", ...explicitAxes,
    "--rationale", "no existing stock template is a truthful reference",
    "--contract", contract]);
  if (novel.status !== 0 || novel.payload.composition.nearestPreset !== undefined ||
      novel.payload.composition.promotionCandidate !== false)
    throw new Error(`truly novel bespoke composition must not invent nearest-template provenance: ${novel.stderr}`);
  for (const flag of [
    "--task-grade", "--topology", "--tier", "--deliberation", "--posture",
  ]) {
    const missingAxisArgs = explicitAxes.filter((_, index, all) => {
      const flagIndex = all.indexOf(flag);
      return index !== flagIndex && index !== flagIndex + 1;
    });
    const result = compose(["novel-systems-inquiry", ...missingAxisArgs,
      "--rationale", `missing ${flag} probe`, "--contract", contract]);
    if (result.status === 0 || !result.stderr.includes("without --nearest must explicitly set") ||
        !result.stderr.includes(flag === "--deliberation" ? "--deliberation/--reasoning" : flag))
      throw new Error(`bespoke composition silently defaulted omitted ${flag}: ${result.stderr}`);
  }
  if (novel.payload.domainRequirements.length !== 0)
    throw new Error("bespoke composition without --domain must emit an explicit empty domainRequirements list");
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
for (const [role, flag, value, field] of [
  ["integrator", "--taskGrade", "principal", "taskGrade"],
  ["integrator", "--posture", "preserve", "posture"],
  ["integrator", "--domain", "Nix", "domainRequirements"],
  ["implementer", "--tier", "senior", "tier"],
  ["designer", "--deliberation", "max", "reasoning"],
]) {
  const base = compose([role]).payload;
  const { status, payload, stderr } = compose([role, flag, value, "--override-reason", `test ${field} override`]);
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
for (const [direction, args, expected] of [
  ["down", ["--task-grade", "mid", "--tier", "standard", "--deliberation", "medium"],
    { taskGrade: "mid", tier: "standard", reasoning: "medium" }],
  ["up", ["--task-grade", "staff", "--tier", "frontier", "--deliberation", "xhigh"],
    { taskGrade: "staff", tier: "frontier", reasoning: "xhigh" }],
]) {
  const { status, payload, stderr } = compose([
    "verifier", ...args, "--override-reason", `verdict leverage routes ${direction}`,
  ]);
  if (status !== 0 || payload.taskGrade !== expected.taskGrade ||
      payload.tier !== expected.tier || payload.reasoning !== expected.reasoning ||
      JSON.stringify(payload.composition.overrides) !==
        JSON.stringify(["taskGrade", "tier", "reasoning"]))
    throw new Error(`verifier ${direction} override contract failed: ${stderr}`);
}
{
  const incompatibleTopology = compose(["integrator", "--topology", "orchestrator",
    "--override-reason", "topology invariant probe"]);
  if (incompatibleTopology.status === 0 ||
      !incompatibleTopology.stderr.includes("--topology applies only to bespoke compositions"))
    throw new Error("composer accepted a stock-template topology option");
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
// Layer raises the capability floor; it never silently renames the function.
{
  const { status, payload, stderr } = compose(["executor", "--tier", "senior", "--deliberation", "high",
    "--override-reason", "fully specified edit on a foundational library"]);
  if (status !== 0 || payload.role !== "executor" || payload.taskGrade !== "novice" ||
      payload.tier !== "senior" || payload.reasoning !== "high" ||
      JSON.stringify(payload.composition.overrides) !== JSON.stringify(["tier", "reasoning"]))
    throw new Error(`layer-floor override fused function with capability: ${stderr}`);
}

// Exhaust the 4×5 semantic matrix: a pair composes iff at least one provider
// catalog resolves it. This prevents producer/catalog drift and proves that
// independence means separately chosen axes, not an unchecked Cartesian product.
const matrixBase = compose(["integrator"]).payload;
for (const tier of staffing.vocabulary.semanticTiers) {
  const supported = resolvableDeliberations(tier);
  for (const deliberation of staffing.vocabulary.deliberations) {
    const args = ["integrator", "--tier", tier, "--deliberation", deliberation];
    if (tier !== matrixBase.tier || deliberation !== matrixBase.reasoning)
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
    if (result.status === 0 || !result.stderr.includes("apply only to bespoke compositions"))
      throw new Error(`preset accepted bespoke-only flag: ${args.slice(1).join(" ")}`);
  }
  const contradictoryDirector = compose(["director", "--topology", "worker", "--override-reason", "contradiction probe"]);
  if (contradictoryDirector.status === 0 ||
      !contradictoryDirector.stderr.includes("--topology applies only to bespoke compositions"))
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
  const taskGradeSource = readFileSync(resolve(root, "docs/task-grades.md"), "utf8");
  const topologies = readFileSync(resolve(root, "docs/topologies.md"), "utf8");
  const method = readFileSync(resolve(root, "docs/method.md"), "utf8");
  const generatedDirector = readFileSync(resolve(root, "agents/director.md"), "utf8");
  const generatedReviewer = readFileSync(resolve(root, "agents/reviewer.md"), "utf8");
  const internedWorker = /\binterned worker\b|worker\s*\(\s*interned\s*\)/i;
  if (internedWorker.test(doctrine) || internedWorker.test(northAdapter))
    throw new Error("obsolete interned-worker jargon returned; use terminal worker");
  if (/\b(?:feature or fix|existing architecture|cross-seam integration|engineering trade-offs|migration paths)\b/i.test(taskGradeSource))
    throw new Error("shared task-grade blocks leaked authoring-role semantics");
  if (/layer floor\s*(?:→|->)\s*integrator|foundational targets? get gaffer:integrator|ANY work on foundational/i.test(
    `${readme}\n${doctrine}\n${JSON.stringify(staffing.presets)}`))
    throw new Error("layer floor must raise capability without renaming the task function");
  if (/root CLAUDE\.md/.test(roles)) throw new Error("role blocks must route to canonical AGENTS.md");
  if (/any second file the spec didn't name|3\+ distant subsystems/i.test(roles) ||
      !/mechanically coupled or generated surfaces required by the specified\s+change/i.test(roles) ||
      !/independently traceable mechanisms[\s\S]{0,240}regardless of how many\s+subsystems/i.test(roles) ||
      !/independently traceable mechanisms[\s\S]{0,220}regardless of subsystem count/i.test(
        staffing.presets.find(({ name }) => name === "analyst")?.description ?? ""))
    throw new Error("executor/analyst boundaries must follow ambiguity, authority, and dependency shape rather than file/subsystem counts");
  if (/\b(?:Fable|Sonnet|Opus|Terra|Luna|Sol)\b/.test(routing))
    throw new Error("provider-neutral routing prose leaked a concrete model name");
  const methodSection = readme.split("## The payload method")[1]?.split("## Install")[0] ?? "";
  if (/\b(?:Sonnet|Opus)\b/.test(methodSection))
    throw new Error("shared calibration method must not hardcode Anthropic model names");
  const portableDoctrine = doctrine.replace(
    /<!-- gaffer:spawn-surfaces[\s\S]*?<!-- \/gaffer:spawn-surfaces -->/,
    "",
  );
  if (/subagent_type\s*:|\bagent\s*\(|mcp__north|provider\s*=\s*`?auto/i.test(portableDoctrine))
    throw new Error("provider/harness invocation syntax escaped the fenced doctrine adapter example");
  if (!/FUNCTION\/ROLE,[\s\S]{0,160}POSTURE/.test(doctrine) ||
      !/Function, task grade, domain requirements,[\s\S]{0,100}posture/.test(readme) ||
      !/Role is conceptually independent[\s\S]{0,180}posture/.test(roles) ||
      !/Role does not choose the other axes[\s\S]{0,180}posture/.test(method) ||
      !/Classify the independent axes[\s\S]{0,1200}Posture/.test(composeSkill))
    throw new Error("posture must appear in every canonical independent-axis list");
  for (const field of ROUTING_FIELDS)
    if (!doctrine.includes(field)) throw new Error(`doctrine spawn contract omits ${field}`);
  for (const block of ["gradeBlock", "topologyBlock", "commsBlock"])
    if (!composeSkill.includes(block)) throw new Error(`compose example omits ${block}`);
  if (!/single claim remains verifier work at[\s\S]{0,120}any leverage/i.test(roles) ||
      !/confirmed[\s\S]{0,120}affirmative evidence[\s\S]{0,120}refuted[\s\S]{0,120}counterevidence/i.test(roles) ||
      !/ambiguous evidence[\s\S]{0,160}cannot-determine/i.test(roles) ||
      !/justified stock-template override may move[\s\S]{0,100}up or down[\s\S]{0,120}quality floor remains binding/i.test(roles))
    throw new Error("verifier role lost its single-claim boundary or strict verdict epistemics");
  if (!/ROLE: REVIEWER[\s\S]{0,180}one supplied artifact[\s\S]{0,120}multiple[\s\S]{0,220}prioritized/i.test(roles) ||
      !/accept \/ changes-required \/\s*cannot-assess/i.test(roles) ||
      !/REVIEWER[\s\S]{0,1800}gaffer:verifier[\s\S]{0,300}gaffer:analyst[\s\S]{0,300}gaffer:designer[\s\S]{0,300}gaffer:judge[\s\S]{0,300}gaffer:integrator/i.test(roles) ||
      !["google.github.io/eng-practices/review/reviewer/looking-for.html",
        "google.github.io/eng-practices/review/reviewer/standard.html",
        "docs.github.com/en/pull-requests"].every((source) => `${roles}\n${method}`.includes(source)) ||
      !generatedReviewer.includes("ROLE: REVIEWER") ||
      !generatedReviewer.includes("TOPOLOGY: WORKER") ||
      !generatedReviewer.includes("POSTURE: EVALUATE"))
    throw new Error("reviewer lost its generalized artifact-review contract, distinctions, grounding, or generated blocks");
  if (!/JUDGE[\s\S]{0,120}two or more supplied alternatives/.test(roles) ||
      /JUDGE[\s\S]{0,1000}(?:single make-or-break|ranking findings by severity)/i.test(roles))
    throw new Error("judge must rank multiple supplied alternatives only");
  if (!/DESIGNER[\s\S]{0,500}Must escalate: implementation/i.test(roles) ||
      !/DIRECTOR[\s\S]{0,1800}context-carrying, independently staffed verifier returned a[\s\S]{0,120}verdict, probe, and observed result[\s\S]{0,120}emergent whole outcome/i.test(roles) ||
      !/DIRECTOR[\s\S]{0,700}Do not rerun or spot-check a worker probe inline/i.test(roles) ||
      /DIRECTOR[\s\S]{0,1600}(?:may spot-check|spot-check at most)/i.test(roles))
    throw new Error("designer/director authority and verification boundaries drifted");
  if (/a completed unit is verified by a[\s\S]{0,80}context-carrying verifier fork/i.test(doctrine) ||
      /otherwise the director's read-only spot-checks/i.test(roles) ||
      /ORCHESTRATOR[\s\S]{0,1000}(?:may spot-check|spot-check at most)/i.test(topologies) ||
      !/ORCHESTRATOR[\s\S]{0,700}Self-contained units return worker evidence[\s\S]{0,180}verdict leverage warrants one/i.test(topologies) ||
      !/ORCHESTRATOR[\s\S]{0,900}emergent aggregate always gets a report from[\s\S]{0,120}independently staffed[\s\S]{0,160}verdict,\s*probe, and observed result/i.test(topologies) ||
      !/emergent aggregate receives an independently staffed,[\s\S]{0,120}verifier report with a verdict, probe, and observed result/i.test(method))
    throw new Error("outcome-attached verifier contract drifted");
  const trustVocabulary = `${doctrine}\n${roles}\n${topologies}\n${method}\n${readme}\n${routing}\n${JSON.stringify(staffing.presets)}\n${generatedDirector}`;
  if (/\b(?:self[- ]attest\w*|whole-outcome (?:verifier )?attestation|verifier attestations?|attested by|independently attested|verified (?:result|outcome))\b/i.test(trustVocabulary))
    throw new Error("shared-UID workflow claimed security-grade attestation or a verified result");
  if (!/current lanes share one OS uid[\s\S]{0,220}`attested` or `verified` status is reserved for a[\s\S]{0,80}future protected trust boundary/i.test(doctrine) ||
      !/Current lanes share one OS uid[\s\S]{0,220}`attested` or `verified` status is[\s\S]{0,80}reserved for a future protected trust boundary/i.test(readme) ||
      !/evidence-backed result/.test(director.tagline) ||
      !/evidence-reconciled/.test(director.description))
    throw new Error("shared-UID trust vocabulary must reserve attested/verified status and describe evidence-backed outcomes");
  const postures = readFileSync(resolve(root, "docs/postures.md"), "utf8");
  if (!/POSTURE: EVALUATE[\s\S]{0,700}non-mutating|POSTURE: EVALUATE[\s\S]{0,700}mutating the subject/.test(postures))
    throw new Error("evaluate posture must be evidence-first and non-mutating");
  if (!/evidence quality\/validity > decision correctness > coverage\s+of the stated question > speed > polish/.test(postures))
    throw new Error("evaluate posture collision order drifted");
  if (!/Posture never expands[\s\S]{0,120}capability contract/i.test(postures) ||
      !/read-only probes and written hypotheses for non-authoring\s+agents/i.test(postures))
    throw new Error("explore posture must not grant authoring authority to read-only stock templates");
  const analystDescription = staffing.presets.find(({ name }) => name === "analyst")?.description ?? "";
  if (!/falls back to explicitly static-only analysis[\s\S]{0,100}unobserved behavior/i.test(analystDescription) ||
      !/ANALYST[\s\S]{0,1000}no enforceable read-only execution surface[\s\S]{0,180}static-only/i.test(roles))
    throw new Error("analyst must fall back to labeled static-only analysis when read-only execution is unavailable");
  const researchDescription = staffing.presets.find(
    ({ name }) => name === "research-scientist",
  )?.description ?? "";
  if (!/existing non-mutating tools or probes only/i.test(researchDescription) ||
      !/new script[\s\S]{0,120}apparatus[\s\S]{0,120}ephemeral scratch/i.test(researchDescription) ||
      !/RESEARCH-SCIENTIST[\s\S]{0,900}new script[\s\S]{0,160}ephemeral scratch/i.test(roles))
    throw new Error("research-scientist must use existing non-mutating probes and hand off all new apparatus authoring");
  if (!providerMatrix.includes("sources do not") || !providerMatrix.includes("exact rung economics"))
    throw new Error("generated provider matrix must distinguish official provenance from Gaffer calibration judgments");
  if (!providerMatrix.includes("every exact catalog model covered for each fact") ||
      !providerMatrix.includes("category"))
    throw new Error("generated provider matrix must state that provenance scope coverage is per exact model");
  if (!providerMatrix.includes("advisory freshness signals") ||
      !providerMatrix.includes("warning but remains reproducible and nonfatal"))
    throw new Error("generated provider matrix must explain nonfatal review freshness");
  for (const enforcement of ["shell.readonly", "mcp__north-readonly-shell__run",
    "bwrap-backed read-only host/checkout", "ephemeral `/tmp`", "no network",
    "cleared environment", "fails closed at preflight", "--sandbox read-only",
    "North MCP required", "OpenAI orchestration", "fails pre-turn",
    "withholds Bash", "not proof of arbitrary external-service authority", "`north linear`"])
    if (!northAdapter.includes(enforcement))
      throw new Error(`North adapter omits fail-closed non-authoring enforcement: ${enforcement}`);
  if (!northAdapter.includes("reviewer") ||
      !northAdapter.includes("Stock-template overrides may change task grade, domains, tier, reasoning, or") ||
      !northAdapter.includes("Stock topology is fixed") ||
      !northAdapter.includes("topology alone never loads the director role") ||
      !northAdapter.includes("does not run worker probes inline"))
    throw new Error("generated North adapter lost reviewer, topology, or director evidence boundaries");
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
