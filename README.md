# Agentic AI Glossary

A lightweight, mobile-friendly personal AI engineering wiki for vocabulary, mental models, architecture, failure modes, misconceptions, engineering scenarios, and things worth remembering.

The site intentionally stays **static and local-first**: no framework, build step, account, database, backend, or embedded GitHub credential.

## V3: wiki + learning

V3 keeps the fast glossary and the V2 focus/review system, but adds a deeper wiki layer for concepts that deserve more than a definition.

The site has three primary surfaces:

- **Wiki** — the dense searchable glossary plus rich concept pages.
- **Learn** — the existing focus-first flow with recall-before-reveal, prerequisites, review state, and the same concept picker.
- **ELI5 & Misconceptions** — simple mental models plus common claims classified as False, Misleading, Depends, or Reasonable but uncertain.

Important concepts can now expand into:

> ELI5 → definition → mental model → how it works → example → trade-offs → failure modes → engineering scenario → decision factors → self-check → prerequisites → confused-with → related concepts → backlinks

Compact terms remain compact. A protocol acronym, tool name, or piece of engineering slang does not need a long article unless deeper treatment adds value.

## Focus-first learning

The V2 learning behavior remains intact:

- **One active concept** — the page remembers what you were learning and makes Resume the default action.
- **Progressive disclosure** — Focus asks you to recall the concept before revealing the definition and example.
- **Simple learning states** — Not reviewed → Learning → Familiar → Solid.
- **Light review scheduling** — Still fuzzy = 1 day, Got it = 7 days, Solid = 30 days.
- **Memory hooks** — save the analogy or sentence that makes a concept stick.
- **Understand first** — prerequisite-aware learning paths show foundations before deeper concepts.
- **Often confused with** — explicitly capture concepts that are easy to mix up.
- **Related terms + backlinks** — relationships form a small navigable knowledge graph.
- **Parking lot** — capture a tangent without abandoning the current concept.
- **Deep links** — concept pages continue to use `#term=...` links.
- **Keyboard shortcuts** — `/` search, `f` resume focus, `p` park a tangent.

The site deliberately does **not** add timers, streaks, notifications, gamification, accounts, or a complicated spaced-repetition algorithm. The goal is to reduce cognitive overhead, not create another productivity system to maintain.

## Reference features

- Instant full-text search
- Filter by group, kind, and learning state
- Sort table columns
- Mobile card layout
- Rich concept pages for selected foundations
- ELI5 mental models
- Nuanced misconception cards
- Prerequisites, related terms, confused-with links, and backlinks
- Add/edit/hide entries locally
- Add personal notes/comments and memory hooks
- Hide/show columns and add custom columns
- Export JSON, CSV, or Markdown
- Import a JSON snapshot

## Data model

Canonical shared knowledge stays reviewable in Git and is deliberately split by responsibility:

- `glossary-*.json` — compact canonical vocabulary. Every concept starts here.
- `learning-paths.json` — prerequisite edges, memory hooks, and confused-with relationships used by the learning layer.
- `wiki-content.json` — optional long-form enrichment for selected canonical terms: mechanisms, trade-offs, failure modes, scenarios, decision factors, and self-checks.
- `misconceptions.json` — curated claims with nuanced verdicts and links back to canonical concepts.

Browser-specific state remains in `localStorage` under `agentic-ai-glossary.local.v1`, including:

- personal entry edits
- notes and memory hooks
- learning/review state
- recall sentences
- parking-lot items
- custom columns and display preferences

Existing local data is preserved; V3 does not replace the storage key or learning-state model.

Use **Data → Export JSON snapshot** to back up personal state or move it between devices.

## Authoring

### Add a normal glossary term

Add the term to an appropriate `glossary-*.json` shard with a concise definition, plain-English explanation, example, aliases, and useful relationships.

### Add a deep wiki page

First make sure the canonical term exists in a glossary shard. Then add the same canonical key to `wiki-content.json`. All enrichment fields are optional. Supported fields include:

- `howItWorks`
- `whenItMatters`
- `tradeoffs`
- `failureModes`
- `scenario` with `question`, `diagnosis`, and `resolution`
- `decisionChanges`
- `checkYourself` with `question` and `answer`
- `sources`

Do not expand every term merely for consistency. Depth should be earned by teaching value.

### Add a misconception

Add an item to `misconceptions.json` with:

- `claim`
- `verdict`
- `short`
- `detail`
- `related`

Allowed verdicts are:

- `False`
- `Misleading`
- `Depends`
- `Reasonable but uncertain`

Use the least absolute verdict supported by the evidence. The purpose is to teach distinctions, not manufacture binary myth/fact claims.

## Validation

The repository includes a lightweight standard-library content validator and CI checks. Before merging content changes, run:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/validate_content.py
node --check app.js
node --check data-loader.js
node --check wiki.js
```

The validator checks canonical-term uniqueness, wiki enrichment keys, misconception structure and references, and learning-path prerequisites. Optional enrichment also fails soft at runtime: if wiki or misconception data cannot be loaded, the base glossary remains usable.

## Run locally

Because the page loads JSON with `fetch`, use any tiny static HTTP server instead of opening `index.html` as a `file://` URL.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Useful deep links include:

- `#page=wiki`
- `#page=learn`
- `#page=eli5`
- `#term=LLM`

## GitHub Pages

Publish directly from the root of `main`:

1. Open **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Select **main** and **/(root)**
4. Save

Site: `https://alifrae.github.io/agentic-ai-glossary/`

## Design principle

Keep this repository a **small personal memory and learning system, not a CMS**.

Canonical knowledge stays reviewable in Git. Personal annotations and learning state stay local in the browser. Prefer a small amount of well-connected, high-quality content over mechanically expanding every term.
