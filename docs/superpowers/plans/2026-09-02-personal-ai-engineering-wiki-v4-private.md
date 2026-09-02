# Personal AI & Engineering Wiki V4 Private Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a separate private GitHub knowledge repository for confidential Pia, SceneWorks, PCS, LiDAR, requirements, decisions, investigations, and project-derived engineering memory without creating any reverse pointer from the public wiki.

**Architecture:** The private repository is Markdown-first and relies on GitHub access control, rendering, code search, diffs, and authorized connected AI tooling. It may point outward to generic public concept IDs, but the public repository never records the private repository name, URL, path, or document IDs. There is no automatic private-to-public publishing path.

**Tech Stack:** Private GitHub repository, Markdown, YAML front matter, optional Python metadata validation, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-02-personal-ai-engineering-wiki-v4-design.md`

## Global Constraints

- Repository visibility must be `private` before any confidential content is added.
- Do not use GitHub Pages in V4.
- Do not bulk-copy conversation memory or project repositories automatically.
- Add confidential/project-derived material only from authoritative source documents or explicit user-approved summaries.
- Public concept IDs are allowed as outward references; private paths/IDs must never be written back into the public repository.
- Uncertain publication status defaults to private.

---

### Task 1: Create and verify the private repository

**Files:**
- Create in private repo: `README.md`
- Create in private repo: `TAXONOMY.md`

**Interfaces:**
- Produces a GitHub repository whose API metadata reports `private: true`.
- No public repo file consumes the private repository name.

- [ ] **Step 1: Create a new GitHub repository with visibility set to private**

Use an authenticated GitHub repository-creation capability. If the active connector cannot create repositories, stop this task without placing private content elsewhere; create the repository manually in GitHub or use another authorized GitHub client.

- [ ] **Step 2: Verify privacy before writing content**

Fetch repository metadata and assert `private: true` / public visibility disabled.

- [ ] **Step 3: Create confidentiality README**

State that the repository contains confidential personal/project engineering knowledge, is not a publishing source, must not be mirrored to public Pages, and defaults uncertain material to private.

- [ ] **Step 4: Create taxonomy**

Define top-level `projects/pia`, `projects/sceneworks`, `projects/pcs`, `projects/lidar`, and `notes/ai`, `notes/systems-engineering`.

- [ ] **Step 5: Commit**

`git commit -m "docs: initialize private engineering knowledge base"`

---

### Task 2: Scaffold project hubs and metadata validation

**Files:**
- Create: `projects/pia/README.md`
- Create: `projects/sceneworks/README.md`
- Create: `projects/pcs/README.md`
- Create: `projects/lidar/README.md`
- Create directory marker/README files for architecture, roadmap, evals, decisions, investigations, APIs, multiframe, perception, SOME/IP, simulation, requirements as specified by the design.
- Create: `scripts/validate_metadata.py`
- Create: `tests/test_metadata.py`
- Create: `.github/workflows/validate.yml`

**Interfaces:**
- Private document front matter fields: `id: string`, `public_concept_ids: list[str]`, `classification: confidential`, `status: current|historical|draft`.
- Validator entry point: `validate_repository(root: Path) -> list[str]`.

- [ ] **Step 1: Write failing metadata tests**

Reject missing `id`, duplicate IDs, classification other than `confidential`, malformed `public_concept_ids`, and invalid status.

- [ ] **Step 2: Implement validator and CI**

Validate Markdown front matter without introducing a publishing/build pipeline.

- [ ] **Step 3: Create project hubs**

Each hub describes what belongs there and links only within the private repository or outward to generic public concepts.

- [ ] **Step 4: Run tests and commit**

`python -m unittest discover -s tests -p 'test_*.py' -v && python scripts/validate_metadata.py`

---

### Task 3: Add private content intentionally

**Files:**
- Created later per authoritative source/document and user-approved scope.

**Interfaces:**
- No automatic importer.
- Every document records source/provenance in prose or metadata appropriate to its origin.

- [ ] **Step 1: Select one authoritative project area at a time**

Start with Pia architecture only after identifying the canonical repository/docs/roadmap sources.

- [ ] **Step 2: Create private synthesis documents from those sources**

Separate authoritative facts, current design decisions, hypotheses, and historical notes.

- [ ] **Step 3: Validate and review confidentiality**

No material is promoted to public automatically.

- [ ] **Step 4: Repeat for SceneWorks, PCS, and LiDAR only when intentionally requested**

This keeps the private knowledge base evidence-based rather than becoming an unreviewed dump of conversational memory.
