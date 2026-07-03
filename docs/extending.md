# Extending gaffer — the standard-library contract

Gaffer is a stdlib, not a framework: the squad is precompiled convenience
for hot paths, the blocks are parts, and only the LAWS bind everything.
This is the specification for building on it.

## The contract — what makes an agent "gaffer-valid"

Three requirements, everything else is free:

1. **Both dials pinned** — model AND effort, chosen per the doctrine's ramp
   and laws (layer floor, shingle law). Never inherited implicitly from the
   session.
2. **Comms norms respected** — compact reports, provenance marks
   (observed/inferred/assumed), not-done lists. Embed `docs/comms.md` or
   restate equivalent norms.
3. **Bounded authority** — the agent states what it may decide, what it
   must escalate, and what "done" is. Borrow a role block or write your
   own; an agent with unstated authority is unreviewable.

A bespoke domain-specific-ops agent that satisfies these is a full citizen — the
squad has no privileged status beyond being pre-built.

## Building a bespoke agent (the 10% the squad doesn't cover)

1. Route first: shape + laws give you model/effort even for a novel agent.
2. Borrow blocks that fit: comms (almost always), the model delta (almost
   always — it's calibration, not style), role/posture (when apt).
3. Write the domain-specific remainder freely — that's the point.
4. Say why bespoke beat the preset, in one line. If the same bespoke shape
   recurs, promote it (below).

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
- Promotion rule of thumb: build bespoke twice before promoting — a
  pattern used once is not a pattern.

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
| Substrate | model + effort | hard (API params) | recipe frontmatter | spawn opts |
| Capability surface | tool set | hard (allowedTools) | recipe frontmatter `tools:` | spawn opts |
| Role | authority / deliverable / report / redirect | advisory | `docs/roles.md` | — |
| Posture | value-collision ordering | advisory | `docs/postures.md` | — |
| Calibration | substrate-specific compensations | advisory | `docs/deltas/<model>.md` | — |
| Comms | universal output norms | advisory | `docs/comms.md` | host may add layers (register, wire formats) |
| Coordination membership | peer coexistence (presence, claims) | host-specific | NOT gaffer's | host harness |
| Laws | house constitution | advisory | `doctrine.md` (routing laws only) | host config |
| Hierarchy | escalation target, spawn rights | thin | REDIRECT lines in role blocks | host orchestration |
| Task + identity | the brief, agent id, state | — | never — arrives at spawn | prompt body / host state |

The compiler (`scripts/build-agents.mjs`) flattens the first six axes into
agent files. The last four are deliberately runtime concerns: gaffer stays
portable precisely by NOT encoding host coordination, hierarchy, or
identity.
