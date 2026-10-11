# FREEPORT 004 — The First Foreign Ship

**Status:** bounded integration experiment. All inputs are synthetic. No live Supabase and no private musical material. Stacked on [FREEPORT 003](https://github.com/the-static-collective/freeport/pull/1). This specimen does not turn Freeport into an import or execution authority.

## Exact independent donors

| Role | Original git source |
| --- | --- |
| Native immutable cargo storage | `the-static-collective/tranchnode` `feat/immutable-artifact-store-issue-6` @ `7fbb0c868befd5f6a7478bdd0447477a0e8e075e` |
| Native signed crossing and receipts | `the-static-collective/reLATTE` @ `dcc8cdca84c440aa4294134f020fb7095bf87f24` |
| Temporary crossing architecture | `the-static-collective/Human-Witness` — original SupaBardo crossing-field spec |
| Local cells and receiver-owned gate | `freeport` FREEPORT 003, unchanged on this branch |

The entrypoint imports the **original** TranchNode `FilesystemArtifactStore`, `artifactAddress` and **original** reLATTE `generateP256KeyPair`, `sealCrossingEnvelope`, `verifyCrossingEnvelope`, `sealReceipt`, `verifyReceipt`. An external checked-out donor may be used only if its exact `git rev-parse HEAD` matches the pinned SHA. No local protocol imitation or signature mock is accepted.

## Crossing that actually happens

```text
Synthetic World A song ------┐
                              ├── native TranchNode put/get ──▶ Freeport Amber A/B
Synthetic World D visuals ---┘                                    │
                                                   unauthorized CROSS -> REFUSED
                                                   explicit one-use permit -> BOUNDED TEXT JOIN
                                                                  │
                                                   Foreign-derived child C
                                                                  │
                                                   native TranchNode put/get C
                                                                  │
                                             port-signed native reLATTE crossing X
                                                                  │
                                           port-signed native reLATTE RELEASE
                                                                  │
                                             separate Bardo key -> OPEN / WAIT
                                             (offline synthetic, no Supabase)
                                                                  │
                                                Freeport re-export offer
                                                                  │
                                                 World C's distinct gate
                                               World C explicitly decides HOLD
                                                                  │
                                            World C's key signs native R3_HOLD
                                                                  │
                                            Bardo key signs semantic-free EXIT
                                                                  │
                                       discard disposable local Bardo staging
                                                                  │
                                  cold verification still reconstructs receipts
                                     and 3 objects with original donor code
```

The sender signer represents the **port's claim about its custody and release**, not the historical creators' permission, ownership or legal capacity. The independent destination signs only its own `R3_HOLD` outcome. `RELEASE != OWNERSHIP`, `OPEN != ADMIT`, `EXIT != ADMISSION`.

## Command-line use

Node.js 24, plus an installed TypeScript runtime from the original TranchNode checkout. Both original git donor commits must match the pins; reLATTE needs its declared dependency installed.

```sh
export FREEPORT_004_TRANCHNODE=/path/to/exact/tranchnode
export FREEPORT_004_RELATTE=/path/to/exact/relatte

node --import "$FREEPORT_004_TRANCHNODE/node_modules/tsx/dist/loader.mjs" \
  scripts/first-foreign-ship-004.mjs run /tmp/first-foreign-ship \
  "$FREEPORT_004_TRANCHNODE" "$FREEPORT_004_RELATTE"

node --import "$FREEPORT_004_TRANCHNODE/node_modules/tsx/dist/loader.mjs" \
  scripts/first-foreign-ship-004.mjs verify /tmp/first-foreign-ship \
  "$FREEPORT_004_TRANCHNODE" "$FREEPORT_004_RELATTE"
```

GitHub Actions checks out both original repositories by immutable commit, runs the pre-existing FREEPORT 003 tests, then runs FREEPORT 004 hostile tests with the original donor code, followed by a distinct CLI run/verify. The only uploaded CI artifact is a synthetic manifest without payload bytes, signing key material or credentials.

## Testable boundaries

- TranchNode bytes are stored **before** being offered to Freeport and the derived child is stored there again; native repeat PUT must report no second creation; native GET verifies hashes.
- No pair interaction without the existing Freeport local operator permit; one authorized fixed transform makes a child with no inherited authority and a recorded ancestry; repeated permit fails.
- Native reLATTE signed crossing has exactly one payload reference, the native content address, and explicitly delegates the receiving disposition to the destination.
- Three distinct P-256 identities sign port RELEASE, Bardo WAIT / EXIT, and destination-local HOLD; original reLATTE verifies all.
- Bardo interval is **offline, synthetic**. Its OPEN receipt specifies null disposition and no semantic consequence; its EXIT receipt has no semantic consequence.
- The destination independently decides `HOLD` through FREEPORT 003's destination gate; a signed native reLATTE `R3_HOLD` binds that actual local decision.
- Before cold verification, the disposable local Bardo directory is destroyed; durable receipts and the actual TranchNode cargo remain.
- Hostile changes to a signed semantic effect, crossing render permission, unsigned manifest promotion, or underlying native bytes must fail closed.

## Unproved and deliberately not claimed

This is not a **live** SupaBardo membrane, project-level signing authority, remote federation, production-grade isolated sandbox, external identity attestation, permission to publish someone else's song, or operational replacement for TranchNode. No original SupaBardo schema is connected, paused, started, mutated, or destroyed here. The test does **not** prove a source owner's original permission to transform, distribute or license material. The owner-selected, private-archive path from CANNON 015 remains entirely separate.

There is no local or public KEEP and no render authority. Destination HOLD is not acceptance of the source's creative proposal. Re-export is not admission.

**The first ship carries proven bytes and genuine signed papers. It does not carry anyone else's authority.**
