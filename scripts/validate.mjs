#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadStaffingCatalog, validateStaffingCatalog } from "./staffing-catalog.mjs";
import { validateProviderCatalog } from "./provider-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staffing = loadStaffingCatalog();
const tiers = staffing.vocabulary.semanticTiers;
const grades = staffing.vocabulary.taskGrades;
JSON.parse(readFileSync(resolve(root, "staffing/catalog.schema.json"), "utf8"));
// Negative schema-level probes exercise the validators used by the generators;
// parsing a JSON Schema file alone is not validation.
for (const invalid of [
  { ...staffing, defaults: { ...staffing.defaults, topology: "manager" } },
  { ...staffing, recipes: [{ ...staffing.recipes[0], tier: "cheap" }, ...staffing.recipes.slice(1)] },
]) {
  try { validateStaffingCatalog(invalid); throw new Error("invalid staffing catalog was accepted"); }
  catch (error) { if (error.message === "invalid staffing catalog was accepted") throw error; }
}
for (const name of ["anthropic", "openai"]) {
  const catalog = JSON.parse(readFileSync(resolve(root, `providers/${name}.json`), "utf8"));
  validateProviderCatalog(catalog, name);
}
const openai = JSON.parse(readFileSync(resolve(root, "providers/openai.json"), "utf8"));
for (const [tier, model, levels] of [
  ["economy", "gpt-5.6-luna", ["low"]], ["standard", "gpt-5.6-terra", ["medium"]],
  ["senior", "gpt-5.6-sol", ["high"]], ["frontier", "gpt-5.6-sol", ["xhigh", "max"]],
]) {
  if (openai.tiers[tier].model !== model || JSON.stringify(openai.tiers[tier].reasoning) !== JSON.stringify(levels))
    throw new Error(`OpenAI ${tier} semantic resolution drifted`);
}
const providerNames = /\b(?:sonnet|opus|luna|terra|sol)\b/i;
for (const recipe of staffing.recipes) {
  if (providerNames.test(recipe.description)) throw new Error(`${recipe.name}: provider model leaked into neutral staffing description`);
}
if (staffing.aliases.find(({ name }) => name === "researcher")?.target !== "scout" ||
    !staffing.recipes.find(({ name, taskGrade }) => name === "research-scientist" && taskGrade === "research-grade"))
  throw new Error("research assistant/scout and cutting-edge research-scientist must remain distinct");
for (const [label, invalid] of [
  ["unknown tier field", { provider: "openai", transports: ["codex-cli"], tiers: {
    economy: { model: "gpt-5.6-luna", reasoning: ["low"], defaultReasoning: "low", price: 1 },
    standard: { model: "gpt-5.6-terra", reasoning: ["medium"], defaultReasoning: "medium" },
    senior: { model: "gpt-5.6-sol", reasoning: ["high"], defaultReasoning: "high" },
    frontier: { model: "gpt-5.6-sol", reasoning: ["xhigh"], defaultReasoning: "xhigh" },
  } }],
  ["unsupported default", { provider: "openai", transports: ["codex-cli"], tiers: {
    economy: { model: "gpt-5.6-luna", reasoning: ["low"], defaultReasoning: "high" },
    standard: { model: "gpt-5.6-terra", reasoning: ["medium"], defaultReasoning: "medium" },
    senior: { model: "gpt-5.6-sol", reasoning: ["high"], defaultReasoning: "high" },
    frontier: { model: "gpt-5.6-sol", reasoning: ["xhigh"], defaultReasoning: "xhigh" },
  } }],
]) {
  try { validateProviderCatalog(invalid, "openai"); throw new Error(`${label} provider catalog was accepted`); }
  catch (error) { if (error.message === `${label} provider catalog was accepted`) throw error; }
}

// The generator owns recipe validation so its rules cannot drift from what it
// renders. Importing it with --check validates every recipe's independent task
// grade and semantic tier, then proves all generated adapter artifacts current.
if (new Set(grades).size !== grades.length || new Set(tiers).size !== tiers.length) {
  throw new Error("validation vocabulary contains duplicates");
}

const built = spawnSync(process.execPath, [resolve(root, "scripts/build-agents.mjs"), "--check"], { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);
const composed = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), "integrator", "--domain", "Nix", "--tier", "frontier"], { encoding: "utf8" });
if (composed.status !== 0) throw new Error(`composition CLI failed: ${composed.stderr}`);
const payload = JSON.parse(composed.stdout);
if (payload.role !== "integrator" || payload.taskGrade !== "senior" || payload.tier !== "frontier" ||
    payload.reasoning !== "high" || payload.domainRequirements?.[0] !== "Nix")
  throw new Error("composition CLI did not preserve independent preset/override axes");
const bespoke = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), "migration-forensics"], { encoding: "utf8" });
if (bespoke.status === 0 || !bespoke.stderr.includes("requires --rationale")) throw new Error("bespoke composition rationale gate is not enforced");
const nominated = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), "migration-forensics", "--rationale", "specialized trace", "--promotion-candidate"], { encoding: "utf8" });
if (nominated.status !== 0 || JSON.parse(nominated.stdout).composition.promotionCandidate !== true)
  throw new Error("bespoke promotion must be an explicit executable choice");
const ordinaryBespoke = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), "migration-forensics", "--rationale", "specialized trace"], { encoding: "utf8" });
if (ordinaryBespoke.status !== 0 || JSON.parse(ordinaryBespoke.stdout).composition.promotionCandidate !== false)
  throw new Error("bespoke promotion must default false");
for (const unsupported of ["--leverage", "--quality-floor", "--dependency-shape"]) {
  const result = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), "integrator", unsupported, "high"], { encoding: "utf8" });
  if (result.status === 0 || !result.stderr.includes("unknown option"))
    throw new Error(`${unsupported} must fail until it has executable runtime semantics`);
}
console.log("validate: provider catalogs, staffing catalog, composition CLI, and generated artifacts current");
