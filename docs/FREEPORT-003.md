# FREEPORT-003 — The Bonded Garden

**State:** original executable *local* specimen on a draft branch, not admitted cross-project infrastructure.

## Source roads

- [FREEPORT 001](https://github.com/the-static-collective/What-is-the-static-collective-/issues/61): foreign material without admission.
- [FREEPORT 002](https://github.com/the-static-collective/What-is-the-static-collective-/issues/62): separate Amber Cells and explicit interaction as a new crossing.
- Human-Witness: canonical SupaBardo temporary unresolved crossing field.
- TranchNode: candidate external immutable artifact carrier.
- reLATTE: candidate signed portable crossing grammar.
- Project0: candidate continuity/identity evidence; authority remains local.

## First ceremony

Two synthetic foreign cargo records, **A** and **B**, are deposited as inert bytes in disjoint Amber Cells. B contains executable-looking JavaScript text, and A claims `authority=root` inside its untrusted bytes. Neither claim or text is executed, granted or believed.

An unauthorized attempt to compose A and B records a signed `INTERACTION_REFUSED` receipt. An explicit local operator signs a one-use HMAC permit for only that exact pair and a fixed built-in UTF-8 text-join transform. The transform creates a third inert **FOREIGN_DERIVED** cargo cell, with both parents in its signed receipt. A replay attempt is refused. A named **World C** receives an explicit re-export offer but has not admitted the cargo. Only World C's separate operator and signing identity can record its own HOLD or ADMIT.

Cold verification operates on stored artifacts without using the mutating Freeport or DestinationGate implementation. It checks all exact object byte addresses, cell identity and parentage, Ed25519 receipt signatures, and receiver-local semantics.

## Hostile fixtures

| Pressure | Expected result |
|---|---|
| Fake `authority: root` or callback code in foreign payload | Inert bytes |
| Separate cells resident together | No ambient composition/discovery API |
| Unknown consequential field | Reject at typed claims or transit boundary |
| Absent/forged/wrong-pair permit | Signed refusal |
| Expired, overlong or replayed interaction lease | Refusal |
| One explicitly authorized pair interaction | New foreign child; source cells preserved |
| Invalid UTF-8 operand | Refused, no derived child |
| 65,537-byte payload | Refused |
| Repeated berth slot with different address | Refused |
| Wrong recipient, changed bytes or illegal transit authority | Refused |
| Re-export to World C | Host adoption stays false |
| Recipient HOLD | No local admission |
| Recipient explicit ADMIT | Inert destination storage only; no code execution |
| Modified stored bytes or Ed25519 receipt body | Cold verification fails |

## Security and authority limits

This is a **single-user local trusted OS** experiment with synthetic content. Logical Amber Cell isolation does not confer process/container sandboxing. No live network connection, external software executor, Supabase service, lawful content rights, identity credential, public website, or durable reLATTE receipt is involved. Public claims about production-grade safety would be unwarranted. Signature validity proves a local signing key produced a receipt; it does not prove the signer's external identity, lawful authority or consent.

Freeport deliberately owns **no receiving world's admission**. A receiving world's local ADMIT is not Freeport's effect.

**FREEPORT-004** should test adapters using original TranchNode and reLATTE code pinned to exact commits, preserving this first independent local specimen's narrower result.
