# Provider-neutral routing

Gaffer chooses semantics; a provider adapter chooses a concrete runtime. The
portable decision is:

```json
{
  "shape": "integrate",
  "role": "integrator",
  "taskGrade": "senior",
  "domainRequirements": ["repository architecture"],
  "topology": "worker",
  "dependencyShape": "atomic-cohesive",
  "leverage": "high",
  "posture": "deliver",
  "tier": "senior",
  "qualityFloor": "senior",
  "provider": "auto",
  "reasoning": "high",
  "allocation": { "mode": "preferential" }
}
```

## Shape routing

| Shape | Default role | Tier | Posture |
|---|---|---|---|
| execute | executor | economy | deliver |
| implement | implementer | standard | deliver |
| integrate | integrator | senior | deliver |
| design | designer | frontier | explore |
| scout | scout | economy | explore |
| analyze | analyst | senior | explore |
| verify | verifier | senior | explore |
| judge | judge | senior | explore |
| research-science | research-scientist | frontier | explore |

These are presets, not coupled identities. `taskGrade`, domain requirements,
topology, semantic tier, and deliberation are independently reviewable and may
override a row. The layer floor raises foundational, library, and architecture work to at
least `senior`. Blast radius may raise a tier; importance alone does not.

## Resolution

1. Honor an explicit provider or transport override.
2. Remove providers that lack required tools, authentication, or capacity.
3. Reject candidates below the quality floor or missing required capabilities.
4. Apply the requested subscription allocation mode and active resource
   envelope; pressure trims optional breadth, polish, and retries before
   capability.
5. Resolve an eligible semantic candidate through `providers/<provider>.json`.
6. Record the requested decision and resolved provider, account/pool,
   transport, model,
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
  shape?: string;
  role: string;
  posture?: "explore" | "deliver" | "preserve";
  provider: "auto" | "anthropic" | "openai";
  tier: "economy" | "standard" | "senior" | "frontier";
  transport?: string;
  reasoning?: "low" | "medium" | "high" | "xhigh";
  taskGrade?: "novice" | "junior" | "mid" | "senior" | "staff" | "principal" | "research-grade";
  domainRequirements?: string[];
  topology?: "worker" | "verifier" | "orchestrator";
  dependencyShape?:
    | "atomic-cohesive"
    | "deterministic-workflow"
    | "parallel-breadth"
    | "dynamic-decomposition"
    | "tightly-coupled-sequential";
  leverage?: "low" | "medium" | "high" | "critical";
  qualityFloor?: "economy" | "standard" | "senior" | "frontier";
  candidates?: Array<{
    tier: "economy" | "standard" | "senior" | "frontier";
    provider?: "anthropic" | "openai";
    reasoning?: "low" | "medium" | "high" | "xhigh";
  }>;
  allocation?: {
    mode: "preferential" | "balanced" | "reserved";
    providerOrder?: Array<"anthropic" | "openai">;
    resourceEnvelope?: string;
    reserveClass?: string;
  };
  degradation?: {
    allowed: boolean;
    minimumTier?: "economy" | "standard" | "senior" | "frontier";
    reason?: string;
  };
  composition?: {
    kind: "preset" | "bespoke";
    id: string;
    nearestPreset?: string;
    bespokeReason?: string;
    promotionCandidate?: boolean;
  };
  constraints?: {
    requiredCapabilities?: string[];
    maxRetries?: number;
    maxWorkers?: number;
    optionalPolish?: boolean;
  };
};
```

`role`/function describes the deliverable; `taskGrade` describes the scope and
judgment expected of the work; `tier` is the model capability floor;
`reasoning` is deliberation; `domainRequirements` describes context/expertise;
and `topology` describes coordination authority. Adapters must not infer one
solely from another. A preset may propose all of them, but the recorded request
keeps them distinct.

`leverage` estimates how much better judgment changes downstream outcomes; it
is distinct from difficulty and task grade. `qualityFloor` is the lowest
responsible capability tier and defaults to `tier` when omitted. `candidates`
is Gaffer's ordered semantic waterfall: it may name a provider preference, but
never an account or concrete model. North filters candidates against live
subscription entitlements and account envelopes.

`dependencyShape` selects topology. Atomic cohesive work stays with one worker;
deterministic workflows use fixed stages; parallel breadth uses a director and
independent workers; dynamic decomposition warrants a frontier director; and
tightly coupled sequential work stays with one strong worker plus an optional
verifier. The existing two-tier depth cap still applies.

Allocation modes are intentionally few: `preferential` consumes eligible
providers in `providerOrder`; `balanced` distributes work across eligible
subscription pools; `reserved` protects capacity identified by `reserveClass`
for high-leverage work. `resourceEnvelope` is an opaque North-owned policy
reference, not money or an API-credit counter. North records the chosen pool,
pressure state, and allocation reason without leaking account identity into
Gaffer doctrine.

Every bespoke composition supplies `composition.kind = "bespoke"`, a stable
`id`, its nearest preset, and a one-line `bespokeReason`. North or another host
records this requested composition beside the resolved route and verified
outcome in its telemetry world. Repeated successful fingerprints may be
surfaced as promotion candidates; runtime observations never rewrite Gaffer's
standard library automatically.

The resolution result includes `requestedProvider`, `provider`, `resourcePool`,
`transport`, `tier`, `model`, `reasoning` or `effort`, `selectionReason`,
`allocationMode`, `envelopePressure`, and `fallbackCount`. Availability is one
of `available`, `unavailable`,
`rate-limited`, `quota-exhausted`, `authentication-missing`, or `unknown`,
with an optional cooldown time.

`auto` is a request to the harness, not a provider. Catalog model value `auto`
means the adapter selects its current supported model. Gaffer intentionally
does not claim that model aliases or effort labels are equivalent between
providers.

Automatic fallback is substitution only: it preserves `qualityFloor`, required
capabilities, and semantic tier, and is safe only before side effects. After a
worker mutates state, substitution requires an isolated worktree or an explicit
recovery contract. A lower tier, reduced deliberation, or dropped verification
is degradation; it requires `degradation.allowed`, a recorded reason, and must
not cross `minimumTier` or the quality floor.
Quota, authentication, rate-limit, transport, and model-unavailable failures
must be classified separately so routing remains explainable.

When an envelope is tight, North first reduces optional worker breadth, polish,
and retry count within the declared constraints. If no candidate clears the
quality floor, it returns an unsatisfied route instead of quietly buying a
lower-quality answer. The caller may then reduce scope, defer, or issue an
explicit degradation request.

## Compatibility

Claude Code agent frontmatter still contains Anthropic `model` and `effort`
pins. Those are compiled adapter artifacts. The semantic `tier` is the source
decision and provider catalogs perform resolution. Existing Claude plugin
behavior therefore remains unchanged while North and other harnesses use the
portable fields.
