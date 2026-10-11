# FREEPORT — foreign material without admission

**The Static Collective · experimental bonded garden**

> A thing may arrive without entering the world. It may be preserved, inspected, transformed in a bounded way, or re-exported without becoming locally owned, trusted, published, executable, or admitted.

The architectural seed already exists in GitBook's *Freeport v0 — Foreign Material Without Admission*, *Amber Cells*, and [FREEPORT 001](https://github.com/the-static-collective/What-is-the-static-collective-/issues/61) / [FREEPORT 002](https://github.com/the-static-collective/What-is-the-static-collective-/issues/62). This code is a **FREEPORT-003** executable specimen, not a universal runtime.

```
World A ── opaque foreign bytes ───▶ Freeport B
                                      │
                              Amber A   Amber B
                                └─X──────┘       no ambient contact
                                └─permit─┘       one-use bounded transform
                                      │
                                   Amber C       still foreign
                                      │
                                  re-export
                                      ▼
                                World C gate
                         REFUSE / HOLD / ADMIT
                             (no automatic execution)
```

## Run

Requires Node.js 22+; no external package dependencies.

```sh
npm test
npm run demo
```

The demo uses invented synthetic objects, fresh local Ed25519 signing identities, separate random operator secrets, and temporary filesystem storage that it removes after running. No live user archive, Supabase project, network, or service is accessed.

## Current bounded proof

- **Inert cargo:** SHA-256 addressed exact-byte local object store, create-only named berths, checked reads. Foreign ancestry metadata remains explicitly unverified. Fake executable-looking content is stored only as bytes.
- **Amber separation:** Separate cell records, no resident API to discover or inspect neighbors. The local operator can inspect a named cell; this is **not** process-, VM-, or multi-tenant security isolation.
- **Named interaction:** One fixed inert text-join transform, authorized by a local operator's HMAC permit scoped to the exact two source cells and valid up to 60 seconds. Lease consumption is create-only; replay, expiry, wrong pair and forgery are refused.
- **Attributable consequence:** Ed25519-signed, content-addressed local DEPOSIT / INTERACTION_REFUSED / FOREIGN_DERIVED / REEXPORT receipts. New descendants have both source cell IDs and do not inherit authority or local admission.
- **Re-export without adoption:** Explicit recipient and base64 material in a transit envelope, with `hostAdoption:false` and `recipientAdmission:false`. The envelope carries actual bytes and **must not be published** if the bytes are private.
- **Recipient-local customs:** A separate `DestinationGate` has a distinct secret, signing key and filesystem. It may HOLD, REFUSE or ADMIT only under its own operator's explicit action. ADMIT creates inert destination storage only; it never executes imported code.
- **Cold inspection:** A separately written cold verifier checks object hash integrity, cell addresses, slot commitments, receipts and signatures, explicit derived content and independent receiver choices.

## Honest limits

This is a **single-user, controlled local-filesystem test**. It does not establish sandboxed execution, identity verification, proof of lawful ownership or consent, OS-level isolation, safe handling of actively hostile local users, crash-atomic multi-file transactions, distributed lease fencing, live federation, genuine foreign-runtime polyglot substitution, or reliable network delivery. Port and recipient signing keys are ephemeral unless separately supplied by their owners; the first specimen does not manage durable keys or revocation.

Its local storage is **not yet** the actual TranchNode implementation. Its receipt wire is **not yet** a reLATTE crossing/receipt, its waiting state is **not** a live SupaBardo, and neither Project0 nor Free Graph automatically approves its data. These are candidates for future **original-code adapter** tests, not completed integrations.

## Next seam

`FREEPORT-004`: original TranchNode immutable store as an optional carrier, reLATTE signed receipt crossings as an optional transport envelope, and an independently owned destination import gate. The SupaBardo nonfinal state may precede or bridge those activities, but should never become immortal warehouse storage.

**Residence != trust. Co-residence != interaction. Transformation != admission. Re-export != adoption. Receipt != authority.**

## FREEPORT 004 — First Foreign Ship

[Original-code integration and its boundaries](docs/FREEPORT-004.md)

This next specimen uses the **real**, SHA-pinned native TranchNode filesystem CAS and **real** reLATTE P-256 crossing/receipt library. Two synthetic parcels enter Freeport; one authorized fixed text composition becomes a derived foreign child; native TranchNode stores the exact child bytes. A source-world **port custody** signer releases it via a native signed reLATTE crossing. A separately signed **offline SupaBardo-shaped OPEN / WAIT** witnesses unresolved transit, then World C's own separate gate deliberately **HOLDs** the cargo and signs native `R3_HOLD`. Bardo signs a nonsemantic EXIT; its synthetic staging folder is deleted. Original donor code cold-verifies the signatures and TranchNode bytes afterward.

No live Supabase is contacted; the private Autodiscography archive is not imported; original creator rights are not attested; host re-export is not host adoption; recipient HOLD is not creative KEEP, admission or execution.

An additional [GitHub Actions integration](.github/workflows/freeport-004.yml) clones exact original donor commits, runs the original 003 tests and independent hostile 004 tests, plus a separate CLI cold replay.

**FREEPORT 003 remains self-contained. FREEPORT 004 is a pinned independent donor integration, not a new mandatory central service.**
