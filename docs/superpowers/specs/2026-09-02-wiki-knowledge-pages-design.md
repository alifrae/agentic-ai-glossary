# Wiki Knowledge Pages Design

Date: 2026-09-02
Status: Proposed
Branch: `feat/wiki-knowledge-pages`

## Goal

Evolve the existing Agentic AI Glossary from a glossary-first reference into a lightweight personal AI engineering wiki without losing its current strengths: static hosting, local-first learning state, fast search, mobile usability, and Git-reviewable canonical knowledge.

The wiki should teach concepts, not only define terms. Important concepts should connect definitions to mechanisms, examples, trade-offs, failure modes, engineering scenarios, and misconceptions.

## Design constraints

1. Keep the repository static: HTML, CSS, JavaScript, JSON. No framework, build step, backend, account, database, or credential.
2. Preserve existing `localStorage` learning state and V1/V2 migration behavior.
3. Keep glossary shards as the compact canonical vocabulary layer.
4. Do not require every glossary entry to become a long article.
5. Optimize for mobile first, while making desktop browsing denser and faster.
6. Preserve deep links to concepts and existing focus/review behavior.
7. Avoid turning the site into interview-prep or a generic AI textbook.

## Approaches considered

### A. Expand every glossary entry directly

Add long-form fields such as `howItWorks`, `tradeoffs`, `failureModes`, and `scenario` to every glossary JSON entry.

**Pros:** one schema, simple lookup.

**Cons:** bloats glossary shards, makes lightweight terms expensive to maintain, and mixes vocabulary with article content.

### B. Separate wiki enrichment layer — recommended

Keep glossary entries compact and add an optional `wiki-content.json` keyed by canonical term. Only concepts that deserve deeper treatment receive enrichment.

**Pros:** preserves current data model, supports incremental depth, keeps glossary reviewable, and avoids forcing long content on acronyms/tools/slang.

**Cons:** requires a merge step in the client and consistency validation between glossary terms and wiki keys.

### C. Convert to a documentation framework

Move to MkDocs/Docusaurus/Astro and generate a conventional docs site.

**Pros:** mature navigation and content authoring.

**Cons:** violates the repository's static/no-build simplicity, complicates local edits, and duplicates functionality already present in the app.

**Decision:** Approach B.

## Information architecture

Add three first-class surfaces while preserving current search/focus/review functions:

1. **Wiki** — default reference view. Search and browse terms; opening a term shows a rich concept page when enrichment exists and a compact page otherwise.
2. **Learn** — existing focus/review/prerequisite flow, retained rather than rewritten.
3. **ELI5 & Misconceptions** — a dedicated page for simple mental models and common claims that need correction or nuance.

The existing table/card glossary remains useful as the high-density index behind the Wiki surface.

## Concept page

A concept page is built from the existing glossary entry plus optional enrichment.

Recommended order:

1. Term, group, kind, aliases
2. **ELI5 / 30-second explanation** — existing `plain` field
3. **Definition** — existing `definition`
4. **Mental model / memory hook** — existing `memoryHook`
5. **How it works** — enrichment
6. **Concrete example** — existing `example`, optionally extended
7. **When it matters / when to use it** — enrichment
8. **Trade-offs** — enrichment
9. **Failure modes** — enrichment
10. **Engineering scenario** — enrichment with question, diagnosis, and resolution
11. **What changes the decision?** — enrichment for decision-sensitive concepts
12. **Check yourself** — one short conceptual question with revealable answer
13. **Often confused with** — existing graph edge
14. **Prerequisites / understand first** — existing learning-path data
15. **Related concepts / backlinks** — existing graph edges
16. **Sources** — existing source plus optional enrichment sources

Sections are optional. A compact term remains compact if it has no enrichment.

## Wiki enrichment schema

Create `wiki-content.json`:

```json
{
  "version": 1,
  "entries": {
    "LLM": {
      "howItWorks": "...",
      "whenItMatters": "...",
      "tradeoffs": ["..."],
      "failureModes": ["..."],
      "scenario": {
        "question": "...",
        "diagnosis": "...",
        "resolution": "..."
      },
      "decisionChanges": ["..."],
      "checkYourself": {
        "question": "...",
        "answer": "..."
      },
      "sources": ["..."]
    }
  }
}
```

No new field is mandatory.

Initial enriched concepts should focus on high-value foundations rather than volume: LLM, ChatGPT/AI assistant, hallucination, agent, workflow, RAG, context window, KV cache, MCP, eval/benchmark, world model, AGI, and ASI.

## ELI5 & Misconceptions page

Add one dedicated page with two complementary sections.

### ELI5 concepts

Use existing glossary content wherever possible rather than maintaining duplicate explanations. Cards should show:

- term
- one-sentence `plain` explanation
- memory hook / analogy
- one related concept
- link to the full wiki page

Default curated ELI5 set:

- AI
- model
- neural network
- LLM
- ChatGPT / AI assistant
- token
- prompt
- context
- training vs inference
- hallucination
- agent
- tool
- memory
- RAG
- world model
- AGI
- ASI

### Misconceptions

Create a small canonical dataset `misconceptions.json` rather than encoding claims as glossary terms.

Each item:

```json
{
  "claim": "ChatGPT is just an LLM.",
  "verdict": "Misleading",
  "short": "The model is the intelligence engine; ChatGPT is a product/system around models, tools, context, memory and interfaces.",
  "detail": "...",
  "related": ["LLM", "Model", "Agent", "Harness"]
}
```

Initial misconceptions should include the themes discussed on 2026-09-02:

1. **“ChatGPT is an LLM.”** — incomplete: ChatGPT is a product/system powered by language/multimodal models plus orchestration, tools, context, memory and UI.
2. **“Hallucination means the model is randomly making things up.”** — misleading: hallucinations are fluent unsupported/incorrect generations; they arise from probabilistic generation and insufficient grounding, not necessarily random output.
3. **“LLMs always agree with the user / are yes-men.”** — false as an absolute; sycophancy is a real failure mode, but behavior depends on model, training, instructions, evidence and evaluation.
4. **“AI never says ‘I don’t know.’”** — false as an absolute; models can express uncertainty, but calibration is imperfect and confident errors remain possible.
5. **“Because an AI can be wrong, its advice is useless.”** — false generalization; reliability depends on domain, evidence, verification, stakes and deployment design.
6. **“An LLM is basically a database or search engine.”** — false; it generates from learned statistical representations, though products may add retrieval/search.
7. **“It only predicts the next token, so it cannot reason.”** — oversimplified; next-token prediction is the training/generation objective, not a complete description of the learned internal computations or resulting capabilities.
8. **“A bigger context window gives perfect memory.”** — false; context capacity does not guarantee attention, relevance, freshness or retrieval quality.
9. **“RAG eliminates hallucinations.”** — false; RAG can improve grounding but can retrieve bad evidence or still generate unsupported conclusions.
10. **“More agents are automatically better.”** — false; multi-agent systems add coordination cost and new failure modes.
11. **“Passing a benchmark proves general intelligence.”** — false; benchmarks measure scoped tasks and can be gamed, saturated, contaminated or poorly representative.
12. **“AGI has one universally agreed definition.”** — false; definitions differ across researchers, companies and public debate.

The page should label items as **False**, **Misleading**, **Depends**, or **Reasonable but uncertain** rather than forcing every debated claim into binary myth/fact framing.

## Navigation and interaction

- Add compact top-level navigation: `Wiki`, `Learn`, `ELI5 & Misconceptions`.
- Default to Wiki on first load.
- Preserve current search shortcut `/`.
- Existing `#term=...` deep links continue to open a concept directly.
- Use hash state for page selection as well, e.g. `#page=eli5`, without introducing a router.
- On mobile, concept pages use a full-screen sheet/page; on desktop, use a wide dialog or dedicated main-panel state.
- Keep focus/review state local and independent from page navigation.

## Data loading

Extend `data-loader.js` to load:

- existing glossary shards
- existing `learning-paths.json`
- optional `wiki-content.json`
- optional `misconceptions.json`

If enrichment files fail to load, the glossary must still work. Enrichment is additive, not a startup dependency.

## Compatibility and migration

- No destructive change to existing local storage keys.
- Existing glossary entries and user overrides continue to normalize as today.
- New enrichment data is canonical/shared and is not copied into `localStorage`.
- Existing `#term=` links remain valid.

## Validation

Add a lightweight Node-free browser-independent validation script if practical, or a small Python script if the repository accepts it. At minimum validate:

- every `wiki-content.json` key resolves to a glossary term/alias
- misconception `related` terms resolve
- `related`, `confusedWith`, and prerequisite references resolve where intended
- no duplicate canonical glossary terms
- required misconception fields exist
- JSON parses successfully

The site should fail soft at runtime if optional wiki enrichment is malformed or unavailable.

## Initial content scope

Do not attempt to enrich every glossary term in the first implementation. The first release should establish the architecture and demonstrate quality with a curated set of foundational pages.

Priority enrichment:

1. LLM
2. ChatGPT / AI assistant
3. Hallucination
4. Agent
5. Workflow
6. RAG
7. Context window
8. KV cache
9. MCP
10. Eval / Benchmark
11. World model
12. AGI
13. ASI

## Files expected to change

- `index.html` — top-level navigation and concept/ELI5 page containers
- `styles.css` — wiki page, nav, misconception verdict, scenario, responsive layouts
- `app.js` — page state, rich concept rendering, ELI5/misconception rendering, hash handling
- `data-loader.js` — enrichment loading
- `README.md` — V3 wiki architecture and authoring model
- `wiki-content.json` — new optional deep-dive content
- `misconceptions.json` — new curated misconceptions
- glossary shard(s) — only for genuinely missing canonical terms such as ChatGPT/AI assistant or Hallucination
- validation script/tests — new

## Success criteria

1. Existing glossary/search/focus/review functionality remains intact.
2. A user can deep-link to and read a rich concept page on mobile.
3. Compact terms remain lightweight; only selected concepts have deep-dive sections.
4. ELI5 explanations are reachable in one tap and link back to full concepts.
5. Misconceptions clearly distinguish false absolutes from legitimate uncertainty/debate.
6. Related terms, prerequisites, confused-with links and backlinks behave like a small knowledge graph.
7. The site remains deployable directly from GitHub Pages with no build step.
8. Existing local learning data survives the upgrade unchanged.

## Explicit non-goals

- No CMS
- No backend or account
- No AI-generated content at runtime
- No automatic web scraping
- No gamification
- No interview question bank
- No attempt to turn every glossary item into a long article
- No framework migration
