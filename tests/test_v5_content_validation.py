import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_v5_content import canonical_terms, load_metadata, metadata_coverage, validate_repository


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
                    {"term":"LLM","group":"Models","kind":"Acronym","definition":"A language model.","plain":"A model for language.","example":"Predict text.","aliases":["Large Language Model"],"related":["Model"]},
                    {"term":"Model","group":"Models","kind":"Concept","definition":"A learned function.","plain":"A learned pattern machine.","example":"A neural network.","aliases":[],"related":["LLM"]},
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

    def test_model_compression_concepts_exist_with_metadata(self):
        terms = canonical_terms(ROOT)
        metadata = load_metadata(ROOT)
        for term in ["Distillation", "Pruning", "Quantization"]:
            self.assertIn(term, terms)
            self.assertIn(term, metadata)
            self.assertIn(metadata[term].get("level"), {"Beginner", "Core", "Advanced"})
            self.assertTrue(metadata[term].get("references"))

    def test_llm_mathematics_graph_and_teaching_sequence(self):
        topics = json.loads((ROOT / "content/topics.json").read_text(encoding="utf-8"))["topics"]
        topic = next(item for item in topics if item["id"] == "llm-mathematics")
        stages = topic.get("graphStages")
        self.assertIsInstance(stages, list)
        self.assertGreaterEqual(len(stages), 5)
        flattened = [term for stage in stages for term in stage]
        for term in ["Vector", "Embedding", "Attention", "Softmax", "Training", "Backpropagation", "Gradient descent", "Inference", "Sampling"]:
            self.assertIn(term, flattened)
            self.assertIn(term, canonical_terms(ROOT))

        article_ids = topic.get("articleIds", [])
        text = " ".join((ROOT / "content/articles" / f"{article_id}.json").read_text(encoding="utf-8") for article_id in article_ids).lower()
        for concept in ["vector", "attention", "softmax", "backpropagation", "gradient descent", "sampling", "worked-example", "eli5"]:
            self.assertIn(concept, text)

    def test_model_build_lifecycle_article_contract(self):
        path = ROOT / "content/articles/how-a-model-gets-built-end-to-end.json"
        self.assertTrue(path.exists())
        article = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(article.get("id"), "how-a-model-gets-built-end-to-end")
        self.assertIn("ai-foundations", article.get("topicIds", []))
        self.assertIn("ai-engineering", article.get("topicIds", []))
        text = json.dumps(article).lower()
        for token in ["data preparation", "tokenization", "pretraining", "fine-tuning", "rlhf", "not universal", "evaluation", "red-team", "deployment", "inference", "assistant product", "toy"]:
            self.assertIn(token, text)

    def test_invalid_level_is_reported(self):
        temp, root = self.make_fixture({"LLM":{"level":"Expert","references":[{"title":"X","url":"https://example.com"}]}})
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("level" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_non_https_reference_is_reported(self):
        temp, root = self.make_fixture({"LLM":{"level":"Core","references":[{"title":"X","url":"http://example.com"}]}})
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("https" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_alias_only_metadata_key_is_reported(self):
        temp, root = self.make_fixture({"Large Language Model":{"level":"Core","references":[{"title":"X","url":"https://example.com"}]}})
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("canonical" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_missing_reference_title_is_reported(self):
        temp, root = self.make_fixture({"LLM":{"level":"Core","references":[{"title":"","url":"https://example.com"}]}})
        try:
            errors = validate_repository(root, require_full_coverage=False)
            self.assertTrue(any("title" in error.lower() for error in errors))
        finally:
            temp.cleanup()

    def test_full_coverage_gate_reports_uncovered_terms(self):
        temp, root = self.make_fixture({"LLM":{"level":"Core","references":[{"title":"X","url":"https://example.com"}]}})
        try:
            errors = validate_repository(root, require_full_coverage=True)
            self.assertTrue(any("coverage" in error.lower() for error in errors))
            self.assertEqual(metadata_coverage(root), (1, 2))
        finally:
            temp.cleanup()

    def test_complete_fixture_passes(self):
        temp, root = self.make_fixture({
            "LLM":{"level":"Core","references":[{"title":"Transformer paper","url":"https://arxiv.org/abs/1706.03762"}]},
            "Model":{"level":"Beginner","references":[{"title":"Deep Learning","url":"https://www.deeplearningbook.org/"}]},
        })
        try:
            self.assertEqual(validate_repository(root, require_full_coverage=True), [])
            self.assertEqual(metadata_coverage(root), (2, 2))
        finally:
            temp.cleanup()


if __name__ == "__main__":
    unittest.main()
