# Agentic AI Glossary

A lightweight, mobile-friendly personal wiki for agentic AI vocabulary, concepts, acronyms, patterns, and engineering slang.

## What it does

- Instant full-text search
- Filter by group, kind, and review status
- Sort table columns
- Hide/show columns
- Add custom columns
- Add/edit/hide entries locally
- Add personal notes/comments
- Mark entries that need review
- Mobile card layout
- Export JSON, CSV, or Markdown
- Import a JSON snapshot
- No framework, build step, account, database, or backend

## Data model

The `glossary-*.json` files are the canonical shared glossary committed to Git.

Browser edits are intentionally local-first and stored in `localStorage`. This keeps the site static and safe: there is no token or GitHub credential embedded in the page.

Use **Data → Export JSON snapshot** to back up personal edits or move them between devices.

## Run locally

Because the page loads JSON with `fetch`, use any tiny static HTTP server instead of opening `index.html` as a `file://` URL.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This repository is designed to publish directly from the root of `main`:

1. Open **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Select **main** and **/(root)**
4. Save

The resulting site should be available at:

`https://alifrae.github.io/agentic-ai-glossary/`

## Design principle

Keep this repository a **small personal reference system**, not a CMS.

The canonical content should stay reviewable in Git. Personal annotations and learning state stay local in the browser. If the project ever needs multi-device automatic sync or collaborative editing, add a backend only then.
