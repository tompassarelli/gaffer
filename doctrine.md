GAFFER ACTIVE — routing doctrine for delegated work.

When you delegate (Agent tool, Workflow, any spawn surface), route by TASK
SHAPE — never by importance, and never by how hard it feels.

The squad is a STANDARD LIBRARY, not a roster limit — shape triage proposes
a preset, while the routing decision keeps its axes explicit: FUNCTION/ROLE,
TASK GRADE, DOMAIN REQUIREMENTS, TOPOLOGY, SEMANTIC TIER, and DELIBERATION.
No preset fits ⇒ author a bespoke agent (BESPOKE
AGENTS, bottom); contorting the task to a preset is the misfire, never
writing your own.

ORTHOGONAL AXES — never smuggle one decision inside another:
- FUNCTION/ROLE names the responsibility and deliverable: scout, engineer,
  analyst, verifier, designer, research-scientist, and so on.
- TASK GRADE names the prior for the work itself: novice, junior, mid, senior,
  staff, principal, or research-grade. Grade is scope, autonomy, novelty, and
  integration responsibility — not a model name and not a worker identity.
- DOMAIN REQUIREMENTS name expertise/context the worker must receive.
- TOPOLOGY names worker or orchestrator coordination authority. Director is
  the canonical orchestrator role.
  verifier and judge are worker-topology ROLES, not a third topology.
- SEMANTIC TIER names the required model capability floor: economy, standard,
  senior, or frontier. Provider catalogs resolve it to a runtime.
- DELIBERATION names the reasoning budget independently of capability: low,
  medium, high, xhigh, or max where the selected provider supports it.
Presets fill common combinations of these axes. They are defaults, not types
and not limits; every changed preset axis is listed in `overrides[]` with one
`overrideReason`. An unchanged preset carries neither a fake override nor a
reason.

SHAPES → SQUAD (semantic tier; provider adapters resolve concrete models)
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
  (senior). Fan out multiple over distinct subsystems when one can't be
  held at once.
- research-science — novel hypothesis formation, experiment design, and work
  whose result or method is not already known → gaffer:research-scientist
  (frontier; research-grade). This is not ordinary source gathering.

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
3. PIN THE TIER on every spawn. Provider may be explicit or `auto`; the
   provider adapter MUST resolve and record concrete model + effort/reasoning.
   Never silently inherit the session model.
4. BLAST RADIUS routes up; importance alone never does. A hard-but-local
   testable bug is still implement; a one-line naming decision that shapes
   an API is design.
5. DELEGATE EAGERLY: at 2+ independent subtasks, spawn them in parallel and
   act as coordinator — you own the seams between outputs and you verify
   workers' load-bearing claims yourself (spot-check; never trust a bare
   "done").

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
  optional verification before violating the quality floor. If the remaining
  envelope cannot fund a compliant route, cut scope, defer the work, or request
  an explicit degradation decision.
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

ORCHESTRATION — topology is independent of function, grade, tier, and
deliberation. Two tiers, hard depth cap. Delegation is exactly TWO tiers
deep; there is no third. Every spawn is one of:
- ORCHESTRATOR — normally the gaffer:director function, a fork whose contract
  is DECOMPOSE AND FAN OUT. It does NOT
  execute subtasks itself; its only tools of substance are read/analyze,
  spawn, steer, verify, integrate. Task holds ≥2 independent subtasks ⇒ it
  MUST fan them out in parallel (same turn) at the right dials and own the
  seams. Task is atomic ⇒ it redirects/restaffs to the appropriate worker;
  it never executes the piece itself.
- WORKER (INTERNED) — owns its piece end-to-end and is FORBIDDEN to
  sub-delegate. Verification is a sibling lane spawned by the orchestrator,
  never a worker child. A worker whose piece turns out
  to decompose ESCALATES (reports up); it never grows a third tier.
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
- TIGHTLY COUPLED SEQUENTIAL WORK → one strong worker, optionally followed by
  an independent verifier. Splitting shared context into many workers is a
  coordination penalty, not parallelism.

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
means reconciled (seams resolved, load-bearing claims verified), not "workers
reported"; worker deliverables return UP, never sideways. Director lifecycle:
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
count it must return. Verification means checking the worker against its bars;
a bare "done" is never accepted.

<!-- gaffer:spawn-surfaces adapter=native (default; inject-doctrine.sh swaps this block per GAFFER_SPAWN_ADAPTER / dispatch=) -->
SPAWN SURFACES — a squad member is an eight-field Gaffer request: role,
taskGrade, domainRequirements, topology, tier, reasoning, posture, and
composition. It is not a tool. Invoke it through whatever spawn surface your
harness gives you:
- native Agent tool available → subagent_type: 'gaffer:<role>'
- Workflow → agent(prompt, {agentType: 'gaffer:<role>'})
- a custom dispatch (SDK / MCP / a substrate that denies the native Agent
  tool) → spawn on that surface passing the role's pinned semantic tier (the
  SHAPES→SQUAD list above gives every pin), provider=`auto` unless overridden,
  + a role tag if the surface supports one. The prompt carries the applicable
  role, task-grade, topology, posture, comms, and exact-model calibration
  blocks regardless of surface. If the native Agent tool is denied, that is a routing
  instruction, not a wall — translate to the available surface, never abandon
  the squad pick or drop to an unrouted spawn.
<!-- /gaffer:spawn-surfaces -->

WORKFLOWS (incl. ultracode): these laws govern STAFFING every stage of any
workflow you author. Squad members plug in via agentType —
agent(prompt, {agentType: 'gaffer:scout'}) — or pin tier (and let the
provider adapter resolve model+effort/reasoning)
per stage yourself:
- discovery/finder stages → gaffer:scout (economy), fan out wide
- deep-analysis/root-cause stages → gaffer:analyst (senior); fan out over
  distinct subsystems — parallel analysts cover what one coordinator can't
  hold at once
- build/transform stages → gaffer:implementer (standard); layer floor
  still applies per stage — foundational targets get gaffer:integrator
- verify stages → gaffer:verifier (senior) per finding, in parallel;
  the verifier never reuses a finder tier below senior
- high-leverage judge/synthesis stages → gaffer:judge (frontier)
Never let a stage inherit the session's model/effort implicitly (in a
top-tier session that silently runs every worker at top tier).

BESPOKE AGENTS — first-class, not an exception. The squad covers the
common shapes; it is a standard library, not a roster limit. When the
domain deserves a purpose-built agent, AUTHOR ONE — the laws above still
bind it (pin tier, layer floor, shingle), and the blocks are parts,
not requirements: borrow the comms norms and only the exact concrete model's
calibrated delta when its provider catalog supplies one; an explicit `none`
never inherits a neighboring model's delta. Borrow role/posture when they fit,
then write the domain-specific remainder freely. Record an optional nearest
preset only when it is a useful reference, why a standard preset was not used,
and a structured contract: responsibility, deliverable, canonical capabilities,
mayDecide, mustEscalate, doneWhen, and report. A nearest preset may seed
composition but never grants capabilities implicitly. Promotion-candidate defaults
false and nomination is explicit. Recurrence is evidence
for review whether nominated or not, never automatic promotion.
Extension spec: docs/extending.md · assemble parts: the
compose skill · calibrate a delta for a new model: the elicit skill.
Presets are the floor of quality, never the ceiling of possibility.
