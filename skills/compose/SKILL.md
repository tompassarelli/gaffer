---
name: compose
description: Assemble a custom gaffer payload (role + posture + model delta) for a spawn the five preset agents don't cover — e.g. Workflow agent() calls, an unusual role/posture pairing, or a different model tier. Use when delegating work that needs tuned prompting but no preset fits.
---

# Compose a custom spawn payload

The preset agents cover the common cells. For anything else, assemble the
payload by hand from this plugin's blocks and paste it into the spawn
prompt (or Workflow `agent()` prompt).

## Procedure

1. **Pick the four blocks** (all under this skill's plugin root):
   - Role — `docs/roles.md`: executor · implementer · integrator ·
     designer · researcher · verifier · judge. Sets authority, deliverable,
     report format, redirects.
   - Posture — `docs/postures.md`: explore · deliver · preserve. Sets the
     collision priority order (what yields when values conflict).
   - Comms — `docs/comms.md` (universal block): output norms every report
     follows regardless of role.
   - Model delta — `docs/deltas/<model>.md`: per-model prompt overrides.
     Pick by the model the spawn will actually run on.
2. **Pin both dials** on the spawn: model AND effort, per the doctrine's
   ramp (sonnet-low → sonnet-medium → opus-medium → opus-high/xhigh).
   Remember the layer floor: foundational/library/architecture code never
   runs on sonnet tier.
3. **Paste** the three blocks above the task text. Keep the assembled
   payload under ~60 lines — trim the delta before trimming role/posture.
4. If no block fits, drop the presets, say so in one line, and write the
   constraints directly. A logged drop is the escape hatch working.

## Workflow example

```js
const payload = roleBlock + postureBlock + deltaBlock;
await agent(`${payload}\n\nTASK: ${task}`, {model: 'sonnet', effort: 'medium'})
```
