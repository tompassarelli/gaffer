# gaffer

*Every squad needs a gaffer.*

Which model? What effort? A preset subagent or a bespoke one? A one-off
spawn or a staffed workflow? **Let the gaffer figure it out.**

A Claude Code plugin that routes every piece of delegated work: the right
model, at the right effort, with prompting calibrated to that model —
whether it's a single subagent or a multi-stage workflow.

Install it and your sessions gain:

1. **A routing doctrine** (injected at session start): classify each
   delegated task by *shape* — execute / implement / integrate / design /
   research — and route it on one continuous model×effort ramp, governed by
   two laws most setups get wrong:
   - **Layer floor** — foundational / library / architecture code never
     goes to the cheap tier, however mechanical the task looks.
   - **Shingle law** — each model has ~2 useful effort rungs, and a model's
     top rung is dominated by the next model's bottom rung. Harder ⇒ climb
     the model, don't crank effort against a low ceiling.
2. **A pre-tuned squad** — five agents, each with model + effort pinned and
   a *consumer-calibrated prompt payload* baked in:

   | Agent | Model / effort | Shape it plays |
   |---|---|---|
   | `gaffer:executor` | sonnet / low | bounded mechanical changes |
   | `gaffer:implementer` | sonnet / medium | one feature/fix inside known patterns |
   | `gaffer:integrator` | opus / high | cross-file work, ambiguous debugging, foundational layers |
   | `gaffer:designer` | opus / xhigh | choosing shapes: APIs, data models, decomposition (decision-only, read-only tools) |
   | `gaffer:researcher` | sonnet / low | mapping territory, answering with provenance |
   | `gaffer:verifier` | opus / medium | adversarial verification of one claim (workflow verify stages, fan-out) |
   | `gaffer:judge` | opus / high | scoring competing alternatives; single make-or-break verdicts |

   The squad also staffs **workflow stages** (including ultracode-authored
   workflows): `agent(prompt, {agentType: 'gaffer:verifier'})` — the
   doctrine tells the session which member plays which stage, and stops
   workers from silently inheriting a top-tier session's model.

3. **Two skills**:
   - `compose` — assemble a custom payload for spawns the presets don't
     cover (Workflow calls, unusual pairings).
   - `elicit` — calibrate a payload for a model gaffer doesn't know yet,
     using the method below.

## The payload method (the interesting part)

The agent payloads are **not** generic best-practice prompts. Each is built
by **elicit → subtract → compile**: have the model write an introspective
self-report of how it actually works (contamination-guarded), *subtract
everything it already does natively* — restating it wastes budget and
dilutes attention — and compile only the remainder, phrased in the model's
own vocabulary: its named limits become procedure, its named tells become
triggers, its stale self-models get corrected.

Example finds from the shipped self-reports (in `docs/self-reports/`):
Sonnet self-reports "I get quieter when I'm less sure" — so its delta
inverts that ("uncertainty gets MORE words, not fewer"). It also
self-reports "I can't run code" — false inside Claude Code, so its delta
opens with *run, don't predict*. Opus recites the engineering canon
flawlessly, so its delta never restates canon and is almost entirely
meta-cognition: fluency alarms, momentum checks, escalation tripwires.

Full rationale: [`docs/method.md`](docs/method.md).

## Install

```
/plugin marketplace add tompassarelli/gaffer
/plugin install gaffer@gaffer
```

Start a new session — you'll see `GAFFER ACTIVE` in the session context.
Then delegate normally: the session routes by shape, or spawn squad members
directly via the Agent tool (`subagent_type: "gaffer:implementer"`).

## Architecture note

`agents/*.md` are **generated** — compiled from the source blocks in
`docs/` (roles, postures, comms, deltas) by `scripts/build-agents.mjs`.
The axes stay sharp at the source layer; the script does the flattening the
plugin format requires. Edit blocks, rebuild (`node
scripts/build-agents.mjs`), never hand-edit agent files (`--check` verifies
freshness).

## Tuning

- Different top tier available (e.g. a model above opus)? The ramp extends
  naturally — run `elicit` to calibrate a delta for it.
- The squad is a **standard library, not a roster limit**: bespoke
  purpose-built agents are first-class — the laws still bind them, the
  blocks are borrowable parts, and recurring bespoke patterns get promoted
  into the library. Full contract: [`docs/extending.md`](docs/extending.md).

## Related work

- [tzachbon/claude-model-router-hook](https://github.com/tzachbon/claude-model-router-hook) —
  same delivery mechanism (SessionStart-injected routing rules), keyword-based
  three-model tiers. Gaffer adds the shape taxonomy, effort as a first-class
  dial, and the layer-floor / shingle laws.
- [wshobson/agents](https://github.com/wshobson/agents) — model pinning at
  scale (194 domain agents). No effort pinning; domain taxonomy rather than
  task-shape taxonomy.
- [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)'s
  cavecrew agents — the scope-refusal, redirect-protocol, and compact
  report-contract patterns, which gaffer's agents adopt. Cavecrew optimizes
  coordinator context; gaffer optimizes routing + calibration.
- Anthropic's per-model prompting guides — prior art for per-model
  behavioral calibration as a concept. Gaffer's contribution is the
  mechanism: elicit a contamination-guarded self-report from the model,
  subtract what it already does natively, compile only the residue into the
  agent's system prompt. As far as we could find, pinning BOTH model and
  effort per agent, and the self-report subtraction method, have no prior
  art.

## License

Apache-2.0.
