# FREEPORT 008 — reLATTE × Neon × HUMKIN TOWER (review-only)

**Status:** experimental branch and isolated Neon development branch, **not** deployed radio integration.
**FREEPORT project:** Neon `withered-cake-55125266`, database `freeport`.
**Dev branch:** `freeport-008-dev` (`br-twilight-lab-bbec01jj`).
**Existing Fellowship database:** deliberately untouched.
**Protocol owner:** [reLATTE](https://github.com/the-static-collective/reLATTE).
**Archive owner:** FREEPORT. TOWER owns its own decisions and active schedule.

## The contract

```
synthetic MOTIF-style ProgramProposal (1..12 track references)
  → source approval → reLATTE original sealCrossingEnvelope
  → signed envelope + exact base64 JSON bytes
  → source signature verified against an independently approved P-256 public key
  → SHA-256 of transported payload bytes matches the signed reference
  → TOWER LocalReceiver records RECEIVE with its own key and journal
  → TOWER chooses HOLD or REFUSE, never ADMIT in this specimen
  → genuine signed SovereignResponseBundle
  → independently check destination signer against an owner-approved public key
  → private Neon row, idempotent by crossing ID, no scheduling effect
```

## New implementation

- `reLATTE/src/freeport-008.ts`: strict schema, source approval, original reLATTE crypto, exact byte hash, owner-local HOLD/REFUSE and independent signed-bundle verification.
- `reLATTE/src/freeport-neon-store.ts`: narrow parameterized PostgreSQL archive interface. Insert-once, cold read-back on duplicate, rejects divergent replays.
- `reLATTE/test/freeport-008.test.ts`: synthetic signed three-track proposal, HOLD, REFUSE, hostile mutation, wrong source key, wrong destination, duplicate and restart.
- `reLATTE/test/freeport-neon-store.test.ts`: independent receiver key pin, archived result idempotence, forged disposition rejection.
- `migrations/008-relatte-review-records.sql`: private Postgres archive contract.

Only placeholder catalog IDs are tested. No audio, music credentials, private archive, radio schedule, external artist, or living user records are ingested.

## Important non-claims

- The Neon database row is **not a cryptographic verifier**. A trusted process must call reLATTE's native `verifyCrossingEnvelope` and `verifySovereignResponseBundle` and check the independently approved source and destination key pins before inserting.
- The current `sourceOwnerApprovedReview` flag is a local explicit-use input, not a durable identity/consent verification service.
- A pinned P-256 key demonstrates key continuity, **not real-world human identity**.
- Native `LocalReceiver` has a local file journal. Neon must not take over this owner history or invent admission.
- The Neon project has not been given public insert permissions. Browser-facing Data API remains disabled. No Function or production service is deployed for this prototype.
- `saveReview` is an adapter requiring a database client from a trusted server; it must not be offered to untrusted browsers.
- An archived review is **not a transmission receipt, broadcast authorization, listener evidence, legal permission or broadcast event**.

## Next interface to deploy after checks

1. Register independent real public-key pins for MOTIF proposal source and TOWER recipient (with owner consent).
2. Deploy a private/authenticated Neon Function accepting only bounded carriers and signed response bundles, calling the **original reLATTE verification functions**.
3. Create a least-privilege database role with INSERT/SELECT-only access to the FREEPORT 008 table, no UPDATE/DELETE, no general `freeport` schema control.
4. Produce a first end-to-end authenticated pilot with test-only tracks and an independent TOWER process. Retry and tamper-check it. Only later propose human-authorized integration into TOWER's programming UI.
5. Optionally anchor signed response-set roots in MEMENTO/external witness; do not promote receipt claims to canon automatically.

**Law:** FREEPORT stores the crossing; reLATTE proves the crossing; TOWER alone decides consequence.

## Constraints and failure conditions

Unsigned/modified source, unexpected fields, payload-byte/hash mismatch, private key in declared pin, unknown source pin, destination mismatch, unauthorized broadcast instruction, unknown track reference syntax, oversized packet, replay divergence, forged recipient signature or `ADMIT` disposition → reject. A failure must not write a new receipt or modify the live schedule.

An existing SQL row may still be forged by an administrator or a direct privileged writer. Independent cryptographic verification remains mandatory on read; do not use the table as a trusted admission log.

## Rollback

Drop `freeport.relatte_review_records` **only in the isolated development branch** after confirming no meaningful data. Do not modify or delete the project's original seven tables, `amber-private`, fellowSHIP Commons or FREEPORT 007.
