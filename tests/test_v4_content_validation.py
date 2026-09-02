import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_v4_content import validate_repository


ROOT = Path(__file__).resolve().parents[1]
FLAGSHIP_ARTICLES = {
    "llm-math-from-vectors-to-attention",
    "attention-mathematics",
    "llm-training-mathematics",
    "inference-and-sampling",
    "agent-protocols-mcp-acp-a2a",
    "agentic-system-model-agent-harness",
    "agi-asi-rsi-singularity",
    "ai-sentience-evidence",
    "intelligence-consciousness-sentience-sapience-agency",
    "pia-sanitized-overview",
    "sceneworks-sanitized-overview",
    "pcs-scene-studio-sanitized-overview",
}
TOPIC_HUBS = {
    "ai-foundations",
    "llm-mathematics",
    "agentic-ai",
    "agent-protocols",
    "ai-engineering",
    "future-ai",
    "ai-humanity",
    "systems-engineering",
    "pia",
    "sceneworks",
    "pcs-scene-studio",
}


class V4ContentValidationTests(unittest.TestCase):
    def write_json(self, root, relative, payload):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def minimal_topic(self, **overrides):
        topic = {
            "id": "ai-foundations",
            "title": "AI Foundations",
            "summary": "Foundational concepts.",
            "startHere": [],
            "articleIds": ["intro"],
            "relatedTopicIds": [],
            "visibility": "public",
        }
        topic.update(overrides)
        return topic

    def minimal_article(self, **overrides):
        article = {
            "id": "intro",
            "title": "Introduction",
            "topicIds": ["ai-foundations"],
            "level": "beginner",
            "status": "reviewed",
            "epistemicStatus": "established-technical",
            "reviewedAt": "2026-09-02",
            "summary": "A short introduction.",
            "eli5": "A simple explanation.",
            "sections": [{"type": "text", "heading": "Core idea", "body": "Text."}],
            "relatedTerms": [],
            "readNext": [],
            "references": [
                {
                    "title": "Primary source",
                    "url": "https://example.com/source",
                    "publisher": "Example",
                    "year": 2026,
                    "kind": "primary",
                }
            ],
            "visibility": "public",
        }
        article.update(overrides)
        return article

    def build_fixture(self, topic=None, article=None, manifest=None):
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        topic = topic or self.minimal_topic()
        article = article or self.minimal_article()
        manifest = manifest or {
            "articles": [
                {
                    "id": article["id"],
                    "path": "content/articles/intro.json",
                    "topicIds": article["topicIds"],
                    "visibility": "public",
                }
            ]
        }
        self.write_json(root, "content/topics.json", {"topics": [topic]})
        self.write_json(root, "content/articles/index.json", manifest)
        self.write_json(root, "content/articles/intro.json", article)
        return temp, root

    def test_repository_v4_content_is_consistent(self):
        self.assertEqual(validate_repository(ROOT), [])

    def test_flagship_articles_and_topic_hubs_exist(self):
        topics_payload = json.loads((ROOT / "content/topics.json").read_text(encoding="utf-8"))
        manifest_payload = json.loads((ROOT / "content/articles/index.json").read_text(encoding="utf-8"))
        topic_ids = {item["id"] for item in topics_payload["topics"]}
        article_ids = {item["id"] for item in manifest_payload["articles"]}
        self.assertTrue(TOPIC_HUBS.issubset(topic_ids))
        self.assertTrue(FLAGSHIP_ARTICLES.issubset(article_ids))
        for item in manifest_payload["articles"]:
            article = json.loads((ROOT / item["path"]).read_text(encoding="utf-8"))
            self.assertTrue(article.get("references"), item["id"])
            if set(article.get("topicIds", [])) & {"future-ai", "ai-humanity"}:
                self.assertIn(article.get("epistemicStatus"), {
                    "active-scientific-question",
                    "philosophical-position",
                    "forecast-uncertain",
                    "speculative",
                    "mixed",
                })

    def test_duplicate_topic_id_is_reported(self):
        temp, root = self.build_fixture()
        try:
            topic = self.minimal_topic()
            self.write_json(root, "content/topics.json", {"topics": [topic, topic]})
            self.assertTrue(any("duplicate topic id" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_missing_manifest_path_is_reported(self):
        temp, root = self.build_fixture()
        try:
            (root / "content/articles/intro.json").unlink()
            self.assertTrue(any("does not exist" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_unresolved_topic_is_reported(self):
        temp, root = self.build_fixture(article=self.minimal_article(topicIds=["missing-topic"]))
        try:
            self.assertTrue(any("unknown topic" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_invalid_visibility_is_reported(self):
        temp, root = self.build_fixture(article=self.minimal_article(visibility="private"))
        try:
            self.assertTrue(any("visibility" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_unknown_section_type_is_reported(self):
        temp, root = self.build_fixture(article=self.minimal_article(sections=[{"type": "magic", "body": "x"}]))
        try:
            self.assertTrue(any("section type" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_broken_read_next_is_reported(self):
        temp, root = self.build_fixture(article=self.minimal_article(readNext=["missing-article"]))
        try:
            self.assertTrue(any("readnext" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_invalid_reference_kind_is_reported(self):
        refs = [{"title": "X", "url": "https://example.com", "publisher": "X", "year": 2026, "kind": "random"}]
        temp, root = self.build_fixture(article=self.minimal_article(references=refs))
        try:
            self.assertTrue(any("reference kind" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()

    def test_project_specific_requires_sanitized(self):
        temp, root = self.build_fixture(article=self.minimal_article(projectSpecific=True, sanitized=False))
        try:
            self.assertTrue(any("sanitized" in item.lower() for item in validate_repository(root)))
        finally:
            temp.cleanup()


if __name__ == "__main__":
    unittest.main()
