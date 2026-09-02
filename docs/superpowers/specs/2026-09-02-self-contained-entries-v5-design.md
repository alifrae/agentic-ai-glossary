# V5 Design — Self-Contained Entries, Cross-Links, References, and Core Content Gaps

Date: 2026-09-02
Status: Approved in chat; written spec for final review
Branch: `feat/v5-self-contained-entries`

## Objective

Make every glossary entry and long-form article useful as a teaching surface rather than only a definition index. A reader should be able to understand the concept, follow prerequisite/related concepts, inspect primary references, and navigate deeper without leaving the page or relying on Learn mode.

V5 is deliberately a content-quality and rendering pass. It does not redesign the navigation, add accounts, add gamification, or introduce a frontend framework.

## Success criteria

V5 is complete when:

1. Canonical glossary terms and aliases appearing in `definition`, `plain`, or `example` render as Wikipedia-style links to the existing `#term=` route.
2. Every canonical glossary entry has a validated `level` and at least one primary/official `reference` unless explicitly exempted by validator policy.
3. Compact cards show level and prerequisites directly.
4. The LLM Mathematics topic contains a concept-graph view built from canonical concepts and `related` edges.
5. The LLM Mathematics teaching sequence explicitly covers vectors → attention → softmax → backpropagation → sampling, with ELI5 → mechanism → worked example depth.
6. Canonical concepts `Distillation`, `Pruning`, and `Quantization` exist with references and meaningful graph relationships.
7. A new long-form article, `How a model gets built, end to end`, covers pretraining → fine-tuning → alignment/RLHF → evaluation → deployment with a concrete toy example.
8. Existing V4 navigation, Learn behavior, local state, and privacy boundary remain unchanged.
9. CI validates metadata coverage, graph integrity, reference structure, new content, JavaScript/JSON syntax, and privacy constraints.

## 1. Data model

### 1.1 Canonical glossary content remains in glossary shards

Existing `glossary-*.json` files remain authoritative for:

- `term`
- `group`
- `kind`
- `definition`
- `plain`
- `example`
- `aliases`
- `related`
- existing optional teaching fields

V5 will not mechanically duplicate every glossary entry into a new canonical content file.

### 1.2 New `glossary-metadata.json`

A new sidecar file is keyed by canonical term:

```json
{
  "LLM": {
    "level": "Core",
    "references": [
      {
        "title": "Attention Is All You Need",
        "url": "https://arxiv.org/abs/1706.03762"
      }
    ]
  }
}
```

Allowed levels are exactly:

- `Beginner`
- `Core`
- `Advanced`

`references` is an array of objects with:

- `title`: non-empty string
- `url`: absolute `https://` URL

Reference policy:

- Prefer original papers, standards, official specifications, official technical documentation, or authoritative textbooks/course material.
- Avoid blog aggregators, SEO summaries, scraped content, and citation farms.
- An entry may have multiple references.
- The validator may maintain a small explicit exemption set for concepts where no meaningful external primary source exists; exemptions must be named in code, not silently inferred.

### 1.3 Prerequisite authority remains `learning-paths.json`

Prerequisite relationships remain authoritative in `learning-paths.json`.

At runtime `data-loader.js` merges prerequisites into the glossary entries as:

```js
entry.prerequisites = [...]
```

This prevents two sources of truth while letting every compact card render prerequisite information.

### 1.4 Runtime entry shape

After loading and merging, every canonical public glossary entry available to the UI has:

- existing glossary fields
- `level`
- `references`
- `prerequisites`

Local-only user-created entries remain supported. They are not required to satisfy canonical metadata coverage and may use a fallback level such as `Local` in the UI rather than being written into `glossary-metadata.json`.

## 2. Automatic term linking

### 2.1 Scope

Automatic links are generated in these glossary text fields:

- `definition`
- `plain`
- `example`

The same shared rendering helper may later be reused elsewhere, but V5 does not automatically rewrite arbitrary article prose.

### 2.2 Matching

The linker builds a runtime dictionary from:

- canonical `term`
- all `aliases`

Rules:

1. Case-insensitive matching.
2. Longest-match-first so `context window` wins over `context` where both exist.
3. Word-boundary-aware for ordinary word-like terms.
4. Do not link the current entry to itself, including its aliases.
5. Do not recursively process generated links.
6. Escape the source text before injecting anchor markup.
7. All links use existing deep links: `#term=<canonical term>`.
8. Generated anchors carry a marker such as `data-term-link` and `data-no-open` so clicking a link inside a card does not trigger the card-level open/focus handler.

### 2.3 Failure behavior

If the glossary dictionary is unavailable, rendering falls back to escaped plain text. Linking is enhancement, not a loading dependency.

## 3. Compact cards

Each compact card will show:

- canonical term
- learning status (existing)
- level badge: Beginner / Core / Advanced
- definition with auto-linked terms
- plain-English explanation with auto-linked terms when present
- existing group/kind metadata
- prerequisites, rendered as clickable concept chips when present
- a compact `Further reading` section using the entry's references

The existing focus/review behavior remains unchanged.

The table view may expose level as an optional column, but the acceptance requirement applies to compact cards.

## 4. Further reading blocks

### 4.1 Glossary entries

Compact cards and rich concept pages render `references` as `Further reading`.

Reference links:

- open in a new tab
- use `rel="noopener noreferrer"`
- display human-readable source titles
- do not render unsafe or non-HTTP(S) URLs

### 4.2 Long-form articles

V4 articles already have structured references. V5 standardizes the user-facing heading as `Further reading` or separates the existing reference list into primary references and advanced reading where useful.

Articles continue to use the existing richer reference schema. No regression to article metadata is allowed.

## 5. Concept graph

### 5.1 Scope

V5 ships one graph in the `LLM Mathematics` topic hub.

It is not a general-purpose graph explorer.

### 5.2 Graph data

Nodes are canonical glossary terms selected for the math learning sequence and neighboring mathematical/model concepts.

Edges are derived only from canonical `related` relationships where both endpoints are in the graph node set.

No duplicated graph-edge content file is introduced.

### 5.3 Rendering

Use deterministic inline SVG implemented with existing vanilla JavaScript/CSS.

Requirements:

- mobile-safe horizontal/vertical scaling
- deterministic positions so the graph does not jump on reload
- clear labels
- accessible node buttons/anchors where practical
- click node → existing `#term=` route
- no external graph dependency
- graph failure does not block the topic hub content

The preferred first layout is a simple staged learning-flow layout rather than force-directed physics.

## 6. LLM Mathematics teaching pass

The `LLM Mathematics` hub is reorganized into an explicit progressive sequence:

1. vectors and representations
2. attention scores / weighted combinations
3. softmax and probability distributions
4. training loss and backpropagation / gradient descent
5. autoregressive inference and sampling

Each stage must follow the existing progressive-depth philosophy:

### ELI5

Explain the intuition in ordinary language before notation.

### Mechanism

Introduce the actual operation and why it exists in the pipeline.

### Worked example

Use small hand-computable numbers. Avoid examples that require a calculator or obscure the concept behind large matrices.

The existing mathematics articles should be revised or connected rather than creating redundant copies.

## 7. Missing concepts

Add canonical entries:

### Distillation

Explain knowledge distillation as teacher-student transfer/compression. Cover:

- teacher vs student model
- soft targets / probability distribution matching at a conceptual level
- why it can reduce inference cost
- trade-off between compression and capability retention

Related concepts should include `Model`, `Training`, `Quantization`, and `Pruning` where canonical relationships make sense.

### Pruning

Explain removal/sparsification of parameters, weights, channels, heads, or structures to reduce computation/storage, with the distinction between unstructured and structured pruning at a high level.

### Quantization

Explain representing weights/activations with lower-precision numeric formats to reduce memory/bandwidth/compute, with accuracy/calibration trade-offs.

All three receive levels, references, examples, plain-English explanations, and graph relationships.

## 8. New article — How a model gets built, end to end

New article ID:

`how-a-model-gets-built-end-to-end`

Primary topic:

`ai-foundations`

Secondary topic where appropriate:

`ai-engineering`

Required structure:

1. ELI5 overview of the model-development lifecycle.
2. Data preparation / tokenization context where necessary.
3. Pretraining.
4. Fine-tuning / supervised adaptation.
5. Alignment, preference optimization, or RLHF — clearly state that real systems can use different post-training recipes and RLHF is not universal.
6. Evaluation and red-teaming/validation concepts.
7. Deployment / inference serving.
8. Concrete toy example that follows one tiny fictional model/task through all stages.
9. Failure modes and trade-offs.
10. Related concepts.
11. Primary/official references.
12. Read-next links into mathematics, eval, inference, and agent/system concepts.

The article must distinguish training a base model from building an assistant product around a model.

## 9. Validation and CI

Add V5 tests before implementation.

The test/validator suite must cover:

### Metadata

- `glossary-metadata.json` parses.
- Metadata keys resolve to canonical terms, never only aliases.
- Every canonical glossary term has metadata unless explicitly exempted.
- Levels are exactly Beginner/Core/Advanced.
- References have non-empty titles and HTTPS URLs.

### Runtime merge

Static-contract tests confirm `data-loader.js` loads and merges metadata and prerequisites into runtime entries.

### Auto-linking

Tests confirm:

- a dedicated linker helper exists
- longest-match logic exists
- self-link prevention exists
- `#term=` routes are emitted
- links are marked so card-level handlers do not consume them

### Cards

Tests require compact-card rendering for:

- level badge
- prerequisites
- Further reading
- linked teaching text

### Graph

Tests require:

- LLM Mathematics topic graph container
- SVG renderer or equivalent deterministic graph code
- `related`-edge derivation
- clickable canonical term nodes

### Content

Tests require canonical `Distillation`, `Pruning`, `Quantization`.

Tests require article `how-a-model-gets-built-end-to-end` and its expected lifecycle stages.

Tests require the LLM Mathematics hub/articles to cover vectors, attention, softmax, backpropagation/gradient descent, and sampling with ELI5 plus worked examples.

### Existing safeguards

Retain:

- V3 content validation
- V4 content validation
- privacy validation
- JavaScript syntax checks
- JSON syntax checks
- existing Learn/local-state/static-contract tests

## 10. Files expected to change

Likely additions:

- `glossary-metadata.json`
- `content/articles/how-a-model-gets-built-end-to-end.json`
- V5-specific validator/tests if separation improves clarity

Likely modifications:

- `data-loader.js`
- `app.js`
- `wiki.js` if rich concept pages need metadata/reference rendering
- `v4.js`
- `v4.css` and/or `wiki.css`
- `content/topics.json`
- `content/articles/index.json`
- existing LLM Mathematics articles
- one glossary shard for Distillation/Pruning/Quantization
- `.github/workflows/validate.yml`
- `README.md`

No navigation redesign and no new framework/build system.

## 11. Non-goals

V5 will not add:

- accounts
- server-side persistence
- gamification
- new top-level navigation
- generic arbitrary graph exploration
- an external graph library
- automatic links inside source code/equations
- automatic external-reference discovery at runtime
- private repository integration

## 12. Privacy

Existing public/private rules remain binding.

The new automatic linker, references, graph, and new project-neutral content must not expose private project paths, repository identifiers, proprietary data, internal test evidence, or work-derived confidential material.

The existing privacy validator remains part of the acceptance gate.
