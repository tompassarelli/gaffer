const TIERS = ["economy", "standard", "senior", "frontier"];
const REASONING = ["low", "medium", "high", "xhigh", "max"];

function keysOnly(value, allowed, label) {
  const unknown = Object.keys(value ?? {}).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${label} has unknown field(s): ${unknown.join(", ")}`);
}

export function validateProviderCatalog(catalog, expectedProvider) {
  keysOnly(catalog, ["$schema", "provider", "transports", "tiers"], "provider catalog");
  if (catalog?.provider !== expectedProvider) throw new Error(`${expectedProvider}: provider mismatch`);
  if (!Array.isArray(catalog.transports) || !catalog.transports.length ||
      catalog.transports.some((value) => typeof value !== "string" || !value.trim()))
    throw new Error(`${expectedProvider}: transports must contain non-empty strings`);
  keysOnly(catalog.tiers, TIERS, `${expectedProvider}.tiers`);
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
  }
  return catalog;
}
