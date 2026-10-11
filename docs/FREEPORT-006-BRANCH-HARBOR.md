# FREEPORT 006 — The First Branch Graft

**State:** unmerged, offline native-source experiment on a stacked review branch. No live Supabase, no private archive, no source repo mutation, no automatic donor-runtime composition.

## Why these exact two branches?

| Source role | Frozen Git ref hint | Pinned immutable commit | Selected immutable blob |
| --- | --- | --- | --- |
| CANNON STACK² 017 | `the-static-collective/CANNON` `experiment/stack-squared-017` | `3aa5b0d0e9403e90affe05ec4056825e8d166fe4` | `src/stack-squared-017.mjs` |
| Static Workbench OLD-GROWTH 002 | `the-static-collective/static-workbench` `feature/old-growth-002-pinned-graft-import` | `16b0d5a2eb9c4c9b7da27f9ee1d8d8ba422a35a2` | `static_workbench/old_growth_import.py` |

And two distinct, purpose-specific verified runtime capabilities:

- **Static Workbench OLD-GROWTH 001 native calculation:** original `static_workbench/old_growth.py` in Workbench's pinned branch. Selectors require exact Git commit, source SHA-256, safe path, declared excerpt boundaries, declared KEEP/BEND/question/relationship/move. Its output is `PROPOSED_UNRUN` and `promotion:NONE`.
- **GHoT external-adapter manifest 001:** original `ghot/external_adapters.py` in `the-static-collective/GHoT@e12ce3e62486feb1e5cd2324d1ae5a6a2be8b19b`. Native `execute_external_adapter` is invoked using **a Freeport-created short-lived manifest**, fixed explicit capability `freeport.synthetic.branch_graft_probe_v0`, and the **Freeport-owned** `synthetic-graft-adapter-006.py`. The probe receives only SHA-256 excerpt / packet identifiers, Git commit identifiers, and an explicit `PROPOSAL_ONLY` flag. It does not import or execute either foreign branch blob.

This is deliberately different from pretending GHoT can sandbox untrusted code: it does **not** prove process isolation or enforce network prohibition. The exact command is written by Freeport's own test harness; GHoT's manifest constraints are declarations, not an OS-level security boundary.

## Actual voyage

```text
CANNON 017 exact blob --------------------┐
                                         ├── check Git SHA, tree mode 100644,
Workbench OLD-GROWTH 002 exact blob -----┘   exact blob SHA-1, and disk SHA-256
                                                │
                                      native Freeport 003 Amber A + B
                                                │
                                      unauthorized pair -> REFUSED
                                      explicitly scoped pair permit -> inert text join
                                      replay -> REFUSED
                                                │
                             operator-directed, unrun OLD-GROWTH native calculation
                                                │
                             original GHoT opt-in manifest -> fixed digest-only probe
                                                │
                               new proposal, still foreign / PROPOSED_UNRUN
                                                │
                                      Freeport candidate cargo cell
                                                │
                                   re-export to independent Review-World
                                                │
                                    recipient-owned explicit HOLD
                                                │
                                native cold Git + Workbench + GHoT replay
```

The `old_growth.compose` declaration inputs are written for this explicit operator-approved experimental scope. They are **not independently obtained human testimony**, nor evidence of consent from the authors of either donor repository. Freeport's pair permit authorizes **only** the existing inert literal text join; it **does not** authorize the separate Workbench calculation, code execution, merges, creative publication, or an adopter's decisions. The Workbench calculation is an additional purpose-built operator-directed local act. Both original branches are preserved as historical sources.

## Run

Requires **Node 24, Git and Python 3.12** plus checked-out original donor repositories at the immutable commits above. No npm or pip runtime dependencies are needed for the FREEPORT 006 specimen.

```sh
export FREEPORT_006_CANNON=/path/to/exact/CANNON
export FREEPORT_006_WORKBENCH=/path/to/exact/static-workbench
export FREEPORT_006_GHOT=/path/to/exact/GHoT

npm test
node scripts/branch-graft-006.mjs run /tmp/branch-graft-006 "$FREEPORT_006_CANNON" "$FREEPORT_006_WORKBENCH" "$FREEPORT_006_GHOT"
node scripts/branch-graft-006.mjs verify /tmp/branch-graft-006 "$FREEPORT_006_CANNON" "$FREEPORT_006_WORKBENCH" "$FREEPORT_006_GHOT"
```

The GitHub Actions workflow checks out all three donors at exact Git commits, runs adversarial FREEPORT 003 / 005 / 006 tests, then independently runs issuance and cold verification. It uploads **only the synthetic manifest**, not full source code, selected excerpts, private material or signing keys.

## What passes and what it does *not* establish

- **Pass:** exactly two independently pinned, regular Git blobs are verified. Modified source working files refuse even if commit HEAD is unchanged.
- **Pass:** exact SHA-256 foreign bytes reside independently in Amber, signed by Freeport as a local custody claim. Explicit one-use pair transform proves no ambient interaction.
- **Pass:** original Workbench computes a packet digest and `PROPOSED_UNRUN` native receipt. This calculation receipt is **not a digital signature or a durable project-owned receipt**.
- **Pass:** original GHoT executes only a known Freeport synthetic adapter receiving digests, not unknown donor code. Its output is **not** evidence of source runtime compatibility, sandboxing or acceptance.
- **Pass:** a distinct review world `HOLD`s the proposed artifact using Freeport 003's independent key and local disposition, without admission or merge. The candidate Git branch name is **proposed text**, not an actual Git ref.
- **Pass:** independent cold replay recalculates original Workbench and GHoT results and independently checks Freeport signed local receipts, selected bytes and destination state. Forged canonical selection, source SHA, GHoT outcome, altered transit flag, or changed proposal must refuse.

**Not proved:** remote Git author identity, source license or human permission, native donor-to-donor code compatibility, actual graft build, generated Git branch in donor repos, successful project tests of a merged graft, external review acceptance, code execution sandbox, author rights, WebZ deployment, or a production Freeport.

## Where the stack could go next

- **Static Workbench** could show this `PROPOSED_UNRUN` evidence in a read-only local Branch Deck, reusing its actual source verification and human review UX.
- **Free Graph** could record `descends-from`, `tests`, and `bears-on` relationships with scope limits; relationships would not establish authority.
- **webZ / Abundent** could offer a redacted view for opted-in public branch experiments after an explicit disclosure check.
- **reLATTE** could carry review evidence through native signed crossings without Freeport asserting the destination's canon-selection powers.

**BRANCH ≠ BACKLOG. REFERENCE ≠ EXECUTION. GRAFT PROPOSAL ≠ TESTED COMPOSITION. LOCAL HOLD ≠ ADMIT. BRANCH NAME ≠ BRANCH CREATED.**
