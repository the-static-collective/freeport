#!/usr/bin/env python3
"""Owned synthetic probe. Never imports or executes a foreign Git branch."""
import hashlib
import json
import re
import sys

HEX = re.compile(r"^[0-9a-f]{64}$")
SHA = re.compile(r"^[0-9a-f]{40}$")

try:
    value = json.load(sys.stdin)
    if type(value) is not dict or set(value) != {
        "schema", "mode", "packet_sha256", "source_excerpt_sha256", "source_commits"
    }:
        raise ValueError("PROBE_FIELDS")
    if value["schema"] != "freeport.synthetic-branch-probe/v0" or value["mode"] != "PROPOSAL_ONLY":
        raise ValueError("PROBE_SCOPE")
    if not isinstance(value["packet_sha256"], str) or not HEX.fullmatch(value["packet_sha256"]):
        raise ValueError("INVALID_PACKET_HASH")
    if type(value["source_excerpt_sha256"]) is not list or len(value["source_excerpt_sha256"]) != 2 or any(
        type(x) is not str or not HEX.fullmatch(x) for x in value["source_excerpt_sha256"]
    ):
        raise ValueError("INVALID_EXCERPT_HASHES")
    if type(value["source_commits"]) is not list or len(value["source_commits"]) != 2 or any(
        type(x) is not str or not SHA.fullmatch(x) for x in value["source_commits"]
    ):
        raise ValueError("INVALID_GIT_PINS")
    # No network access or branch module imports; input contains only digests.
    result = {
        "schema": "freeport.synthetic-branch-probe-result/v0",
        "status": "SYNTHETIC_BOUNDARY_CHECK_ONLY",
        "input_packet_sha256": value["packet_sha256"],
        "source_count": 2,
        "permitted_scope": "NO_FOREIGN_BRANCH_EXECUTION",
        "compatibility_proven": False,
        "merge_authorized": False,
        "receipt_signed": False,
        "candidate_admitted": False,
    }
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))
except Exception as error:
    print("REFUSED: " + str(error)[:120], file=sys.stderr)
    sys.exit(2)
