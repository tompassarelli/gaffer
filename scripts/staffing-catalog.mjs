import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STAFFING_CATALOG_PATH = resolve(ROOT, "staffing/catalog.json");

function keysOnly(value, allowed, label) {
  const unknown = Object.keys(value ?? {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`staffing catalog: ${label} has unknown field(s): ${unknown.join(", ")}`);
}

export function validateStaffingCatalog(catalog) {
  if (catalog?.version !== 1) throw new Error("staffing catalog: version must be 1");
  keysOnly(catalog, ["$schema", "version", "vocabulary", "defaults", "recipes", "aliases"], "top level");
  const vocabulary = catalog?.vocabulary;
  const axes = ["taskGrades", "semanticTiers", "deliberations", "topologies", "postures"];
  keysOnly(vocabulary, axes, "vocabulary");
  for (const axis of axes) {
    const values = vocabulary?.[axis];
    if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== "string" || !value))
      throw new Error(`staffing catalog: vocabulary.${axis} must contain non-empty strings`);
    if (new Set(values).size !== values.length) throw new Error(`staffing catalog: duplicate vocabulary.${axis}`);
  }
  keysOnly(catalog.defaults, ["taskGrade", "tier", "deliberation", "topology", "posture"], "defaults");
  for (const [field, axis] of [["taskGrade", "taskGrades"], ["tier", "semanticTiers"], ["deliberation", "deliberations"], ["topology", "topologies"], ["posture", "postures"]])
    if (!vocabulary[axis].includes(catalog.defaults?.[field])) throw new Error(`staffing catalog: invalid defaults.${field}`);
  if (!Array.isArray(catalog.recipes) || !catalog.recipes.length) throw new Error("staffing catalog: recipes must be non-empty");
  const names = new Set();
  for (const recipe of catalog.recipes) {
    keysOnly(recipe, ["name", "taskGrade", "tier", "deliberation", "topology", "posture", "tools", "tagline", "description"], `recipe ${recipe?.name ?? "<unknown>"}`);
    if (!recipe?.name || names.has(recipe.name)) throw new Error(`staffing catalog: duplicate or empty recipe ${recipe?.name ?? ""}`);
    names.add(recipe.name);
    for (const [field, axis] of [["taskGrade", "taskGrades"], ["tier", "semanticTiers"], ["deliberation", "deliberations"], ["topology", "topologies"]]) {
      if (!vocabulary[axis].includes(recipe[field])) throw new Error(`${recipe.name}: invalid ${field} ${JSON.stringify(recipe[field])}`);
    }
    if (recipe.posture !== undefined && !vocabulary.postures.includes(recipe.posture))
      throw new Error(`${recipe.name}: invalid posture ${JSON.stringify(recipe.posture)}`);
    for (const field of ["tagline", "description"])
      if (typeof recipe[field] !== "string" || !recipe[field].trim()) throw new Error(`${recipe.name}: missing ${field}`);
  }
  if (!Array.isArray(catalog.aliases)) throw new Error("staffing catalog: aliases must be an array");
  const aliases = new Set();
  for (const alias of catalog.aliases) {
    keysOnly(alias, ["name", "target"], `alias ${alias?.name ?? "<unknown>"}`);
    if (!alias?.name || aliases.has(alias.name) || names.has(alias.name)) throw new Error(`staffing catalog: invalid alias ${alias?.name ?? ""}`);
    aliases.add(alias.name);
    if (!names.has(alias.target)) throw new Error(`staffing catalog: alias target missing: ${alias.target}`);
  }
  return catalog;
}

export function loadStaffingCatalog(path = STAFFING_CATALOG_PATH) {
  return validateStaffingCatalog(JSON.parse(readFileSync(path, "utf8")));
}
