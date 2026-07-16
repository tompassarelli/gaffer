# Provider-neutral routing

Gaffer chooses semantics; a provider adapter chooses a concrete runtime. The
portable decision is:

```json
{
  "shape": "integrate",
  "role": "integrator",
  "posture": "deliver",
  "tier": "senior",
  "provider": "auto",
  "reasoning": "high"
}
```

## Shape routing

| Shape | Default role | Tier | Posture |
|---|---|---|---|
| execute | executor | economy | deliver |
| implement | implementer | standard | deliver |
| integrate | integrator | senior | deliver |
| design | designer | frontier | explore |
| research/scout | researcher | economy | explore |
| analyze | analyst | senior | explore |
| verify | verifier | senior | explore |
| judge | judge | senior | explore |

The layer floor raises foundational, library, and architecture work to at
least `senior`. Blast radius may raise a tier; importance alone does not.

## Resolution

1. Honor an explicit provider or transport override.
2. Remove providers that lack required tools, authentication, or capacity.
3. Apply task policy (quality, latency, cost, subscription/API preference).
4. Resolve the semantic tier through `providers/<provider>.json`.
5. Record the requested decision and resolved provider, transport, model,
   reasoning/effort, selection reason, and any fallback.

The harness must advertise whether it accepts this contract. A v2 North spawn
accepts `provider` and `tier`; a legacy North spawn accepts `model` and
`effort`. Callers detecting legacy North resolve the chosen tier through the
provider catalog before calling it. They must not send unknown fields and hope
they are ignored. This bridge preserves existing Anthropic behavior while the
North provider boundary is introduced.

The provider-neutral North adapter contract is:

```ts
type RoutingRequest = {
  provider: "auto" | "anthropic" | "openai";
  tier: "economy" | "standard" | "senior" | "frontier";
  transport?: string;
  reasoning?: "low" | "medium" | "high" | "xhigh";
  constraints?: {
    maxCostUsd?: number;
    fallbackProviders?: Array<"anthropic" | "openai">;
    requiredCapabilities?: string[];
  };
};
```

The resolution result includes `requestedProvider`, `provider`, `transport`,
`tier`, `model`, `reasoning` or `effort`, `selectionReason`, and
`fallbackCount`. Availability is one of `available`, `unavailable`,
`rate-limited`, `quota-exhausted`, `authentication-missing`, or `unknown`,
with an optional cooldown time.

`auto` is a request to the harness, not a provider. Catalog model value `auto`
means the adapter selects its current supported model. Gaffer intentionally
does not claim that model aliases or effort labels are equivalent between
providers.

Fallback is safe before side effects. After a worker mutates state, automatic
fallback requires an isolated worktree or an explicit recovery contract.
Quota, authentication, rate-limit, transport, and model-unavailable failures
must be classified separately so routing remains explainable.

## Compatibility

Claude Code agent frontmatter still contains Anthropic `model` and `effort`
pins. Those are compiled adapter artifacts. The semantic `tier` is the source
decision and provider catalogs perform resolution. Existing Claude plugin
behavior therefore remains unchanged while North and other harnesses use the
portable fields.
