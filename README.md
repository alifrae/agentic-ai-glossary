# Personal AI & Engineering Wiki

A lightweight, mobile-friendly personal knowledge base for AI, agentic systems, protocols, engineering, future AI, and the concepts worth remembering.

**Live wiki:** https://alifrae.github.io/agentic-ai-glossary/

The public site intentionally stays **static and local-first**: no framework, build step, account, database, backend, or embedded credential. Canonical public knowledge is reviewable in Git; personal learning state remains in the browser.

## What this is becoming

The repository started as an agentic-AI glossary. It is evolving into a broader **Personal AI & Engineering Wiki** with two complementary layers:

- **Compact concepts** for fast retrieval, definitions, ELI5 explanations, aliases, examples, prerequisites, misconceptions, and related terms.
- **Long-form articles and topic hubs** for subjects that need architecture, mathematics, worked examples, comparisons, references, trade-offs, and advanced reading.

The main public knowledge areas are:

- **AI Foundations** — models, LLMs, transformers, tokens, inference, training, embeddings, attention, context, reasoning and multimodality.
- **LLM Mathematics** — vectors, matrices, probability, logits, softmax, embeddings, attention, loss, gradient descent, backpropagation, autoregressive inference, sampling and related mathematics.
- **Agentic AI** — agents, workflows, harnesses, tools, skills, memory, orchestration, subagents, planning, verification and autonomy.
- **Agent Protocols** — MCP, ACP, A2A, tool/function calling, schemas, transports, capability discovery, authentication/authorization and interoperability.
- **AI Engineering** — RAG, grounding, evaluation, observability, feedback, safety, context engineering, routing and production trade-offs.
- **Future AI** — AGI, ASI, recursive self-improvement, singularity, world models, physical AI, embodiment and forecasting uncertainty.
- **AI & Humanity** — intelligence, consciousness, sentience, sapience, agency, machine consciousness, moral status, AI rights, human augmentation, work, meaning, transhumanism, alignment and coexistence.
- **Systems Engineering** — requirements, interfaces, black/white-box reasoning, verification, architecture, trade-offs and change-impact thinking.
- **Pia / SceneWorks / PCS / Scene Studio** — public pages contain only intentionally sanitized, high-level engineering examples.

## Privacy boundary

This repository and its GitHub Pages site are **public**. Confidential project knowledge does not belong here.

Detailed Pia, SceneWorks, PCS, LiDAR, requirements, code-derived analysis, unpublished roadmaps, private test evidence, proprietary protocols/algorithms, employer-specific information, and other uncertain material are kept outside this public repository in a separate private knowledge store.

Public content must never contain private repository names, URLs, paths, document IDs, reverse links, or confidential excerpts. If publication status is uncertain, the material is treated as private.

Client-side hiding, obscure routes, or JavaScript gating are **not** considered privacy controls: anything shipped through GitHub Pages is public.

## Current surfaces

The current V3 application provides:

- **Wiki** — searchable glossary plus rich concept pages.
- **Learn** — focus-first learning with recall-before-reveal, prerequisites and review state.
- **ELI5 & Misconceptions** — simple mental models and nuanced misconception cards.

V4 adds **Home**, **Topics**, source-backed long-form articles, broader global search, references/read-more/advanced-reading sections, and the topic hubs described above while preserving the V3 learning model.

## Focus-first learning

The learning behavior is intentionally small and low-maintenance:

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
- `learning-paths.json` — prerequisite edges and learning-oriented relationships.
- `wiki-content.json` — optional V3 enrichment for selected concepts.
- `misconceptions.json` — curated misconception cards.
- `content/topics.json` — V4 topic-hub manifest.
- `content/articles/index.json` — V4 long-form article manifest.
- `content/articles/*.json` — structured source-backed articles.

Browser-specific state remains in `localStorage` under `agentic-ai-glossary.local.v1`, including notes, local edits, recall text, learning state, parking-lot items and display preferences.

## Article design

Substantial V4 articles are designed to support progressive depth rather than a single wall of text. Depending on the topic they can include:

- ELI5 / 30-second explanation;
- core explanation;
- equations and notation;
- worked numerical examples;
- architecture/mechanism;
- trade-offs and failure modes;
- engineering scenarios;
- misconceptions;
- self-checks;
- related concepts and prerequisites;
- epistemic-status labels for contested/future topics;
- **References**;
- **Read more**;
- **Advanced reading**.

Primary sources, official specifications, original papers and standards are preferred when available.

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

Add it to an appropriate `glossary-*.json` shard with a concise definition, plain-English explanation, useful aliases/examples and meaningful relationship edges.

### Enrich a concept

For V3-style concept enrichment, add the canonical term to `wiki-content.json` with only the fields that add teaching value (`howItWorks`, `whenItMatters`, trade-offs, failure modes, scenarios, decision factors, self-checks and sources).

### Add a long-form V4 article

1. Add or confirm its topic in `content/topics.json`.
2. Add the article to `content/articles/index.json`.
3. Create its structured JSON document under `content/articles/`.
4. Use public-only references.
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

Current and V4 validation commands include:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/validate_content.py
python scripts/validate_v4_content.py
python scripts/validate_privacy.py
node --check app.js
node --check data-loader.js
node --check wiki.js
node --check v4.js
```

V4 validators are introduced on the V4 feature branch and become required before it is merged.

## Run locally

Because the page loads JSON with `fetch`, serve the repository over HTTP rather than opening `index.html` directly as a `file://` URL:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Current deep links include:

- `#page=wiki`
- `#page=learn`
- `#page=eli5`
- `#term=LLM`

V4 additionally introduces Home, Topics, topic and article routes.

## GitHub Pages

**Live site:** https://alifrae.github.io/agentic-ai-glossary/

The site deploys directly from the root of `main` through GitHub Pages. No build system is required.

## Design principle

Keep this a **retrieval-oriented personal knowledge and learning system, not a CMS**.

Prefer well-connected, source-backed knowledge over mechanically accumulating pages. Preserve simple local learning behavior. Use long-form depth where it improves understanding. Keep confidential engineering memory behind a real repository-level privacy boundary rather than attempting to hide public bytes.
