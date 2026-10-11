# FREEPORT 005 — Supabase Harbor, not a new sovereign

**Status:** proposal plus tested offline inert signal parser. **Zero Supabase writes, zero deployments, zero new auth credentials.** Stacked atop FREEPORT 004.

## Live read-only reconnaissance · October 11, 2026

The user's connected Supabase account currently shows:

| Host | Status | Evidence |
| --- | --- | --- |
| `pantry-gate` | ACTIVE_HEALTHY | Private `pantry` data/specimen schema, `mx13_host`, six even-numbered `mx13_n02..n12` node schemas, six Edge Functions |
| `WITNESS` | ACTIVE_HEALTHY | Three existing RLS-protected public witness tables, `mx13_host`, seven odd-numbered `mx13_n01..n13` node schemas, four `mx13` Edge Functions |
| `the-autodiso` | INACTIVE | Database queries time out; not restored or altered |

These are **deployment and schema observations, not a claim that any particular live crossing has occurred**. Counts of inbox/outbox/receipts for the specific Pirate Clerk, Ferryman, Gate, Witness and Dead Letter tables were zero when inspected.

Existing Maxhinal 13's *deployed original code* defines thirteen nodes across the two hosts. Relevant nodes and their actual laws:

- `mx13:02-gate`: **PRESENCE != PEDIGREE** — on some input the local evaluator makes an automatic `ADMIT` once ancestry is present;
- `mx13:08-pirate-clerk`: **CUSTODY != OWNERSHIP** — may make a local `ADMIT` when source-declared `salvage_eligible` or `abandoned` is true;
- `mx13:12-ferryman`: **FERRYMAN != DESTINATION** — returns a `FORWARD`-only disposition;
- `mx13:01-witness`: **WITNESS != JUDGE** — observes and forwards, does not independently ADMIT.

The current mesh ingress verifies an original reLATTE-shaped signed P-256 crossing and peer-fingerprint, checks payload byte address, persists an inbound HOLD, then **may automatically resolve it according to a node's own constitution**. The public `mx13-ingress` Edge Function has `verify_jwt=false`, but the code performs cryptographic validation and pinned-peer checks for ordinary ingress, and a separate operator capability check for bootstrap commands. This should not be treated as automatically safe for arbitrary foreign entrants; the operator/peer/role boundary requires its own full security review.

The `mx13_host` and `mx13_n*` schemas currently have **no USAGE grants** for the ordinary `anon` or `authenticated` roles. Several node schemas do not have RLS policies; this is **not the same as exposure** while they remain private and ungranted. Private `mx13_host.node_keys` includes key material and must **never** be mirrored, queried for cargo use, exposed in logs, or bundled into artifacts. The public WITNESS tables have RLS enabled; current Supabase security advisor reported zero findings in that project. The Pantry security advisor reports INFO findings for seventeen `pantry` tables with RLS but no policies, an intentional-looking private schema pattern **that still warrants explicit grant and Data API exposure review** before additional access.

Existing `pantry-gate` also has a JWT-protected `pantry-intake` Edge Function and a custom-worker-token-protected `screen-specimen` function. It can ingest private storage specimens and produce analysis/proposals, but screening, generated tags, captions, recommendations and visual similarity cannot be confused with permission, provenance, human consent, or destination admission. Its image-analysis worker can use an external semantic provider when configured; **never send private WITNESS or owner archival payloads into such analysis without separate informed permission and data-flow audit**.

## The actual architectural opportunity

```text
TranchNode immutable original bytes            durable, independently verifiable
    │
Freeport Amber custody and scoped permit       foreign, not adopted
    │
reLATTE signed crossings and receipts          portable evidence, not authority
    │
Supabase Harbor: private operator plane        temporary notices, queue, presence,
                                               waiting/expiration/retry, review offers
    │
SupaBardo encounter interval                   transient, born and ended explicitly
    │
World-local destination gate                   independently decides HOLD/REFUSE/ADMIT
    │
Free Graph / webZ read-only public projection  only deliberately authorized receipts
```

Maxhinal 13's ferryman and pirate clerk may eventually provide **bounded observations** about existing routes, but should not be delegated custody rights or Freeport imports merely because their names match. The existing `mx13-ingress` is a *materially different experiment*, and its ordinary node-local constitutions can automatically ADMIT. Consequently:

**Do not push Freeport cargo into MX13 ingress as if it were a HOLD-only Bardo membrane.**

Recommended first integration is a **separate, capability-poor harbor notification adapter**, *not* a new global service. Realtime sends only bounded discovery metadata: crossing ID, opaque SHA-256 address, observed-from host, short-lived notice kind and expiry. Raw payloads, encrypted blobs, private archive labels, JWTs, authorization headers, signing keys, import warrants and sender permission claims must never ride Realtime notices. A valid notice remains an `UNVERIFIED_HINT`.

The native reLATTE verification, original bytes and destination gate remain **a separate subsequent local operation**. Real live announcement requires explicit security design for private Realtime channels, RLS permissions on `realtime.messages`, privacy ownership, revocation, short expiry, no sensitive persistence, and replay resistance.

## What was built in this branch

`src/harbor-signal-005.mjs`: pure deterministic observer projection requiring exact fields, short TTL, known event types, bounded host labels, correct hash/crossing-ID shapes, and a hardcoded no-authority posture. It does not connect to Supabase or know a service role credential, has no database or network side effects, and returns `UNVERIFIED_HINT` rather than verified evidence. Any unexpected field, including `ADMIT`, payload bytes, ownership declaration, tokens or injected receipts, is quarantined.

`test/harbor-signal-005.test.mjs`: adversarial checks for malformed, extra-authority, expired, replay-looking, stale, future, unknown-host and private-byte-bearing hints. This test is **not** live RLS validation, network admission conformance, server-side authorization, or a deployed integration.

## The exact next authorized live experiment

First perform the owner-approved scope decision: **which Supabase project, if any, is allowed to host a new disposable, test-only harbor?** Since WITNESS is sensitive, prefer a newly isolated project/branch when cost/organization is explicitly approved, or a carefully scoped disposable private schema after security review. Never silently reuse the existing 13 node schemas or modify WITNESS. Freeport user approval for a code experiment does not imply approval to move any personal archive into Supabase.

A synthetic live test could then:

1. Create **only** a private bounded harbor-notice surface, deny direct anonymous access, and verify grants and private Realtime policies;
2. Emit one random synthetic address **without** payload bytes; test that unintended subscribers cannot access it;
3. Retrieve a real signed reLATTE envelope and original TranchNode bytes separately, verify both independently;
4. Have destination-local actor explicitly record `HOLD`, not an MX13 automatic ADMIT;
5. Expire the private session, revoke its access, remove the disposable session while preserving signed history in the actual owning durable store;
6. Verify absence of stray public grants, surviving private notices, implicit adoption or inferred authority.

### Links

- [FREEPORT 003](https://github.com/the-static-collective/freeport/pull/1)
- [FREEPORT 004](https://github.com/the-static-collective/freeport/pull/2)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase RLS and API security](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase database linter: RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

**Summary:** Supabase can be the port's temporary noticeboard and scheduling desk. It is not the cargo's lawful owner, the trusted shipper, the recipient's constitution, or the permanent history.
