# The method — why gaffer works this way

## Routing: shape, not difficulty

Tasks are routed by SHAPE — execute / implement / integrate / design /
research — because shape predicts reasoning demand and difficulty-as-felt
does not. A hard-but-local testable bug is still *implement*; a one-line
naming decision that shapes an API is *design*. Blast radius routes up;
importance alone never does.

Two empirical laws sharpen the routing:

- **Layer floor.** Foundational / library / architecture code never routes
  below the `senior` semantic tier, however mechanical the task looks. Lower
  tiers extend established patterns in well-trodden code; foundational work
  needs senior or frontier judgment even when the diff is small. The stack
  layer sets the floor, not surface difficulty.
- **Shingle law.** A provider catalog exposes only useful
  model×deliberation rungs. When one model's upper deliberation rung is
  dominated by the next capability tier's lower rung, the catalog omits the
  dominated pair. Routing therefore follows one continuous semantic ramp:
  harder work climbs capability rather than cranking deliberation against a
  low ceiling. Concrete, current examples are generated from the catalogs in
  [`docs/provider-matrix.md`](provider-matrix.md); they are evidence for the
  mapping, not shared doctrine.

## Payloads: consumer-calibrated deltas

Generic "best practices" prompts waste budget restating what a model
already does and dilute the items it actually needs. A gaffer delta is
built by **elicit → subtract → compile** (see the elicit skill):

1. Elicit the model's own introspective self-report, contamination-guarded.
2. Subtract everything it already self-reports — that needs no teaching.
3. Compile what remains in the model's own vocabulary: named limits become
   procedure, named tells become triggers, stale self-models get corrected,
   know-but-skip habits get written-checkpoint enforcers.

The self-reports that produced the shipped deltas are in
`docs/self-reports/` — they double as worked examples of step 1.

## What this does and doesn't transfer

Procedure transfers **mode-switches**: verification discipline (run, don't
predict), escalation tripwires (first failed fix → report, don't thrash),
reporting protocol (observed/inferred/assumed provenance). Procedure does
NOT transfer **capacity**: holding many constraints in parallel, noticing
the anomaly nobody flagged, distant-analogy reframes. That residue is why
the ramp exists — when a task needs capacity, route up the model tier; the
delta makes whichever tier you land on behave at its best.

## Authoring norms — briefs, payloads, skills

The discipline that makes a good spawn payload makes a good brief and a good
skill. Three levers, adapted from Matt Pocock's *writing great skills*
(github.com/mattpocock/skills, MIT).

**Done-bars.** Every step of a brief or skill ends on a *completion
criterion* — a checkable bar the worker judges itself against, never a vague
"understanding reached". State it as a command plus its expected output, or a
grep plus the hit count it must return. Two properties earn it: it is
*checkable* (the worker tells done from not-done) and, where it matters,
*exhaustive* ("every modified file accounted for", not "produce a change
list"). A bar defends against **premature completion** — attention slipping
to *being done* before the work is — so name that failure when the bar is
non-obvious: what a rushed worker skips, and what count catches it. A bare
"done" is never accepted; verification means checking the worker against its
bars.

**Leading words.** One strong pretrained concept anchors a whole region of
behaviour in the fewest tokens, by recruiting priors the model already holds
(*tight loop*, *red-capable*, *driven end-to-end*, *layer floor*). It works
twice: in the body it anchors execution — the worker reaches for the same
behaviour every time the word appears — and in the invocation it anchors
firing, the same word in prompts, docs, and code linking them to the intent.
Hunt restatements and collapse them into the word: a triad spelled out at
three sites is one token begging to be minted. The no-op test grades each
line — does it change behaviour versus the model's default? A line that does
not (*be thorough* when the model is already thorough-ish) dies or earns a
stronger word (*relentless*). Prefer positive phrasing: a prohibition names
the elephant into the frame, so state the target behaviour and the banned one
is never spoken.

**Information hierarchy.** Payload sits on three tiers, ranked by how
immediately every reader needs it: the inline step (in the brief or SKILL.md
body — what every path executes), the in-file reference (a rule or table
consulted on demand), and the linked file behind a named pointer (loaded only
when the pointer fires). **Progressive disclosure** is the move down the
ladder — push reference out of the top so it stays legible. Branching is the
test: inline what every path needs, disclose what only some paths reach. The
pointer's *wording*, not its target, decides whether the worker reaches the
material — a must-have behind a weak pointer is a variance bug; sharpen the
wording before inlining.
