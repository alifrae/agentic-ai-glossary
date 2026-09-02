import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class StaticContractTests(unittest.TestCase):
    def read(self, name):
        return (ROOT / name).read_text(encoding="utf-8")

    def test_optional_wiki_data_is_loaded_fail_soft(self):
        loader = self.read("data-loader.js")
        self.assertIn("wiki-content.json", loader)
        self.assertIn("misconceptions.json", loader)
        self.assertIn("__wikiContent", loader)
        self.assertIn("__wikiMisconceptions", loader)
        self.assertIn("console.warn", loader)

    def test_wiki_assets_and_navigation_contract_exist(self):
        html = self.read("index.html")
        self.assertIn('href="wiki.css"', html)
        self.assertIn('src="wiki.js"', html)
        wiki = self.read("wiki.js")
        for token in ["Wiki", "Learn", "ELI5 & Misconceptions", "hashchange", "#term=", "#page=", '"eli5"']:
            self.assertIn(token, wiki)

    def test_learn_keeps_existing_concept_picker_flow(self):
        wiki = self.read("wiki.js")
        self.assertIn("main.append(wikiView, learnView, eli5View, wikiIndex)", wiki)
        self.assertIn("!shell.learnView.hidden", wiki)
        self.assertIn("row.click()", wiki)

    def test_rich_concept_sections_exist(self):
        wiki = self.read("wiki.js")
        for label in [
            "ELI5", "How it works", "Trade-offs", "Failure modes", "Engineering scenario",
            "What changes the decision?", "Check yourself", "Understand first",
            "Often confused with", "Related concepts", "Referenced by"
        ]:
            self.assertIn(label, wiki)

    def test_eli5_and_misconception_surface_exists(self):
        wiki = self.read("wiki.js")
        self.assertIn("ELI5 concepts", wiki)
        self.assertIn("Common misconceptions", wiki)
        for verdict in ["False", "Misleading", "Depends", "Reasonable but uncertain"]:
            self.assertIn(verdict, wiki)

    def test_existing_learning_invariants_remain(self):
        html = self.read("index.html")
        app = self.read("app.js")
        loader = self.read("data-loader.js")
        for element_id in ["searchInput", "focusDialog", "reviewBtn", "focusNowBtn"]:
            self.assertIn(f'id="{element_id}"', html)
        self.assertIn('agentic-ai-glossary.local.v1', app)
        self.assertIn('glossary-1.json', loader)
        self.assertIn('glossary-6.json', loader)
        self.assertIn("term=", app)


if __name__ == "__main__":
    unittest.main()
