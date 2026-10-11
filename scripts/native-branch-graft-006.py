#!/usr/bin/env python3
"""Native Workbench OLD-GROWTH + GHoT declared synthetic adapter.

This helper never imports selected foreign branch files. It invokes only
two preselected, immutable, operator-reviewed original utility modules.
"""
from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

WORKBENCH_PIN = "16b0d5a2eb9c4c9b7da27f9ee1d8d8ba422a35a2"
GHOT_PIN = "e12ce3e62486feb1e5cd2324d1ae5a6a2be8b19b"
CAPABILITY = "freeport.synthetic.branch_graft_probe_v0"


def insist(condition: bool, code: str):
    if not condition:
        raise ValueError(code)


def pinned(root: Path, expected: str, label: str):
    observed = subprocess.check_output(
        ["git", "-C", str(root), "rev-parse", "HEAD"], timeout=10, text=True
    ).strip()
    insist(observed == expected, "PIN_MISMATCH_" + label)


def source_module(path: Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, path)
    insist(spec is not None and spec.loader is not None, "MODULE_NOT_FOUND")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    insist(len(sys.argv) == 4, "USAGE: WORKBENCH_ROOT GHOT_ROOT FREEPORT_ADAPTER_PATH")
    workbench_root, ghot_root, adapter = [Path(s).resolve(strict=True) for s in sys.argv[1:]]
    pinned(workbench_root, WORKBENCH_PIN, "WORKBENCH")
    pinned(ghot_root, GHOT_PIN, "GHOT")
    insist(adapter.name == "synthetic-graft-adapter-006.py", "UNKNOWN_ADAPTER")
    declared = json.load(sys.stdin)
    insist(set(declared) == {"sources", "declarations"}, "INPUT_FIELDS")
    insist(type(declared["sources"]) is list and len(declared["sources"]) == 2, "TWO_SOURCES_REQUIRED")
    keep = declared["declarations"]
    insist(set(keep) == {"keep", "bend", "question", "relation_lane", "move"}, "DECLARATION_FIELDS")

    # Invoke the exact donor module, not a Freeport imitation.
    old_growth = source_module(
        workbench_root / "static_workbench" / "old_growth.py",
        "original_workbench_old_growth_006",
    )
    calculated = old_growth.compose(
        declared["sources"][0], declared["sources"][1], **keep
    )
    insist(calculated["packet"]["authority"] == "none", "WORKBENCH_CLAIMS_AUTHORITY")
    insist(calculated["packet"]["candidate"]["status"] == "PROPOSED_UNRUN", "WORKBENCH_NOT_PROPOSAL")

    # Native GHoT execution is explicitly operator-allowlisted to exactly this
    # Freeport-owned synthetic JSON validator. Not arbitrary source code.
    sys.path.insert(0, str(ghot_root / "ghot"))
    import external_adapters  # original GHoT module from SHA-pinned checkout

    prior = os.environ.pop("GHOT_ADAPTER_MANIFESTS", None)
    try:
        insist(external_adapters.find_external_capability(CAPABILITY) is None,
               "UNEXPECTED_AMBIENT_ADAPTER")
        import tempfile
        with tempfile.TemporaryDirectory(prefix="freeport006-ghot-") as directory:
            path = Path(directory) / "adapter-manifest.json"
            path.write_text(json.dumps({
                "schema": "ghot.external-adapter-manifest/v0",
                "adapter_id": "freeport006.synthetic",
                "capabilities": [{
                    "capability": CAPABILITY,
                    "protocol": "stdin-json/stdout-json-v0",
                    "command": sys.executable,
                    "args": [str(adapter)],
                    "timeout_seconds": 5,
                    "limits": {"network": False, "arbitrary_shell": False,
                               "source_code_execution": False},
                }],
            }), encoding="utf-8")
            os.environ["GHOT_ADAPTER_MANIFESTS"] = str(path)
            if external_adapters.find_external_capability(CAPABILITY) is None:
                raise ValueError("ORIGINAL_GHOT_CAPABILITY_UNAVAILABLE")
            probe = {
                "schema": "freeport.synthetic-branch-probe/v0",
                "mode": "PROPOSAL_ONLY",
                "packet_sha256": calculated["packet_sha256"],
                "source_excerpt_sha256": calculated["receipt"]["source_excerpt_sha256"],
                "source_commits": [s["commit"] for s in declared["sources"]],
            }
            witness = external_adapters.execute_external_adapter(CAPABILITY, probe)
            insist(witness["result"]["status"] == "SYNTHETIC_BOUNDARY_CHECK_ONLY",
                   "UNEXPECTED_GHOT_RESULT")
            insist(witness["result"]["input_packet_sha256"] == calculated["packet_sha256"],
                   "GHOT_INPUT_NOT_BOUND")
            insist(witness["result"]["permitted_scope"] == "NO_FOREIGN_BRANCH_EXECUTION",
                   "GHOT_SCOPE_VIOLATION")
            # Discard temporary local manifest path: cold replay is path independent.
            summarized = {
                "kind": witness["kind"],
                "adapter_id": witness["adapter_id"],
                "capability": witness["capability"],
                "result": witness["result"],
                "laws": witness["laws"],
                "authority": "none",
                "execution_scope": "freeport-owned fixed synthetic adapter only",
                "foreign_source_code_executed": False,
            }
    finally:
        if prior is not None:
            os.environ["GHOT_ADAPTER_MANIFESTS"] = prior
        else:
            os.environ.pop("GHOT_ADAPTER_MANIFESTS", None)

    print(json.dumps({
        "schema": "freeport.native-graft-calculation/v0",
        "workbench": calculated,
        "ghot": summarized,
        "review_status": "PROPOSED_UNRUN",
        "foreign_branch_files_executed": 0,
        "merge_authorized": False,
        "destination_admitted": False,
        "owner_selects": False,
    }, sort_keys=True, separators=(",", ":"), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print("HOLD: " + str(exc)[:250], file=sys.stderr)
        raise SystemExit(1)
