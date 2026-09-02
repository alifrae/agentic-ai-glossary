import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_content import validate_repo


ROOT = Path(__file__).resolve().parents[1]


class ContentValidationTests(unittest.TestCase):
    def test_repository_content_is_consistent(self):
        self.assertEqual(validate_repo(ROOT), [])

    def test_duplicate_terms_are_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "glossary-1.json").write_text(json.dumps({"entries": [{"term": "LLM"}, {"term": "llm"}]}), encoding="utf-8")
            errors = validate_repo(root)
            self.assertTrue(any("duplicate canonical term" in error.lower() for error in errors))

    def test_unresolved_wiki_key_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "glossary-1.json").write_text(json.dumps({"entries": [{"term": "LLM"}]}), encoding="utf-8")
            (root / "wiki-content.json").write_text(json.dumps({"version": 1, "entries": {"Unknown": {}}}), encoding="utf-8")
            errors = validate_repo(root)
            self.assertTrue(any("wiki key" in error.lower() and "unknown" in error.lower() for error in errors))

    def test_misconception_contract_is_validated(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "glossary-1.json").write_text(json.dumps({"entries": [{"term": "LLM"}]}), encoding="utf-8")
            (root / "misconceptions.json").write_text(json.dumps({"version": 1, "entries": [{"claim": "x", "verdict": "False", "short": "x", "related": ["Missing"]}]}), encoding="utf-8")
            errors = validate_repo(root)
            self.assertTrue(any("missing required field" in error.lower() and "detail" in error.lower() for error in errors))
            self.assertTrue(any("unresolved related term" in error.lower() and "missing" in error.lower() for error in errors))

    def test_priority_wiki_entries_and_verdicts_exist(self):
        wiki = json.loads((ROOT / "wiki-content.json").read_text(encoding="utf-8"))["entries"]
        required = {"LLM", "AI assistant", "Hallucination", "Agent", "Workflow", "RAG", "Context window", "KV cache", "MCP", "Eval", "World model", "AGI", "ASI"}
        self.assertTrue(required.issubset(set(wiki)))
        misconceptions = json.loads((ROOT / "misconceptions.json").read_text(encoding="utf-8"))["entries"]
        allowed = {"False", "Misleading", "Depends", "Reasonable but uncertain"}
        self.assertGreaterEqual(len(misconceptions), 12)
        self.assertTrue(all(item["verdict"] in allowed for item in misconceptions))


if __name__ == "__main__":
    unittest.main()
