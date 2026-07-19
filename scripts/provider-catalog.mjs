import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIERS = ["economy", "standard", "senior", "frontier"];
const REASONING = ["low", "medium", "high", "xhigh", "max"];
const SOURCE_SCOPES = ["model-family", "availability", "effort-support"];
const OFFICIAL_DOMAINS = {
  anthropic: ["anthropic.com", "claude.com"],
  openai: ["openai.com"],
};

export const PROVIDER_NAMES = ["anthropic", "openai"];

export function loadProviderCatalog(name, root = ROOT) {
  const catalog = JSON.parse(readFileSync(resolve(root, `providers/${name}.json`), "utf8"));
  return validateProviderCatalog(catalog, name, root);
}

// The deliberation levels a semantic tier can actually resolve to, unioned
// across the given provider catalogs. With provider:auto a (tier, deliberation)
// pair is dispatchable iff SOME provider catalog resolves it; each catalog is
// authored to omit dominated rungs (shingle law), so this union is exactly the
// set of ramp-legal, non-dominated pairs. tier and deliberation stay orthogonal
// axes — only their COMBINATION is constrained, never collapsed one into the other.
export function resolvableDeliberations(tier, providers = PROVIDER_NAMES, root = ROOT) {
  const levels = new Set();
  for (const name of providers) {
    const t = loadProviderCatalog(name, root).tiers[tier];
    if (!t) continue;
    for (const level of t.efforts ?? t.reasoning) levels.add(level);
  }
  return levels;
}

export function resolveModelAlias(catalog, modelOrAlias) {
  return catalog.modelAliases?.[modelOrAlias] ?? modelOrAlias;
}

// Delta selection is always by the concrete model that will execute. Runtime
// promotion or fallback must never inherit the tier's original model delta.
// An adapter must declare an explicit `none` entry for an uncalibrated model.
export function modelDeltaFor(catalog, concreteModel) {
  const descriptor = catalog.modelDeltas?.[concreteModel];
  if (!descriptor)
    throw new Error(`${catalog.provider}: concrete model ${concreteModel} has no exact modelDeltas entry; declare calibrated or explicit none`);
  return descriptor;
}

function keysOnly(value, allowed, label) {
  const unknown = Object.keys(value ?? {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${label} has unknown field(s): ${unknown.join(", ")}`);
}

function isoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(`${label} must be an ISO date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error(`${label} must be a real calendar date`);
  return value;
}

function officialSource(url, provider) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && OFFICIAL_DOMAINS[provider]
      .some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function providerCatalogFreshness(catalog, today = new Date().toISOString().slice(0, 10)) {
  isoDate(today, "freshness today");
  const reviewAfter = isoDate(catalog?.provenance?.reviewAfter, `${catalog?.provider ?? "provider"}.provenance.reviewAfter`);
  return reviewAfter < today
    ? { status: "overdue", reviewAfter, message: `${catalog.provider}: provider catalog review overdue after ${reviewAfter}` }
    : { status: "current", reviewAfter, message: `${catalog.provider}: provider catalog review current through ${reviewAfter}` };
}

export function validateProviderCatalog(catalog, expectedProvider, root = ROOT) {
  keysOnly(catalog, ["$schema", "provider", "provenance", "transports", "modelAliases", "modelDeltas", "tiers"], "provider catalog");
  if (catalog?.provider !== expectedProvider) throw new Error(`${expectedProvider}: provider mismatch`);
  const provenance = catalog.provenance;
  keysOnly(provenance, ["asOf", "reviewAfter", "sources"], `${expectedProvider}.provenance`);
  const asOf = isoDate(provenance?.asOf, `${expectedProvider}.provenance.asOf`);
  const reviewAfter = isoDate(provenance?.reviewAfter, `${expectedProvider}.provenance.reviewAfter`);
  const today = new Date().toISOString().slice(0, 10);
  if (asOf > today) throw new Error(`${expectedProvider}: catalog asOf ${asOf} is in the future`);
  if (reviewAfter < asOf) throw new Error(`${expectedProvider}: reviewAfter must not precede asOf`);
  if (!Array.isArray(provenance.sources) || !provenance.sources.length)
    throw new Error(`${expectedProvider}: provenance.sources must be non-empty`);
  const sourceUrls = new Set();
  const sourcedModels = new Set();
  const sourcedScopes = new Set();
  const sourcedScopesByModel = new Map();
  for (const [index, source] of provenance.sources.entries()) {
    const label = `${expectedProvider}.provenance.sources[${index}]`;
    keysOnly(source, ["url", "modelFamilies", "scopes"], label);
    if (!officialSource(source?.url, expectedProvider))
      throw new Error(`${label}.url must be an official ${expectedProvider} HTTPS source`);
    if (sourceUrls.has(source.url)) throw new Error(`${expectedProvider}: duplicate provenance source ${source.url}`);
    sourceUrls.add(source.url);
    if (!Array.isArray(source.modelFamilies) || !source.modelFamilies.length ||
        source.modelFamilies.some((model) => typeof model !== "string" || !model.trim()) ||
        new Set(source.modelFamilies).size !== source.modelFamilies.length)
      throw new Error(`${label}.modelFamilies must contain unique exact model IDs`);
    if (!Array.isArray(source.scopes) || !source.scopes.length ||
        source.scopes.some((scope) => !SOURCE_SCOPES.includes(scope)) ||
        new Set(source.scopes).size !== source.scopes.length)
      throw new Error(`${label}.scopes must use official fact scopes only`);
    source.modelFamilies.forEach((model) => {
      sourcedModels.add(model);
      const modelScopes = sourcedScopesByModel.get(model) ?? new Set();
      source.scopes.forEach((scope) => modelScopes.add(scope));
      sourcedScopesByModel.set(model, modelScopes);
    });
    source.scopes.forEach((scope) => sourcedScopes.add(scope));
  }
  const missingScopes = SOURCE_SCOPES.filter((scope) => !sourcedScopes.has(scope));
  if (missingScopes.length)
    throw new Error(`${expectedProvider}: provenance sources do not cover ${missingScopes.join(",")}`);
  if (!Array.isArray(catalog.transports) || !catalog.transports.length ||
      catalog.transports.some((value) => typeof value !== "string" || !value.trim()))
    throw new Error(`${expectedProvider}: transports must contain non-empty strings`);
  if (new Set(catalog.transports).size !== catalog.transports.length)
    throw new Error(`${expectedProvider}: transports must not contain duplicates`);
  if (catalog.modelAliases == null || typeof catalog.modelAliases !== "object" || Array.isArray(catalog.modelAliases) ||
      !Object.keys(catalog.modelAliases).length)
    throw new Error(`${expectedProvider}: modelAliases must map aliases to exact model IDs`);
  for (const [alias, model] of Object.entries(catalog.modelAliases)) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(alias) || typeof model !== "string" || !model.trim() || alias === model)
      throw new Error(`${expectedProvider}: invalid model alias ${JSON.stringify(alias)}`);
  }
  keysOnly(catalog.tiers, TIERS, `${expectedProvider}.tiers`);
  const expectedLevels = expectedProvider === "anthropic" ? "efforts" : "reasoning";
  for (const tier of TIERS) {
    const value = catalog.tiers?.[tier];
    keysOnly(value, ["model", "efforts", "defaultEffort", "reasoning", "defaultReasoning"], `${expectedProvider}.${tier}`);
    if (typeof value?.model !== "string" || !value.model.trim()) throw new Error(`${expectedProvider}: missing ${tier} model resolution`);
    const listName = value.efforts ? "efforts" : "reasoning";
    const defaultName = value.efforts ? "defaultEffort" : "defaultReasoning";
    const levels = value[listName];
    if (!Array.isArray(levels) || !levels.length || levels.some((level) => !REASONING.includes(level)) || new Set(levels).size !== levels.length)
      throw new Error(`${expectedProvider}.${tier}.${listName} must contain unique supported deliberation levels`);
    if (!levels.includes(value[defaultName])) throw new Error(`${expectedProvider}.${tier}.${defaultName} must be supported by ${listName}`);
    if ((value.efforts && (value.reasoning || value.defaultReasoning)) || (value.reasoning && (value.efforts || value.defaultEffort)))
      throw new Error(`${expectedProvider}.${tier} must use one provider's deliberation vocabulary`);
    if (listName !== expectedLevels)
      throw new Error(`${expectedProvider}.${tier} must use ${expectedLevels}`);
    if (Object.hasOwn(catalog.modelAliases, value.model))
      throw new Error(`${expectedProvider}.${tier}.model must be an exact model ID, not alias ${value.model}`);
  }
  const concreteRungs = new Map();
  for (const tier of TIERS) {
    const value = catalog.tiers[tier];
    for (const level of value.efforts ?? value.reasoning) {
      const key = `${value.model}\0${level}`;
      const priorTier = concreteRungs.get(key);
      if (priorTier)
        throw new Error(`${expectedProvider}: concrete rung ${value.model}/${level} appears in both ${priorTier} and ${tier}`);
      concreteRungs.set(key, tier);
    }
  }
  if (catalog.modelDeltas == null || typeof catalog.modelDeltas !== "object" || Array.isArray(catalog.modelDeltas))
    throw new Error(`${expectedProvider}: modelDeltas must be an object`);
  const models = new Set(TIERS.map((tier) => catalog.tiers[tier].model));
  const deltaModels = new Set(Object.keys(catalog.modelDeltas));
  const missing = [...models].filter((model) => !deltaModels.has(model));
  if (missing.length)
    throw new Error(`${expectedProvider}: modelDeltas must cover every tier model; missing=${missing.join(",")}`);
  for (const [alias, model] of Object.entries(catalog.modelAliases)) {
    if (!deltaModels.has(model))
      throw new Error(`${expectedProvider}: modelAliases.${alias} target lacks exact modelDeltas entry: ${model}`);
  }
  const unsourced = [...deltaModels].filter((model) => !sourcedModels.has(model));
  const unknownSourced = [...sourcedModels].filter((model) => !deltaModels.has(model));
  if (unsourced.length || unknownSourced.length)
    throw new Error(`${expectedProvider}: provenance model coverage mismatch; unsourced=${unsourced.join(",")} unknown=${unknownSourced.join(",")}`);
  const missingScopesByModel = [...deltaModels].flatMap((model) => {
    const covered = sourcedScopesByModel.get(model) ?? new Set();
    const missingModelScopes = SOURCE_SCOPES.filter((scope) => !covered.has(scope));
    return missingModelScopes.length ? [`${model} missing ${missingModelScopes.join(",")}`] : [];
  });
  if (missingScopesByModel.length)
    throw new Error(`${expectedProvider}: provenance must cover every scope per exact model; ${missingScopesByModel.join("; ")}`);
  for (const [model, descriptor] of Object.entries(catalog.modelDeltas)) {
    if (descriptor == null || typeof descriptor !== "object" || Array.isArray(descriptor))
      throw new Error(`${expectedProvider}: modelDeltas.${model} must be an object`);
    if (descriptor.kind === "calibrated") {
      keysOnly(descriptor, ["kind", "path"], `${expectedProvider}.modelDeltas.${model}`);
      if (typeof descriptor.path !== "string" || !descriptor.path.trim() || descriptor.path.startsWith("/") || descriptor.path.split("/").includes(".."))
        throw new Error(`${expectedProvider}: modelDeltas.${model}.path must be a safe repo-relative path`);
      if (!existsSync(resolve(root, descriptor.path)))
        throw new Error(`${expectedProvider}: calibrated delta path does not exist: ${descriptor.path}`);
    } else if (descriptor.kind === "none") {
      keysOnly(descriptor, ["kind", "reason"], `${expectedProvider}.modelDeltas.${model}`);
      if (typeof descriptor.reason !== "string" || !descriptor.reason.trim())
        throw new Error(`${expectedProvider}: modelDeltas.${model}.reason must explain explicit none`);
    } else {
      throw new Error(`${expectedProvider}: modelDeltas.${model}.kind must be calibrated or none`);
    }
  }
  return catalog;
}
