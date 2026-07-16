---
name: compose
description: Assemble a provider-neutral bespoke composition across independent role, task-grade, domain, topology, posture, semantic-tier, deliberation, comms, and model-delta axes when no preset fits.
---

# Compose a bespoke composition

The preset agents cover the common cells. For anything else, assemble the
payload by hand from this plugin's blocks and paste it into the spawn
prompt (or Workflow `agent()` prompt).

## Procedure

1. **Classify the independent axes** before selecting blocks:
   - Role/function — responsibility and deliverable: executor, implementer,
     integrator, designer, director, scout, analyst, verifier, judge, or
     research-scientist.
   - `taskGrade` — novice, junior, mid, senior, staff, principal, or
     research-grade.
   - Domain requirements — expertise and context the brief must provide.
   - Topology — worker or orchestrator (coordination authority); verifier and
     judge are worker-topology roles, never a topology; never inferred from grade.
   - Semantic tier — economy, standard, senior, or frontier capability floor.
   - Deliberation — low, medium, high, xhigh, or max reasoning budget where
     supported by the selected provider tier.
   Done: each axis is stated explicitly; no role name doubles as a grade,
   model, or manager permission.
2. **Pick the prompt blocks** (all under this skill's plugin root):
   - Role — `docs/roles.md`: executor · implementer · integrator ·
     designer · director · scout · analyst · verifier · judge · research-scientist. Sets authority,
     deliverable, report format, redirects.
   - Task grade — `docs/task-grades.md`: novice through research-grade. Sets
     the work-contract prior without impersonating a model tier.
   - Topology — `docs/topologies.md`: worker · orchestrator. Sets spawn and
     reduction authority without contaminating posture.
   - Posture — `docs/postures.md`: explore · deliver · preserve. Sets the
     collision priority order (what yields when values conflict).
   - Comms — `docs/comms.md` (universal block): output norms every report
     follows regardless of role.
   - Model delta — `docs/deltas/<model>.md`: include only when the selected
     provider adapter ships a calibrated delta for the concrete model. Absence
     is explicit, not permission to borrow a different provider's delta.
   Done: role, grade, topology, posture, and comms paths are named; the exact
   concrete model's delta path is named or explicitly `none` for this adapter.
3. **Pin provider-neutral routing**: semantic tier and deliberation are
   explicit. Provider/account selection is a separate harness-envelope concern;
   North defaults that envelope to `provider: auto`. The selected adapter
   resolves the concrete model and effort/reasoning. Remember the layer floor:
   foundational/library/architecture work never runs below senior tier.
   Done: tier + deliberation are literal Gaffer request values; provider is a
   literal North envelope value (normally `auto`), never a ninth Gaffer field.
4. **Paste** the blocks above the task text. Trim the delta before trimming
   role/posture.
   Done: `wc -l` of the assembled payload ≤ 60, every block above the task.
5. If no block fits, write a bespoke role contract and record: an optional
   nearest preset when useful, why a standard recipe was not used,
   responsibility, deliverable, canonical `capabilities[]`, `mayDecide[]`, `mustEscalate[]`,
   `doneWhen[]`, report contract, and a stable composition name. Record either
   `promotionCandidate` status (false by default; `--promotion-candidate`
   nominates explicitly);
   recurrence is logged evidence and never auto-promotes the role.
   Done: the bespoke reason and contract are present, with promotion status.

## Workflow example

```js
const prompt = roleBlock + gradeBlock + topologyBlock + postureBlock +
  commsBlock + (deltaBlock ?? '');
await spawn(`${prompt}\n\nTASK: ${task}`, {
  provider: 'auto', tier: 'standard', reasoning: 'medium',
  role: 'implementer', taskGrade: 'mid', topology: 'worker',
  domainRequirements: ['repository conventions'],
  composition: {kind: 'preset', id: 'implementer', overrides: []}
})
```
