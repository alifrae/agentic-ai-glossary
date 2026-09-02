# Personal AI & Engineering Wiki V4 — Design

**Date:** 2026-09-02  
**Status:** Proposed implementation design — user-approved direction, implementation pending written-spec review  
**Public repository:** `alifrae/agentic-ai-glossary`  
**Private companion repository:** `alifrae/personal-ai-engineering-wiki-private` (to be created as a private repository during implementation)

## 1. Goal

Evolve the existing Agentic AI Glossary into a personal technical knowledge system that is fast to retrieve from, useful for learning, and safe for work/project knowledge.

The system must support four distinct use cases without conflating them:

1. **Reference:** quickly retrieve a definition, architecture, protocol, equation, trade-off, or comparison.
2. **Learning:** progressively study a topic from ELI5 through advanced material, while preserving the current Focus/review workflow.
3. **Synthesis:** connect related concepts across AI, systems engineering, protocols, future AI, philosophy, and the user's projects.
4. **Private engineering memory:** retain confidential/project-derived knowledge without publishing it through GitHub Pages or exposing private-repository metadata in the public site.

V4 remains intentionally lightweight. The public site stays static, local-first, and framework-free.

## 2. Non-goals

V4 does **not**:

- turn the repository into a CMS;
- add a backend, account system, authentication layer, database, or remote personal-state sync;
- publish confidential Pia, PCS, SceneWorks, employer, requirements, repository-derived, or proprietary LiDAR information;
- create a private GitHub Pages deployment;
- claim philosophical or speculative AI positions as scientific facts;
- replace the current glossary, Focus mode, review scheduling, parking lot, notes, or localStorage state.

## 3. Architecture Overview

V4 uses two repositories with a hard trust boundary.

### 3.1 Public repository and GitHub Pages

`alifrae/agentic-ai-glossary`

Purpose:

- public/general technical knowledge;
- sanitized high-level project summaries;
- learning paths;
- glossary and ELI5 material;
- topic hubs and long-form articles;
- references and advanced reading;
- public search/indexing.

Published by GitHub Pages.

### 3.2 Private companion repository

`alifrae/personal-ai-engineering-wiki-private`

Purpose:

- detailed Pia architecture and roadmap;
- SceneWorks internals/control plane/execution details;
- PCS architecture, APIs, test evidence, and roadmap details;
- proprietary/work-derived LiDAR and sensor information;
- repository-derived analysis, requirements, implementation decisions, design rationale, and private engineering notes;
- any material whose disclosure is uncertain.

The private repository is **not** published through Pages in V4. GitHub itself is the private browsing/search surface. Connected GitHub/AI tools may retrieve it only under the user's existing repository permissions.

### 3.3 One-way privacy rule

Private content may reference public concepts. Public content must not reference private content.

Specifically, the public repository must contain none of the following:

- private repository URL/name;
- private paths or document identifiers;
- excerpts or summaries generated from confidential material unless explicitly sanitized and intentionally authored for public release;
- `private://` links or placeholders;
- statements such as “see private page X” that reveal private information architecture.

A public page may say only a generic statement such as: “Implementation-specific notes are intentionally not published.”

## 4. Information Architecture

The public site becomes **Personal AI & Engineering Wiki**. “Glossary” remains a reference view, not the identity of the whole product.

### 4.1 Top-level topic hubs

1. **AI Foundations**
2. **LLM Mathematics**
3. **Agentic AI**
4. **Agent Protocols**
5. **AI Engineering**
6. **Future AI**
7. **AI & Humanity**
8. **Systems Engineering**
9. **Pia** — sanitized public overview only
10. **SceneWorks** — sanitized public overview only
11. **PCS / Scene Studio** — sanitized public overview only

Existing **Wiki**, **Learn**, and **ELI5 & Misconceptions** remain available as cross-cutting views.

### 4.2 Topic hub behavior

Each hub includes:

- short orientation;
- “Start here” concepts;
- learning sequence;
- featured long-form articles;
- common misconceptions;
- related hubs;
- “Read next” recommendations;
- advanced reading;
- searchable child concepts/articles.

Hub pages are navigation/synthesis surfaces, not giant articles.

## 5. Public Content Model

V4 separates compact glossary entries from scalable long-form content.

### 5.1 Existing glossary data

`glossary-*.json` remains canonical for short concept definitions and relation edges.

It continues to hold fields such as:

- `term`
- `group`
- `kind`
- `definition`
- `plain`
- `example`
- `aliases`
- `related`
- `confusedWith`
- `memoryHook`

### 5.2 Topic manifest

Add `content/topics.json`.

Each topic has:

```json
{
  "id": "llm-mathematics",
  "title": "LLM Mathematics",
  "summary": "The mathematical ideas needed to understand how modern language models work.",
  "startHere": ["vectors", "probability", "softmax"],
  "articleIds": ["llm-math-from-vectors-to-attention"],
  "relatedTopicIds": ["ai-foundations", "ai-engineering"],
  "visibility": "public"
}
```

Only `visibility: "public"` is legal in the public repository.

### 5.3 Article manifest

Add `content/articles/index.json`.

It lists public article IDs and paths so the browser does not enumerate directories:

```json
{
  "articles": [
    {
      "id": "llm-math-from-vectors-to-attention",
      "path": "content/articles/llm-math-from-vectors-to-attention.json",
      "topicIds": ["llm-mathematics"],
      "visibility": "public"
    }
  ]
}
```

The loader fetches only manifest-listed files.

### 5.4 Long-form article schema

A public article uses structured JSON rather than runtime Markdown parsing.

Core fields:

```json
{
  "id": "attention-mathematics",
  "title": "The Mathematics of Attention",
  "topicIds": ["llm-mathematics", "ai-foundations"],
  "level": "intermediate",
  "status": "reviewed",
  "summary": "...",
  "eli5": "...",
  "sections": [
    {"type": "text", "heading": "Why dot products?", "body": "..."},
    {"type": "equation", "heading": "Scaled dot-product attention", "latex": "Attention(Q,K,V)=softmax(QK^T/sqrt(d_k))V", "explanation": "..."},
    {"type": "worked-example", "heading": "Two-token example", "steps": ["..."]},
    {"type": "callout", "kind": "misconception", "body": "..."}
  ],
  "relatedTerms": ["Attention", "Softmax", "Embedding"],
  "readNext": ["transformer-block-mathematics"],
  "references": [],
  "visibility": "public"
}
```

Supported section types in V4:

- `text`
- `bullets`
- `equation`
- `worked-example`
- `comparison`
- `callout`
- `scenario`
- `self-check`

Unknown types fail validation rather than rendering unpredictably.

## 6. References and Reading Model

Every substantial long-form article must have references unless it is explicitly marked as a personal synthesis article with no external factual claims.

### 6.1 Reference schema

```json
{
  "title": "Attention Is All You Need",
  "url": "https://arxiv.org/...",
  "publisher": "arXiv",
  "year": 2017,
  "kind": "primary",
  "note": "Original Transformer paper."
}
```

Allowed `kind` values:

- `primary` — specification, paper, standard, official documentation;
- `explainer` — high-quality secondary explanation;
- `advanced` — deeper technical treatment, textbook, advanced paper, formal spec;
- `historical` — historically important source;
- `philosophy` — primary or serious philosophical source relevant to contested questions.

### 6.2 UI grouping

Article pages display references as:

1. **References** — strongest/most direct sources;
2. **Read more** — accessible expansion;
3. **Advanced reading** — deeper/formal treatment.

External links open in a new tab with `rel="noopener"`.

### 6.3 Source policy

Prefer, in order:

1. official specifications and standards;
2. original papers;
3. official project/model documentation;
4. textbooks/university material;
5. reputable technical explainers.

Blog posts or community discussions may supplement but should not be the sole support for important technical claims when primary sources exist.

Time-sensitive protocol/model pages should include a `reviewedAt` date and a prominent freshness note when appropriate.

## 7. Global Search and Retrieval

V4 search must cover:

- glossary terms;
- aliases;
- definitions/plain explanations;
- topic titles/summaries;
- article titles/summaries;
- article section headings/body text;
- misconceptions;
- reference titles.

### 7.1 Search result types

Results are typed:

- `Concept`
- `Article`
- `Topic`
- `Misconception`

Each result shows the matching surface and a short snippet.

### 7.2 No backend search

The browser builds a small in-memory index after loading the public manifests/content. No server or search service is introduced.

The current table/card glossary search remains usable as the **Glossary** view.

## 8. LLM Mathematics Hub

The mathematics section is designed as a progressive learning path rather than one monolithic page.

### 8.1 Learning sequence

1. Scalars and notation
2. Vectors
3. Matrices and matrix multiplication
4. Probability distributions
5. Logits
6. Softmax
7. Embeddings
8. Dot products and similarity
9. Linear transformations
10. Attention
11. Scaled dot-product attention
12. Multi-head attention
13. Transformer block
14. Residual connections and normalization
15. Next-token probability
16. Cross-entropy loss
17. Gradient descent
18. Backpropagation intuition
19. Autoregressive inference
20. Temperature, top-k, top-p and sampling
21. KV cache mathematics/intuitions
22. Optional advanced topics: RoPE/positional encoding, MoE routing, quantization, speculative decoding.

### 8.2 Pedagogical rule

Each mathematical concept should contain, where applicable:

- ELI5 intuition;
- notation legend;
- equation;
- dimensions/shapes;
- a tiny numerical worked example;
- connection to an actual LLM component;
- common mistake/misconception;
- “what to learn next”;
- advanced reference.

The site should not assume calculus/linear algebra fluency. Advanced derivations are progressively disclosed.

### 8.3 First flagship article

`From Vectors to Attention: the Mathematics Behind LLMs`

This article provides the high-level mathematical map and links into the individual concepts above.

## 9. Agent Protocols Hub

Initial articles/concepts:

- API vs protocol
- tool/function calling
- OpenAPI in agent systems
- MCP
- ACP
- A2A
- client/server vs peer/agent roles
- transports
- schemas
- capability discovery
- identity/authentication/authorization
- stateless vs stateful protocol design
- tool/resource semantics
- interoperability
- MCP vs API
- MCP vs ACP
- MCP vs A2A
- when not to introduce a protocol

Each protocol page must clearly separate:

- the protocol's purpose;
- wire/interface concepts;
- roles/components;
- what it does **not** solve;
- security model;
- current spec version/date when relevant;
- minimal example;
- comparison to adjacent protocols;
- references to official specification/documentation.

Pia/SceneWorks examples in the public site are conceptual/sanitized only.

## 10. Future AI Hub

Initial scope:

- AGI
- ASI
- recursive self-improvement (RSI)
- intelligence explosion
- technological singularity
- world models
- physical AI
- embodiment
- autonomous science/engineering
- AI self-improvement vs model self-training
- jagged intelligence
- capability vs autonomy
- economic/functional definitions of AGI
- timelines and forecasting uncertainty

Future-facing pages must distinguish:

- observed capability;
- engineering extrapolation;
- scientific hypothesis;
- forecast;
- philosophical claim;
- speculation.

No page may collapse these categories into one confidence level.

## 11. AI & Humanity Hub

This hub covers philosophical and human questions without presenting contested positions as settled science.

Initial scope:

### 11.1 Mind and consciousness

- intelligence vs consciousness
- consciousness
- sentience
- sapience
- agency
- self-awareness
- machine consciousness
- phenomenal vs access consciousness
- philosophical zombies
- hard problem of consciousness
- functionalism
- computationalism
- substrate independence
- Chinese Room
- Turing Test and its limits

### 11.2 Moral and social status

- moral agency
- moral patienthood
- digital personhood
- possible AI rights
- criteria/evidence for machine sentience
- anthropomorphism
- deceptive appearance of consciousness

### 11.3 Humans and advanced AI

- human-AI collaboration
- cognitive augmentation
- human agency
- automation and work
- meaning and identity
- education and epistemics
- dependency and deskilling
- transhumanism
- posthumanism
- coexistence with advanced AI
- alignment and control
- existential/catastrophic risk

### 11.4 Epistemic labeling

Each contested article exposes a status banner such as:

- `Established technical concept`
- `Active scientific question`
- `Philosophical position`
- `Forecast / uncertain`
- `Speculative`

Articles may contain multiple claim classes; sections should label them when the distinction matters.

## 12. Public Project Hubs

Pia, SceneWorks, and PCS/Scene Studio remain useful because they connect abstract concepts to real engineering practice, but public pages are deliberately sanitized.

### 12.1 Allowed public content

Examples:

- what the project is at a high level;
- generic architectural pattern (e.g. evidence-first assistant, agent harness, desktop point-cloud tool);
- why a pattern matters;
- conceptual examples of MCP, skills, context, adapters, evals, APIs;
- lessons that would be safe to publish as general engineering knowledge.

### 12.2 Disallowed public content

Examples:

- internal repository structure derived from private source code;
- exact requirements or unpublished roadmaps;
- private test results;
- proprietary algorithms/protocols;
- employer-specific sensor parameters or product details;
- internal URLs, file paths, task IDs, commits when they expose non-public work;
- confidential architecture decisions.

If classification is uncertain, default to private.

## 13. Private Repository Structure

The private repository is Markdown-first because GitHub rendering, code search, diffs, and AI retrieval are more valuable there than a custom browser renderer.

Proposed tree:

```text
README.md
TAXONOMY.md
projects/
  pia/
    README.md
    architecture/
    roadmap/
    evals/
    decisions/
    investigations/
  sceneworks/
    README.md
    architecture/
    execution/
    decisions/
  pcs/
    README.md
    architecture/
    api/
    multiframe/
    perception/
    someip/
    simulation/
  lidar/
    README.md
    concepts/
    requirements/
    investigations/
notes/
  ai/
  systems-engineering/
```

Each private Markdown document begins with a small metadata header:

```yaml
---
id: pia-unified-evidence-model
public_concept_ids:
  - evidence
  - grounding
classification: confidential
status: current
---
```

`public_concept_ids` points outward to generic concepts; the public repo never carries reverse references.

## 14. Privacy Validation and Governance

### 14.1 Public repository validator

Extend CI with `scripts/validate_privacy.py`.

It fails if public content:

- has `visibility` other than `public`;
- contains `private://` references;
- contains the private repository name;
- contains known private-path prefixes;
- includes a reference URL to a non-public GitHub repository;
- marks Pia/SceneWorks/PCS project articles as non-sanitized;
- contains fields reserved for private metadata (`classification`, `privatePath`, `privateRepo`, `confidentialSource`).

This is a guardrail, not a substitute for human confidentiality review.

### 14.2 Sanitized-page marker

Public project-specific long-form articles require:

```json
{
  "projectSpecific": true,
  "sanitized": true
}
```

CI rejects `projectSpecific: true` without `sanitized: true`.

### 14.3 Default classification rule

When uncertain whether information is safe to publish, store it in the private repository. Promotion from private to public is an explicit sanitization action, never automatic synchronization.

## 15. Navigation and UI

### 15.1 Primary navigation

V4 primary navigation becomes:

- **Home**
- **Topics**
- **Wiki**
- **Learn**
- **ELI5**

The existing “ELI5 & Misconceptions” content remains one surface, but the shorter navigation label reduces mobile width.

### 15.2 Home

Home is a retrieval-oriented dashboard:

- global search;
- topic hubs;
- continue learning;
- due reviews;
- recently opened concepts/articles (local-only state);
- featured learning paths;
- direct links to LLM Mathematics, Agent Protocols, Future AI, and AI & Humanity.

No activity feed, streaks, gamification, or recommendation backend.

### 15.3 Article pages

Desktop:

- main reading column;
- compact sticky article outline when space permits;
- related/read-next block.

Mobile:

- single-column reading;
- collapsible outline;
- equations horizontally scroll instead of shrinking to unreadable text.

## 16. Learning Integration

The current Focus system remains concept-centric.

V4 adds:

- article “Learn prerequisites” links that open canonical concepts;
- self-check cards inside articles;
- “Focus this concept” actions on mathematical/protocol concepts;
- topic-level learning sequences.

Long-form articles themselves do not get spaced-repetition scheduling in V4. This avoids duplicating the existing concept review model.

## 17. Rendering and Data Flow

On page load:

1. existing glossary shards load;
2. existing optional V3 enrichment/misconception data loads fail-soft;
3. `content/topics.json` loads;
4. `content/articles/index.json` loads;
5. manifest-listed public article documents load;
6. a normalized in-memory index is built;
7. navigation/search renders.

If long-form content fails to load:

- glossary/Learn remains functional;
- Topics/Article surfaces show a scoped error;
- failure must not disable Focus/review/localStorage behavior.

## 18. Validation and Tests

CI must verify:

### 18.1 Syntax

- JavaScript syntax;
- all JSON syntax;
- private-repo Markdown metadata validation in that repository once created.

### 18.2 Public content graph

- unique topic/article IDs;
- every manifest path exists;
- every article's topic IDs resolve;
- every `relatedTerms` item resolves to a glossary term/alias;
- every `readNext` article resolves;
- every reference has valid required fields;
- allowed section types only;
- no orphan public articles;
- no broken topic relations.

### 18.3 Privacy

- privacy validator rules in Section 14;
- explicit tests proving the validator rejects private markers.

### 18.4 Static UI contract

- old glossary selectors/elements remain;
- old localStorage key remains;
- old `#term=` deep links remain compatible;
- Home/Topics/Wiki/Learn/ELI5 navigation exists;
- article section rendering exists;
- references/read-more/advanced-reading rendering exists;
- search indexes all required public surface types.

### 18.5 Regression principle

V4 cannot be considered complete unless the existing V3 validation remains green.

## 19. Initial Public Content Deliverables

The first V4 release should add enough depth to prove the architecture without trying to fill the whole wiki at once.

### 19.1 Topic hubs

All 11 top-level hubs are created with useful summaries and starter navigation.

### 19.2 Flagship long-form articles

At minimum:

1. **From Vectors to Attention: the Mathematics Behind LLMs**
2. **Attention Mathematics: Q, K, V and Softmax**
3. **Training an LLM: Loss, Gradient Descent and Backpropagation**
4. **Inference and Sampling: How the Next Token Is Chosen**
5. **Agent Protocols: MCP vs ACP vs A2A**
6. **What Is an Agentic AI System? Model vs Agent vs Harness**
7. **AGI, ASI, RSI and the Singularity: What Each Claim Actually Means**
8. **Can AI Be Sentient? What We Know, What We Don't, and What Would Count as Evidence**
9. **Intelligence, Consciousness, Sentience, Sapience and Agency**
10. **Pia: A Sanitized Architecture Overview**
11. **SceneWorks: A Sanitized Agent Harness Overview**
12. **PCS / Scene Studio: A Sanitized Engineering Overview**

### 19.3 References

Each flagship article receives primary/official sources plus at least one appropriate deeper-reading resource where available.

## 20. Private Repository Initial Deliverables

Create the private repository with:

- confidentiality README;
- taxonomy;
- project README hubs for Pia, SceneWorks, PCS, and LiDAR;
- private metadata convention;
- empty/initial folders for architecture, roadmap, decisions, and investigations.

V4 does **not** bulk-copy prior conversation memory or project files into it automatically. Confidential documents are added intentionally from authoritative sources or explicit user-approved summaries.

## 21. Migration and Compatibility

No destructive migration is required.

- existing glossary files stay;
- existing `wiki-content.json` stays supported;
- existing `misconceptions.json` stays supported;
- existing browser localStorage stays untouched;
- existing `#term=` URLs stay valid;
- existing GitHub Pages root deployment remains valid;
- V4 introduces new manifests/content incrementally.

The site title/UI identity may change to “Personal AI & Engineering Wiki,” but repository renaming is **not** required in V4.

## 22. Security and Confidentiality Rationale

A public repository cannot be made private by hiding routes, omitting links, JavaScript gating, client-side encryption keys, or obscure filenames. Any bytes shipped to GitHub Pages are public.

Therefore the security boundary is repository-level access control:

- public knowledge lives in the public repository;
- confidential knowledge lives only in the private repository;
- there is no automatic private-to-public publishing path.

This is intentionally simpler and safer than building custom authentication in V4.

## 23. Success Criteria

V4 is successful when:

1. the public site is recognizably a personal AI/engineering wiki rather than only a glossary;
2. a user can reach a major topic within two interactions from Home;
3. global search retrieves concepts, articles, topics, and misconceptions;
4. the LLM Mathematics path teaches the mathematical chain from vectors to training/inference with worked examples;
5. Agent Protocols has source-backed MCP/ACP/A2A explanations and comparisons;
6. Future AI and AI & Humanity clearly distinguish fact, hypothesis, philosophy, forecast, and speculation;
7. substantial articles expose References, Read more, and Advanced reading;
8. public Pia/SceneWorks/PCS pages are useful but sanitized;
9. confidential project knowledge has a separate private repository and no private content/metadata leaks into Pages;
10. V3 Focus/review/glossary behavior remains operational;
11. all syntax, content-graph, privacy, and regression tests pass;
12. GitHub Pages deploys successfully from `main` after merge.

## 24. Explicit Design Decisions

- **Two repositories, not client-side hiding.** Privacy is enforced by GitHub repository access control.
- **Public JSON, private Markdown.** Public JSON supports deterministic rendering/search; private Markdown optimizes human/GitHub/AI retrieval.
- **Manifest-based article loading.** Avoid directory enumeration and keep the static runtime deterministic.
- **No framework migration.** Existing plain JS/CSS architecture is retained.
- **No private Pages in V4.** Avoid auth/hosting scope creep.
- **No automatic private-to-public sync.** Sanitization is always explicit.
- **References are first-class content.** Primary sources are preferred and reading depth is represented directly in the data model.
- **Epistemic labels are first-class for Future AI/philosophy.** Technical facts and philosophical/speculative positions are not displayed as equivalent claims.
- **Math uses progressive disclosure and worked examples.** The goal is understanding, not merely displaying equations.
