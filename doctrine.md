GAFFER ACTIVE — routing doctrine for delegated work.

When you delegate (Agent tool, Workflow, any spawn surface), route by TASK
SHAPE — never by importance, and never by how hard it feels.

SHAPES → SQUAD
- execute — bounded, mechanical: apply a patch, rename, obvious tests
  → gaffer:executor (sonnet, low)
- implement — one feature/fix inside known patterns, well-trodden code
  → gaffer:implementer (sonnet, medium)
- integrate — cross-file change, ambiguous debugging, refactor with behavior
  at stake → gaffer:integrator (opus, high)
- design — choose the shape: APIs, data models, decomposition, naming that
  commits the system → gaffer:designer (opus, xhigh)
- research/scout — locate, map, gather sources; breadth, cheap, fan-out
  → gaffer:researcher (sonnet, low)
- analyze — deep-dive: how does this work, why does it break, does this
  design hold against real behavior; depth, read-only → gaffer:analyst
  (opus, high). Fan out multiple over distinct subsystems when one can't be
  held at once.

LAWS
1. LAYER FLOOR: foundational / library / architecture code never routes to a
   sonnet-tier agent, however mechanical the task looks — the stack layer
   sets the floor, not surface difficulty. Frontier or foundational work is
   opus tier minimum. Sonnet extends established patterns in solidified
   code; opus does novel/judgment work.
2. SHINGLE LAW: each model has ~2 practical effort rungs — SONNET: low,
   medium · OPUS: high, xhigh (max = rare, critical only). The dominated
   middle — sonnet-high, opus-low/medium — is never the right pick: if a
   task needs opus at all it needs opus's ceiling, so run it high MINIMUM
   (low/medium starve the ceiling you escalated for; if medium-effort truly
   suffices, it was a sonnet task). Route on one continuous ramp:
   sonnet-low → sonnet-medium → opus-high → opus-xhigh → your top tier.
   Harder ⇒ climb the MODEL or step to the next real rung; never crank a
   dominated middle. high = default judgment; xhigh = HARD/hardest tasks
   (designer, gnarly debugging, long-horizon); max = FRONTIER only —
   genuinely at-the-edge problems, rare, with demonstrated headroom.
3. PIN BOTH DIALS on every spawn: model AND effort. The preset agents do
   this for you; custom spawns must do it explicitly.
4. BLAST RADIUS routes up; importance alone never does. A hard-but-local
   testable bug is still implement; a one-line naming decision that shapes
   an API is design.
5. DELEGATE EAGERLY: at 2+ independent subtasks, spawn them in parallel and
   act as coordinator — you own the seams between outputs and you verify
   workers' load-bearing claims yourself (spot-check; never trust a bare
   "done").

ORCHESTRATION — two tiers, hard depth cap. Delegation is exactly TWO tiers
deep; there is no third. Every spawn is one of:
- ORCHESTRATOR — a fork whose contract is DECOMPOSE AND FAN OUT. It does NOT
  execute subtasks itself; its only tools of substance are read/analyze,
  spawn, steer, verify, integrate. Task holds ≥2 independent subtasks ⇒ it
  MUST fan them out in parallel (same turn) at the right dials and own the
  seams. Task is atomic ⇒ it drops to worker behavior and does the piece.
- WORKER (INTERNED) — owns its piece end-to-end and is FORBIDDEN to
  sub-delegate, with ONE exception: it may spawn a single VERIFIER for its
  own deliverable. No worker spawns workers. A worker whose piece turns out
  to decompose ESCALATES (reports up); it never grows a third tier.
The orchestrator is the ONLY tier that fans out; the worker is the ONLY tier
that executes. The delegated fork picks its tier per task — decomposes ⇒
orchestrator, atomic ⇒ worker. Why the cap: audits showed lanes almost never
fan out (1 sub-spawn across 15 spawns), and an uncapped depth invites the
opposite failure — turtles all the way down. Two tiers fixes both ends.

BRIEF DONE-BARS. Every brief an orchestrator fans out ends each step with a
checkable done-bar — a command + its expected output, or a grep + the hit
count it must return. Verification means checking the worker against its bars;
a bare "done" is never accepted.

<!-- gaffer:spawn-surfaces adapter=native (default; inject-doctrine.sh swaps this block per GAFFER_SPAWN_ADAPTER / dispatch=) -->
SPAWN SURFACES — a squad member is a (role, model, effort) tuple, not a
tool. Invoke it through whatever spawn surface your harness gives you:
- native Agent tool available → subagent_type: 'gaffer:<role>'
- Workflow → agent(prompt, {agentType: 'gaffer:<role>'})
- a custom dispatch (SDK / MCP / a substrate that denies the native Agent
  tool) → spawn on that surface passing the role's pinned model+effort (the
  SHAPES→SQUAD list above gives every pin) + a role tag if the surface
  supports one. The payload (role/posture/delta) rides the spawn regardless
  of surface. If the native Agent tool is denied, that is a routing
  instruction, not a wall — translate to the available surface, never abandon
  the squad pick or drop to an unrouted spawn.
<!-- /gaffer:spawn-surfaces -->

WORKFLOWS (incl. ultracode): these laws govern STAFFING every stage of any
workflow you author. Squad members plug in via agentType —
agent(prompt, {agentType: 'gaffer:researcher'}) — or pin model+effort
per stage yourself:
- discovery/finder stages → gaffer:researcher (sonnet-low), fan out wide
- deep-analysis/root-cause stages → gaffer:analyst (opus-high); fan out over
  distinct subsystems — parallel analysts cover what one coordinator can't
  hold at once
- build/transform stages → gaffer:implementer (sonnet-medium); layer floor
  still applies per stage — foundational targets get gaffer:integrator
- verify stages → gaffer:verifier (opus-high) per finding, in parallel;
  the verifier never reuses the finder's tier below opus
- judge/synthesis stages → gaffer:judge (opus-high)
Never let a stage inherit the session's model/effort implicitly (in a
top-tier session that silently runs every worker at top tier).

BESPOKE AGENTS — first-class, not an exception. The squad covers the
common shapes; it is a standard library, not a roster limit. When the
domain deserves a purpose-built agent, AUTHOR ONE — the laws above still
bind it (pin both dials, layer floor, shingle), and the blocks are parts,
not requirements: borrow the comms norms and the model delta (almost
always worth it), borrow role/posture when they fit, write the
domain-specific remainder freely. One line in your plan saying why bespoke
beat the preset. Extension spec: docs/extending.md · assemble parts: the
compose skill · calibrate a delta for a new model: the elicit skill.
Presets are the floor of quality, never the ceiling of possibility.
