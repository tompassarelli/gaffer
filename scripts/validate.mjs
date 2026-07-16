#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tiers = ["economy", "standard", "senior", "frontier"];
const grades = ["novice", "junior", "mid", "senior", "staff", "principal", "research-grade"];
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
console.log("validate: catalogs, recipe grades/tiers, and generated artifacts current");
