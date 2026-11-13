#!/usr/bin/env python3
"""FREEPORT Media Harbor 007: local, read-only public media + private custody.

No dependencies beyond Python 3.8+. Not a sandbox or a remote upload service.
Keep --root OUTSIDE public web roots, Git repositories, and synced public folders.
"""
import argparse
import datetime as dt
import hashlib
import http.server
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tempfile
import threading
import time
from urllib.parse import urlsplit

ALLOWED = {
    ".mp4": ("video/mp4", "video"), ".m4v": ("video/mp4", "video"),
    ".webm": ("video/webm", "video"), ".mov": ("video/quicktime", "video"),
    ".mp3": ("audio/mpeg", "music"), ".m4a": ("audio/mp4", "music"),
    ".wav": ("audio/wav", "music"), ".flac": ("audio/flac", "music"),
    ".ogg": ("audio/ogg", "music"),
    ".jpg": ("image/jpeg", "images"), ".jpeg": ("image/jpeg", "images"),
    ".png": ("image/png", "images"), ".webp": ("image/webp", "images"),
    ".gif": ("image/gif", "images"),
    ".pdf": ("application/pdf", "documents"),
    ".zip": ("application/zip", "archive"),
}
HEX = re.compile(r"^[0-9a-f]{64}$")
MEDIA = re.compile(r"^/media/([0-9a-f]{64})(\.[a-z0-9]+)$")
REQUIRED_CHECKS = ("source_platform_terms_checked", "all_contributors_authorized",
                   "third_party_material_cleared", "likeness_voice_privacy_checked")
LICENSES = {
    "CC0-1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
    "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
    "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
    "CC-BY-NC-4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
    "CC-BY-NC-SA-4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
}

def iso_now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def paths(root):
    root = Path(root).resolve()
    return {
        "root": root,
        "hold_obj": root / "hold" / "objects",
        "hold_meta": root / "hold" / "records",
        "public_obj": root / "public" / "objects",
        "public_meta": root / "public" / "records",
    }

def initialize(root):
    p = paths(root)
    for key in ("hold_obj", "hold_meta", "public_obj", "public_meta"):
        p[key].mkdir(parents=True, exist_ok=True)
    return p

def atomic_json(path, obj):
    fd, temp = tempfile.mkstemp(prefix=".staging-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(obj, stream, sort_keys=True, indent=2, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, str(path))
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def sha256(path):
    h = hashlib.sha256()
    with open(str(path), "rb") as stream:
        while True:
            chunk = stream.read(1024 * 1024 * 4)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def read_json(path):
    with open(str(path), "r", encoding="utf-8") as stream:
        return json.load(stream)

def ingest(root, source):
    p = initialize(root)
    src = Path(source)
    if src.is_symlink() or not src.is_file() or not stat.S_ISREG(src.stat().st_mode):
        raise ValueError("ingest requires one regular non-symlink source file")
    ext = src.suffix.lower()
    if ext not in ALLOWED:
        raise ValueError("unapproved file type; only known inert media/document formats may enter")
    fd, temp = tempfile.mkstemp(prefix=".ingest-", dir=str(p["hold_obj"]))
    digest = hashlib.sha256()
    total = 0
    try:
        with open(str(src), "rb") as input_stream, os.fdopen(fd, "wb") as output:
            while True:
                chunk = input_stream.read(1024 * 1024 * 4)
                if not chunk:
                    break
                digest.update(chunk)
                output.write(chunk)
                total += len(chunk)
            output.flush()
            os.fsync(output.fileno())
        key = digest.hexdigest()
        obj = p["hold_obj"] / key
        if obj.exists():
            if obj.is_symlink() or sha256(obj) != key:
                raise ValueError("existing held object does not match its content address")
        else:
            os.replace(temp, str(obj))
        # Per-object private metadata. Original basename is PRIVATE, never served.
        meta = p["hold_meta"] / (key + ".json")
        if not meta.exists():
            atomic_json(meta, {"sha256": key, "original_filename": src.name,
                               "extension": ext, "size_bytes": total, "ingested_utc": iso_now(),
                               "state": "HOLD", "rights_status": "unreviewed"})
        return {"sha256": key, "bytes": total, "state": "HOLD",
                "already_published": (p["public_meta"] / (key + ".json")).exists()}
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def validate_packet(packet, key):
    if packet.get("source_sha256") != key:
        raise ValueError("packet source_sha256 differs from held object's digest")
    for field in ("title", "creator", "attestor", "attestation"):
        value = packet.get(field)
        if not isinstance(value, str) or not value.strip() or len(value) > 1000:
            raise ValueError("rights packet needs a bounded " + field)
    if packet["attestation"] != "I attest I have authority to grant the stated public reuse rights":
        raise ValueError("explicit operator authority attestation required")
    license_id = packet.get("license_id")
    if license_id not in LICENSES or packet.get("license_url") != LICENSES[license_id]:
        raise ValueError("license identifier and canonical URL must match a supported Creative Commons release")
    scope = packet.get("scope")
    if not isinstance(scope, dict) or scope.get("public_redistribution") is not True or scope.get("derivatives") is not True:
        raise ValueError("packet does not authorize public distribution and derivatives")
    # A Creative Commons NC license cannot simultaneously advertise commercial permission.
    if scope.get("commercial_use") is not (False if "-NC-" in license_id else True):
        raise ValueError("commercial scope conflicts with selected license")
    checks = packet.get("checks")
    if not isinstance(checks, dict) or any(checks.get(k) is not True for k in REQUIRED_CHECKS):
        raise ValueError("all source, collaborator, likeness and platform reviews must be affirmed")
    parents = packet.get("parents", [])
    if not isinstance(parents, list) or len(parents) > 32 or any(
            not isinstance(v, str) or not v.startswith("sha256:") or not HEX.fullmatch(v[7:])
            for v in parents):
        raise ValueError("parents must be bounded sha256:... identifiers")
    if any(v == "sha256:" + key for v in parents):
        raise ValueError("an asset cannot descend from itself")
    return parents

def release(root, key, packet_file, confirmation):
    if not HEX.fullmatch(key):
        raise ValueError("invalid content digest")
    if confirmation != key[:12]:
        raise ValueError("release requires --confirm with first 12 SHA-256 hex digits")
    p = initialize(root)
    held = p["hold_obj"] / key
    held_meta = p["hold_meta"] / (key + ".json")
    if not held.is_file() or held.is_symlink() or not held_meta.is_file():
        raise ValueError("no verified held asset")
    meta = read_json(held_meta)
    if sha256(held) != key:
        raise ValueError("held bytes changed since admission; refusing release")
    ext = meta.get("extension")
    if ext not in ALLOWED:
        raise ValueError("unknown media type")
    packet = read_json(packet_file)
    parents = validate_packet(packet, key)
    public_record = p["public_meta"] / (key + ".json")
    if public_record.exists():
        raise ValueError("already released; releases are immutable, not overwritten")
    dest = p["public_obj"] / (key + ext)
    fd, temp = tempfile.mkstemp(prefix=".release-", dir=str(p["public_obj"]))
    try:
        with open(str(held), "rb") as input_stream, os.fdopen(fd, "wb") as output:
            shutil.copyfileobj(input_stream, output, 1024 * 1024 * 4)
            output.flush()
            os.fsync(output.fileno())
        if sha256(temp) != key:
            raise ValueError("released object failed integrity check")
        if dest.exists():
            raise ValueError("destination exists; refusing overwrite")
        os.replace(temp, str(dest))
        record = {
            "id": "sha256:" + key, "sha256": key, "filename": key + ext,
            "kind": ALLOWED[ext][1], "size_bytes": dest.stat().st_size,
            "title": packet["title"], "creator": packet["creator"],
            "parents": parents, "availability": "published-cleared",
            "rights": {
                "status": "cleared", "allow_remix": True,
                "license_id": packet["license_id"], "license_url": packet["license_url"],
                "attribution": str(packet.get("attribution", packet["creator"]))[:2000],
                "scope": packet["scope"], "release_attested_by": packet["attestor"],
                "reviewed_utc": iso_now(), "system_verified": False,
            }
        }
        atomic_json(public_record, record)
        return {"released": record["id"], "public_filename": record["filename"],
                "note": "operator-attested, not independently verified rights"}
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

def list_public(root, public_base):
    p = paths(root)
    records = []
    if not p["public_meta"].exists():
        return {"schema_version": "commons.catalog.v0.1", "entries": []}
    for record_path in sorted(p["public_meta"].glob("*.json")):
        if record_path.is_symlink():
            continue
        try:
            r = read_json(record_path)
            key = r.get("sha256", "")
            filename = r.get("filename", "")
            if (not HEX.fullmatch(key) or filename not in
                    [key + extension for extension in ALLOWED]):
                continue
            if record_path.name != key + ".json":
                continue
            obj = p["public_obj"] / filename
            if obj.is_symlink() or not obj.is_file() or obj.stat().st_size != r.get("size_bytes"):
                continue
            if r.get("rights", {}).get("status") != "cleared":
                continue
            r["asset_url"] = public_base.rstrip("/") + "/media/" + filename
            r["preview_url"] = r["asset_url"]
            records.append(r)
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            continue
    return {"schema_version": "commons.catalog.v0.1", "entries": records}

def parse_range(header, size):
    if header is None:
        return 0, size - 1, False
    if not header.startswith("bytes=") or "," in header:
        raise ValueError("only one bytes range is supported")
    value = header[6:]
    match = re.fullmatch(r"(\d*)-(\d*)", value)
    if not match or not any(match.groups()):
        raise ValueError("malformed range")
    left, right = match.groups()
    if not left:
        suffix = int(right)
        if suffix <= 0:
            raise ValueError("empty suffix")
        start, end = max(0, size - suffix), size - 1
    else:
        start = int(left)
        end = min(size - 1, int(right)) if right else size - 1
    if start >= size or end < start or size < 1:
        raise ValueError("unsatisfiable range")
    return start, end, True

def make_handler(root, public_base, cors_origin, kib_per_sec, max_streams):
    p = paths(root)
    slots = threading.BoundedSemaphore(max_streams)
    class Handler(http.server.BaseHTTPRequestHandler):
        server_version = "FreeportHarbor/0.7"
        sys_version = ""
        def log_message(self, fmt, *args):
            # Avoid access-log tokens and queries. Never log local source paths.
            return
        def _cors(self):
            if self.headers.get("Origin") == cors_origin:
                self.send_header("Access-Control-Allow-Origin", cors_origin)
                self.send_header("Vary", "Origin")
        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Range")
            self.send_header("Content-Length", "0")
            self.end_headers()
        def do_POST(self):
            self.send_error(405, "Read-only server")
        def do_PUT(self):
            self.send_error(405, "Read-only server")
        def do_DELETE(self):
            self.send_error(405, "Read-only server")
        def do_HEAD(self):
            self._dispatch(True)
        def do_GET(self):
            self._dispatch(False)
        def _dispatch(self, head):
            route = urlsplit(self.path).path
            if route == "/healthz":
                self._bytes(b"ok\n", "text/plain; charset=utf-8", head, "no-store")
                return
            if route == "/v1/catalog.json":
                data = json.dumps(list_public(root, public_base), separators=(",", ":"), ensure_ascii=False)
                self._bytes(data.encode("utf-8"), "application/json; charset=utf-8", head, "no-store")
                return
            match = MEDIA.fullmatch(route)
            if match:
                self._media(match.group(1), match.group(2), head)
                return
            self.send_error(404, "Not found")
        def _bytes(self, payload, content_type, head, caching):
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", content_type)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", caching)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            if not head:
                self.wfile.write(payload)
        def _media(self, key, ext, head):
            if ext not in ALLOWED:
                self.send_error(404, "Not found")
                return
            record_path = p["public_meta"] / (key + ".json")
            if not record_path.is_file() or record_path.is_symlink():
                self.send_error(404, "Not found")
                return
            try:
                r = read_json(record_path)
                if (r.get("sha256") != key or r.get("filename") != key + ext
                    or r.get("availability") != "published-cleared"
                    or r.get("rights", {}).get("status") != "cleared"):
                    raise ValueError("public record inconsistent")
                obj = p["public_obj"] / (key + ext)
                if obj.is_symlink() or not obj.is_file():
                    raise ValueError("object missing or symlink")
                size = obj.stat().st_size
                if size <= 0 or size != r.get("size_bytes"):
                    raise ValueError("public object size changed")
            except (OSError, ValueError, json.JSONDecodeError):
                self.send_error(404, "Not found")
                return
            try:
                start, end, partial = parse_range(self.headers.get("Range"), size)
            except ValueError:
                self.send_response(416)
                self._cors()
                self.send_header("Content-Range", "bytes */" + str(size))
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            if not head and not slots.acquire(blocking=False):
                self.send_response(503)
                self.send_header("Retry-After", "3")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            try:
                self.send_response(206 if partial else 200)
                self._cors()
                self.send_header("Content-Type", ALLOWED[ext][0])
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Cache-Control", "public, max-age=31536000, immutable")
                self.send_header("Content-Disposition", "attachment" if ext in (".pdf", ".zip") else "inline")
                self.send_header("Content-Length", str(end - start + 1))
                if partial:
                    self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
                self.end_headers()
                if not head:
                    with open(str(obj), "rb") as stream:
                        stream.seek(start)
                        remaining = end - start + 1
                        while remaining:
                            chunk = stream.read(min(256 * 1024, remaining))
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            remaining -= len(chunk)
                            if kib_per_sec > 0:
                                time.sleep(len(chunk) / float(kib_per_sec * 1024))
            except (BrokenPipeError, ConnectionResetError, OSError):
                return
            finally:
                if not head:
                    slots.release()
    return Handler

def mirror(root, destination):
    p = paths(root)
    source = p["root"]
    target = Path(destination).resolve()
    if source == target or source in target.parents or target in source.parents:
        raise ValueError("mirror target must be a separate, non-nested directory")
    copied = 0
    for group in ("hold_obj", "hold_meta", "public_obj", "public_meta"):
        folder = p[group]
        if not folder.is_dir():
            continue
        dest_dir = target / folder.relative_to(source)
        dest_dir.mkdir(parents=True, exist_ok=True)
        for file in sorted(folder.iterdir()):
            if file.is_symlink() or not file.is_file():
                continue
            dest = dest_dir / file.name
            original_hash = sha256(file)
            if dest.exists():
                if dest.is_symlink() or sha256(dest) != original_hash:
                    raise ValueError("mirror collision at " + file.name)
                continue
            fd, temporary = tempfile.mkstemp(dir=str(dest_dir), prefix=".mirror-")
            try:
                with open(str(file), "rb") as i, os.fdopen(fd, "wb") as o:
                    shutil.copyfileobj(i, o, 1024 * 1024 * 4)
                    o.flush()
                    os.fsync(o.fileno())
                if sha256(temporary) != original_hash:
                    raise ValueError("mirror checksum mismatch")
                os.replace(temporary, str(dest))
                copied += 1
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
    return {"new_objects_and_records": copied, "note": "copy verified; mirror includes PRIVATE holding material; no removals"}

def cli(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, help="private absolute data directory, outside Git/web roots")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init")
    ingest_cmd = sub.add_parser("ingest")
    ingest_cmd.add_argument("file", help="one source file, not a folder")
    release_cmd = sub.add_parser("release")
    release_cmd.add_argument("sha256")
    release_cmd.add_argument("--packet", required=True)
    release_cmd.add_argument("--confirm", required=True, help="first twelve SHA-256 hex digits")
    serve_cmd = sub.add_parser("serve")
    serve_cmd.add_argument("--port", type=int, default=8766)
    serve_cmd.add_argument("--public-base", default="http://127.0.0.1:8766")
    serve_cmd.add_argument("--cors-origin", default="https://humkin.abundent.org")
    serve_cmd.add_argument("--rate-kib", type=int, default=1024, help="max KiB/s per media response, 0 disables")
    serve_cmd.add_argument("--max-streams", type=int, default=3)
    mirror_cmd = sub.add_parser("mirror")
    mirror_cmd.add_argument("--to", required=True, help="a distinct disk or mounted backup directory")
    args = parser.parse_args(argv)
    try:
        if args.command == "init":
            initialize(args.root)
            result = {"state": "initialized", "root": str(Path(args.root).resolve()), "public": "empty"}
        elif args.command == "ingest":
            result = ingest(args.root, args.file)
        elif args.command == "release":
            result = release(args.root, args.sha256, args.packet, args.confirm)
        elif args.command == "mirror":
            result = mirror(args.root, args.to)
        elif args.command == "serve":
            if args.port < 1024 or args.port > 65535:
                raise ValueError("choose a port between 1024 and 65535")
            if args.max_streams < 1 or args.max_streams > 16 or args.rate_kib < 0:
                raise ValueError("invalid stream limits")
            if not (args.public_base.startswith("https://") or
                    args.public_base.startswith("http://127.0.0.1:")):
                raise ValueError("public-base must be HTTPS or local loopback")
            initialize(args.root)
            cls = make_handler(args.root, args.public_base, args.cors_origin,
                               args.rate_kib, args.max_streams)
            httpd = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), cls)
            print("Read-only local harbor: http://127.0.0.1:%d" % args.port, flush=True)
            print("No remote upload endpoint or open incoming port; requires explicit secure tunnel to share.", flush=True)
            try:
                httpd.serve_forever(poll_interval=0.1)
            except KeyboardInterrupt:
                pass
            finally:
                httpd.server_close()
            return 0
        else:
            parser.error("unknown action")
        print(json.dumps(result, indent=2))
        return 0
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        parser.exit(2, "Harbor refused: %s\n" % str(exc))

if __name__ == "__main__":
    cli()
