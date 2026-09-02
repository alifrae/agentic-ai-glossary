#!/usr/bin/env python3
"""Validate V5 glossary metadata coverage and reference structure."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
ALLOWED_LEVELS = {"Beginner", "Core", "Advanced"}
GLOSSARY_SHARD_RE = re.compile(r"^glossary-\d+\.json$")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_glossary_entries(root: Path) -> list[dict]:
    entries: list[dict] = []
    paths = sorted(path for path in root.glob("glossary-*.json") if GLOSSARY_SHARD_RE.match(path.name))
    for path in paths:
        payload = load_json(path)
        shard_entries = payload.get("entries", []) if isinstance(payload, dict) else []
        if isinstance(shard_entries, list):
            entries.extend(entry for entry in shard_entries if isinstance(entry, dict))
    return entries


def load_metadata(root: Path) -> dict[str, dict]:
    path = root / "glossary-metadata.json"
    if not path.exists():
        return {}
    payload = load_json(path)
    entries = payload.get("entries", {})
    return entries if isinstance(entries, dict) else {}


def canonical_terms(root: Path) -> set[str]:
    return {
        str(entry.get("term", "")).strip()
        for entry in load_glossary_entries(root)
        if str(entry.get("term", "")).strip()
    }


def alias_to_canonical(root: Path) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for entry in load_glossary_entries(root):
        canonical = str(entry.get("term", "")).strip()
        if not canonical:
            continue
        for alias in entry.get("aliases", []) or []:
            alias_text = str(alias).strip()
            if alias_text:
                aliases[alias_text] = canonical
    return aliases


def metadata_coverage(root: Path) -> tuple[int, int]:
    canonical = canonical_terms(root)
    metadata = load_metadata(root)
    covered = len(canonical.intersection(metadata.keys()))
    return covered, len(canonical)


def reference_hosts(root: Path) -> Counter[str]:
    hosts: Counter[str] = Counter()
    for record in load_metadata(root).values():
        if not isinstance(record, dict):
            continue
        for reference in record.get("references", []) or []:
            if not isinstance(reference, dict):
                continue
            url = str(reference.get("url", "")).strip()
            host = urlparse(url).hostname
            if host:
                hosts[host.lower()] += 1
    return hosts


def validate_repository(root: Path, require_full_coverage: bool = True) -> list[str]:
    errors: list[str] = []
    metadata_path = root / "glossary-metadata.json"
    if not metadata_path.exists():
        return ["glossary-metadata.json is missing"]

    try:
        raw_payload = load_json(metadata_path)
    except (json.JSONDecodeError, OSError) as exc:
        return [f"glossary-metadata.json is not valid JSON: {exc}"]

    metadata = raw_payload.get("entries", {})
    if not isinstance(metadata, dict):
        return ["glossary-metadata.json entries must be an object"]

    canonical = canonical_terms(root)
    aliases = alias_to_canonical(root)

    for key, record in metadata.items():
        if key not in canonical:
            if key in aliases:
                errors.append(f"Metadata key must use canonical term '{aliases[key]}', not alias '{key}'")
            else:
                errors.append(f"Metadata key does not resolve to a canonical glossary term: {key}")
            continue

        if not isinstance(record, dict):
            errors.append(f"Metadata for {key} must be an object")
            continue

        level = record.get("level")
        if level not in ALLOWED_LEVELS:
            errors.append(f"Metadata level for {key} must be one of {sorted(ALLOWED_LEVELS)}")

        references = record.get("references")
        if not isinstance(references, list) or not references:
            errors.append(f"Metadata references for {key} must contain at least one reference")
            continue

        for index, reference in enumerate(references):
            prefix = f"Reference {index + 1} for {key}"
            if not isinstance(reference, dict):
                errors.append(f"{prefix} must be an object")
                continue
            title = str(reference.get("title", "")).strip()
            url = str(reference.get("url", "")).strip()
            if not title:
                errors.append(f"{prefix} must have a non-empty title")
            if not url.startswith("https://"):
                errors.append(f"{prefix} must use an HTTPS URL")

    if require_full_coverage:
        covered, total = metadata_coverage(root)
        if covered != total:
            missing = sorted(canonical.difference(metadata.keys()))
            errors.append(
                f"Metadata coverage is {covered}/{total}; full coverage is required. "
                f"Missing: {', '.join(missing)}"
            )

    return errors


def print_report(root: Path) -> None:
    covered, total = metadata_coverage(root)
    percent = 100.0 if total == 0 else covered * 100.0 / total
    print(f"V5 metadata coverage: {covered}/{total} ({percent:.1f}%)")
    print("Reference hosts:")
    hosts = reference_hosts(root)
    if not hosts:
        print("  (none yet)")
    else:
        for host, count in sorted(hosts.items(), key=lambda item: (-item[1], item[0])):
            print(f"  {host}: {count}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--allow-partial-coverage",
        action="store_true",
        help="Validate present metadata but do not fail because canonical terms are still uncovered.",
    )
    args = parser.parse_args()

    errors = validate_repository(ROOT, require_full_coverage=not args.allow_partial_coverage)
    print_report(ROOT)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print("V5 metadata validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
