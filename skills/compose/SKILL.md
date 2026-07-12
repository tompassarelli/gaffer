---
name: compose
description: Assemble a custom gaffer payload (role + posture + model delta) for a spawn the preset squad doesn't cover — e.g. Workflow agent() calls, an unusual role/posture pairing, or a different model tier. Use when delegating work that needs tuned prompting but no preset fits.
---

# Compose a custom spawn payload

The preset agents cover the common cells. For anything else, assemble the
payload by hand from this plugin's blocks and paste it into the spawn
prompt (or Workflow `agent()` prompt).

## Procedure

1. **Pick the four blocks** (all under this skill's plugin root):
   - Role — `docs/roles.md`: executor · implementer · integrator ·
     designer · researcher · analyst · verifier · judge. Sets authority,
     deliverable, report format, redirects.
   - Posture — `docs/postures.md`: explore · deliver · preserve. Sets the
     collision priority order (what yields when values conflict).
   - Comms — `docs/comms.md` (universal block): output norms every report
     follows regardless of role.
   - Model delta — `docs/deltas/<model>.md`: per-model prompt overrides.
     Pick by the model the spawn will actually run on.
   Done: all four block paths named (role, posture, comms, delta), none TBD.
2. **Pin both dials** on the spawn: model AND effort, per the doctrine's
   ramp (sonnet-low → sonnet-medium → opus-high → opus-xhigh; the
   dominated middle — sonnet-high, opus-low/medium — is never the pick).
   Remember the layer floor: foundational/library/architecture code never
   runs on sonnet tier.
   Done: both dials are literal values on the spawn — read it back, see a
   model AND an effort, neither inherited.
3. **Paste** the blocks above the task text. Trim the delta before trimming
   role/posture.
   Done: `wc -l` of the assembled payload ≤ 60, every block above the task.
4. If no block fits, drop the presets, say so in one line, and write the
   constraints directly. A logged drop is the escape hatch working.
   Done: every preset either maps to a block or the drop is logged in one
   line naming what you wrote instead.

## Workflow example

```js
const payload = roleBlock + postureBlock + deltaBlock;
await agent(`${payload}\n\nTASK: ${task}`, {model: 'sonnet', effort: 'medium'})
```
