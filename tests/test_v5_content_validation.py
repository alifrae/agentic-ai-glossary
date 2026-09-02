import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_v5_content import metadata_coverage, validate_repository


ROOT = Path(__file__).resolve().parents[1]


class V5ContentValidationTests(unittest.TestCase):
    def write_json(self, root, relative, payload):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    def make_fixture(self, metadata):
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        self.write_json(
            root,
            "glossary-1.json",
            {
                "entries": [
                    {
                        "term": "LLM",
                        "group": "Models",
                        "kind": "Acronym",
                        "definition": "A language model.",
                        "plain": "A model for language.",
                        "example": "Predict text.",
                        "aliases": ["Large Language Model"],
                        "related": ["Model"],
                    },
                    {
                        "term": "Model",
                        "group": "Models",
                        "kind": "Concept",
                        "definition": "A learned function.",
                        "plain": "A learned pattern machine.",
                        "example": "A neural network.",
                        "aliases": [],
                        "related": ["LLM"],
                    },
                ]
            },
        )
        self.write_json(root, "learning-paths.json", {"version": 1, "entries": {}})
        self.write_json(root, "glossary-metadata.json", {"entries": metadata})
        return temp, root

    def test_repository_metadata_file_exists_and_is_readable(self):
        self.assertTrue((ROOT / "glossary-metadata.json").exists())
        covered, total = metadata_coverage(ROOT)
        self.assertGreater(total, 0)
        self.assertGreaterEqual(covered, 0)

    def test_invalid_level_is_reported(self):
        temp, root = self.make_fixture(
            {
                "LLM": {
                    "level": "Expert",
                    "references": [{"title": "X", "url": "https://example.com"}],
                }
            }
        )
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("level" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_non_https_reference_is_reported(self):
        temp, root = self.make_fixture(
            {
                "LLM": {
                    "level": "Core",
                    "references": [{"title": "X", "url": "http://example.com"}],
                }
            }
        )
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("https" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_alias_only_metadata_key_is_reported(self):
        temp, root = self.make_fixture(
            {
                "Large Language Model": {
                    "level": "Core",
                    "references": [{"title": "X", "url": "https://example.com"}],
                }
            }
        )
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("canonical" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_missing_reference_title_is_reported(self):
        temp, root = self.make_fixture(
            {
                "LLM": {
                    "level": "Core",
                    "references": [{"title": "", "url": "https://example.com"}],
                }
            }
        )
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("title" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_full_coverage_gate_reports_uncovered_terms(self):
        temp, root = self.make_fixture(
            {
                "LLM": {
                    "level": "Core",
                    "references": [{"title": "X", "url": "https://example.com"}],
                }
            }
        )
        try:
            errors = validate_repository(root, require_full_coverage=True)
            self.assertTrue(any("coverage" in error.lower() for error in errors))
            covered, total = metadata_coverage(root)
            self.assertEqual((covered, total), (1, 2))
        finally:
            temp.cleanup()

    def test_complete_fixture_passes(self):
        temp, root = self.make_fixture(
            {
                "LLM": {
                    "level": "Core",
                    "references": [{"title": "Transformer paper", "url": "https://arxiv.org/abs/1706.03762"}],
                },
                "Model": {
                    "level": "Beginner",
                    "references": [{"title": "Deep Learning", "url": "https://www.deeplearningbook.org/"}],
                },
            }
        )
        try:
            self.assertEqual(validate_repository(root, require_full_coverage=True), [])
            self.assertEqual(metadata_coverage(root), (2, 2))
        finally:
            temp.cleanup()


if __name__ == "__main__":
    unittest.main()
