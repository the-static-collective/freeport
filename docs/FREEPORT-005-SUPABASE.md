# FREEPORT 005 — Supabase Harbor Signals (read-only discovery seam)

**Status:** incubating, offline-only source and adversarial test. No Supabase project was changed. No schema, role, key, bucket, policy, Edge Function, or deployed endpoint was added.

## What the connected projects actually have (read-only inspection, 2026-10-11)

The user's existing **WITNESS** and **pantry-gate** projects are ACTIVE_HEALTHY. Both carry the **MAXHINAL 13 / mx13** private mesh, with six tables per node: `inbox`, `outbox`, `payloads`, `receipts`, `ancestry`, and `constitution_events`. Pantry-gate has seven additional relevant private specimen pipeline tables and deployed Edge functions such as `pantry-intake`, `screen-specimen`, `mx13-ingress`, `mx13-worker` and `mx13-status`. WITNESS has a public witness-room RLS layer and the shared mesh code.

Actual candidate nodes on pantry-gate:
- **mx13:08-pirate-clerk**: *CUSTODY != OWNERSHIP*.
- **mx13:12-ferryman**: *FERRYMAN != DESTINATION*.
- **mx13:02-gate**: *PRESENCE != PEDIGREE*.

Observed node-local inbox, outbox and receipt tables for these three were empty at inspection. Empty history means no live shipment was demonstrated.

### Important mismatch

MAXHINAL 13's currently deployed `src/ingress.ts` requires (among other things):
- `schema=maxhinal13.ingress/v0`;
- a **registered local source node** and matching pinned source-key fingerprint;
- a signed reLATTE-v0 crossing;
- `audience_policy.destination` equal to the receiving node;
- a fresh exact payload;
- `requested_effect.destination_disposition='local'` and `capability_ref=null`.

Then it calls `evaluateConstitution` in `src/constitutions.ts`. Under that system's **own** laws, some nodes may immediately select a local `ADMIT` or `REFUSE`, not just HOLD (e.g. Gate and Pirate Clerk depend on ancestry / salvage). This is valid for Maxhinal's destination-local constitution; it is **not** permission to claim those dispositions as **Freeport** import or creator ownership. FREEPORT 004 crossings come from `freeport:Port-B`, not an mx13 node, so they cannot simply be POSTed to the deployed ingress. Never claim such a shipment already works.

### Production boundary

Do **not** add public `anon` or `authenticated` grants to mx13/private pantry schemas to make a demo work. Current mx13 schemas have no direct `USAGE` privileges for those API roles, and pantry's private RLS on 17 tables has no public policies; neither is a reason to relax the walls.

Supabase docs authorize private Realtime Broadcast/Presence through `realtime.messages` RLS policies and private channel topics, but **private-channel RLS does not create cross-world legal or creative authority**. Realtime subscriptions cache policy decisions for the connection life. Treat broadcast as an attention cue, not an authoritative state transition. Deployed Edge functions may have `verify_jwt=false` and still enforce separate operator-token or signed-source checks in handler code; inspect these *before* assuming access or adding a route.

## The new narrow specimen

The pure, dependency-free `observeHarborSignal` function accepts a small **no-cargo**, bounded, declared-as-unverified notice:

```json
{
  "schema": "freeport.harbor-signal/v0",
  "crossing_id": "relatte-crossing-v0:<64 lowercase hex>",
  "cargo_address": "sha256:<64 lowercase hex>",
  "event": "HOLD_NOTICE",
  "observed_at": "2026-10-11T16:09:00.000Z",
  "expires_at": "2026-10-11T16:11:00.000Z",
  "observed_from": "pantry-gate"
}
```

This is a **claimed observer label, not verified origin**. JSON parsing, exact property whitelist, type constraints, 5-minute signal TTL, explicit limited event enum and content-address syntax reject malformed or authority-shaped input. A bounded signal may become only an `UNVERIFIED_HINT`: the output sets all admission, interaction, execution, source consent, host adoption and transport authority flags to `false`. Verification of an actual reLATTE signature and selected exact TranchNode bytes remains a separate later action that is **not implemented here**.

### Guardrails

- Never put cargo bytes, private owner metadata, raw human testimony, personal Suno archive entries, service keys, bucket URLs, or capability tokens on a Realtime signal.
- No `ADMIT`, `KEEP`, `EXECUTE`, `TRANSFORM` event on this channel.
- No foreign-to-foreign interaction from co-residence or repeated signals.
- No automatic long-term custody: SupaBardo-shaped transit remains temporary; durable bytes stay native TranchNode.
- No implicit MAXHINAL13 constitution of a Freeport artifact.
- Supabase is an optional **operational observation transport**. Re-export, custody, verification, human consent and world-local decision remain separately governed.

## Next explicit pressure: FREEPORT 006

First test an **unconnected** private Realtime-style broadcaster and listener in the CI harness using synthetic signed crossings, then an independently controlled receiver gate. Only after independently verifying actual ingress auth, RLS policies, retention/deletion, and real acknowledgment semantics should an operator consider a dedicated temporary schema on a test project. Do not use WITNESS or pantry-gate as a scratch database by default.

**Broadcast != receipt. Presence != pedigree. Port announcement != admission.**
