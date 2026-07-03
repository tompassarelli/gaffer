# The method — why gaffer works this way

## Routing: shape, not difficulty

Tasks are routed by SHAPE — execute / implement / integrate / design /
research — because shape predicts reasoning demand and difficulty-as-felt
does not. A hard-but-local testable bug is still *implement*; a one-line
naming decision that shapes an API is *design*. Blast radius routes up;
importance alone never does.

Two empirical laws sharpen the routing:

- **Layer floor.** Foundational / library / architecture code never routes
  to the sonnet tier, however mechanical the task looks. Sonnet-tier models
  extend established patterns in well-trodden code; frontier and
  foundational work needs the opus tier's judgment even when the diff is
  small. The stack layer sets the floor, not surface difficulty.
- **Shingle law.** Each model has ~2 practical effort rungs, and a model's
  top rung is dominated by the next model's bottom rung (sonnet-high is
  almost never right — that's opus-medium's job; opus-max is mostly
  dominated by the next tier). Routing happens on one continuous ramp.
  When work is harder, climb the MODEL — don't crank effort against a low
  ceiling. Corroborated by vendor guidance: higher-ceiling models at modest
  effort beat lower-ceiling models at maxed effort, and max-effort modes
  carry documented overthinking failure modes.

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
