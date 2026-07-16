# Provider-neutral routing

Gaffer chooses semantics; a provider adapter chooses a concrete runtime. Three
layers sit above that choice, and keeping them apart is the whole contract:

- **Planner inputs** are how a caller REASONS ITS WAY to a request — task shape,
  leverage, dependency shape, quality floor. They are upstream judgment, not
  wire fields: no adapter accepts them and none is dispatched. They DERIVE the
  routing fields below.
- **The routing request** is the provider-neutral payload Gaffer emits and a
  harness consumes. Hard controls such as tier/reasoning/topology affect
  dispatch; descriptive fields such as grade/domains/contracts are validated
  and recorded, then matter only when a prompt or adapter actually consumes
  them. Metadata is never described as magic execution.
- **Runtime allocation** — which account, which concrete model, resource
  pressure, fallback — is owned entirely by the harness. Gaffer never names an
  account or a model and does not define allocation's schema.

## Planner inputs (upstream — they derive the request, they are not it)

These inform how the routing axes are chosen. Feeding one as a request field
is an error, not a silently-ignored no-op — the composer rejects unknown options.

| Planner input | What it captures | Derives |
|---|---|---|
| task shape | execute / implement / integrate / design / scout / analyze / verify / judge / research-science | role + preset defaults |
| leverage | how much better judgment changes downstream outcomes (distinct from difficulty and grade) | argues tier / quality floor up |
| dependency shape | atomic-cohesive, deterministic-workflow, parallel-breadth, dynamic-decomposition, tightly-coupled-sequential | topology |
| quality floor | lowest responsible tier for the decision | bounds tier selection; refuses degraded routes |

The two-tier orchestration cap and the topology choice follow from dependency
shape; a frontier director is warranted by dynamic decomposition, not by
importance. These stay an orchestrator's reasoning today — North records
`topology` but does not synthesize a director graph from this metadata.

## The routing request (Gaffer's contract)

```json
{
  "role": "integrator",
  "taskGrade": "senior",
  "domainRequirements": [],
  "topology": "worker",
  "tier": "senior",
  "reasoning": "high",
  "posture": "deliver",
  "composition": { "kind": "preset", "id": "integrator", "overrides": [] }
}
```

```ts
type RoutingRequest = {
  role: string;                 // function / deliverable; canonical preset or bespoke name
  taskGrade: "novice" | "junior" | "mid" | "senior" | "staff" | "principal" | "research-grade";
  domainRequirements: string[];
  topology: "worker" | "orchestrator";                       // coordination authority; verifier/judge are worker ROLES
  tier: "economy" | "standard" | "senior" | "frontier";      // model capability floor
  reasoning: "low" | "medium" | "high" | "xhigh" | "max";    // deliberation
  posture: "explore" | "deliver" | "preserve";
  composition:
    | { kind: "preset"; id: string; overrides: OverrideField[]; overrideReason?: string }
    | {
        kind: "bespoke"; id: string; nearestPreset?: string;
        bespokeReason: string; promotionCandidate: boolean;
        contract: {
          responsibility: string; deliverable: string;
          capabilities: string[];
          mayDecide: string[]; mustEscalate: string[]; doneWhen: string[];
          report: string;
        };
      };
};
```

`role`/function describes the deliverable; `taskGrade` describes the scope and
judgment expected of the work; `tier` is the model capability floor; `reasoning`
is deliberation; `domainRequirements` names context/expertise the brief or
adapter must supply (recording it alone loads nothing); and
`topology` describes coordination authority. An adapter must not infer one
solely from another. A preset may propose all of them, but the recorded request
keeps them distinct. A changed preset axis is listed in `overrides[]` and
requires `overrideReason`; an unchanged preset uses `overrides: []` and must
not carry a reason. The canonical JSON Schema and cross-harness examples are
[`contracts/routing-request.schema.json`](../contracts/routing-request.schema.json)
and [`contracts/routing-request.fixtures.json`](../contracts/routing-request.fixtures.json).

Role and composition IDs use one lowercase kebab-case namespace
(`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`). Composer-only compatibility aliases are
normalized to their canonical preset before emission; an alias is not a valid
wire-level `role`. Retired IDs such as `researcher` remain invalid rather than
silently returning as bespoke roles.

`tier` and `reasoning` are independent axes, but their COMBINATION must resolve
through a provider catalog (see below). `verifier` and `judge` are functions on
worker topology, not topologies: `topology` is only `worker` or `orchestrator`.

## Shape routing

| Shape | Default role | Tier | Topology | Posture |
|---|---|---|---|---|
| execute | executor | economy | worker | deliver |
| implement | implementer | standard | worker | deliver |
| integrate | integrator | senior | worker | deliver |
| design | designer | frontier | worker | explore |
| direct | director | frontier | orchestrator | deliver |
| scout | scout | economy | worker | explore |
| analyze | analyst | senior | worker | explore |
| verify | verifier | senior | worker | explore |
| judge | judge | frontier | worker | explore |
| research-science | research-scientist | frontier | worker | explore |

These are presets, not coupled identities. `taskGrade`, domain requirements,
topology, semantic tier, and deliberation are independently reviewable and may
override a row subject to their actual invariants. A preset topology override
does not rewrite that preset's capabilities: it is accepted only when the fixed
capabilities already satisfy the requested topology. Otherwise choose a
compatible preset or a bespoke contract with explicit capabilities. The layer
floor raises foundational, library, and architecture work to at least `senior`.
Blast radius may raise a tier; importance alone does not.

The canonical machine-readable templates live in `staffing/catalog.json`
(`staffing/catalog.schema.json` documents the format). Compose a portable
payload without knowing a provider model name:

```sh
node scripts/compose-routing.mjs integrator --domain Nix --tier frontier --deliberation xhigh \
  --override-reason "foundational configuration contract"
node scripts/compose-routing.mjs migration-forensics --nearest analyst \
  --rationale "needs provenance tracing plus schema recovery" \
  --contract @/absolute/path/to/migration-contract.json --no-promotion-candidate
```

The command prints the JSON that follows a `GAFFER_ROUTING` marker. Preset
values are defaults only: every changed axis replaces only itself and is
auditable. Unknown roles are valid bespoke compositions only with a reason,
promotion status, structured authority / deliverable / done contract, and an
optional nearest-preset reference when one genuinely helps explain or seed the
composition.

## Tier × deliberation resolution

`tier` and `reasoning` are chosen independently, but the pair is only
dispatchable if a provider catalog resolves it. Each `providers/<provider>.json`
maps the semantic ramp (economy → standard → senior → frontier) onto that
provider's useful model×deliberation rungs and OMITS dominated combinations —
the shingle law: a model's top reasoning rung is dominated by the next model's
bottom rung, so it is not offered. A `(tier, reasoning)` pair is provider-neutral
and dispatchable iff some catalog offers it; the composer rejects any pair no
catalog resolves — before dispatch, never by silently substituting a level.
Overriding `tier` alone onto a preset whose `reasoning` the new tier does not
offer is therefore rejected: set both axes, or set a `reasoning` the tier
supports. This rejects unsupported and dominated routes without collapsing the
two axes into one.

The current concrete matrix is generated directly from the catalogs in
[`docs/provider-matrix.md`](provider-matrix.md); it is never duplicated here.
Runtime model promotion or provider fallback performs an exact concrete-model
delta lookup. It must not inherit the original tier model's calibration: every
runtime model declares either a calibrated repo path or explicit `none` in its
provider catalog.

## Target resolution — owned by the harness, not by Gaffer

Gaffer stops at the semantic request. Choosing an account, a concrete model, a
transport, and an allocation strategy — and reporting what actually ran — is the
harness's job. That resolution is North's contract, not Gaffer's: Gaffer does
not enumerate its fields or name any account, pool, or model.

A conforming harness accepts the eight-field Gaffer request inside its own
execution envelope. That envelope may additionally pin a provider or account,
but those are North inputs rather than Gaffer fields. The harness:

1. Honors an explicit provider/account pin from its execution envelope, else
   selects freely among compatible accounts.
2. Removes providers lacking required capabilities, authentication, or capacity.
3. Rejects candidates below the quality floor the caller reasoned to, or missing
   required capabilities.
4. Applies its own subscription-allocation policy and resource pressure; pressure
   trims optional breadth, polish, and retries before capability.
5. Resolves the semantic `tier` + `reasoning` through `providers/<provider>.json`
   to a concrete model and effort/reasoning control.
6. Records the requested route beside the resolved one for audit.

Recipe capabilities are provider-neutral requirements. An adapter may expose
only the intersection it can enforce, and must fail closed when a required
boundary is unavailable. In particular, `shell.readonly` means an OS-enforced
working-tree write denial; removing Edit/Write while leaving an unrestricted
shell does not satisfy it. An adapter without a hard read-only shell omits the
shell rather than silently widening authority. This is also why capabilities
are recipe facts rather than a ninth routing field: named presets supply them,
while a bespoke contract states the authority its adapter must realize.

Automatic fallback is SUBSTITUTION only: it preserves the semantic tier and
required capabilities and is safe only before side effects. Lowering capability,
deliberation, scope, or verification is DEGRADATION — an explicit, recorded
decision, never a disguised fallback. Allocation strategy (preferential /
balanced / reserved), account and pool identity, resource pressure, and resolved
model names are runtime facts the harness owns and records; they are never
Gaffer request fields and carry no API-credit meaning.

`auto` is a North execution-envelope value, not a Gaffer field or model name.
Gaffer intentionally does not claim that model aliases or effort labels are
equivalent between providers.

## Bespoke compositions

Composition provenance has five deliberately distinct presentation states:

- `gaffer:<preset>` — an unchanged standard recipe.
- `gaffer:<preset>+override` — a standard recipe with recorded axis changes and
  an `overrideReason`.
- `gaffer:bespoke:<id>` — an improvised, structured composition with its own
  capabilities and authority contract.
- `gaffer:not-selected` — a native session that did not select Gaffer at all.
- `gaffer:legacy-debt` — a pre-contract record whose provenance cannot yet be
  reconstructed; this is migration debt, not a recipe.

`gaffer:none` is not a valid display state because it collapses intentional
non-selection, bespoke composition, and missing legacy data into one ambiguous
label. A refreshed legacy record should be reclassified into one of the first
four states; it is never guessed into a preset.

Every bespoke composition supplies `composition.kind = "bespoke"`, a stable
`id`, an optional nearest-preset reference, a one-line `bespokeReason`, a boolean
`promotionCandidate` (false by default; nomination is explicit), and a structured contract: responsibility, deliverable,
canonical `capabilities[]`, `mayDecide[]`, `mustEscalate[]`, `doneWhen[]`, and
report. The capabilities are explicit even when `nearestPreset` is present:
the nearest preset can seed composition defaults but never grants authority by
implication. A harness records the
requested composition beside the resolved route and verified outcome. Repeated
successful fingerprints are visible for review regardless of nomination; runtime observations never
rewrite Gaffer's standard library automatically.

## Current consumption boundary

`scripts/compose-routing.mjs` validates semantic tier and deliberation
resolvability; current North chooses the provider/account and resolves the pair.
Together they validate and record role, task grade, domain
requirements, topology, posture, and composition as independent metadata.
Recorded metadata is useful for audit and empirical routing reports, but does
not by itself load domain expertise, change a role contract by grade, or spawn
an orchestrator graph. Planner inputs (shape, leverage, dependency shape,
quality floor) are deliberately NOT accepted as request fields — feeding one to
the composer fails rather than being accepted as if it worked.

## Compatibility

The harness must advertise whether it accepts this contract. North accepts the
eight semantic fields plus North-owned execution-envelope controls such as
`provider` and `target`; a legacy North accepts `model` and `effort`. Callers
detecting a legacy surface resolve the chosen tier through the provider catalog
before calling it, and must not send unknown fields hoping they are ignored.

Claude Code agent frontmatter still contains Anthropic `model` and `effort`
pins. Those are compiled adapter artifacts. The semantic `tier` is the source
decision and provider catalogs perform resolution. Existing Claude plugin
behavior therefore remains unchanged while North and other harnesses use the
portable fields.
