SPAWN SURFACES (adapter: north) — a squad member is a semantic routing
tuple, delivered on the north substrate. Native Agent/Task/Workflow are DENIED
here (dispatch=north) — the harness still advertises gaffer:* + native agent
types, IGNORE that and go STRAIGHT to north; never let the advertised list bait a
native call (that is the recurring misfire).
- contract-v2 job → mcp__north__spawn {prompt, provider, tier, role, posture}
- current/legacy North bridge → resolve the catalog first, then
  mcp__north__spawn {prompt, model, effort, role, posture}; Claude resolutions
  are included below so existing North behavior is unchanged
- fan-out → one mcp__north__spawn per lane in the SAME turn; observe at web :8088
- thread-driven → capture the thread, then mcp__north__dispatch (posture from claims)
The five praxis roles pass a north `role` block; the read-only roles
(analyst/verifier/judge) have none → pin tier+posture, role rides in the
prompt. Use provider=auto unless policy or the caller explicitly overrides it.
Contract v2 makes North resolve tier through a provider catalog and record the
concrete model and reasoning/effort. Until North advertises v2, use its legacy
shape and resolve before the call. Routing (canonical — generated from RECIPES,
do not hand-edit):

  gaffer role  tier      Claude bridge  north role   posture
  -----------  --------  -------------  -----------  -------
  executor     economy   sonnet/low     executor     deliver
  implementer  standard  sonnet/medium  implementer  deliver
  integrator   senior    opus/high      integrator   deliver
  designer     frontier  opus/xhigh     designer     explore
  researcher   economy   sonnet/low     researcher   explore
  analyst      senior    opus/high      —            explore
  verifier     senior    opus/high      —            explore
  judge        senior    opus/high      —            explore

ORCHESTRATION (two-tier law, see doctrine.md): the delegated fork is the
ORCHESTRATOR when the task decomposes (≥2 independent subtasks ⇒ MUST fan out
one mcp__north__spawn per subtask, same turn, then own the seams + verify) and
the interned WORKER when it is atomic (⇒ MUST NOT sub-delegate, except ONE
verifier for its own deliverable). No worker spawns workers; depth caps at two.
STOP-RULE: subdivide only while it buys more independence, certainty, or
verifiability than integration cost; a unit with a clear objective, bounded
scope, known I/O, and a verification path is TERMINAL (a worker's atom), so
each sub-spawn carries that LOCAL contract. The orchestrator OWNS REDUCTION —
child outputs reconcile in it, never flat fan-in; deliverables return UP,
never sideways. Over-parallelize EXPLORATION, converge EXECUTION; width and
sequential waves (explore → reconcile → execute) are unbounded, depth stays two.

If a native call slips through, the agent-spawn-guard hook denies with the exact
mcp__north__spawn call pre-resolved for that role and tier — one-paste recovery. A native
denial is a routing instruction, never a wall: translate, never abandon the
squad pick or drop to an unrouted spawn.
