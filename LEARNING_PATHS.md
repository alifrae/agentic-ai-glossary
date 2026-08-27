# Learning paths

`learning-paths.json` is the learning layer on top of the canonical glossary.

Each curated entry can define:

- `understandFirst` — prerequisite concepts worth understanding before going deep on this term.
- `memoryHook` — a short personal mnemonic or mental model.
- `confusedWith` — nearby concepts that are commonly mixed up.

The prerequisites are advisory, not blocking. The UI distinguishes between a quick lookup and deeper learning: if a prerequisite is still `Not reviewed` or `Learning`, Focus mode shows it before the current explanation and offers a direct route to review it first.

The learning graph should stay shallow. Prefer 1–3 real prerequisites rather than connecting everything to everything. `related` remains the broader discovery relationship; `understandFirst` means there is a genuine dependency in comprehension.

## Example

```json
"MCP": {
  "understandFirst": ["API", "Tool", "Schema"],
  "memoryHook": "API = a restaurant's menu; MCP = a standard way AI clients discover and use many such menus.",
  "confusedWith": ["API", "Tool", "Harness"]
}
```

## Rule of thumb

Use the relationships for different purposes:

- **Understand first** → prerequisites; follow these before going deeper.
- **Confused with** → distinctions worth learning side-by-side.
- **Related** → optional exploration after the current concept is understood.
