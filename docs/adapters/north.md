SPAWN SURFACES (adapter: north) — a squad member is the eight-field
Gaffer request (role, taskGrade, domainRequirements, topology, tier, reasoning,
posture, composition), delivered on the North substrate. Provider and account
are North execution-envelope controls. Native Agent/Task/Workflow are DENIED
here (dispatch=north) — the harness still advertises gaffer:* + native agent
types, IGNORE that and go STRAIGHT to north; never let the advertised list bait a
native call (that is the recurring misfire).
- contract-v2 job → mcp__north__spawn {prompt, provider, tier, role, posture,
  taskGrade, domainRequirements, topology, reasoning, composition}
- fan-out → one mcp__north__spawn per lane in the SAME turn; observe at web :8088
- thread-driven → capture the thread, then mcp__north__dispatch (posture from claims)
Every canonical role passes North's open `role` string so its block is loaded
and the choice is observable. Bespoke role names are also allowed; their
authority/deliverable contract and explicit canonical capabilities ride in the
prompt. A nearest stock template may seed defaults but never grants capabilities.
Pin task grade+tier+posture.
Use provider=auto unless policy or the caller explicitly overrides it. These
fields form North's v2 staffing contract: North assembles the selected role,
task-grade, topology, posture, communication, and exact-model calibration
blocks; North gates each named domain requirement on explicit brief context,
relevant loaded repo docs/skills/capability, or escalation — metadata alone
never confers expertise. A domain requirement is a context/prompt gate:
it is not proof of arbitrary external-service authority. Deterministic Linear
synchronization uses the separate `north linear` surface; other external
operations still require an authenticated execution surface established before
dispatch. North intersects the stock template's provider-neutral capabilities
with the selected adapter's concrete tool surface. Orchestrator topology
activates director authority only on an adapter that can enforce it.
Capability enforcement is fail-closed. `shell.readonly` means a shell whose
working tree cannot be written, not merely a tool list without Edit/Write.
For managed Anthropic lanes North denies native Bash and exposes
`mcp__north-readonly-shell__run`: a bwrap-backed read-only host/checkout,
ephemeral `/tmp`, no network, and a cleared environment; unavailable
enforcement fails closed at preflight. For managed OpenAI lanes North launches
Codex with `--sandbox read-only` and marks North MCP required.
OpenAI orchestration is currently ineligible and fails pre-turn; with
`provider=auto`, North may select an eligible Anthropic target instead.
Claude plugin-agent frontmatter cannot encode a hard sandbox, so the generated
plugin adapter withholds Bash for `shell.readonly` stock templates rather
than claiming a boundary it cannot provide.
North presents composition provenance as `gaffer:<preset>`,
`gaffer:<preset>+override`, or `gaffer:bespoke:<id>`. A native session that
did not select Gaffer is `gaffer:not-selected`; only pre-contract records may
use `gaffer:legacy-debt`. Never collapse these states to `gaffer:none`.
Comparable successful bespoke recurrence is evidence for review, never
automatic promotion: responsibility, deliverable, capability/authority
boundary, done criteria, and report shape recur, and each use carries
done-criteria evidence.
North resolves tier+reasoning through a provider
catalog and records both requested and concrete routes. Routing defaults
(canonical stock templates — generated from the machine `presets` key, do not hand-edit):

  gaffer role         task grade      tier      reasoning  topology      posture   capabilities
  ------------------  --------------  --------  ---------  ------------  --------  -----------------------------------------------------------------
  executor            novice          economy   low        worker        deliver   filesystem.read,filesystem.search,filesystem.write,shell
  implementer         mid             standard  medium     worker        deliver   filesystem.read,filesystem.search,filesystem.write,shell
  integrator          senior          senior    high       worker        deliver   filesystem.read,filesystem.search,filesystem.write,shell
  designer            staff           frontier  xhigh      worker        explore   filesystem.read,filesystem.search,shell.readonly
  director            staff           frontier  xhigh      orchestrator  deliver   filesystem.read,filesystem.search,shell.readonly,web,coordination
  scout               junior          economy   low        worker        explore   filesystem.read,filesystem.search,shell.readonly,web
  analyst             senior          senior    high       worker        explore   filesystem.read,filesystem.search,shell.readonly,web
  verifier            senior          senior    high       worker        evaluate  filesystem.read,filesystem.search,shell.readonly
  judge               staff           frontier  xhigh      worker        evaluate  filesystem.read,filesystem.search,shell.readonly
  research-scientist  research-grade  frontier  xhigh      worker        explore   filesystem.read,filesystem.search,shell.readonly,web

ORCHESTRATION (two-tier law, see doctrine.md): the delegated fork is the
ORCHESTRATOR when the task decomposes (≥2 independent subtasks ⇒ MUST fan out
one mcp__north__spawn per subtask, same turn, then own the seams + verify) and
the terminal WORKER when it is atomic (⇒ MUST NOT sub-delegate). Verification
is a sibling lane owned by the orchestrator; no worker spawns any agent, so
depth caps at two.
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
