# FREEPORT 008 — First brokered, synthetic signed review recorded in Neon

**Evidence observed:** 2026-11-21 UTC.
**Status:** CI-verified synthetic proof + private Neon development branch read-back. Not production, authenticated public transport, or live radio scheduling.

## Source and receiver

- reLATTE branch: `feature/freeport-008-program-crossing` @ `4a67f392c38cefd6469bf3ced7defee85508dc39`
- Evidence run: [FREEPORT 008 synthetic evidence — 44959057711](https://github.com/the-static-collective/reLATTE/actions/runs/44959057711), **success**.
- Full reLATTE verification run: [44959057607](https://github.com/the-static-collective/reLATTE/actions/runs/44959057607), **success**.
- Existing two-host reLATTE regression: [44959057630](https://github.com/the-static-collective/reLATTE/actions/runs/44959057630), **success**.
- Signer identities were **synthetic CI-generated P-256 keys**. No external world key pin, human identity, real MOTIF worker, or live TOWER participated.
- The original reLATTE `sealCrossingEnvelope`, `verifyCrossingEnvelope`, `LocalReceiver`, `verifySovereignResponseBundle` and new owner-pin adapter executed in CI.
- A manual broker/connected Neon write copied the **public synthetic result** into the isolated FREEPORT development database.

## Neon witness

- Project: `FREEPORT — Static Collective Harbor`, id `withered-cake-55125266`
- Database: `freeport`
- Branch: `freeport-008-dev`, id `br-twilight-lab-bbec01jj`
- Table: `freeport.relatte_review_records` (not present on main)
- One synthetic row read back:
  - crossing: `relatte-crossing-v0:1823d14330781d484089cdc462d4c23a81fed425f545885adb68556583668ca2`
  - source world: `world:synthetic-motif-ci`
  - destination world: `world:synthetic-humkin-tower-ci`
  - disposition: `HOLD`
  - embedded signed disposition kind: `R3_HOLD`
  - 420-character base64 payload representing two fictional catalog IDs
  - radio broadcast/scheduling effects: none
- Database constraints directly rejected a synthetic attempt to set `disposition='ADMIT'`.
- The original FREEPORT main branch retained its seven existing tables; `fellowSHIP Commons` was not modified.

## What was verified vs not

**Verified in original code/test context:** signed fixture, native response cryptographic checks, independent receiver HOLD, altered payload rejection, forged signature rejection, source and receiver public-key pin mismatch rejection, duplicate idempotence, and local receiver replay.

**Observed at Neon:** persistent storage and SQL read-back of one such CI result, along with enforced SQL HOLD/REFUSE disposition restriction. The manual broker did not itself perform independent cryptographic verification using Neon runtime.

**Not verified:** remote authenticated two-party peer transport, externally pinned real owner keys, the Neon Function API, a live TOWER application consuming the packet, a real MOTIF reasoning result, or real-world media scheduling.

## Next falsifier

Use a trusted server role and an authenticated API to submit a deliberately mutated signed packet from one independently operated source. The API must reject it before any SQL insert, and the destination must retain the right to HOLD or REFUSE. Then repeat with a legitimate signed packet, read it back on a second machine and verify signatures against independently pinned keys.
