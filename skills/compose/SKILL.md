---
name: compose
description: Assemble a custom provider-neutral gaffer payload across independent role, task-grade, domain, topology, posture, semantic-tier, deliberation, comms, and model-delta axes when no preset fits.
---

# Compose a custom spawn payload

The preset agents cover the common cells. For anything else, assemble the
payload by hand from this plugin's blocks and paste it into the spawn
prompt (or Workflow `agent()` prompt).

## Procedure

1. **Classify the independent axes** before selecting blocks:
   - Role/function — responsibility and deliverable: executor, implementer,
     integrator, designer, scout, analyst, verifier, judge, or
     research-scientist.
   - `taskGrade` — novice, junior, mid, senior, staff, principal, or
     research-grade.
   - Domain requirements — expertise and context the brief must provide.
   - Topology — worker, verifier, or orchestrator; never inferred from grade.
   - Semantic tier — economy, standard, senior, or frontier capability floor.
   - Deliberation — low, medium, high, xhigh, or max reasoning budget where
     supported by the selected provider tier.
   Done: each axis is stated explicitly; no role name doubles as a grade,
   model, or manager permission.
2. **Pick the four blocks** (all under this skill's plugin root):
   - Role — `docs/roles.md`: executor · implementer · integrator ·
     designer · scout · analyst · verifier · judge · research-scientist. Sets authority,
     deliverable, report format, redirects.
   - Posture — `docs/postures.md`: explore · deliver · preserve. Sets the
     collision priority order (what yields when values conflict).
   - Comms — `docs/comms.md` (universal block): output norms every report
     follows regardless of role.
   - Model delta — `docs/deltas/<model>.md`: per-model prompt overrides.
     Pick by the model the spawn will actually run on.
   Done: all four block paths named (role, posture, comms, delta), none TBD.
3. **Pin provider-neutral routing**: semantic tier and deliberation are
   explicit; provider defaults to `auto`. The selected adapter resolves the
   concrete model and effort/reasoning. Remember the layer floor:
   foundational/library/architecture work never runs below senior tier.
   Done: tier + deliberation + provider are literal spawn values, none inherited.
4. **Paste** the blocks above the task text. Trim the delta before trimming
   role/posture.
   Done: `wc -l` of the assembled payload ≤ 60, every block above the task.
5. If no block fits, write a bespoke role contract and record: nearest preset,
   why it failed, responsibility/deliverable/authority/report contract, and a
   stable composition name. `--promotion-candidate` is an explicit nomination
   and defaults false. Mark it only when useful;
   recurrence is logged evidence and never auto-promotes the role.
   Done: the bespoke reason and contract are present, with promotion status.

## Workflow example

```js
const payload = roleBlock + postureBlock + deltaBlock;
await spawn(`${payload}\n\nTASK: ${task}`, {
  provider: 'auto', tier: 'standard', reasoning: 'medium',
  role: 'implementer', taskGrade: 'mid', topology: 'worker',
  domainRequirements: ['repository conventions'],
  composition: {kind: 'preset', id: 'implementer'}
})
```
