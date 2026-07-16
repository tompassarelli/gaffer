#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tiers = ["economy", "standard", "senior", "frontier"];
for (const name of ["anthropic", "openai"]) {
  const catalog = JSON.parse(readFileSync(resolve(root, `providers/${name}.json`), "utf8"));
  if (catalog.provider !== name) throw new Error(`${name}: provider mismatch`);
  if (!Array.isArray(catalog.transports) || catalog.transports.length === 0) throw new Error(`${name}: no transports`);
  for (const tier of tiers) {
    if (!catalog.tiers?.[tier]?.model) throw new Error(`${name}: missing ${tier} model resolution`);
  }
}

const built = spawnSync(process.execPath, [resolve(root, "scripts/build-agents.mjs"), "--check"], { stdio: "inherit" });
if (built.status !== 0) process.exit(built.status ?? 1);
console.log("validate: catalogs and generated artifacts current");
