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

    def test_v4_public_identity_and_readme(self):
        readme = self.read("README.md")
        html = self.read("index.html")
        for token in [
            "Personal AI & Engineering Wiki",
            "https://alifrae.github.io/agentic-ai-glossary/",
            "LLM Mathematics",
            "Agent Protocols",
            "Future AI",
            "AI & Humanity",
        ]:
            self.assertIn(token, readme)
        self.assertIn("Personal AI & Engineering Wiki", html)
        self.assertIn("AI foundations, agentic systems, protocols, future AI, and engineering", html)

    def test_v4_content_loader_contract(self):
        loader = self.read("data-loader.js")
        for token in [
            "content/topics.json",
            "content/articles/index.json",
            "__wikiTopics",
            "__wikiArticles",
            "article.path",
            "console.warn",
        ]:
            self.assertIn(token, loader)

    def test_v5_runtime_metadata_merge_contract(self):
        loader = self.read("data-loader.js")
        for token in [
            "glossary-metadata.json",
            "__wikiGlossaryMetadata",
            "prerequisites:",
            "level:",
            "references:",
        ]:
            self.assertIn(token, loader)

    def test_v5_self_contained_entry_surface(self):
        term_links = self.read("term-links.js")
        self.assertIn('href = "v5.css"', term_links)
        self.assertIn('src = "v5.js"', term_links)
        v5 = self.read("v5.js")
        for token in [
            "WikiTermLinks.render",
            "entry.level",
            "entry.prerequisites",
            "entry.references",
            "Further reading",
            "data-no-open",
            "noopener noreferrer",
            "MutationObserver",
            "#cardList",
            "#conceptContent",
        ]:
            self.assertIn(token, v5)

    def test_v5_llm_math_graph_renderer_contract(self):
        v5 = self.read("v5.js")
        for token in [
            "graphStages",
            "renderMathGraph",
            "<svg",
            "stageIndex",
            "nodeIndex",
            "entry.related",
            "data-v5-graph-term",
            "#v4TopicView",
        ]:
            self.assertIn(token, v5)

    def test_v4_shell_article_renderer_and_global_search(self):
        html = self.read("index.html")
        self.assertIn('href="v4.css"', html)
        self.assertIn('src="v4.js"', html)
        v4 = self.read("v4.js")
        for token in [
            "Home", "Topics", "Wiki", "Learn", "ELI5",
            "#page=home", "#page=topics", "#topic=", "#article=", "#term=",
            "Concept", "Article", "Topic", "Misconception",
            "window.__wikiGlossaryEntries", "window.__wikiTopics", "window.__wikiArticles", "window.__wikiMisconceptions",
            "References", "Read more", "Advanced reading",
            "text", "bullets", "equation", "worked-example", "comparison", "callout", "scenario", "self-check",
        ]:
            self.assertIn(token, v4)


if __name__ == "__main__":
    unittest.main()
