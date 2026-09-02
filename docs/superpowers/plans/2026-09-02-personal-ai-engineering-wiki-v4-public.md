# Personal AI & Engineering Wiki V4 Public Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current glossary-first GitHub Pages app into a public personal AI & engineering wiki with topic hubs, long-form source-backed articles, global retrieval, LLM mathematics, agent protocols, Future AI/philosophy content, and enforceable privacy guardrails while preserving V3 learning behavior.

**Architecture:** Keep the existing framework-free HTML/CSS/JS application and glossary/localStorage model intact. Add manifest-driven public topic/article content under `content/`, a focused V4 presentation/search module, and Python validators that treat any project-specific public material as sanitized-only. Long-form content fails soft and never disables the existing glossary/Focus/review flow.

**Tech Stack:** Static HTML/CSS/JavaScript, JSON content, Python 3.12 validation/tests, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-02-personal-ai-engineering-wiki-v4-design.md`

## Global Constraints

- No framework, build step, backend, account system, database, or authentication layer.
- Preserve `agentic-ai-glossary.local.v1`, V3 local state, Focus/review behavior, and `#term=` deep links.
- All publishable runtime content must have public visibility only.
- Public project-specific pages require `projectSpecific: true` and `sanitized: true`.
- No private repository name, path, URL, ID, reverse pointer, or confidential metadata may ship in runtime content.
- References are first-class; substantial articles must expose References, Read more, and Advanced reading where appropriate.
- Future-AI/philosophy content must carry explicit epistemic status and avoid presenting contested claims as settled facts.
- Existing V3 tests remain green throughout.

---

### Task 1: Public identity and README

**Files:**
- Modify: `README.md`
- Modify: `index.html`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Consumes: existing V3 static shell and GitHub Pages deployment.
- Produces: `Personal AI & Engineering Wiki` product identity and a visible canonical Pages link in repository documentation.

- [ ] **Step 1: Add failing identity/README tests**

Add assertions that `README.md` contains `https://alifrae.github.io/agentic-ai-glossary/`, `Personal AI & Engineering Wiki`, `LLM Mathematics`, `Agent Protocols`, `Future AI`, and `AI & Humanity`; assert `index.html` contains the new product title/description.

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m unittest tests.test_static_contract -v`
Expected: failure because V4 README/index identity is not yet present.

- [ ] **Step 3: Update README and index identity**

README must explain public-only scope, current Wiki/Learn/ELI5 surfaces, V4 topic direction, privacy rule, authoring files, validation commands, and place the live site link near the top. Keep the repository name unchanged.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `python -m unittest tests.test_static_contract -v`
Expected: pass.

- [ ] **Step 5: Commit**

`git commit -m "docs: position repository as personal engineering wiki"`

---

### Task 2: Topic/article data model and graph validation

**Files:**
- Create: `content/topics.json`
- Create: `content/articles/index.json`
- Create: `scripts/validate_v4_content.py`
- Create: `tests/test_v4_content_validation.py`
- Modify: `.github/workflows/validate.yml`

**Interfaces:**
- Produces: topic objects `{id,title,summary,startHere,articleIds,relatedTopicIds,visibility}` and article manifest items `{id,path,topicIds,visibility}`.
- Validator entry point: `validate_repository(root: Path) -> list[str]`.

- [ ] **Step 1: Write failing validator tests**

Cover duplicate topic IDs, missing manifest article path, unresolved topic ID, invalid article visibility, unknown section type, broken `readNext`, invalid reference kind, project-specific article without sanitization, and a minimal valid fixture.

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m unittest tests.test_v4_content_validation -v`
Expected: import/file-not-found failures.

- [ ] **Step 3: Implement manifests and validator**

Allowed section types: `text`, `bullets`, `equation`, `worked-example`, `comparison`, `callout`, `scenario`, `self-check`.
Allowed reference kinds: `primary`, `explainer`, `advanced`, `historical`, `philosophy`.
Allowed epistemic statuses: `established-technical`, `active-scientific-question`, `philosophical-position`, `forecast-uncertain`, `speculative`, `mixed`.

- [ ] **Step 4: Run focused tests and repository validator**

Run: `python -m unittest tests.test_v4_content_validation -v && python scripts/validate_v4_content.py`
Expected: pass.

- [ ] **Step 5: Add CI steps and commit**

Add JSON syntax checks for `content/**/*.json` and run the V4 validator after existing V3 validation.

---

### Task 3: Fail-soft content loader

**Files:**
- Modify: `data-loader.js`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Produces globals: `window.__wikiTopics`, `window.__wikiArticles`, and event detail on existing `wiki:data-ready` flow.
- Article manifest is the only source of article paths.

- [ ] **Step 1: Add failing static contract tests**

Require `content/topics.json`, `content/articles/index.json`, manifest-driven article fetches, `__wikiTopics`, `__wikiArticles`, and `console.warn` fail-soft behavior.

- [ ] **Step 2: Run RED**

Run: `python -m unittest tests.test_static_contract.StaticContractTests.test_v4_content_loader_contract -v`

- [ ] **Step 3: Implement minimal loader extension**

Load topics and index independently; fetch only manifest paths; malformed/failed article loads are warned and skipped; existing glossary bundle and V3 enrichments always continue.

- [ ] **Step 4: Run GREEN and JS syntax check**

Run: `python -m unittest tests.test_static_contract -v && node --check data-loader.js`

- [ ] **Step 5: Commit**

`git commit -m "feat: load manifest-driven wiki content"`

---

### Task 4: Home, Topics, article renderer, and global search

**Files:**
- Create: `v4.js`
- Create: `v4.css`
- Modify: `index.html`
- Test: `tests/test_static_contract.py`

**Interfaces:**
- Hash routes: `#page=home`, `#page=topics`, `#topic=<id>`, `#article=<id>`; keep `#term=<term>` unchanged.
- Global result types: `Concept`, `Article`, `Topic`, `Misconception`.
- V3 `wiki.js` remains responsible for concept page/learn behavior; V4 orchestrates new surfaces and delegates concept links through existing hashes.

- [ ] **Step 1: Write failing V4 shell/search tests**

Assert nav labels `Home`, `Topics`, `Wiki`, `Learn`, `ELI5`; article renderer labels `References`, `Read more`, `Advanced reading`; support for all eight section types; global search index references glossary/topics/articles/misconceptions.

- [ ] **Step 2: Run RED**

Run focused static-contract tests.

- [ ] **Step 3: Implement V4 module and styles**

Home prioritizes global search and topic hubs. Topic pages render orientation/start-here/learning sequence/featured articles/related hubs. Article pages render structured sections, epistemic banner, references grouped by kind, read-next, and related glossary concepts. Equations use plain Unicode/math text in a horizontally scrollable element; do not add a math dependency in V4.

- [ ] **Step 4: Preserve V3 delegation**

Concept links always navigate through `#term=`; Learn/Focus remains driven by existing V3 code; no duplicate localStorage or scheduling logic.

- [ ] **Step 5: Run tests and syntax checks**

Run: `node --check v4.js && node --check wiki.js && python -m unittest discover -s tests -p 'test_*.py' -v`.

- [ ] **Step 6: Commit**

`git commit -m "feat: add topic hubs articles and global search"`

---

### Task 5: Initial source-backed V4 public content

**Files:**
- Create: `content/articles/llm-math-from-vectors-to-attention.json`
- Create: `content/articles/attention-mathematics.json`
- Create: `content/articles/llm-training-mathematics.json`
- Create: `content/articles/inference-and-sampling.json`
- Create: `content/articles/agent-protocols-mcp-acp-a2a.json`
- Create: `content/articles/agentic-system-model-agent-harness.json`
- Create: `content/articles/agi-asi-rsi-singularity.json`
- Create: `content/articles/ai-sentience-evidence.json`
- Create: `content/articles/intelligence-consciousness-sentience-sapience-agency.json`
- Create: `content/articles/pia-sanitized-overview.json`
- Create: `content/articles/sceneworks-sanitized-overview.json`
- Create: `content/articles/pcs-scene-studio-sanitized-overview.json`
- Modify: `content/articles/index.json`
- Modify: `content/topics.json`
- Modify/create glossary shard only for genuinely missing public concepts required by article relations.

**Interfaces:**
- Every article must validate against Task 2 schema.
- Mathematical articles use explicit shapes, tiny numerical examples, and related glossary terms.
- Project pages contain only high-level public/sanitized statements.

- [ ] **Step 1: Add/extend tests for flagship article presence**

Require all 12 article IDs, 11 hub IDs, references on substantial articles, and epistemic status on Future AI/AI & Humanity articles.

- [ ] **Step 2: Run RED**

Run: `python -m unittest tests.test_v4_content_validation -v`.

- [ ] **Step 3: Author content using primary/official sources first**

LLM math sources should include the Transformer paper and high-quality educational/official material; protocol sources should use current official MCP/ACP/A2A specs/docs; philosophical articles should distinguish empirical evidence from philosophical arguments and use serious primary/academic sources.

- [ ] **Step 4: Run validators/tests**

Run full unit suite + both content validators.

- [ ] **Step 5: Commit**

`git commit -m "content: add v4 flagship wiki articles"`

---

### Task 6: Privacy guardrail

**Files:**
- Create: `scripts/validate_privacy.py`
- Create: `tests/test_privacy_validation.py`
- Modify: `.github/workflows/validate.yml`

**Interfaces:**
- `validate_public_runtime(root: Path) -> list[str]` scans publishable runtime files only: `glossary-*.json`, `wiki-content.json`, `misconceptions.json`, `learning-paths.json`, `content/**/*.json`, and public JS/HTML data literals as needed.
- It does not scan design/plan documentation, because those documents describe policy rather than content shipped into the knowledge runtime.

- [ ] **Step 1: Write RED tests**

Reject `private://`, reserved keys `classification/privatePath/privateRepo/confidentialSource`, non-public visibility, projectSpecific without sanitized, and known private-repository URL patterns supplied to the validator fixture.

- [ ] **Step 2: Implement validator**

Default-deny project-specific runtime content unless sanitized. Do not attempt to infer secrets from ordinary words; the validator is a deterministic guardrail, not a DLP classifier.

- [ ] **Step 3: Run focused + full verification**

Run privacy tests, all unit tests, V3/V4 validators, JS syntax, and JSON syntax.

- [ ] **Step 4: Add CI and commit**

`git commit -m "test: enforce public wiki privacy boundary"`

---

### Task 7: Final integration and Pages verification

**Files:**
- Modify: `README.md` only if verification/authoring instructions need correction.

**Interfaces:**
- PR target: `main`.
- Pages URL: `https://alifrae.github.io/agentic-ai-glossary/`.

- [ ] **Step 1: Run final verification on feature head**

Commands represented in CI: JavaScript syntax, all JSON syntax, unit tests, V3 validator, V4 validator, privacy validator.

- [ ] **Step 2: Compare feature branch to main and review changed files**

No unrelated changes, no private metadata, no destructive localStorage migration.

- [ ] **Step 3: Open PR and require green PR workflow**

Summarize public V4, privacy boundary, article content, and verification evidence.

- [ ] **Step 4: Merge only after green**

Squash merge to `main` unless repository policy says otherwise.

- [ ] **Step 5: Verify post-merge validation and Pages deployment**

Both the validation workflow and `pages build and deployment` must conclude `success` for the merged SHA before completion is claimed.
