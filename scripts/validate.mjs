#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadStaffingCatalog } from "./staffing-catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staffing = loadStaffingCatalog();
const tiers = staffing.vocabulary.semanticTiers;
const grades = staffing.vocabulary.taskGrades;
JSON.parse(readFileSync(resolve(root, "staffing/catalog.schema.json"), "utf8"));
for (const name of ["anthropic", "openai"]) {
  const catalog = JSON.parse(readFileSync(resolve(root, `providers/${name}.json`), "utf8"));
  if (catalog.provider !== name) throw new Error(`${name}: provider mismatch`);
  if (!Array.isArray(catalog.transports) || catalog.transports.length === 0) throw new Error(`${name}: no transports`);
  for (const tier of tiers) {
    if (!catalog.tiers?.[tier]?.model) throw new Error(`${name}: missing ${tier} model resolution`);
  }
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
if (payload.role !== "integrator" || payload.taskGrade !== "senior" || payload.tier !== "frontier" || payload.domainRequirements?.[0] !== "Nix")
  throw new Error("composition CLI did not preserve independent preset/override axes");
const bespoke = spawnSync(process.execPath, [resolve(root, "scripts/compose-routing.mjs"), "migration-forensics"], { encoding: "utf8" });
if (bespoke.status === 0 || !bespoke.stderr.includes("requires --rationale")) throw new Error("bespoke composition rationale gate is not enforced");
console.log("validate: provider catalogs, staffing catalog, composition CLI, and generated artifacts current");
