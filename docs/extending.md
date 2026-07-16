# Extending gaffer — the standard-library contract

Gaffer is a stdlib, not a framework: the squad is precompiled convenience
for hot paths, the blocks are parts, and only the LAWS bind everything.
This is the specification for building on it.

## The contract — what makes an agent "gaffer-valid"

Three requirements, everything else is free:

1. **Routing pinned** — semantic tier is always explicit; provider may be
   explicit or `auto`. The selected provider adapter must resolve model AND
   effort/reasoning rather than inheriting them from a session.
2. **Comms norms respected** — compact reports, provenance marks
   (observed/inferred/assumed), not-done lists. Embed `docs/comms.md` or
   restate equivalent norms.
3. **Bounded authority** — the agent states what it may decide, what it
   must escalate, and what "done" is. Borrow a role block or write your
   own; an agent with unstated authority is unreviewable.

A bespoke domain-specific-ops agent that satisfies these is a full citizen — the
squad has no privileged status beyond being pre-built.

## Building a bespoke agent (the 10% the squad doesn't cover)

1. Name the axes: function/role, `taskGrade`, domain requirements, topology,
   semantic tier, deliberation, posture, and authority. Do not derive one by
   renaming another.
2. Borrow blocks that fit: comms (almost always), the model delta (almost
   always — it's calibration, not style), role/posture (when apt).
3. Write the domain-specific remainder freely — that's the point.
4. Record a bespoke contract: nearest preset, why it failed, the new role's
   responsibility/deliverable/authority/report, and a stable composition name.
5. Mark whether it is a promotion candidate. Recurrence adds evidence for a
   later human/orchestrator review; it never promotes itself.

## Promoting a recurring pattern into the library

- **New squad member**: add a role block to `docs/roles.md` (authority +
  deliverable + REPORT + REDIRECT), add a recipe to
  `scripts/build-agents.mjs`, rebuild (`node scripts/build-agents.mjs`),
  and describe it in README. Agent files are generated — never hand-write
  one.
- **New posture**: add a block to `docs/postures.md` (collision order +
  licensed + forbidden + done-bar).
- **New model delta**: run the elicit skill — self-report (contamination
  guarded) → subtract what the model already does → compile the residue in
  its own vocabulary. Save to `docs/deltas/<model>.md`, reference it in
  recipes.
- Promotion rule of thumb: review after at least two successful uses with
  comparable contracts. Repetition is evidence, not authorization: promotion
  is always an explicit change to the standard library.

## What NOT to do

- Don't fork the laws per agent — they encode cost/ceiling economics, not
  preference. If a law seems wrong, change the law (doctrine.md), which
  changes it everywhere.
- Don't hand-edit `agents/*.md` — compiled artifacts; `--check` will call
  it out.
- Don't add squad members speculatively — the library grows from recurring
  bespoke need, not from taxonomy completionism.

## Anatomy of an agent — the axes and where each is encoded

| Axis | Sets | Enforcement | In gaffer | At runtime |
|---|---|---|---|---|
| Routing | semantic tier + provider policy | hard at dispatch | recipe + provider catalog | spawn opts |
| Substrate | model + effort/reasoning | hard (API params) | provider catalog / compiled adapter | resolved spawn opts |
| Capability surface | tool set | hard (allowedTools) | recipe frontmatter `tools:` | spawn opts |
| Role | authority / deliverable / report / redirect | advisory | `docs/roles.md` | — |
| Task grade | work scope / autonomy / novelty prior | advisory | preset or bespoke contract | spawn metadata |
| Domain requirements | expertise + context required | advisory/hard when capability-gated | preset or bespoke contract | prompt / required capabilities |
| Topology | worker / verifier / orchestrator authority | host-enforced | doctrine + contract | spawn opts / host orchestration |
| Deliberation | reasoning budget independent of model capability | hard at dispatch | provider-neutral routing request | resolved spawn opts |
| Posture | value-collision ordering | advisory | `docs/postures.md` | — |
| Calibration | substrate-specific compensations | advisory | `docs/deltas/<model>.md` | — |
| Comms | universal output norms | advisory | `docs/comms.md` | host may add layers (register, wire formats) |
| Coordination membership | peer coexistence (presence, claims) | host-specific | NOT gaffer's | host harness |
| Laws | house constitution | advisory | `doctrine.md` (routing laws only) | host config |
| Hierarchy | escalation target | thin | REDIRECT lines in role blocks | host orchestration |
| Task + identity | the brief, agent id, state | — | never — arrives at spawn | prompt body / host state |

The compiler (`scripts/build-agents.mjs`) flattens the source-layer prompt and
adapter axes into agent files where the adapter format requires it. Host
coordination, hierarchy, and task identity remain runtime concerns: gaffer
stays portable precisely by not encoding them as provider-specific doctrine.
