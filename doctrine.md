GAFFER ACTIVE — routing doctrine for delegated work.

When you delegate (Agent tool, Workflow, any spawn surface), select the
FUNCTION by TASK SHAPE. Do not use importance or felt difficulty as a proxy for
role; task grade, leverage, layer, and risk independently set the capability
floor and deliberation.

The templates are a STANDARD LIBRARY, not a roster limit — shape triage
proposes a template, while the routing decision keeps its axes explicit:
FUNCTION/ROLE,
TASK GRADE, DOMAIN REQUIREMENTS, TOPOLOGY, SEMANTIC TIER, DELIBERATION, and
POSTURE.
No template fits ⇒ author a bespoke (custom) composition (BESPOKE
COMPOSITIONS, bottom); contorting the task to a template is the misfire.

SELECTION LADDER: use a template unchanged when deliverable and authority fit;
use a justified template override when task grade, domains, tier,
reasoning, or posture change but its fixed topology/capability boundary still
fits. A topology change is never a preset override. Any change to
responsibility, deliverable, capability/authority boundary, done criteria, or
report shape requires a bespoke composition. Machine payloads retain v2
`kind:"preset"` and `nearestPreset` keys for compatibility.

ORTHOGONAL AXES — never smuggle one decision inside another:
- FUNCTION/ROLE names the responsibility and deliverable: executor,
  implementer, integrator, designer, director, scout, analyst, verifier, judge,
  reviewer, research-scientist, and so on.
- TASK GRADE names the prior for the work itself: novice, junior, mid, senior,
  staff, principal, or research-grade. Grade is scope, autonomy, novelty, and
  cross-boundary responsibility — not a model name and not a worker identity.
- DOMAIN REQUIREMENTS name expertise/context the worker must receive.
- TOPOLOGY names worker or orchestrator coordination authority. It is
  conceptually independent of the other axes, but current templates ship
  fixed enforceable topology/capability pairings: director is the orchestrator;
  every other stock role is a worker. A stock template cannot override
  topology or synthesize a different capability boundary.
- SEMANTIC TIER names the required model capability floor: economy, standard,
  senior, or frontier. Provider catalogs resolve it to a runtime.
- DELIBERATION names the reasoning budget independently of capability: low,
  medium, high, xhigh, or max where the selected provider supports it.
- POSTURE names what yields when values collide: explore, deliver, preserve,
  or evaluate. It never expands role, topology, or capabilities.
Templates fill common combinations of these axes. They are defaults, not types
and not limits; every changed overrideable template axis is listed in
`overrides[]` with one `overrideReason`. Topology is fixed for a stock template,
not overrideable. An unchanged template carries
neither a fake override nor a reason.

SHAPES → TEMPLATES (semantic tier; provider adapters resolve concrete models)
- direct — decompose, staff, verify, and reconcile ≥2 independent pieces;
  never execute the worker pieces → gaffer:director (frontier; orchestrator)
- execute — bounded, mechanical: apply a patch, rename, obvious tests
  → gaffer:executor (economy)
- implement — one feature/fix inside known patterns, well-trodden code
  → gaffer:implementer (standard)
- integrate — cross-file change, ambiguous debugging, refactor with behavior
  at stake → gaffer:integrator (senior)
- design — choose the shape: APIs, data models, decomposition, naming that
  commits the system → gaffer:designer (frontier)
- scout — locate, map, gather sources; breadth, cheap, fan-out
  → gaffer:scout (economy)
- analyze — deep-dive: how does this work, why does it break, does this
  design hold against real behavior; depth, read-only → gaffer:analyst
  (senior). Fan out when independently traceable mechanisms benefit from
  separate evidence trails and later synthesis; keep tightly coupled traces
  together regardless of subsystem count.
- review — evaluate one supplied artifact or change across multiple criteria;
  return evidence-backed prioritized findings plus accept, changes-required,
  or cannot-assess → gaffer:reviewer (senior)
- verify — test one specific claim at any leverage; affirmative evidence
  confirms, counterevidence refutes, missing/ambiguous coverage cannot
  determine → gaffer:verifier (senior default; justified overrides may move
  task grade, tier, and deliberation up or down, while the task's quality floor
  remains binding)
- judge — rank two or more supplied alternatives against a stated rubric
  → gaffer:judge (frontier)
- research-science — novel hypothesis formation, experiment design, and work
  whose result or method is not already known → gaffer:research-scientist
  (frontier; research-grade). It may invoke existing non-mutating tools and
  probes only; authoring any new script, fixture, apparatus, or code, even
  ephemeral scratch, is handed to an authoring role. This is not ordinary
  source gathering.

LAWS
1. LAYER FLOOR: foundational / library / architecture code never routes below
   SENIOR, however mechanical the task looks — the stack layer sets the floor,
   not surface difficulty. Economy/standard extend established patterns in
   solidified code; senior/frontier handle novel or judgment-heavy work.
2. SHINGLE LAW: route on one continuous semantic ramp:
   economy → standard → senior → frontier. Each provider catalog maps these
   tiers onto its useful model×reasoning/effort rungs and omits dominated
   combinations. Harder ⇒ climb to the next real tier; do not crank reasoning
   against a low model ceiling. Provider rungs need not be equivalent.
3. QUALITY FLOOR: resources may reduce optional breadth, polish, retries, and
   scope, but never silently route a consequential decision below the lowest
   responsible capability.
4. PIN THE TIER on every spawn. Provider may be explicit or `auto`; the
   provider adapter MUST resolve and record concrete model + effort/reasoning.
   Never silently inherit the session model. Unpinned resolution uses the
   canonical tier row. An explicit exact-model pin must pass that model's
   provider-supported Gaffer-vocabulary list AND its exact per-tier route;
   never infer a cross-product or filter an alternate model through the default
   tier model. Static route compatibility does not prove an authenticated target
   is currently available — the harness must establish that independently.
5. BLAST RADIUS routes up; importance alone never does. A hard-but-local
   testable bug is still implement; a one-line naming decision that shapes
   an API is design.
6. DELEGATE EAGERLY: at 2+ independent subtasks, spawn them in parallel and
   act as coordinator — you own the seams between outputs. Never trust a bare
   "done".
7. VERIFICATION ATTACHES WHERE THE OUTCOME LIVES. A SELF-CONTAINED terminal
   unit with a local, objectively checkable done-bar supplies worker evidence,
   with a context-carrying verifier fork when the leverage of a plausible wrong
   verdict warrants one. An EMERGENT outcome — subtasks whose aggregate is the
   deliverable — always gets a whole-outcome report from an independently
   staffed, context-carrying integration verifier fork owned by the
   coordinator; per-piece evidence or verifier reports never establish the
   whole by addition. A verifier reports a per-claim verdict + probe run +
   observed result.
   The coordinator nevertheless owns the final judgment: drive the assembled
   result end-to-end and independently spot-check the load-bearing assertion or
   seam contributed by each child on which that judgment depends. Keep this
   bounded — execute only the narrow non-authoring verification probe needed to
   observe the assertion, not the worker's full completion suite and never
   implementation or repair. Disposable test/build/cache state is allowed;
   editing the deliverable is not. A failed or suspicious check is a restaff
   signal for the appropriate worker or verifier, not permission for the
   coordinator to become that worker. This independent due diligence is
   reconciliation; merely rerunning every worker probe is duplicated execution.
   Verifier tier follows verdict leverage. Its senior default may be
   overridden up or down with justification, but never below the task's
   quality floor. Because current lanes share one OS uid,
   independently staffed means role/context separation, not security-grade
   independent attestation; `attested` or `verified` status is reserved for a
   future protected trust boundary.

RESOURCE POLICY — capability is purchased where it changes the outcome, not
spread uniformly over a task. Estimate LEVERAGE separately from difficulty:
leverage rises with blast radius, irreversibility, downstream reuse, ambiguity,
and the cost of a plausible wrong answer. High leverage may justify a premium
director or worker even when execution is short; low-leverage volume should use
the cheapest rung that clears its quality floor.

- QUALITY FLOOR is the minimum semantic tier that can responsibly own the
  decision. It is set by task grade, layer floor, required capabilities, and
  risk. A resource limit never silently lowers it.
- When resources tighten, reduce speculative breadth, polish, retry count, and
  verification breadth beyond the evidence required at that outcome before
  violating the quality floor. If the remaining envelope cannot fund a
  compliant route, cut scope, defer the work, or request an explicit
  degradation decision.
- SUBSTITUTION changes provider/account while preserving semantic tier and
  required capabilities. It may be automatic only before side effects.
  DEGRADATION lowers capability, deliberation, scope, or verification and is an
  explicit, recorded policy decision — never a disguised fallback.
- Allocation may be PREFERENTIAL (ordered provider waterfall), BALANCED
  (distributed consumption across eligible subscription entitlements), or
  RESERVED (protect frontier capacity for high-leverage work). Subscription
  entitlements and their pressure are runtime facts, not API-credit balances.

GAFFER owns the semantic request — role, grade, domain, topology, tier,
deliberation, posture, composition — and the planner reasoning that DERIVES it:
shape, leverage, quality floor, dependency shape. Those planner inputs shape the
request; they are not fields on the wire. NORTH owns runtime allocation:
authenticated accounts, subscription envelopes and reserves, allocation, safe
substitution, resolved model, and decision/outcome telemetry. Provider model
names remain adapter facts. Neither layer silently rewrites the other's facts.
Raw provider support within Gaffer's deliberation vocabulary, Gaffer's calibrated
exact route, account entitlement, and current target availability are four
separate facts. No support entry, route, or dated provenance review implies any
of the other three.

ORCHESTRATION — topology is conceptually independent of function, grade,
domain requirements, tier, deliberation, and posture; templates enforce their
fixed pairings. Two tiers, hard depth cap. Delegation is exactly TWO tiers
deep; there is no third. Every spawn is one of:
- ORCHESTRATOR — normally the gaffer:director function, a fork whose contract
  is DECOMPOSE AND FAN OUT. It does NOT
  execute subtasks itself; its only tools of substance are read/analyze,
  spawn, steer, consume and reconcile verification evidence, run bounded
  non-authoring integration checks, and integrate the result. It never absorbs
  a worker's implementation or full local-probe burden. Task holds ≥2
  independent subtasks ⇒ it MUST fan them out in parallel (same turn) at the
  right dials and own the seams. Task is atomic ⇒ it redirects/restaffs to the
  appropriate worker; it never executes the piece itself.
- WORKER (TERMINAL) — owns its piece end-to-end and is FORBIDDEN to
  sub-delegate. When law 7 calls for a verifier fork, it is a sibling lane
  spawned by the orchestrator, never a worker child. A worker whose piece turns
  out to decompose ESCALATES (reports up); it never grows a third tier.
An orchestrator's exit is gated on RECONCILIATION: every child and its required
evidence are reconciled; the coordinator has driven the assembled result
end-to-end and recorded its bounded load-bearing spot-checks; and an
independently staffed, context-carrying verifier has reported a verdict, probe,
and observed result on the emergent whole outcome, before it reports done.
Exiting while a child still runs is a defect, not a completion.
The orchestrator is the ONLY tier that spawns; the worker is the ONLY tier
that executes. The router picks topology per task — decomposes ⇒ director;
atomic ⇒ worker.

Choose topology by dependency shape, not ceremony. This is an orchestrator
decision today: North records topology but does not synthesize the graph:
- ATOMIC + COHESIVE → one appropriately strong worker.
- DETERMINISTIC WORKFLOW → fixed stages; no reasoning director unless a stage
  itself has dynamic seams.
- PARALLEL BREADTH → director plus cheaper independently scoped workers.
- DYNAMIC DECOMPOSITION / HIGH-INTEGRATION SYNTHESIS → frontier director; route
  each worker independently rather than inheriting the director's tier.
- TIGHTLY COUPLED SEQUENTIAL WORK → one strong worker; its local objective bar
  is supported by worker evidence, with an independently staffed,
  context-carrying verifier report when verdict leverage warrants one.
  Splitting the implementation across shared-context workers is a coordination
  penalty, not parallelism.

STOP-RULE (the decompose/atomic call): break work down until further
subdivision no longer increases independence, certainty, or verifiability
more than it increases integration cost — parallelism is cheap, INTEGRATION
is the expensive part (every cut is paid for at reassembly). A unit is
terminal when it has a clear objective, bounded scope, known inputs/outputs,
and a verification path; splitting a terminal unit is coordination theater,
so a terminal unit is exactly a worker's atom. Shape the cut by the
ASYMMETRY — over-parallelize EXPLORATION, aggressively converge EXECUTION —
and note only DEPTH is capped: width and waves are NOT, so an orchestrator
may fan out sequentially (explore wave → reconcile → execute wave), getting
depth-like structure with zero new reduction seams. Decomposition is a
subGRAPH, not a tree — shared dependencies and cross-cutting constraints are
real edges, and those seams belong to the orchestrator. Convergence mirrors
decomposition: every node that decomposes work OWNS the reduction of that
work — child outputs return to the parent that spawned them (the node that
knows why each child exists), NEVER flat fan-in to a root synthesizer. At two
tiers this is concrete — the orchestrator IS the reducing parent, so done
means reconciled (seams resolved, load-bearing claims supported by evidence),
not "workers reported"; worker deliverables return UP, never sideways.
Director lifecycle:
receive → classify → redirect/restaff atomic work OR decompose composite work
(stop-rule decides) → spawn workers with LOCAL contracts (objective, scope, I/O, verification path
— what makes each child terminal) → await → reconcile into the parent result
→ return upward.

Why the cap — two tiers, not N with a depth budget: the audited failure was
UNDER-decomposition (1 sub-spawn across 15 spawns), never over-; an uncapped
depth invites the opposite, turtles all the way down. The stop-rule applied
to the doctrine itself settles it — extra tiers add reduction seams faster
than independence — so two tiers + waves + the escalation valve cover what
N-tier promises. Two tiers fixes both ends.

BRIEF DONE-BARS. Every brief an orchestrator fans out ends each step with a
checkable done-bar — a command + its expected output, or a grep + the hit
count it must return. A self-contained worker supplies evidence against its
bars; a verifier supplies an independently staffed report with its verdict,
probe, and observed result when law 7 requires one. A bare "done" is never
accepted.

<!-- gaffer:spawn-surfaces adapter=native (default; inject-doctrine.sh swaps this block per GAFFER_SPAWN_ADAPTER / dispatch=) -->
ADAPTER EXAMPLE (native spawn surface; invocation syntax in this fenced block
is not portable doctrine) — a squad member is an eight-field Gaffer request: role,
taskGrade, domainRequirements, topology, tier, reasoning, posture, and
composition. It is not a tool. Invoke it through whatever spawn surface your
harness gives you:
- native Agent tool available → subagent_type: 'gaffer:<role>'
- Workflow → agent(prompt, {agentType: 'gaffer:<role>'})
- a custom dispatch (SDK / MCP / a substrate that denies the native Agent
  tool) → spawn on that surface passing the role's pinned semantic tier (the
  SHAPES→TEMPLATES list above gives every pin), provider=`auto` unless overridden,
  + a role tag if the surface supports one. The prompt carries the applicable
  role, task-grade, topology, posture, comms, and exact-model calibration
  blocks regardless of surface. If the native Agent tool is denied, that is a routing
  instruction, not a wall — translate to the available surface, never abandon
  the squad pick or drop to an unrouted spawn.
<!-- /gaffer:spawn-surfaces -->

WORKFLOWS: these laws govern STAFFING every stage of any workflow. Use the
active adapter's fenced invocation example for its concrete syntax, and pin
the semantic route per stage:
- discovery/finder stages → gaffer:scout (economy), fan out wide
- deep-analysis/root-cause stages → gaffer:analyst (senior); fan out when
  independently traceable mechanisms benefit from separate evidence trails
  and later synthesis, not because a subsystem count was crossed
- build/transform stages → gaffer:implementer (standard); layer floor
  still applies per stage — a foundational target raises tier/reasoning while
  retaining its function; use gaffer:integrator only for integrate-shaped work
- artifact-review stages → gaffer:reviewer per supplied artifact/change
- verify stages → gaffer:verifier per claim, in parallel; start at senior/high
  and justify task-grade/tier/reasoning overrides up or down while preserving
  the task's quality floor
- rank two or more supplied alternatives → gaffer:judge (frontier)
Never let a stage inherit the session's model/effort implicitly (in a
top-tier session that silently runs every worker at top tier).

BESPOKE COMPOSITIONS — first-class, not an exception. The templates cover
common shapes; they are a standard library, not a roster limit. When the
domain deserves a purpose-built composition, AUTHOR ONE — the laws above still
bind it (pin tier, layer floor, shingle), and the blocks are parts,
not requirements: borrow the comms norms and only the exact concrete model's
calibrated delta when its provider catalog supplies one; an explicit `none`
never inherits a neighboring model's delta. Borrow role/posture when they fit,
then write the domain-specific remainder freely. Record an optional
`nearestPreset` only when a template is a useful reference, why a template was
not used,
and a structured contract: responsibility, deliverable, canonical capabilities,
mayDecide, mustEscalate, doneWhen, and report. A nearest template may seed
composition but never grants capabilities implicitly. Promotion-candidate defaults
false and nomination is explicit. Recurrence is evidence
for review whether nominated or not, never automatic promotion.
THE CAPABILITY VOCABULARY IS CLOSED. `fram.graph.edit` is its one
graph-authoring entry: it authorizes North-sealed FRAM code-graph mutation
through exactly add-def, set-body, rename-def, insert-after, and
replace-in-body. It grants no generic fact tools, no reads, no filesystem,
shell, web, or coordination authority, no arbitrary project MCP discovery, and
no caller-selected server. Only an explicit bespoke contract's canonical
capabilities may request it: no stock template ships it, a domain requirement
never grants it, and it is neither a ninth routing field nor an alias of
shell/filesystem authority.
Extension spec: docs/extending.md · assemble parts: the
compose skill · calibrate a delta for a new model: the elicit skill.
Templates are starting points, never the ceiling of possibility.
