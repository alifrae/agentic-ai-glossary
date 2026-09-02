#!/usr/bin/env python3
"""Validate the static glossary/wiki content graph without third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ALLOWED_VERDICTS = {"False", "Misleading", "Depends", "Reasonable but uncertain"}
MISCONCEPTION_REQUIRED = ("claim", "verdict", "short", "detail", "related")
GLOSSARY_SHARD_RE = re.compile(r"^glossary-\d+\.json$")


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path.name}: {exc}") from exc


def _glossary_files(root: Path) -> list[Path]:
    return sorted(
        (path for path in root.glob("glossary-*.json") if GLOSSARY_SHARD_RE.match(path.name)),
        key=lambda p: p.name,
    )


def validate_repo(root: Path) -> list[str]:
    root = Path(root)
    errors: list[str] = []
    entries: list[dict[str, Any]] = []

    for path in _glossary_files(root):
        try:
            payload = _read_json(path)
        except ValueError as exc:
            errors.append(str(exc))
            continue
        shard_entries = payload.get("entries", []) if isinstance(payload, dict) else []
        if not isinstance(shard_entries, list):
            errors.append(f"{path.name}: entries must be a list")
            continue
        entries.extend(item for item in shard_entries if isinstance(item, dict))

    canonical: dict[str, str] = {}
    resolvable: dict[str, str] = {}
    for entry in entries:
        term = str(entry.get("term", "")).strip()
        if not term:
            errors.append("glossary entry missing term")
            continue
        key = term.casefold()
        if key in canonical:
            errors.append(f"duplicate canonical term: {term} conflicts with {canonical[key]}")
        else:
            canonical[key] = term
        resolvable.setdefault(key, term)
        aliases = entry.get("aliases", []) or []
        if isinstance(aliases, list):
            for alias in aliases:
                alias_text = str(alias).strip()
                if alias_text:
                    resolvable.setdefault(alias_text.casefold(), term)

    wiki_path = root / "wiki-content.json"
    if wiki_path.exists():
        try:
            wiki = _read_json(wiki_path)
            wiki_entries = wiki.get("entries", {}) if isinstance(wiki, dict) else {}
            if not isinstance(wiki_entries, dict):
                errors.append("wiki-content.json: entries must be an object")
            else:
                for key in wiki_entries:
                    if str(key).casefold() not in canonical:
                        errors.append(f"wiki key does not resolve to a canonical glossary term: {key}")
        except ValueError as exc:
            errors.append(str(exc))

    misconception_path = root / "misconceptions.json"
    if misconception_path.exists():
        try:
            payload = _read_json(misconception_path)
            items = payload.get("entries", []) if isinstance(payload, dict) else []
            if not isinstance(items, list):
                errors.append("misconceptions.json: entries must be a list")
            else:
                for index, item in enumerate(items):
                    if not isinstance(item, dict):
                        errors.append(f"misconception #{index + 1}: entry must be an object")
                        continue
                    for field in MISCONCEPTION_REQUIRED:
                        if field not in item or item[field] in (None, "", []):
                            errors.append(f"misconception #{index + 1}: missing required field {field}")
                    verdict = item.get("verdict")
                    if verdict and verdict not in ALLOWED_VERDICTS:
                        errors.append(f"misconception #{index + 1}: unsupported verdict {verdict}")
                    related = item.get("related", [])
                    if isinstance(related, list):
                        for term in related:
                            if str(term).casefold() not in resolvable:
                                errors.append(f"misconception #{index + 1}: unresolved related term {term}")
        except ValueError as exc:
            errors.append(str(exc))

    learning_path = root / "learning-paths.json"
    if learning_path.exists():
        try:
            payload = _read_json(learning_path)
            learning = payload.get("entries", {}) if isinstance(payload, dict) else {}
            if isinstance(learning, dict):
                for term, config in learning.items():
                    if str(term).casefold() not in resolvable:
                        errors.append(f"learning path key does not resolve: {term}")
                    if isinstance(config, dict):
                        for prereq in config.get("understandFirst", []) or []:
                            if str(prereq).casefold() not in resolvable:
                                errors.append(f"learning prerequisite does not resolve: {term} -> {prereq}")
        except ValueError as exc:
            errors.append(str(exc))

    return errors


def main() -> int:
    errors = validate_repo(Path.cwd())
    if errors:
        print("Content validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Content validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
