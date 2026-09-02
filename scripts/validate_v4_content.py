#!/usr/bin/env python3
"""Validate V4 topic and long-form article content using only stdlib."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


ALLOWED_SECTION_TYPES = {
    "text",
    "bullets",
    "equation",
    "worked-example",
    "comparison",
    "callout",
    "scenario",
    "self-check",
}
ALLOWED_REFERENCE_KINDS = {"primary", "explainer", "advanced", "historical", "philosophy"}
ALLOWED_EPISTEMIC_STATUSES = {
    "established-technical",
    "active-scientific-question",
    "philosophical-position",
    "forecast-uncertain",
    "speculative",
    "mixed",
}
ALLOWED_LEVELS = {"beginner", "intermediate", "advanced"}
ALLOWED_ARTICLE_STATUSES = {"draft", "reviewed"}
HTTP_URL = re.compile(r"^https?://", re.IGNORECASE)
GLOSSARY_SHARD_RE = re.compile(r"^glossary-\d+\.json$")


def _load_json(path: Path, errors: list[str]) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        errors.append(f"Missing required file: {path}")
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {path}: {exc}")
    return None


def _duplicate_ids(items: list[dict[str, Any]], label: str, errors: list[str]) -> None:
    seen: set[str] = set()
    for item in items:
        item_id = str(item.get("id", "")).strip()
        if not item_id:
            errors.append(f"{label} is missing id")
            continue
        if item_id in seen:
            errors.append(f"Duplicate {label} id: {item_id}")
        seen.add(item_id)


def _load_glossary_terms(root: Path) -> set[str]:
    names: set[str] = set()
    paths = sorted(path for path in root.glob("glossary-*.json") if GLOSSARY_SHARD_RE.match(path.name))
    for path in paths:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        entries = payload.get("entries", []) if isinstance(payload, dict) else []
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            term = str(entry.get("term", "")).strip()
            if term:
                names.add(term.casefold())
            for alias in entry.get("aliases", []) or []:
                alias_text = str(alias).strip()
                if alias_text:
                    names.add(alias_text.casefold())
    return names


def _validate_reference(reference: Any, article_id: str, index: int, errors: list[str]) -> None:
    prefix = f"Article {article_id} reference {index}"
    if not isinstance(reference, dict):
        errors.append(f"{prefix} must be an object")
        return
    for field in ("title", "url", "publisher", "year", "kind"):
        if field not in reference or reference[field] in ("", None):
            errors.append(f"{prefix} missing required field {field}")
    kind = reference.get("kind")
    if kind not in ALLOWED_REFERENCE_KINDS:
        errors.append(f"{prefix} has invalid reference kind: {kind}")
    url = str(reference.get("url", ""))
    if url and not HTTP_URL.match(url):
        errors.append(f"{prefix} URL must be http(s): {url}")
    year = reference.get("year")
    if year is not None and not isinstance(year, int):
        errors.append(f"{prefix} year must be an integer")


def validate_repository(root: Path) -> list[str]:
    root = Path(root)
    errors: list[str] = []

    topics_payload = _load_json(root / "content/topics.json", errors)
    manifest_payload = _load_json(root / "content/articles/index.json", errors)
    if not isinstance(topics_payload, dict) or not isinstance(manifest_payload, dict):
        return errors

    topics = topics_payload.get("topics", [])
    manifest = manifest_payload.get("articles", [])
    if not isinstance(topics, list):
        errors.append("content/topics.json: topics must be a list")
        return errors
    if not isinstance(manifest, list):
        errors.append("content/articles/index.json: articles must be a list")
        return errors
    if not all(isinstance(item, dict) for item in topics):
        errors.append("Every topic must be an object")
        return errors
    if not all(isinstance(item, dict) for item in manifest):
        errors.append("Every article manifest item must be an object")
        return errors

    _duplicate_ids(topics, "topic", errors)
    _duplicate_ids(manifest, "article manifest", errors)

    topic_ids = {str(item.get("id", "")).strip() for item in topics if item.get("id")}
    manifest_by_id = {str(item.get("id", "")).strip(): item for item in manifest if item.get("id")}
    manifest_ids = set(manifest_by_id)

    for topic in topics:
        topic_id = str(topic.get("id", "")).strip() or "<missing>"
        if topic.get("visibility") != "public":
            errors.append(f"Topic {topic_id} visibility must be public")
        for field in ("title", "summary"):
            if not str(topic.get(field, "")).strip():
                errors.append(f"Topic {topic_id} missing {field}")
        for article_id in topic.get("articleIds", []) or []:
            if article_id not in manifest_ids:
                errors.append(f"Topic {topic_id} references unknown article {article_id}")
        for related_id in topic.get("relatedTopicIds", []) or []:
            if related_id not in topic_ids:
                errors.append(f"Topic {topic_id} references unknown related topic {related_id}")

    article_documents: dict[str, dict[str, Any]] = {}
    for item in manifest:
        article_id = str(item.get("id", "")).strip() or "<missing>"
        if item.get("visibility") != "public":
            errors.append(f"Article manifest {article_id} visibility must be public")
        path_text = str(item.get("path", "")).strip()
        if not path_text:
            errors.append(f"Article manifest {article_id} missing path")
            continue
        if not path_text.startswith("content/articles/") or path_text.endswith("/index.json"):
            errors.append(f"Article manifest {article_id} has invalid path: {path_text}")
            continue
        article_path = root / path_text
        if not article_path.exists():
            errors.append(f"Article manifest {article_id} path does not exist: {path_text}")
            continue
        article = _load_json(article_path, errors)
        if isinstance(article, dict):
            article_documents[article_id] = article

    glossary_terms = _load_glossary_terms(root)

    for article_id, article in article_documents.items():
        manifest_item = manifest_by_id[article_id]
        if article.get("id") != article_id:
            errors.append(f"Article {article_id} id does not match manifest")
        if article.get("visibility") != "public":
            errors.append(f"Article {article_id} visibility must be public")
        if article.get("level") not in ALLOWED_LEVELS:
            errors.append(f"Article {article_id} has invalid level: {article.get('level')}")
        if article.get("status") not in ALLOWED_ARTICLE_STATUSES:
            errors.append(f"Article {article_id} has invalid status: {article.get('status')}")
        if article.get("epistemicStatus") not in ALLOWED_EPISTEMIC_STATUSES:
            errors.append(f"Article {article_id} has invalid epistemicStatus: {article.get('epistemicStatus')}")
        if not str(article.get("title", "")).strip():
            errors.append(f"Article {article_id} missing title")
        if not str(article.get("summary", "")).strip():
            errors.append(f"Article {article_id} missing summary")
        if not str(article.get("eli5", "")).strip():
            errors.append(f"Article {article_id} missing eli5")

        article_topic_ids = article.get("topicIds", []) or []
        if set(article_topic_ids) != set(manifest_item.get("topicIds", []) or []):
            errors.append(f"Article {article_id} topicIds do not match manifest")
        for topic_id in article_topic_ids:
            if topic_id not in topic_ids:
                errors.append(f"Article {article_id} references unknown topic {topic_id}")

        sections = article.get("sections", [])
        if not isinstance(sections, list) or not sections:
            errors.append(f"Article {article_id} must contain sections")
        else:
            for index, section in enumerate(sections, start=1):
                if not isinstance(section, dict):
                    errors.append(f"Article {article_id} section {index} must be an object")
                    continue
                section_type = section.get("type")
                if section_type not in ALLOWED_SECTION_TYPES:
                    errors.append(f"Article {article_id} has unknown section type: {section_type}")

        references = article.get("references", [])
        if not isinstance(references, list) or not references:
            errors.append(f"Article {article_id} must contain references")
        else:
            for index, reference in enumerate(references, start=1):
                _validate_reference(reference, article_id, index, errors)

        for next_id in article.get("readNext", []) or []:
            if next_id not in manifest_ids:
                errors.append(f"Article {article_id} readNext references unknown article {next_id}")

        if glossary_terms:
            for term in article.get("relatedTerms", []) or []:
                if str(term).casefold() not in glossary_terms:
                    errors.append(f"Article {article_id} related term does not resolve: {term}")

        if article.get("projectSpecific") is True and article.get("sanitized") is not True:
            errors.append(f"Article {article_id} is projectSpecific but not sanitized")

    referenced_articles = {
        article_id
        for topic in topics
        for article_id in (topic.get("articleIds", []) or [])
    }
    for article_id in manifest_ids:
        if article_id not in referenced_articles:
            errors.append(f"Article {article_id} is orphaned from all topic hubs")

    return errors


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    errors = validate_repository(root)
    if errors:
        print("V4 content validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("V4 content validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
