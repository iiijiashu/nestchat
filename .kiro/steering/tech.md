---
inclusion: always
---

# NestChat Technology Stack

## Runtime & Framework

- **Node.js 24** — Long-term support version with modern JavaScript features
- **Express 5** — Minimal web server framework for HTTP handling
- **Vanilla JavaScript SPA** — No build step; single HTML file loads app.js directly

## Data & Storage

- **JSON file persistence** — All data stored under `data/` directory (conversations, messages, tags)
- **No external database** — Local-first design with human-readable data files

## Testing

- **node:test** — Built-in unit test runner for example-based tests
- **fast-check** — Property-based testing for robust validation of core logic

## Assistant Engine

- **Pluggable architecture** — `src/lib/assistant.js` defines the interface
- **Deterministic local provider** — Default provider uses local computation
- **Optional remote provider** — Switch via `ASSISTANT_PROVIDER=remote` environment variable
- **No external API keys required** — Local-first by design

## Code Style

- **ESM modules** — `import`/`export` syntax throughout
- **Async/await** — For all asynchronous operations
- **Single quotes** — `'string'` convention
- **Semicolons** — Explicit statement termination
- **2-space indentation** — Consistent indentation
- **Kebab-case filenames** — `assistant.js`, `conversation-store.js`
- **CamelCase exports** — Named exports using camelCase

## File Organization

- `src/` — All source code
- `data/` — Runtime data persistence
- `test/` — Test files matching source structure