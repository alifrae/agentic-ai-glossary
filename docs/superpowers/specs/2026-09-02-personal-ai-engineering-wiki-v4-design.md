# Personal AI & Engineering Wiki V4 — Design

**Date:** 2026-09-02  
**Status:** User-approved direction; implementation pending written-spec review  
**Public repository:** `alifrae/agentic-ai-glossary`  
**Private companion:** separate private GitHub repository; its exact repository name is intentionally not recorded in the public repository.

## 1. Goal

Evolve the existing Agentic AI Glossary into a personal technical knowledge system that supports:

1. **Reference** — quickly retrieve a definition, architecture, protocol, equation, trade-off, comparison, or source.
2. **Learning** — progress from ELI5 explanations to advanced material while preserving Focus/review behavior.
3. **Synthesis** — connect AI, systems engineering, protocols, future AI, philosophy, and sanitized project examples.
4. **Private engineering memory** — retain confidential/project-derived knowledge without publishing it through GitHub Pages or exposing private-repository metadata in the public site.

The public application remains static, local-first, framework-free, and deployable directly by GitHub Pages.

## 2. Non-goals

V4 does **not**:

- add a backend, database, account system, authentication layer, or remote sync;
- turn the public repository into a CMS;
- publish confidential Pia, PCS, SceneWorks, employer, requirements, repository-derived, or proprietary LiDAR information;
- create private GitHub Pages hosting;
- automatically copy conversation memory or project files into either wiki;
- treat philosophical or speculative AI claims as settled scientific facts;
- replace the current glossary, Focus mode, review scheduling, parking lot, notes, or localStorage state.

## 3. Two-Repository Trust Boundary

### 3.1 Public repository and Pages

The current repository contains only public/general knowledge and intentionally sanitized project summaries. It provides:

- glossary concepts and ELI5 material;
- topic hubs and long-form articles;
- learning paths;
- references and advanced reading;
- global public search;
- sanitized Pia / SceneWorks / PCS examples.

### 3.2 Private companion repository

A separate **private** GitHub repository contains confidential engineering knowledge, including:

- detailed Pia architecture, roadmap, evals, decisions, and investigations;
- SceneWorks internals/control-plane/execution details;
- PCS architecture, APIs, test evidence, and roadmaps;
- proprietary/work-derived LiDAR and sensor material;
- requirements, repository-derived analysis, implementation decisions, and private notes;
- anything whose publication status is uncertain.

The private repository is Markdown-first and is not deployed through Pages in V4. GitHub itself, GitHub search, and authorized connected AI tooling are the private retrieval surfaces.

### 3.3 One-way privacy rule

Private content may reference public concepts. Public content must **never** reference the private repository or its content.

Public content must not contain:

- private repository URLs/names;
- private paths or document IDs;
- `private://` links;
- confidential excerpts or summaries unless a human intentionally rewrites and sanitizes them for public publication;
- “see private page X” or any other reverse pointer that exposes private information architecture.

A public project page may only state generically that implementation-specific details are intentionally not published.

There is **no automatic private-to-public synchronization**. Promotion is an explicit sanitization action.

## 4. Public Information Architecture

The site identity becomes **Personal AI & Engineering Wiki**. The glossary remains one reference surface, not the product identity.

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

Cross-cutting views remain:

- **Wiki / Glossary**
- **Learn**
- **ELI5 & Misconceptions**

### 4.2 Topic hub contract

Every hub may contain:

- orientation/summary;
- “Start here” concepts;
- ordered learning sequence;
- featured articles;
- common misconceptions;
- related hubs;
- Read next;
- Read more;
- Advanced reading.

A hub is a navigation/synthesis page, not a single giant article.

## 5. Public Content Model

### 5.1 Glossary remains canonical for compact concepts

Existing `glossary-*.json` files continue to define short concepts and graph edges, including:

- `term`, `group`, `kind`
- `definition`, `plain`, `example`
- `aliases`, `related`, `confusedWith`
- `memoryHook`

### 5.2 Topic manifest

Add `content/topics.json`.

Example:

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

Only `visibility: "public"` is legal in publishable public content.

### 5.3 Article manifest

Add `content/articles/index.json` listing the long-form public documents the browser is allowed to fetch.

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

The runtime fetches manifest-listed files only. It does not enumerate directories.

### 5.4 Long-form article schema

```json
{
  "id": "attention-mathematics",
  "title": "The Mathematics of Attention",
  "topicIds": ["llm-mathematics", "ai-foundations"],
  "level": "intermediate",
  "status": "reviewed",
  "epistemicStatus": "established-technical",
  "reviewedAt": "2026-09-02",
  "summary": "...",
  "eli5": "...",
  "sections": [
    {"type": "text", "heading": "Why dot products?", "body": "..."},
    {"type": "equation", "heading": "Scaled dot-product attention", "expression": "Attention(Q,K,V) = softmax(QKᵀ / √dₖ)V", "explanation": "..."},
    {"type": "worked-example", "heading": "Two-token example", "steps": ["..."]},
    {"type": "callout", "kind": "misconception", "body": "..."},
    {"type": "text", "heading": "Consciousness implication", "claimClass": "speculation", "body": "..."}
  ],
  "relatedTerms": ["Attention", "Softmax", "Embedding"],
  "readNext": ["transformer-block-mathematics"],
  "references": [],
  "visibility": "public"
}
```

Allowed `level` values:

- `beginner`
- `intermediate`
- `advanced`

Allowed `status` values:

- `draft`
- `reviewed`

Allowed top-level `epistemicStatus` values:

- `established-technical`
- `active-scientific-question`
- `philosophical-position`
- `forecast-uncertain`
- `speculative`
- `mixed`

Allowed optional per-section `claimClass` values:

- `observed-capability`
- `established-technical`
- `scientific-hypothesis`
- `philosophical-position`
- `forecast`
- `speculation`

Supported section types:

- `text`
- `bullets`
- `equation`
- `worked-example`
- `comparison`
- `callout`
- `scenario`
- `self-check`

Unknown enum values fail validation.

### 5.5 Equation rendering

V4 stores equations as readable Unicode/plain mathematical expressions plus human explanations. It does not add a remote MathJax/KaTeX runtime dependency. Equations render in a horizontally scrollable math/code block on mobile and remain understandable if styling fails.

A richer vendored math renderer can be added later only if the simple representation becomes a real limitation.

## 6. References and Reading Depth

References are first-class article data.

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

- `primary` — official specification/standard, original paper, official documentation;
- `explainer` — high-quality accessible secondary explanation;
- `advanced` — deeper/formal paper, textbook, advanced specification;
- `historical` — historically important source;
- `philosophy` — serious philosophical source relevant to a contested question.

### 6.2 UI grouping

- **References:** `primary`, `historical`, and directly relevant `philosophy` sources.
- **Read more:** `explainer` sources.
- **Advanced reading:** `advanced` sources.

External links use a normal public `https://` URL and open with `rel="noopener"`.

### 6.3 Source policy

Prefer, in order:

1. official specifications and standards;
2. original papers;
3. official project/model documentation;
4. textbooks/university material;
5. reputable technical explainers.

Community discussions may supplement but should not be the sole source for material technical claims when primary sources exist.

Time-sensitive protocol/model pages require `reviewedAt`; the UI shows the date where freshness matters.

## 7. Global Search and Retrieval

Search spans:

- glossary terms and aliases;
- definitions and ELI5 text;
- topic titles/summaries;
- article titles/summaries;
- article section headings/body text;
- misconceptions;
- reference titles.

Typed result categories:

- `Concept`
- `Article`
- `Topic`
- `Misconception`

Each result displays its type and a short matching snippet.

The index is built in memory in the browser. No backend/search service is introduced. Existing glossary table/card search remains available in the Wiki/Glossary surface.

## 8. LLM Mathematics Hub

The hub is a progressive learning path:

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
20. Temperature, top-k, top-p, and sampling
21. KV cache intuition/mathematics
22. Optional advanced topics: positional encoding/RoPE, MoE routing, quantization, speculative decoding.

Where applicable, each mathematical concept contains:

- ELI5 intuition;
- notation legend;
- equation;
- tensor/vector dimensions;
- tiny numerical worked example;
- connection to the real LLM component;
- common mistake/misconception;
- what to learn next;
- advanced source.

The site does not assume calculus or linear-algebra fluency. Advanced derivations use progressive disclosure.

Flagship map article:

**From Vectors to Attention: the Mathematics Behind LLMs**

## 9. Agent Protocols Hub

Initial scope:

- API vs protocol
- tool/function calling
- OpenAPI in agent systems
- MCP
- ACP
- A2A
- client/server vs agent/peer roles
- transports
- schemas
- capability discovery
- identity/authentication/authorization
- stateful vs stateless protocol design
- tools/resources
- interoperability
- MCP vs API
- MCP vs ACP
- MCP vs A2A
- when not to add a protocol

Every protocol article separates:

- purpose/problem solved;
- roles/components;
- wire/interface concepts;
- what it does **not** solve;
- security model;
- current spec/version/date where relevant;
- minimal example;
- adjacent-protocol comparison;
- official references.

Public Pia/SceneWorks examples are conceptual and sanitized only.

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

Future-facing pages explicitly distinguish observed capability, engineering extrapolation, scientific hypothesis, forecast, philosophical claim, and speculation using the epistemic model in Section 5.4.

## 11. AI & Humanity Hub

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
- evidence standards for machine sentience
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

Contested pages use `epistemicStatus` and per-section `claimClass` rather than a blanket “fact/myth” presentation.

## 12. Sanitized Public Project Hubs

Pia, SceneWorks, and PCS/Scene Studio connect abstract concepts to real engineering practice but are deliberately constrained.

### Allowed

- high-level project purpose;
- generic architectural patterns;
- why a pattern matters;
- conceptual examples of evidence, MCP, skills, context, adapters, evals, APIs;
- general engineering lessons safe for publication.

### Disallowed

- private repository structure derived from source code;
- exact requirements or unpublished roadmaps;
- private test results;
- proprietary algorithms/protocols;
- employer/product-specific sensor parameters;
- internal URLs, file paths, task IDs, or sensitive commits;
- confidential architecture decisions.

When classification is uncertain, content defaults to private.

Public project-specific long-form articles require:

```json
{
  "projectSpecific": true,
  "sanitized": true
}
```

CI rejects `projectSpecific: true` without `sanitized: true`.

## 13. Private Repository Structure

The private companion is Markdown-first:

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

Private documents use metadata such as:

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

Private `public_concept_ids` may point outward to generic public concepts. The public repository never carries reverse references.

The exact private repository name is stored only in private/account context, never committed to the public repository.

## 14. Privacy Validation and Governance

Add `scripts/validate_privacy.py` to the public CI.

The validator scans **publishable runtime content**, not design docs. Its scope includes `content/**/*.json`, `glossary-*.json`, `wiki-content.json`, and `misconceptions.json`.

It rejects publishable data that:

- has a `visibility` value other than `public`;
- contains `private://` references;
- contains fields reserved for private metadata (`classification`, `privatePath`, `privateRepo`, `confidentialSource`);
- uses `file://`, localhost, or other non-public reference URLs;
- marks a project-specific article without `sanitized: true`;
- contains unknown article/epistemic/reference schema fields where strict validation applies.

This validator cannot determine whether prose is confidential. Human review remains authoritative. The default rule is therefore: **uncertain → private**.

No build script may read from the private repository when producing the public site.

## 15. Navigation and UI

Primary navigation:

- **Home**
- **Topics**
- **Wiki**
- **Learn**
- **ELI5**

### Home

Retrieval-oriented dashboard:

- global search;
- topic hubs;
- continue learning;
- due reviews;
- recently opened concepts/articles, stored locally;
- featured learning paths;
- direct links to LLM Mathematics, Agent Protocols, Future AI, and AI & Humanity.

No activity feed, streaks, gamification, or recommendation backend.

### Article page

Desktop:

- main reading column;
- compact sticky outline where space permits;
- related/read-next/references block.

Mobile:

- single-column reading;
- collapsible outline;
- scrollable equations;
- touch-sized related/read-next links.

## 16. Learning Integration

The existing Focus system remains concept-centric.

V4 adds:

- article prerequisite links to canonical concepts;
- self-check cards;
- “Focus this concept” actions;
- ordered topic learning paths.

Long-form articles themselves do not get spaced-repetition scheduling in V4.

## 17. Runtime Data Flow and Failure Isolation

On load:

1. existing glossary shards load;
2. V3 enrichment/misconception data loads fail-soft;
3. `content/topics.json` loads;
4. `content/articles/index.json` loads;
5. manifest-listed public articles load;
6. normalized in-memory search/index data is built;
7. Home/Topics/search render.

If V4 long-form data fails:

- glossary and Learn remain functional;
- Topics/Article surfaces show a scoped error;
- Focus/review/localStorage behavior remains available.

## 18. Validation and Tests

CI verifies:

### Syntax

- JavaScript syntax;
- all public JSON syntax.

### Content graph

- unique topic/article IDs;
- every manifest path exists;
- article topic IDs resolve;
- `relatedTerms` resolve to glossary terms/aliases;
- `readNext` IDs resolve;
- references satisfy schema;
- section/level/status/epistemic enums are valid;
- no orphan public articles;
- topic relations resolve.

### Privacy

- Section 14 rules;
- tests proving private markers and unsanitized project articles are rejected.

### Static UI contract

- existing glossary selectors/elements remain;
- existing localStorage key remains;
- `#term=` deep links remain compatible;
- Home/Topics/Wiki/Learn/ELI5 navigation exists;
- article rendering supports all V4 section types;
- References / Read more / Advanced reading render;
- global search covers all required public result types.

### Regression

Existing V3 validation must remain green.

The private repository separately validates Markdown metadata once created.

## 19. Initial Public Content Deliverables

### 19.1 Topic hubs

Create all 11 top-level hubs with useful summaries, starter concepts, article links, and related topics.

### 19.2 Flagship articles

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

Each flagship article receives primary/official sources plus suitable Read more / Advanced reading links where available.

## 20. Private Companion Initial Deliverables

Create a private repository containing:

- confidentiality README;
- taxonomy;
- project hub READMEs for Pia, SceneWorks, PCS, and LiDAR;
- private metadata convention;
- initial folders for architecture, roadmap, decisions, investigations, APIs, evals, and related work.

V4 does **not** bulk-copy prior conversation memory or project files. Confidential documents are added intentionally from authoritative private sources or explicit user-approved summaries.

## 21. Compatibility

No destructive migration:

- existing glossary shards remain;
- `wiki-content.json` remains supported;
- `misconceptions.json` remains supported;
- browser localStorage remains untouched;
- `#term=` URLs remain valid;
- GitHub Pages root deployment remains valid;
- V4 manifests/content are additive.

The UI title may change to **Personal AI & Engineering Wiki**. Repository renaming is not required.

## 22. Security Rationale

Anything shipped to a public GitHub Pages deployment is public. Hidden routes, obscure filenames, JavaScript gates, and client-side encryption are not confidentiality boundaries.

V4 therefore uses GitHub repository access control as the security boundary and intentionally avoids custom private-site authentication.

## 23. Success Criteria

V4 is complete only when:

1. the public site is clearly a personal AI/engineering wiki, not only a glossary;
2. a major topic is reachable within two interactions from Home;
3. global search retrieves concepts, articles, topics, and misconceptions;
4. the LLM Mathematics path teaches the chain from vectors through attention, training, and inference with worked examples;
5. Agent Protocols contains source-backed MCP/ACP/A2A explanations and comparisons;
6. Future AI and AI & Humanity distinguish technical fact, scientific hypothesis, philosophy, forecast, and speculation;
7. substantial articles expose References, Read more, and Advanced reading;
8. public Pia/SceneWorks/PCS pages are useful but sanitized;
9. confidential project knowledge lives in a separate private repository with no private content/metadata shipped to Pages;
10. V3 Focus/review/glossary behavior remains operational;
11. syntax, content-graph, privacy, and regression validation pass;
12. GitHub Pages builds and deploys successfully from `main` after integration.

## 24. Explicit Design Decisions

- **Two repositories, not client-side hiding.** Repository access control is the confidentiality boundary.
- **Public JSON, private Markdown.** JSON supports deterministic public rendering/search; Markdown optimizes private GitHub/human/AI retrieval.
- **Manifest-based article loading.** No directory enumeration.
- **No framework migration.** Preserve the current plain JS/CSS architecture.
- **No private Pages in V4.** Avoid authentication/hosting scope creep.
- **No automatic private-to-public sync.** Sanitization is explicit and human-controlled.
- **References are first-class.** Primary sources are preferred, with explicit reading depth.
- **Epistemic labels are first-class.** Technical facts and philosophical/speculative claims are not displayed as equivalent.
- **Math uses progressive disclosure and worked examples.** Understanding takes priority over decorative notation.
- **No external math runtime in V4.** Keep the site self-contained and fail-safe; richer rendering can be added later if justified.
