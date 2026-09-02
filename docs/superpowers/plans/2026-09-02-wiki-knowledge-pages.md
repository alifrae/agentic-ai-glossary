# Wiki Knowledge Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static glossary into a lightweight wiki with rich concept pages plus a dedicated ELI5 & Misconceptions surface, without breaking the current focus/review workflow.

**Architecture:** Keep glossary shards as the canonical compact vocabulary layer. Load optional deep-dive content from `wiki-content.json` and curated claims from `misconceptions.json`; render them through hash-based page state in the existing single-page static app. Existing prerequisite, related, confused-with, backlink, learning, and localStorage behavior remains authoritative.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, JSON, Python standard-library validation, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-02-wiki-knowledge-pages-design.md`

## Global Constraints

- No framework, build step, backend, account, database, or credential.
- Preserve `agentic-ai-glossary.local.v1` localStorage data and migrations.
- Preserve existing `#term=...` deep links.
- Enrichment is optional: failure to load it must not prevent the glossary from working.
- Compact glossary terms must remain compact; long-form content is selective.
- Mobile-first layout; desktop should remain dense and useful.
- No runtime AI generation, scraping, CMS, gamification, or interview-question-bank behavior.

---

### Task 1: Add validation contract for wiki data

**Files:**
- Create: `scripts/validate_content.py`
- Create: `tests/test_content_validation.py`
- Create later in task: `wiki-content.json`, `misconceptions.json`

**Interfaces:**
- Consumes: `glossary-*.json`, `learning-paths.json`, optional `wiki-content.json`, optional `misconceptions.json`.
- Produces: `validate_repo(root: pathlib.Path) -> list[str]` where an empty list means valid content.

- [ ] **Step 1: Write failing validation tests**

```python
from pathlib import Path
from scripts.validate_content import validate_repo

ROOT = Path(__file__).resolve().parents[1]


def test_repository_content_is_consistent():
    assert validate_repo(ROOT) == []
```

Add focused temporary-fixture tests proving the validator reports: duplicate canonical terms, unresolved wiki keys, unresolved misconception `related` references, and missing required misconception fields.

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m unittest discover -s tests -p 'test_*.py' -v`

Expected: failure because `scripts.validate_content` does not exist.

- [ ] **Step 3: Implement minimal validator**

Implement JSON loading with the Python standard library. Build a case-insensitive map of canonical terms plus aliases. Validate duplicate canonical terms, `wiki-content.json` keys, misconception required fields (`claim`, `verdict`, `short`, `detail`, `related`), misconception related references, learning-path prerequisites, `related`, and `confusedWith` references when they target known glossary concepts. Return human-readable error strings instead of exiting from `validate_repo`; CLI exits nonzero if errors exist.

- [ ] **Step 4: Run tests and verify GREEN**

Run the unittest command above; expected PASS.

- [ ] **Step 5: Commit**

Commit message: `test: add wiki content validation contract`

---

### Task 2: Add canonical wiki enrichment and misconception datasets

**Files:**
- Create: `wiki-content.json`
- Create: `misconceptions.json`
- Modify: the smallest appropriate `glossary-*.json` shard only if canonical terms such as `Hallucination`, `World model`, `AGI`, `ASI`, or `AI assistant` are missing.
- Test: `tests/test_content_validation.py`

**Interfaces:**
- Produces: `wiki-content.json` shape `{ "version": 1, "entries": { "Canonical term": {...} } }`.
- Produces: `misconceptions.json` shape `{ "version": 1, "entries": [{claim, verdict, short, detail, related}] }`.

- [ ] **Step 1: Extend tests to assert priority enrichment exists**

Require enrichment for: `LLM`, `Agent`, `Workflow`, `RAG`, `Context window`, `KV cache`, `MCP`, `Eval`, `World model`, `AGI`, `ASI`, and a canonical assistant/product concept plus `Hallucination`.

Require misconception verdicts to be one of `False`, `Misleading`, `Depends`, `Reasonable but uncertain`.

- [ ] **Step 2: Run tests and verify RED**

Expected: missing-file / missing-entry failures.

- [ ] **Step 3: Add content**

For each enriched concept use optional fields only: `howItWorks`, `whenItMatters`, `tradeoffs`, `failureModes`, `scenario`, `decisionChanges`, `checkYourself`, `sources`.

Add the 12 misconceptions from the approved design, including the morning discussion about ChatGPT vs LLM, hallucination, sycophancy, uncertainty, next-token prediction, context memory, RAG, multi-agent systems, benchmarks, and AGI definitions.

- [ ] **Step 4: Run validator tests and verify GREEN**

Run unittest suite plus `python scripts/validate_content.py`.

- [ ] **Step 5: Commit**

Commit message: `content: add wiki deep dives and misconceptions`

---

### Task 3: Load enrichment as a fail-soft optional layer

**Files:**
- Modify: `data-loader.js`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Produces globals after load: `window.__wikiContent` (object keyed by canonical term) and `window.__wikiMisconceptions` (array).
- Keeps existing `window.__wikiLearningPaths` and `window.__wikiGlossaryEntries` behavior.

- [ ] **Step 1: Write failing static contract tests**

Use Python unittest to read `data-loader.js` and assert it references both enrichment files, initializes both globals, and contains fail-soft warning/fallback paths.

- [ ] **Step 2: Run tests and verify RED**

Expected: assertions fail because current loader only handles learning paths and glossary shards.

- [ ] **Step 3: Implement optional loaders**

Add a small `loadOptionalJson(file, fallback, label)` helper using `nativeFetch(..., {cache: "no-store"})`. Load enrichment in parallel with glossary/learning paths. A failure logs `console.warn` and assigns the fallback; it must not reject the synthetic `glossary.json` response.

- [ ] **Step 4: Run tests and verify GREEN**

Run all Python tests.

- [ ] **Step 5: Commit**

Commit message: `feat: load optional wiki enrichment data`

---

### Task 4: Add top-level Wiki / Learn / ELI5 navigation and rich concept container

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Page state: `wiki`, `learn`, `eli5`.
- Hash contract: `#page=eli5`, `#page=learn`, and `#term=<term>`; term deep links open the Wiki concept view.
- New DOM anchors: `#primaryNav`, `#wikiView`, `#learnView`, `#eli5View`, `#conceptPage`, `#conceptContent`.

- [ ] **Step 1: Write failing DOM/hash contract tests**

Assert the required DOM ids exist in `index.html`; assert `app.js` contains page-state/hash parsing and preserves `term` handling.

- [ ] **Step 2: Run tests and verify RED**

Expected: missing anchors/state handling.

- [ ] **Step 3: Implement page shells and navigation**

Keep the current glossary/search/table/card content under `wikiView`; keep focus/review controls under `learnView` or retain shared controls when they serve both views. Add a compact three-item nav. Do not duplicate the glossary data.

- [ ] **Step 4: Implement hash state**

Parse hash parameters without a router. `#term=LLM` selects Wiki and opens the matching concept. `#page=eli5` selects ELI5. Unknown pages fall back to Wiki. Browser back/forward must re-render state via `hashchange`.

- [ ] **Step 5: Run tests and verify GREEN**

Run all Python tests and `python scripts/validate_content.py`.

- [ ] **Step 6: Commit**

Commit message: `feat: add wiki navigation and page state`

---

### Task 5: Render rich concept pages using existing graph edges

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Add `renderConceptPage(entry)` and `wikiFor(entry)` helpers.
- Uses existing `resolveByTerm`, `learningFor`, `window.__wikiLearningPaths`, `entry.related`, `entry.confusedWith` and computed backlinks.

- [ ] **Step 1: Write failing rendering contract tests**

Assert source contains labels/sections for `ELI5`, `How it works`, `Trade-offs`, `Failure modes`, `Engineering scenario`, `What changes the decision?`, `Check yourself`, `Understand first`, `Often confused with`, `Related concepts`, and `Referenced by`.

- [ ] **Step 2: Run tests and verify RED**

Expected: rich concept rendering absent.

- [ ] **Step 3: Implement rich rendering**

Render only sections with data. Escape all canonical JSON/user text. Related/prerequisite/confused/backlink chips call the existing term-navigation path. Compact entries with no enrichment still show definition, plain explanation, example, memory hook, graph links, and learning state.

- [ ] **Step 4: Implement progressive self-check reveal**

`checkYourself.question` is visible; answer is hidden behind an accessible button/details element. This is for understanding, not scoring or gamification.

- [ ] **Step 5: Add responsive styling**

On phones, concept reading becomes a single-column full-width view with large tap targets. On desktop, cap reading width and use compact metadata/chip rows; do not recreate a dense documentation sidebar.

- [ ] **Step 6: Run tests and verify GREEN**

Run full validation/tests.

- [ ] **Step 7: Commit**

Commit message: `feat: render rich wiki concept pages`

---

### Task 6: Build ELI5 & Misconceptions surface

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Add `renderEli5Page()`.
- Curated ELI5 terms resolve from the existing glossary; misconception cards resolve `related` terms into concept chips.

- [ ] **Step 1: Write failing tests**

Assert `app.js` renders both an `ELI5 concepts` section and `Common misconceptions` section, recognizes all four verdict labels, and creates concept navigation from misconception related terms.

- [ ] **Step 2: Run tests and verify RED**

Expected: ELI5 renderer absent.

- [ ] **Step 3: Implement ELI5 cards**

Use canonical glossary `plain` and `memoryHook` fields rather than duplicating descriptions. Each card links to the full concept page. Missing optional curated terms are skipped safely.

- [ ] **Step 4: Implement misconception cards**

Display claim, verdict, short correction, expandable detail, and related concept chips. Style verdicts semantically without making uncertain/debated items look like binary fact checks.

- [ ] **Step 5: Run tests and verify GREEN**

Run all tests and validator.

- [ ] **Step 6: Commit**

Commit message: `feat: add eli5 and misconceptions page`

---

### Task 7: Documentation, accessibility and regression closure

**Files:**
- Modify: `README.md`
- Modify as needed after testing: `index.html`, `styles.css`, `app.js`, `data-loader.js`
- Test: all `tests/*.py`

**Interfaces:**
- README documents V3 authoring boundaries: glossary shards vs `wiki-content.json` vs `misconceptions.json`.

- [ ] **Step 1: Add regression tests for old invariants**

Assert current ids for focus/review/search remain present; storage key remains `agentic-ai-glossary.local.v1`; `#term=` support remains; glossary loader still loads all existing shards; no framework/build dependency was introduced.

- [ ] **Step 2: Run tests and verify RED only for any missing regression guards**

The test should fail only if the new implementation accidentally removed an invariant.

- [ ] **Step 3: Fix regressions and accessibility issues**

Ensure nav buttons expose selected state, interactive cards are keyboard reachable, reveal controls have accessible labels, and content sections use semantic headings.

- [ ] **Step 4: Update README**

Document V3 surfaces, authoring schema, validation command, GitHub Pages compatibility, and continued localStorage behavior.

- [ ] **Step 5: Final verification**

Run:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/validate_content.py
python -m json.tool wiki-content.json > /dev/null
python -m json.tool misconceptions.json > /dev/null
```

Also serve with `python -m http.server 8000` and smoke-check navigation/deep links in a browser if a browser runtime is available.

- [ ] **Step 6: Commit**

Commit message: `docs: document wiki v3 and close regressions`

---

## Completion criteria

- All validation/tests pass.
- `#term=` deep links still work.
- Existing localStorage key and learning-state model are unchanged.
- Wiki enrichment and misconceptions fail soft if unavailable.
- Priority concepts have rich pages; compact terms remain lightweight.
- ELI5 content is sourced from canonical glossary data.
- Misconceptions use nuanced verdicts rather than binary myth/fact only.
- GitHub Pages remains deployable directly from repository root.
