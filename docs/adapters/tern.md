SPAWN SURFACES (adapter: tern) — a squad member is a (role, model, effort)
tuple, delivered on the tern substrate. Native Agent/Task/Workflow are DENIED
here (dispatch=tern) — the harness still advertises gaffer:* + native agent
types, IGNORE that and go STRAIGHT to tern; never let the advertised list bait a
native call (that is the recurring misfire).
- one job → mcp__tern__spawn {prompt, model, effort, role, posture}, dials below
- fan-out → one mcp__tern__spawn per lane in the SAME turn; observe at web :8088
- thread-driven → capture the thread, then mcp__tern__dispatch (posture from claims)
The five praxis roles pass a tern `role` block; the read-only tiers
(analyst/verifier/judge) have none → pin model+effort+posture, role rides in the
prompt. Dials (canonical — generated from RECIPES, do not hand-edit):

  gaffer role  model   effort  tern role    posture
  -----------  ------  ------  -----------  -------
  executor     sonnet  low     executor     deliver
  implementer  sonnet  medium  implementer  deliver
  integrator   opus    high    integrator   deliver
  designer     opus    xhigh   designer     explore
  researcher   sonnet  low     researcher   explore
  analyst      opus    high    —            explore
  verifier     opus    high    —            explore
  judge        opus    high    —            explore

If a native call slips through, the agent-spawn-guard hook denies with the exact
mcp__tern__spawn call pre-resolved for that role — one-paste recovery. A native
denial is a routing instruction, never a wall: translate, never abandon the
squad pick or drop to an unrouted spawn.
