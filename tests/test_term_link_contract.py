import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class TermLinkContractTests(unittest.TestCase):
    def read(self, name):
        return (ROOT / name).read_text(encoding="utf-8")

    def run_node(self, assertions):
        source = (ROOT / "term-links.js").read_text(encoding="utf-8")
        script = f"""
        global.window = global;
        {source}
        const entries = [
          {{term:'Context', aliases:[]}},
          {{term:'Context window', aliases:['context length']}},
          {{term:'Model', aliases:['AI model']}},
          {{term:'Training', aliases:[]}}
        ];
        {assertions}
        """
        result = subprocess.run(
            ["node", "-e", script],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr or result.stdout)

    def test_asset_is_loaded_before_renderers(self):
        html = self.read("index.html")
        self.assertIn('src="term-links.js"', html)
        term_pos = html.index('src="term-links.js"')
        self.assertLess(term_pos, html.index('src="app.js"'))
        self.assertLess(term_pos, html.index('src="wiki.js"'))
        self.assertLess(term_pos, html.index('src="v4.js"'))

    def test_longest_match_wins_and_emits_canonical_deep_link(self):
        self.run_node("""
        const html = WikiTermLinks.render('The context window contains context.', {currentTerm:'Model', entries});
        if (!html.includes('#term=Context%20window')) throw new Error(html);
        const matches = html.match(/data-term-link/g) || [];
        if (matches.length !== 2) throw new Error('expected two links: ' + html);
        """)

    def test_self_links_are_suppressed(self):
        self.run_node("""
        const html = WikiTermLinks.render('A model can be an AI model.', {currentTerm:'Model', entries});
        if (html.includes('data-term-link')) throw new Error(html);
        """)

    def test_nolink_marker_renders_plain_text(self):
        self.run_node("""
        const html = WikiTermLinks.render('A [[nolink:Model]] can enter Training.', {currentTerm:'Context', entries});
        if (html.includes('nolink:')) throw new Error(html);
        if (html.includes('#term=Model')) throw new Error(html);
        if (!html.includes('>Training</a>')) throw new Error(html);
        """)

    def test_unresolved_nolink_marker_fails_safe(self):
        self.run_node("""
        const html = WikiTermLinks.render('Use [[nolink:ordinary word]] safely.', {currentTerm:'Context', entries});
        if (html.includes('nolink:')) throw new Error(html);
        if (!html.includes('ordinary word')) throw new Error(html);
        """)

    def test_generated_links_are_marked_not_to_open_parent_card(self):
        self.run_node("""
        const html = WikiTermLinks.render('Training changes a Model.', {currentTerm:'Context', entries});
        if (!html.includes('data-term-link')) throw new Error(html);
        if (!html.includes('data-no-open="true"')) throw new Error(html);
        """)


if __name__ == "__main__":
    unittest.main()
