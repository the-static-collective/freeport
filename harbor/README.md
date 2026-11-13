# FREEPORT 007 — Creative Media Harbor

**2026-11-13 — executable local prototype, not a public deployment.** A separate Python 3.8+ read-only serving sidecar on its own branch, independent of the unmerged FREEPORT 003–006 Node experiments.

## Recovered history

A fresh check found FREEPORT 003, 004, 005 and 006 on four **open unmerged draft PRs**; main is README-only. In particular, FREEPORT 005 was an offline parser of proposed Supabase harbor notices, not a storage or file-hosting service. There is no evidence it has been deleted. Current Supabase projects: pantry-gate ACTIVE, WITNESS INACTIVE, the-autodiso INACTIVE. A narrowly targeted read of the active pantry-gate database found no Freeport/harbor/asset-named tables and **no Storage buckets**. Inactive projects were not accessible for a database inspection. None was changed here. Existing MX13 ingress has different admission behavior and must not be used for bulk archive intake.

This Harbor is actual file custody, not an MX13/SupaBardo integration.

## The file and permission boundary

    creator source file(s)
       ↓  explicit ingest, SHA-256
    HOLD/objects/<SHA256>           PRIVATE bytes
    HOLD/records/<SHA256>.json      PRIVATE source metadata
       ↓  deliberate rights packet + human confirmation
    PUBLIC/objects/<SHA256>.<ext>   RELEASED bytes
    PUBLIC/records/<SHA256>.json    release metadata
       ↓  read-only local HTTP server
    /v1/catalog.json               released entries only
    /media/<SHA256>.<ext>           immutable, seekable GET / HEAD / Range

The public server cannot upload, browse directories, or serve HOLD. The private root must **never** be publicly shared or placed inside the GitHub repository or website. A rights packet is an **operator attestation**, not independent legal proof.

## Run one test clip (no media uploaded)

From a checkout of this branch, Python 3.8+ required (no pip dependencies):

~~~sh
python3 harbor/media_harbor.py --root "$HOME/creative-harbor-data" init
python3 harbor/media_harbor.py --root "$HOME/creative-harbor-data" ingest "/path/to/your-owned-clip.mp4"
~~~

The ingest command prints the full SHA-256. Copy the example rights packet in harbor/rights-packet.example.json outside the repository. Fill the full hash, real title, actual creator/rightsholder and reviewer, intended license, and attribution. Inspect platform terms (e.g. Flow/Suno), recording and composition, sources, all contributors, real-person voice/likeness, and inherited licenses. The four check fields deliberately start **false**; turn them true only on real verification.

~~~sh
python3 harbor/media_harbor.py --root "$HOME/creative-harbor-data" release \
  THE_FULL_SHA256 --packet "/path/to/reviewed-rights.json" --confirm FIRST_12_HEX_OF_SHA256

python3 harbor/media_harbor.py --root "$HOME/creative-harbor-data" serve \
  --port 8766 --public-base http://127.0.0.1:8766
~~~

Read locally:

- http://127.0.0.1:8766/healthz
- http://127.0.0.1:8766/v1/catalog.json
- http://127.0.0.1:8766/media/<SHA256>.mp4 (replace with the released hash and extension)

On Windows PowerShell use py -3 instead of python3, with a conventional Windows --root path. Ingest duplicates source bytes into the private HOLD; release copies again to PUBLIC. **Don't bulk-copy ~225 videos without checking free space.** Inventory first with the HUMKIN offline scanner.

## Public HTTPS: supported routes and restrictions

The server binds **127.0.0.1 only**. For a *small pilot*, current Tailscale **Funnel** can expose this local HTTP service publicly over HTTPS without opening home router ports. Tailscale documents a beta service, a public ts.net hostname, availability across plans and **non-configurable bandwidth limits**. Anyone with the URL can reach the published-only server.

~~~sh
# After installing and setting up Tailscale on a supported computer:
tailscale funnel 8766
~~~

Use the **actual** HTTPS hostname printed by Tailscale as the server's --public-base. Configure HUMKIN's empty opt-in sources registry only after that hostname is confirmed and the owner intentionally releases a cleared file. Funnel is for tests and small files, **not a guaranteed unlimited community video CDN**.

**Cloudflare Tunnel correction (verified Nov 13, 2026):** Cloudflare's current video-delivery policy explicitly says *public hostname routes through Tunnel on Free, Pro and Business plans are subject to restrictions on serving video and disproportionate large files.* Therefore **do not use a free Cloudflare public Tunnel to serve the Commons' videos at scale**. A paid video/storage delivery product or a truly DNS-only/direct origin is a separate route. Official policy: https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/

For a durable home-origin route without Cloudflare's video proxy, a patched server can use **Caddy reverse proxy** with automatic HTTPS and an owned DNS name. This generally needs Internet-reachable ports 80/443, router/firewall configuration, and a usable public address (CGNAT can block it). Caddy can proxy to the Python loopback service. **Do not forward 8766 directly, do not run unsupported legacy OSes as exposed public gateways, and do not change current HUMKIN domain records without a separately verified migration.** Official quick-start: https://caddyserver.com/docs/quick-starts/reverse-proxy

Later, a dedicated media/object-storage host is more reliable than one consumer broadband connection. Whichever route you choose, private HOLD is never served.

The public handler supports GET and HEAD, one HTTP byte Range (including suffix ranges), immutable cache headers for hashed objects, a bounded concurrent stream count (3), and per-response throttling (1024 KiB/s by default). It refuses POST/PUT/DELETE, unknown paths, held files, unexpected extensions, bad record/hash shapes, and missing public bytes. CORS is available only to the explicitly configured HUMKIN origin. CORS is *not* a confidentiality boundary for freely published bytes.

This is a useful, bounded prototype, **not a production security-audited HTTP stack**. If large anonymous traffic arrives, migrate delivery to a hardened media server + CDN/object storage and enable monitoring, quotas, and appropriate OS firewalls. Keep a server on a supported, patched OS. An older Mac unable to run the tunnel agent is better used as an offline/private archive or mirror with a more modern box running the public dock.

## Second computer as verified private replica

~~~sh
python3 harbor/media_harbor.py --root "$HOME/creative-harbor-data" \
  mirror --to "/Volumes/TrustedBackup/creative-harbor-mirror"
~~~

The mirror makes hashed copies of both PRIVATE and PUBLIC media and metadata; it verifies copied bytes, refuses conflicting overwrite, and never deletes backups. **Never mount that target as a public directory or share it anonymously.** An external drive or trusted LAN share can be the mirror destination. It is not automatic failover and not a backup until you have tested restoration.

Proposed 3-box pattern:

- A / Vault: original media, holding, legal/provenance packets, most reliable storage.
- B / Dock: supported-OS machine, only PUBLIC objects, loopback HTTP plus outbound tunnel.
- C / Lifeboat: offline or periodically attached verified backup; no public service.

One computer may serve A+B initially; separate later. A cloud catalog can remain online even while the home video dock sleeps. Streaming will not.

## Release metadata contract

Exact object hash, normalized immutable filename, creator, title, parent sha256 ids, explicit license identifier + canonical URL, attribution, reviewer attestation, all scope and rights checks, original content length, public HTTPS base URL. Supported release licenses are CC0, CC BY, CC BY-SA, CC BY-NC, and CC BY-NC-SA 4.0 variants as encoded in the prototype. The code enforces license/scope consistency **syntactically**; it cannot ascertain that the operator genuinely controls every right. A source's public availability never counts as reuse consent.

The endpoint /v1/catalog.json uses the same essential status fields as HUMKIN Commons: availability published-cleared; rights.status cleared; rights.allow_remix true; license_id/license_url; parents; and asset_url. This is a suitable future optional catalog source for HUMKIN, but the first prototype does not claim that the live site has already been configured to fetch the dock.

## Honest status of Supabase and older Freeport

Previous Freeport 005 suggested Supabase as a transient **private notice board** with no raw payloads, and an independent receiver HOLD. It deliberately did not connect to Supabase or publish files. Supabase Storage today can hold private files with RLS, signed URLs, S3-compatible transfers and resumable uploads, but quota/cost and rights review remain separate. Do **not** write into pantry-gate or WITNESS merely because those projects exist, and do not assume existing reLATTE or TranchNode adapters are this public file server.

Future integrations: rights-review queue, reLATTE signed releases, encrypted private replicas, chunk/resume transfer, named-node availability, explicit immutable revocation/supersession history, automatic alternate origin, and optional Supabase metadata. None is implemented by 007.

## Local regression test

~~~sh
python3 -m unittest discover -s harbor/tests -v
~~~

Unit tests use synthetic bytes, temporary directories and a loopback HTTP server. They check that a held file is not public, explicit release works, byte ranges/HEAD work, writes are refused, malformed rights claims are refused, duplicate ingests coalesce and private mirrors verify exact bytes.
