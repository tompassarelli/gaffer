SPAWN SURFACES (adapter: north) — a squad member is a (role, model, effort)
tuple, delivered on the north substrate. Native Agent/Task/Workflow are DENIED
here (dispatch=tern) — the harness still advertises gaffer:* + native agent
types, IGNORE that and go STRAIGHT to north; never let the advertised list bait a
native call (that is the recurring misfire).
- one job → mcp__north__spawn {prompt, model, effort, role, posture}, dials below
- fan-out → one mcp__north__spawn per lane in the SAME turn; observe at web :8088
- thread-driven → capture the thread, then mcp__north__dispatch (posture from claims)
The five praxis roles pass a north `role` block; the read-only tiers
(analyst/verifier/judge) have none → pin model+effort+posture, role rides in the
prompt. Dials (canonical — generated from RECIPES, do not hand-edit):

  gaffer role  model   effort  north role   posture
  -----------  ------  ------  -----------  -------
  executor     sonnet  low     executor     deliver
  implementer  sonnet  medium  implementer  deliver
  integrator   opus    high    integrator   deliver
  designer     opus    xhigh   designer     explore
  researcher   sonnet  low     researcher   explore
  analyst      opus    high    —            explore
  verifier     opus    high    —            explore
  judge        opus    high    —            explore

ORCHESTRATION (two-tier law, see doctrine.md): the delegated fork is the
ORCHESTRATOR when the task decomposes (≥2 independent subtasks ⇒ MUST fan out
one mcp__north__spawn per subtask, same turn, then own the seams + verify) and
the interned WORKER when it is atomic (⇒ MUST NOT sub-delegate, except ONE
verifier for its own deliverable). No worker spawns workers; depth caps at two.

FABLE WINDOW — TEMPORARY, auto-expiring 2026-07-13T00:00 Asia/Shanghai
(2026-07-12T16:00Z); a mechanical date gate, personal-delta, NOT a doctrine
fork. While OPEN: orchestrator forks route model=fable effort=high; workers
default to opus/xhigh and escalate to fable above opus/xhigh when opus spins.
After it closes: orchestrators fall back to opus/xhigh, workers to the standard
ramp — with zero code change. The gate lives in code (cli/agents-cli.clj, sdk
fable-window.ts + ladder.ts); this note only documents it.

If a native call slips through, the agent-spawn-guard hook denies with the exact
mcp__north__spawn call pre-resolved for that role — one-paste recovery. A native
denial is a routing instruction, never a wall: translate, never abandon the
squad pick or drop to an unrouted spawn.
