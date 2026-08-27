# Agentic AI Glossary

A lightweight, mobile-friendly personal wiki for agentic AI vocabulary, concepts, acronyms, patterns, engineering slang, and things worth remembering.

The site intentionally stays **static and local-first**: no framework, build step, account, database, backend, or embedded GitHub credential.

## V2: focus-first learning

V2 keeps the fast glossary from V1 and adds a small learning layer designed to reduce unintentional topic switching:

- **One active concept** — the page remembers what you were learning and makes Resume the default action.
- **Progressive disclosure** — Focus asks you to recall the concept before revealing the definition and example.
- **Simple learning states** — Not reviewed → Learning → Familiar → Solid.
- **Light review scheduling** — Still fuzzy = 1 day, Got it = 7 days, Solid = 30 days.
- **Memory hooks** — save the analogy or sentence that makes a concept stick.
- **Often confused with** — explicitly capture concepts you mix up.
- **Related terms + backlinks** — relationships are shown only after the current explanation is revealed, under “After this”.
- **Parking lot** — capture a tangent in one line without abandoning the current concept; convert it to an Inbox entry later.
- **Deep links** — focused concepts use `#term=...` links.
- **Keyboard shortcuts** — `/` search, `f` resume focus, `p` park a tangent.

V2 deliberately does **not** add timers, streaks, notifications, gamification, accounts, or a complicated spaced-repetition algorithm. The goal is to reduce cognitive overhead, not create another productivity system to maintain.

## Reference features

- Instant full-text search
- Filter by group, kind, and learning state
- Sort table columns
- Hide/show columns
- Add custom columns
- Add/edit/hide entries locally
- Add personal notes/comments
- Mobile card layout
- Export JSON, CSV, or Markdown
- Import a JSON snapshot

## Data model

The `glossary-*.json` files are the canonical shared glossary committed to Git.

Browser edits are stored in `localStorage`, including:

- personal entry edits
- notes and memory hooks
- learning/review state
- recall sentences
- parking-lot items
- custom columns and display preferences

Existing V1 local data is migrated in place when V2 loads.

Use **Data → Export JSON snapshot** to back up personal state or move it between devices.

## Run locally

Because the page loads JSON with `fetch`, use any tiny static HTTP server instead of opening `index.html` as a `file://` URL.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Publish directly from the root of `main`:

1. Open **Settings → Pages**
2. Under **Build and deployment**, choose **Deploy from a branch**
3. Select **main** and **/(root)**
4. Save

Site: `https://alifrae.github.io/agentic-ai-glossary/`

## Design principle

Keep this repository a **small personal memory system**, not a CMS.

Canonical knowledge stays reviewable in Git. Personal annotations and learning state stay local in the browser. Add automatic multi-device sync only if the lack of it becomes a real recurring problem.
