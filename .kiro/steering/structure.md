---
inclusion: always
---

# NestChat Project Structure

## Directory Layout

```
d:\nestchat
├── src/
│   ├── lib/          # Pure logic modules (no I/O, no globals)
│   ├── server.js     # Express HTTP layer (only I/O, no business logic)
│   └── public/       # SPA static assets
│       ├── index.html
│       ├── app.js
│       └── styles.css
├── data/             # Runtime JSON data persistence
├── test/
│   ├── unit/         # Example-based tests (node:test)
│   └── properties/   # Property-based tests (fast-check)
├── mcp/
│   └── server.js     # Project's own MCP server
└── .kiro/            # Kiro configuration (specs, steering, hooks, agents, settings)
```

## Module Conventions

- **Pure logic modules** (`src/lib/`) — No file I/O, no network calls, no global state; each module independently testable
- **Server layer** (`src/server.js`) — HTTP routing, request/response handling, serves static files
- **Public assets** (`src/public/`) — Single-page application loaded directly by browser

## Naming Conventions

- **Files** — kebab-case: `conversation-store.js`, `message-formatter.js`
- **Exports** — camelCase: `export function getConversation(id)`, `export const MESSAGE_TYPES`
- **Functions/variables** — descriptive, action-oriented: `saveConversation`, `searchMessages`

## Import Conventions

```javascript
// Use relative paths within src
import { getConversation, updateConversation } from '../lib/conversation-store.js';
import { generateResponse } from '../lib/assistant.js';
```

## Test Structure

- **Unit tests** — Match source structure: `src/lib/foo.js` ↔ `test/unit/lib/foo.test.js`
- **Property tests** — Separate directory: `test/properties/conversation-properties.test.js`