# Personal AI & Engineering Wiki

A lightweight, mobile-friendly personal knowledge base for AI, agentic systems, protocols, engineering, future AI, and the concepts worth remembering.

**Live wiki:** https://alifrae.github.io/agentic-ai-glossary/

The public site intentionally stays **static and local-first**: no framework, build step, account, database, backend, or embedded credential. Canonical public knowledge is reviewable in Git; personal learning state remains in the browser.

## What this is becoming

The repository started as an agentic-AI glossary. It is evolving into a broader **Personal AI & Engineering Wiki** with two complementary layers:

- **Compact concepts** for fast retrieval, definitions, ELI5 explanations, aliases, examples, prerequisites, references, misconceptions, and related terms.
- **Long-form articles and topic hubs** for subjects that need architecture, mathematics, worked examples, comparisons, references, trade-offs, and advanced reading.

The main public knowledge areas are:

- **AI Foundations** — models, LLMs, transformers, tokens, inference, training, embeddings, attention, context, reasoning and multimodality.
- **LLM Mathematics** — vectors, probability, softmax, embeddings, attention, loss, gradient descent, backpropagation, autoregressive inference and sampling.
- **Agentic AI** — agents, workflows, harnesses, tools, skills, memory, orchestration, subagents, planning, verification and autonomy.
- **Agent Protocols** — MCP, ACP, A2A, tool/function calling, schemas, transports, capability discovery, authentication/authorization and interoperability.
- **AI Engineering** — RAG, grounding, evaluation, observability, feedback, safety, context engineering, routing and production trade-offs.
- **Future AI** — AGI, ASI, recursive self-improvement, singularity, world models, physical AI, embodiment and forecasting uncertainty.
- **AI & Humanity** — intelligence, consciousness, sentience, sapience, agency, moral status, human augmentation, work, meaning, alignment and coexistence.
- **Systems Engineering** — requirements, interfaces, black/white-box reasoning, verification, architecture, trade-offs and change-impact thinking.
- **Pia / SceneWorks / PCS / Scene Studio** — public pages contain only intentionally sanitized, high-level engineering examples.

## Privacy boundary

This repository and its GitHub Pages site are **public**. Confidential project knowledge does not belong here.

Detailed Pia, SceneWorks, PCS, LiDAR, requirements, code-derived analysis, unpublished roadmaps, private test evidence, proprietary protocols/algorithms, employer-specific information, and other uncertain material are kept outside this public repository in a separate private knowledge store.

Public content must never contain private repository names, URLs, paths, document IDs, reverse links, or confidential excerpts. If publication status is uncertain, the material is treated as private.

Client-side hiding, obscure routes, or JavaScript gating are **not** considered privacy controls: anything shipped through GitHub Pages is public.

## Current V5 surfaces

V5 keeps the V4/V3 navigation and learning flows while making compact concepts self-contained:

- **Home** — retrieval-first landing page with topic entry points and global search.
- **Topics** — public knowledge hubs and their flagship articles.
- **Wiki** — searchable compact glossary plus rich concept pages.
- **Learn** — focus-first learning with recall-before-reveal, prerequisites and review state.
- **ELI5 & Misconceptions** — simple mental models and nuanced misconception cards.
- **Long-form articles** — source-backed explanations with equations, worked examples, comparisons, references and read-next paths.
- **Self-contained concept cards** — every canonical concept has a level, prerequisite links where defined, automatic related-term linking, and authoritative further reading.
- **LLM Mathematics graph** — a clickable deterministic SVG graph generated from `graphStages` plus canonical related-concept edges.

V5 preserves browser-local state under `agentic-ai-glossary.local.v1`.

## Focus-first learning

The learning behavior remains intentionally small and low-maintenance:

- one active concept;
- recall before reveal;
- Not reviewed → Learning → Familiar → Solid;
- review intervals of roughly 1 / 7 / 30 days;
- memory hooks;
- prerequisite-aware “Understand first” links;
- confused-with relationships and backlinks;
- parking lot for tangents;
- deep links with `#term=...`;
- `/` search, `f` resume focus, `p` park a tangent.

No streaks, timers, notifications, accounts, or complicated spaced-repetition engine are added merely for gamification.

## Knowledge model

Canonical public knowledge is split by responsibility:

- `glossary-*.json` — compact canonical vocabulary and concept graph.
- `glossary-metadata.json` — V5 sidecar keyed by **canonical term**, containing `level` and authoritative `references` for every canonical entry.
- `learning-paths.json` — the single source of truth for prerequisite edges and learning-oriented relationships.
- `wiki-content.json` — optional rich concept enrichment for selected terms.
- `misconceptions.json` — curated misconception cards.
- `content/topics.json` — topic-hub manifest; `graphStages` is used for deterministic topic graphs where needed.
- `content/articles/index.json` — long-form article manifest.
- `content/articles/*.json` — structured source-backed articles.
- `scripts/generate_v5_metadata.py` — deterministic helper that produces explicit metadata records from the reviewed source-family registry while preserving manual per-term overrides.

Browser-specific state remains in `localStorage` under `agentic-ai-glossary.local.v1`, including notes, local edits, recall text, learning state, parking-lot items and display preferences.

## V5 concept-page behavior

Every canonical concept must remain useful without opening another article:

1. term + level;
2. ELI5 / plain-English explanation;
3. precise definition;
4. example or mechanism where available;
5. prerequisite links from `learning-paths.json`;
6. automatic links to canonical concepts mentioned in prose;
7. further reading from `glossary-metadata.json`.

Automatic linking is longest-match-first and resolves aliases to canonical `#term=` routes. To intentionally keep an occurrence as ordinary prose, write:

```text
[[nolink:Model]]
```

It renders as plain `Model` without creating a concept link.

## Reference policy

V5 requires at least one HTTPS reference for **every** canonical glossary entry. The preferred hierarchy is:

1. original paper, specification, standard, or official project/product documentation;
2. authoritative textbook, institutional guide, or maintained technical documentation;
3. secondary explainers only when a stronger source is unavailable.

Avoid SEO aggregators, anonymous tutorials, scraped copies, and placeholder URLs. CI validates structure, canonical coverage and URL shape; **source authority remains a human review responsibility**. `scripts/validate_v5_content.py` prints reference-host distribution to make review easier.

Allowed concept levels are exactly:

- `Beginner`
- `Core`
- `Advanced`

## Article design

Substantial articles support progressive depth rather than a single wall of text. Depending on the topic they can include:

- ELI5 / 30-second explanation;
- mechanism;
- equations and notation;
- worked numerical examples;
- architecture;
- trade-offs and failure modes;
- engineering scenarios;
- misconceptions;
- self-checks;
- related concepts and prerequisites;
- epistemic-status labels for contested/future topics;
- references and read-next paths.

The model-lifecycle article deliberately separates data preparation, tokenization, pretraining, fine-tuning, preference-oriented post-training, evaluation/red-teaming, deployment/inference and the surrounding assistant product. RLHF is presented as an influential recipe, **not a universal stage**.

## Epistemic discipline

Future-AI and philosophical material explicitly distinguishes categories such as:

- established technical concept;
- active scientific question;
- philosophical position;
- forecast / uncertain;
- speculative.

The wiki should make uncertainty easier to see, not flatten technical facts, forecasts and philosophical positions into the same kind of claim.

## Authoring

### Add a compact concept

1. Add the canonical entry to an appropriate numbered `glossary-N.json` shard.
2. Add prerequisite relationships to `learning-paths.json` only if they genuinely improve learning order.
3. Add or regenerate its `glossary-metadata.json` record with an allowed level and authoritative reference.
4. Add meaningful aliases/related edges; avoid relationship spam merely to make the graph dense.
5. Use `[[nolink:Term]]` when an ordinary-language occurrence should not auto-link.
6. Run the full validators before merge.

To regenerate the explicit metadata sidecar from the reviewed source registry while preserving manual overrides:

```bash
python scripts/generate_v5_metadata.py
```

Review the resulting source assignments before committing them.

### Maintain the LLM Mathematics graph

`content/topics.json` owns the ordered `graphStages` data. Do **not** hand-maintain x/y coordinates. The renderer computes node positions from stage/index and derives graph edges from canonical `related` relationships.

All graph labels must resolve to canonical glossary terms.

### Enrich a concept

For rich concept enrichment, add the canonical term to `wiki-content.json` with only fields that add teaching value (`howItWorks`, `whenItMatters`, trade-offs, failure modes, scenarios, decision factors, self-checks and sources).

### Add a long-form article

1. Add or confirm its topic in `content/topics.json`.
2. Add the article to `content/articles/index.json`.
3. Create its structured JSON document under `content/articles/`.
4. Prefer primary/official references.
5. Mark project-specific public articles as sanitized.
6. Run all content and privacy validators before merge.

### Add a misconception

Use `misconceptions.json` and one of the existing nuanced verdicts:

- `False`
- `Misleading`
- `Depends`
- `Reasonable but uncertain`

Prefer the least absolute verdict supported by the evidence.

## Validation

The repository uses Python standard-library validators plus JavaScript/JSON syntax checks in GitHub Actions.

Required validation includes:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/validate_content.py
python scripts/validate_v4_content.py
python scripts/validate_v5_content.py
python scripts/validate_privacy.py
node --check app.js
node --check data-loader.js
node --check term-links.js
node --check wiki.js
node --check v4.js
node --check v5.js
```

`validate_v5_content.py` is a hard gate: metadata coverage must be **100%**. The V3 graph, V4 content graph, V5 metadata graph, unit tests, JavaScript syntax, JSON syntax and public privacy boundary must all pass on `main`.

## Run locally

Because the page loads JSON with `fetch`, serve the repository over HTTP rather than opening `index.html` directly as a `file://` URL:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Useful deep links include:

- `#page=home`
- `#page=topics`
- `#page=wiki`
- `#page=learn`
- `#page=eli5`
- `#term=LLM`
- `#topic=llm-mathematics`
- `#article=how-a-model-gets-built-end-to-end`
- `#article=llm-math-from-vectors-to-attention`

## GitHub Pages

**Live site:** https://alifrae.github.io/agentic-ai-glossary/

The site deploys directly from the root of `main` through GitHub Pages. No build system is required.

## Design principle

Keep this a **retrieval-oriented personal knowledge and learning system, not a CMS**.

Prefer well-connected, source-backed knowledge over mechanically accumulating pages. Preserve simple local learning behavior. Use long-form depth where it improves understanding. Keep confidential engineering memory behind a real repository-level privacy boundary rather than attempting to hide public bytes.
