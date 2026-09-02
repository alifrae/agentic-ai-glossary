# V5 Self-Contained Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every canonical glossary entry self-contained and navigable with automatic concept links, authoritative references, levels, prerequisites, an LLM-math concept graph, deeper math teaching, compression concepts, and an end-to-end model-building article.

**Architecture:** Keep glossary shards authoritative for concept prose, keep `learning-paths.json` authoritative for prerequisites, and add `glossary-metadata.json` as the only source for level/reference metadata. Add one focused vanilla-JS term-linking helper, merge metadata/prerequisites in `data-loader.js`, extend existing card/concept/article renderers, and keep the V4 static/no-build architecture. V5 reaches 100% metadata coverage before merge, but the backfill is staged in reviewable batches.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, JSON content, Python standard-library validators/tests, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-02-self-contained-entries-v5-design.md`

## Global Constraints

- No navigation redesign, accounts, gamification, backend, framework, build system, or external graph library.
- Existing localStorage key `agentic-ai-glossary.local.v1` and Learn/review behavior remain compatible.
- Every canonical glossary entry must have `level` plus at least one authoritative HTTPS reference before merge.
- Allowed levels are exactly `Beginner`, `Core`, `Advanced`.
- Prerequisites remain authoritative in `learning-paths.json`; do not duplicate them into metadata.
- Auto-link only glossary `definition`, `plain`, and `example`; skip self-links and support `[[nolink:...]]`.
- The LLM Mathematics graph is curated, stage-based, responsive, deterministic, and derives edges from canonical `related` relations.
- Existing V3, V4, privacy, syntax, and local-learning tests remain required.

---

### Task 1: V5 metadata validator, coverage report, and failing contracts

**Files:**
- Create: `scripts/validate_v5_content.py`
- Create: `tests/test_v5_content_validation.py`
- Modify: `tests/test_static_contract.py`
- Create initially: `glossary-metadata.json`
- Modify: `.github/workflows/validate.yml`

**Interfaces:**
- Consumes: canonical glossary shards `glossary-1.json` … `glossary-7.json`, `learning-paths.json`.
- Produces: `validate_repository(root: Path, require_full_coverage: bool = True) -> list[str]`, `metadata_coverage(root: Path) -> tuple[int, int]`, and a CLI report that prints coverage plus reference host counts.

- [ ] **Step 1: Write failing V5 validator tests**

Add tests that require:

```python
errors = validate_repository(ROOT, require_full_coverage=False)
covered, total = metadata_coverage(ROOT)
self.assertGreater(total, 0)
self.assertGreaterEqual(covered, 0)
```

Fixture tests must assert errors for:

```python
# invalid level
{"LLM": {"level": "Expert", "references": [{"title": "X", "url": "https://example.com"}]}}

# non-HTTPS URL
{"LLM": {"level": "Core", "references": [{"title": "X", "url": "http://example.com"}]}}

# alias-only key
{"Large Language Model": {"level": "Core", "references": [{"title": "X", "url": "https://example.com"}]}}
```

Also require the repository metadata file to exist and require `require_full_coverage=True` to report uncovered canonical terms until backfill is complete.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
python -m unittest tests.test_v5_content_validation -v
```

Expected: FAIL because `scripts.validate_v5_content` and/or `glossary-metadata.json` do not yet exist.

- [ ] **Step 3: Implement the validator and initial metadata file**

`glossary-metadata.json` starts as:

```json
{
  "entries": {}
}
```

`validate_v5_content.py` must:

```python
ALLOWED_LEVELS = {"Beginner", "Core", "Advanced"}

def metadata_coverage(root):
    canonical = load_canonical_terms(root)
    metadata = load_metadata(root)
    return len(canonical & metadata.keys()), len(canonical)

def validate_repository(root, require_full_coverage=True):
    # validate canonical keys, levels, reference title/url, and optional full coverage
    ...
```

The CLI prints:

```text
V5 metadata coverage: 17/143 (11.9%)
Reference hosts:
  arxiv.org: 8
  modelcontextprotocol.io: 4
...
```

- [ ] **Step 4: Extend CI in report-first mode**

Add:

```yaml
- name: Validate V5 content metadata
  run: python scripts/validate_v5_content.py --allow-partial-coverage
```

Do not enable the hard 100% gate until Task 9.

- [ ] **Step 5: Run V5 tests and existing suite**

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/validate_v5_content.py --allow-partial-coverage
```

Expected: PASS with a coverage report below 100%.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate_v5_content.py tests/test_v5_content_validation.py tests/test_static_contract.py glossary-metadata.json .github/workflows/validate.yml
git commit -m "test: define v5 metadata quality contract"
```

---

### Task 2: Merge metadata and prerequisites into runtime glossary entries

**Files:**
- Modify: `data-loader.js`
- Modify: `tests/test_static_contract.py`

**Interfaces:**
- Consumes: `glossary-metadata.json`, `learningPaths[term].understandFirst`.
- Produces runtime canonical entries containing `level: string`, `references: Array<{title,url}>`, `prerequisites: string[]` on `window.__wikiGlossaryEntries` and the intercepted `glossary.json` response.

- [ ] **Step 1: Write failing loader-contract test**

Require these tokens/behaviors in `data-loader.js`:

```python
for token in [
    "glossary-metadata.json",
    "__wikiGlossaryMetadata",
    "prerequisites:",
    "level:",
    "references:",
]:
    self.assertIn(token, loader)
```

- [ ] **Step 2: Run the static test to verify RED**

```bash
python -m unittest tests.test_static_contract.StaticContractTests.test_v5_runtime_metadata_merge_contract -v
```

Expected: FAIL.

- [ ] **Step 3: Implement fail-soft metadata loading**

Add:

```js
let glossaryMetadata = {};
window.__wikiGlossaryMetadata = window.__wikiGlossaryMetadata || {};

async function loadGlossaryMetadata() {
  const payload = await loadOptionalJson("glossary-metadata.json", { entries: {} }, "Glossary metadata");
  glossaryMetadata = payload?.entries && typeof payload.entries === "object" ? payload.entries : {};
  window.__wikiGlossaryMetadata = glossaryMetadata;
  return glossaryMetadata;
}
```

Include it in the existing `Promise.all` and merge:

```js
const meta = glossaryMetadata[entry.term] || {};
return {
  ...entry,
  level: meta.level || "",
  references: Array.isArray(meta.references) ? meta.references : [],
  prerequisites: unique(learning.understandFirst || []),
  memoryHook: entry.memoryHook || learning.memoryHook || "",
  confusedWith: unique([...(entry.confusedWith || []), ...(learning.confusedWith || [])])
};
```

- [ ] **Step 4: Verify fail-soft compatibility**

Run full tests and confirm the existing optional-data warning pattern still works when metadata is unavailable.

- [ ] **Step 5: Commit**

```bash
git add data-loader.js tests/test_static_contract.py
git commit -m "feat: merge glossary metadata and prerequisites"
```

---

### Task 3: Shared Wikipedia-style term linker with opt-out syntax

**Files:**
- Create: `term-links.js`
- Modify: `index.html`
- Modify: `.github/workflows/validate.yml`
- Create: `tests/test_term_link_contract.py`
- Modify: `tests/test_static_contract.py`

**Interfaces:**
- Produces global API:

```js
window.WikiTermLinks.render(text, { currentTerm = "", entries = [] } = {}) -> string
```

The returned string is safe HTML containing anchors with `href="#term=..."`, `data-term-link`, and `data-no-open="true"`.

- [ ] **Step 1: Write failing source-contract tests**

Require `term-links.js` to contain:

```text
WikiTermLinks
nolink
sort((a, b) => b.label.length - a.label.length
#term=
data-term-link
data-no-open
```

Require `index.html` to load `term-links.js` before `app.js`, `wiki.js`, and `v4.js`.

- [ ] **Step 2: Verify RED**

```bash
python -m unittest tests.test_term_link_contract tests.test_static_contract -v
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the focused helper**

Core algorithm:

```js
function buildDictionary(entries, currentTerm) {
  const self = String(currentTerm || "").toLowerCase();
  return entries.flatMap(entry => [entry.term, ...(entry.aliases || [])]
    .map(label => ({ label: String(label), canonical: entry.term })))
    .filter(item => item.label && item.canonical.toLowerCase() !== self)
    .sort((a, b) => b.label.length - a.label.length || a.label.localeCompare(b.label));
}
```

Protect `[[nolink:...]]` fragments with private placeholders, escape ordinary text, perform one-pass longest-match replacement without recursively processing generated markup, then restore protected plain text.

- [ ] **Step 4: Add Node syntax checking to CI**

```yaml
node --check term-links.js
```

- [ ] **Step 5: Verify tests and syntax**

```bash
node --check term-links.js
python -m unittest tests.test_term_link_contract tests.test_static_contract -v
```

- [ ] **Step 6: Commit**

```bash
git add term-links.js index.html .github/workflows/validate.yml tests/test_term_link_contract.py tests/test_static_contract.py
git commit -m "feat: add automatic glossary term linking"
```

---

### Task 4: Make compact cards and rich concept pages self-contained

**Files:**
- Modify: `app.js`
- Modify: `wiki.js`
- Modify: `styles.css`
- Modify: `wiki.css`
- Modify: `tests/test_static_contract.py`

**Interfaces:**
- Consumes runtime fields `entry.level`, `entry.references`, `entry.prerequisites` and `window.WikiTermLinks.render`.
- Produces card/concept-page UI with level badge, linked teaching text, prerequisite chips, and `Further reading`.

- [ ] **Step 1: Write failing UI contract tests**

Require `app.js` to contain:

```text
WikiTermLinks.render
entry.level
entry.prerequisites
Further reading
entry.references
```

Require `wiki.js` rich concept rendering to include `Further reading` and metadata level.

- [ ] **Step 2: Verify RED**

```bash
python -m unittest tests.test_static_contract -v
```

- [ ] **Step 3: Extend `normalize()` in `app.js`**

Preserve canonical fields:

```js
level: entry.level || (entry.localOnly ? "Local" : ""),
references: Array.isArray(entry.references) ? entry.references : [],
prerequisites: splitList(entry.prerequisites),
```

- [ ] **Step 4: Render teaching text through the linker**

Add:

```js
function linkedText(text, currentTerm) {
  return window.WikiTermLinks?.render(text, {
    currentTerm,
    entries: window.__wikiGlossaryEntries || []
  }) || escapeHtml(text);
}
```

Use it only for definition/plain/example fields. Do not use it for notes, source titles, equations, or local recall text.

- [ ] **Step 5: Add card metadata and Further reading**

Card body must render:

```html
<span class="tag level-badge">Core</span>
<div class="card-prerequisites">...</div>
<div class="card-further-reading">...</div>
```

Prerequisite chips use `href="#term=..."` or buttons carrying existing term-navigation attributes. Reference anchors use `target="_blank" rel="noopener noreferrer" data-no-open="true"`.

- [ ] **Step 6: Update rich concept pages**

In `wiki.js`, use the same runtime metadata and render a `Further reading` section after related/backlink content. Rich concept prose can remain escaped/plain in V5 unless it is one of the three auto-link scope fields.

- [ ] **Step 7: Style for mobile density**

Add compact spacing so prerequisites/references do not turn cards into oversized panels; cap visible card references at 2 with an accessible count/continuation if more exist.

- [ ] **Step 8: Verify full static suite and JS syntax**

```bash
node --check app.js
node --check wiki.js
python -m unittest discover -s tests -p 'test_*.py' -v
```

- [ ] **Step 9: Commit**

```bash
git add app.js wiki.js styles.css wiki.css tests/test_static_contract.py
git commit -m "feat: make glossary cards self-contained"
```

---

### Task 5: Canonical compression concepts and prerequisite relationships

**Files:**
- Modify: `glossary-7.json`
- Modify: `learning-paths.json`
- Modify: `glossary-metadata.json`
- Modify: `tests/test_v5_content_validation.py`

**Interfaces:**
- Produces canonical terms `Distillation`, `Pruning`, `Quantization` with aliases, related edges, metadata, and prerequisites.

- [ ] **Step 1: Write failing content test**

Require:

```python
for term in ["Distillation", "Pruning", "Quantization"]:
    self.assertIn(term, canonical_terms(ROOT))
    self.assertIn(term, load_metadata(ROOT))
```

- [ ] **Step 2: Verify RED**

```bash
python -m unittest tests.test_v5_content_validation -v
```

- [ ] **Step 3: Add canonical entries**

Use concise fields:

```json
{
  "term": "Distillation",
  "group": "Model Optimization",
  "kind": "Technique",
  "definition": "Knowledge distillation trains a smaller student model to reproduce useful behavior or output distributions from a larger teacher model.",
  "plain": "A large teacher helps train a smaller student so the smaller model keeps more capability than it would learn from labels alone.",
  "example": "A compact student can learn from the teacher's probability distribution over next tokens, not only the single highest-probability token.",
  "aliases": ["Knowledge distillation"],
  "related": ["Model", "Training", "Pruning", "Quantization"]
}
```

Add similarly precise entries for Pruning and Quantization.

- [ ] **Step 4: Add prerequisites**

Example:

```json
"Distillation": {"understandFirst": ["Model", "Training"], ...},
"Pruning": {"understandFirst": ["Weights"], ...},
"Quantization": {"understandFirst": ["Weights", "Inference"], ...}
```

- [ ] **Step 5: Add authoritative metadata**

Use the original Hinton et al. distillation paper for Distillation, original/authoritative pruning literature for Pruning, and an authoritative quantization paper/documentation source for Quantization.

- [ ] **Step 6: Verify V3/V5 graph integrity**

```bash
python scripts/validate_content.py
python scripts/validate_v5_content.py --allow-partial-coverage
```

- [ ] **Step 7: Commit**

```bash
git add glossary-7.json learning-paths.json glossary-metadata.json tests/test_v5_content_validation.py
git commit -m "content: add model compression concepts"
```

---

### Task 6: LLM Mathematics staged graph and teaching sequence

**Files:**
- Modify: `content/topics.json`
- Modify: `v4.js`
- Modify: `v4.css`
- Modify: existing LLM Mathematics article JSON files
- Modify if graph stages expose missing canonical concepts: `glossary-7.json`, `learning-paths.json`, `glossary-metadata.json`
- Modify: `tests/test_v4_content_validation.py`
- Modify: `tests/test_static_contract.py`

**Interfaces:**
- Consumes `topic.graphStages: string[][]` and canonical `related` arrays.
- Produces `renderConceptGraph(topic)` with deterministic SVG positions computed from stage/node index and click-to-`#term=` nodes.

- [ ] **Step 1: Write failing graph/content tests**

Require `llm-mathematics` topic to contain five ordered stages covering canonical terms for:

```text
vectors/representations
attention
softmax
gradient descent/backpropagation
sampling/inference
```

Require `v4.js` tokens/functions:

```text
graphStages
renderConceptGraph
<svg
related
data-v4-term
```

- [ ] **Step 2: Verify RED**

Run V4/V5 tests.

- [ ] **Step 3: Normalize missing math concepts**

If a graph-stage concept currently exists only as article prose, add the smallest canonical glossary entry required for clickable navigation. Do not add duplicates for concepts already resolvable by canonical term/alias.

- [ ] **Step 4: Add `graphStages` to `llm-mathematics`**

The final structure must use exact canonical term names and contain no hard-coded coordinates.

- [ ] **Step 5: Implement deterministic SVG rendering**

Use dimensions derived from stage count and maximum nodes per stage. Compute each node center from:

```js
const x = leftPad + stageIndex * stageGap;
const y = topPad + (nodeIndex + 1) * (height / (stage.length + 1));
```

Build edges only where `source.related` contains another graph node. Render edges first, then clickable node groups/anchors.

- [ ] **Step 6: Rework math articles into progressive depth**

Across the math hub/article sequence, make the pipeline explicit:

```text
ELI5 → mechanism → worked example
vectors → attention → softmax → backpropagation/gradient descent → sampling
```

Every stage must have an ordinary-language intuition before its first equation. Worked examples use hand-computable numbers.

- [ ] **Step 7: Verify graph/content validators and mobile CSS contract**

Run V4/V5/static tests plus JS syntax.

- [ ] **Step 8: Commit**

```bash
git add content/topics.json content/articles/*.json v4.js v4.css glossary-7.json learning-paths.json glossary-metadata.json tests
git commit -m "feat: add llm mathematics concept graph"
```

---

### Task 7: Add “How a model gets built, end to end”

**Files:**
- Create: `content/articles/how-a-model-gets-built-end-to-end.json`
- Modify: `content/articles/index.json`
- Modify: `content/topics.json`
- Modify: `tests/test_v4_content_validation.py`
- Modify: `tests/test_v5_content_validation.py`

**Interfaces:**
- Produces article ID `how-a-model-gets-built-end-to-end` in topics `ai-foundations` and `ai-engineering`.

- [ ] **Step 1: Write failing article contract test**

Require the article text/sections to include concepts equivalent to:

```text
pretraining
fine-tuning
RLHF or preference optimization
evaluation
deployment
```

Require at least one `worked-example`, at least one `self-check`, references, related terms, and read-next links.

- [ ] **Step 2: Verify RED**

Run the focused V4/V5 tests.

- [ ] **Step 3: Author the article with the existing schema**

Use this teaching order:

```text
ELI5 lifecycle
Data/tokenization
Pretraining
Supervised fine-tuning/adaptation
Post-training: preference optimization / RLHF caveat
Evaluation and red teaming
Deployment/inference
Toy lifecycle example
Failure modes/trade-offs
Base model vs assistant product
Self-check
Further reading
Read next
```

Toy example: a tiny fictional support model first learns generic text continuation from a small corpus, is fine-tuned on support Q&A pairs, preference-tuned to choose safer/helpful answers, evaluated on held-out support scenarios, then deployed behind an assistant interface with retrieval/tools kept conceptually separate from model weights.

- [ ] **Step 4: Use primary/official references**

Reference original/authoritative sources for Transformers/pretraining foundations, instruction tuning/RLHF where appropriate, evaluation, and deployment concepts. Do not imply one universal post-training recipe.

- [ ] **Step 5: Wire manifest and topics**

Add the article to `content/articles/index.json` and both topic article lists without duplicate IDs.

- [ ] **Step 6: Validate and commit**

```bash
python scripts/validate_v4_content.py
python scripts/validate_v5_content.py --allow-partial-coverage
git add content/articles/how-a-model-gets-built-end-to-end.json content/articles/index.json content/topics.json tests
git commit -m "content: explain model development end to end"
```

---

### Task 8: Full authoritative metadata backfill in reviewable batches

**Files:**
- Modify: `glossary-metadata.json`
- Optionally modify only incorrect/stale glossary prose discovered during source review: `glossary-*.json`

**Interfaces:**
- Produces exactly one metadata record for every canonical glossary term.

- [ ] **Step 1: Generate uncovered-term report**

Run:

```bash
python scripts/validate_v5_content.py --allow-partial-coverage
```

Capture the uncovered canonical terms grouped by glossary shard/group.

- [ ] **Step 2: Backfill AI/model/math terms**

Use source families such as original Transformer papers, authoritative ML textbooks/course materials, official model/provider documentation where the concept is provider-specific, and original optimization papers.

Run the validator and commit:

```bash
git commit -am "content: source ai and model concepts"
```

- [ ] **Step 3: Backfill agentic/protocol/API terms**

Prefer official MCP/A2A/ACP specifications, protocol documentation, official API/schema documentation, and primary system papers where applicable. Validate and commit:

```bash
git commit -am "content: source agentic and protocol concepts"
```

- [ ] **Step 4: Backfill evaluation/safety/engineering terms**

Use original benchmark/evaluation papers, standards, official documentation, or authoritative engineering references. Validate and commit:

```bash
git commit -am "content: source evaluation and engineering concepts"
```

- [ ] **Step 5: Backfill remaining terminology/product/future-AI terms**

For product terms use official product documentation; for philosophical/future concepts use authoritative original/academic references and keep epistemic distinctions intact. Validate and commit:

```bash
git commit -am "content: complete glossary source coverage"
```

- [ ] **Step 6: Review reference-host report manually**

Inspect the validator output for suspicious hosts, accidental aggregators, or overly repeated generic sources. Replace weak sources before enabling the hard gate.

- [ ] **Step 7: Verify 100% coverage**

```bash
python scripts/validate_v5_content.py
```

Expected output includes:

```text
V5 metadata coverage: <N>/<N> (100.0%)
```

---

### Task 9: Enable hard V5 gate, document authoring rules, and final regression verification

**Files:**
- Modify: `.github/workflows/validate.yml`
- Modify: `README.md`
- Modify: tests if needed for final README/CI contract

**Interfaces:**
- Produces merge-blocking 100% V5 validation.

- [ ] **Step 1: Switch CI from partial to full coverage**

Replace:

```yaml
python scripts/validate_v5_content.py --allow-partial-coverage
```

with:

```yaml
python scripts/validate_v5_content.py
```

- [ ] **Step 2: Update README authoring section**

Document:

```text
- every canonical entry needs Beginner/Core/Advanced metadata
- every entry needs at least one authoritative HTTPS reference
- prerequisites live only in learning-paths.json
- [[nolink:Model]] suppresses an unwanted automatic link
- source quality is manually reviewed; CI reports structure/hosts but does not infer authority
- graphStages is curated teaching data, not a general graph database
```

- [ ] **Step 3: Run the complete validation matrix fresh**

```bash
node --check app.js
node --check data-loader.js
node --check term-links.js
node --check wiki.js
node --check v4.js
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/validate_content.py
python scripts/validate_v4_content.py
python scripts/validate_v5_content.py
python scripts/validate_privacy.py
```

Expected: all commands exit 0; V5 coverage is 100%.

- [ ] **Step 4: Commit final gate/docs**

```bash
git add .github/workflows/validate.yml README.md tests
git commit -m "docs: enforce self-contained glossary quality"
```

---

### Task 10: PR, review, merge, and Pages verification

**Files:** none unless review finds a defect.

**Interfaces:** final integration into `main`.

- [ ] **Step 1: Compare branch with `main`**

Confirm branch is not behind and review changed-file scope for accidental navigation/private-data changes.

- [ ] **Step 2: Open PR**

PR summary must call out:

```text
- 100% glossary metadata/reference coverage
- automatic term links + nolink escape hatch
- card level/prerequisite/Further reading
- LLM Mathematics concept graph and progressive math pass
- Distillation/Pruning/Quantization
- end-to-end model lifecycle article
- unchanged navigation/privacy/local-learning contracts
```

- [ ] **Step 3: Require PR CI success**

Verify syntax, unit tests, V3/V4/V5 graphs/content, 100% metadata coverage, and privacy validation all pass on the PR head.

- [ ] **Step 4: Squash merge to `main`**

Use the expected PR head SHA to prevent merging stale code.

- [ ] **Step 5: Verify merged commit**

Confirm the post-merge validation workflow succeeds on the exact `main` commit.

- [ ] **Step 6: Verify GitHub Pages deployment**

Confirm Pages build and deploy succeed from the same final `main` commit and report the environment URL `https://alifrae.github.io/agentic-ai-glossary/`.
