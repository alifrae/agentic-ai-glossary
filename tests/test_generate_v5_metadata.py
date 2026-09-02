import json
import tempfile
import unittest
from pathlib import Path

from scripts.generate_v5_metadata import ALLOWED_LEVELS, build_metadata


class GenerateV5MetadataTests(unittest.TestCase):
    def write_json(self, root, name, payload):
        (root / name).write_text(json.dumps(payload), encoding="utf-8")

    def test_generation_covers_every_canonical_term_and_preserves_overrides(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_json(root, "glossary-1.json", {"entries": [
                {"term":"Agent","group":"Agent Architecture","kind":"Term"},
                {"term":"Prompt injection","group":"Control & Safety","kind":"Term"},
                {"term":"CUDA","group":"Local LLM Runtime","kind":"Platform"},
                {"term":"Softmax","group":"LLM Mathematics","kind":"Function"},
            ]})
            overrides = {
                "Softmax": {
                    "level": "Advanced",
                    "references": [{"title":"Custom authoritative source","url":"https://example.org/custom"}],
                }
            }
            metadata = build_metadata(root, overrides)
            self.assertEqual(set(metadata), {"Agent", "Prompt injection", "CUDA", "Softmax"})
            self.assertEqual(metadata["Softmax"], overrides["Softmax"])
            for record in metadata.values():
                self.assertIn(record["level"], ALLOWED_LEVELS)
                self.assertTrue(record["references"])
                for ref in record["references"]:
                    self.assertTrue(ref["title"].strip())
                    self.assertTrue(ref["url"].startswith("https://"))

    def test_source_families_are_not_placeholder_references(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.write_json(root, "glossary-1.json", {"entries": [
                {"term":"Agent","group":"Agent Architecture","kind":"Term"},
                {"term":"Regression test","group":"Evaluation","kind":"Term"},
                {"term":"API","group":"Interfaces","kind":"Acronym"},
                {"term":"Vibe coding","group":"Slang & Engineering","kind":"Slang"},
                {"term":"World model","group":"Models & Architecture","kind":"Concept"},
            ]})
            metadata = build_metadata(root, {})
            urls = [ref["url"] for record in metadata.values() for ref in record["references"]]
            self.assertFalse(any("example.com" in url for url in urls))
            self.assertGreaterEqual(len(set(urls)), 4)


if __name__ == "__main__":
    unittest.main()
