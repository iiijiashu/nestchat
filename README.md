# NestChat

A personal AI chat workspace web app built with Kiro as the primary development tool. Users hold multiple concurrent conversations with an AI assistant, organized with tags, searchable history, and archiving. All data persists locally in JSON files for privacy and offline access.

## Quick Start

```bash
npm install
npm start
# Server runs on http://localhost:3000
```

Run tests:
```bash
npm test
```

## Architecture Overview

| Layer | Description |
|-------|-------------|
| `src/lib/` | Pure logic modules (assistant, conversation-store, messages, pagination, search, tags) — no I/O |
| `src/server.js` | Express HTTP layer, serves static SPA |
| `src/public/` | Vanilla JS SPA (index.html, app.js, styles.css) |
| `data/` | JSON file persistence (conversations.json, seed.json) |
| `mcp/server.js` | MCP stdio server with 4 tools |

## Kiro University Challenge — Lesson Coverage

| Lesson | Where it lives in this repo |
|--------|----------------------------|
| 1. Spec-driven development | `.kiro/specs/chat-core/` — `requirements.md` in EARS notation, `design.md` with 8 correctness properties, `tasks.md` implementation plan |
| 2. Steering documents | `.kiro/steering/` — `product.md`, `tech.md`, `structure.md`, all with `inclusion: always` |
| 3. Hooks | `.kiro/hooks/` — `run-tests-on-agent-stop.json` runs `npm test` on AgentStop; `block-force-push.json` blocks `git push -f` via PreToolUse exit 2; `syntax-check-on-write.json` runs `node --check` on writes. Shell scripts in `scripts/hooks/` |
| 4. Property-based testing | `test/properties/` — fast-check tests: search subset, pagination partition, tag idempotence, archived-rejects-messages, trimmed-length validation, persistence round-trip |
| 5. Powers | `power/` — `plugin.json` + 2 skills (`add-endpoint`, `write-property-tests`) + bundled `mcp.json`; installable via Kiro Powers panel → Import from GitHub |
| 6. Model Context Protocol (MCP) | `mcp/server.js` (stdio JSON-RPC, 4 tools) + `.kiro/settings/mcp.json` (workspace registration, used during development) |
| 7. Custom agents | `.kiro/agents/qa-engineer.md` — test-coverage reviewer; run with `kiro-cli --agent qa-engineer` |
| Bonus: Kiro Power | `power/` directory (see lesson 5) |

## Testing

- **163 tests total** (105 unit + 58 property)
- All tests passing
- `npm test` runs both unit (`test/unit/`) and property-based (`test/properties/`) suites

## Project Structure

```
nestchat/
├── .kiro/
│   ├── agents/         # Custom QA engineer agent
│   ├── hooks/          # Agent and tool hooks
│   ├── settings/       # MCP workspace config
│   ├── specs/chat-core/ # Spec documents
│   └── steering/       # Product, tech, structure guides
├── data/               # JSON persistence
├── mcp/                # MCP server implementation
├── power/              # Kiro Power package
├── scripts/hooks/      # Hook shell scripts
├── src/
│   ├── lib/            # Pure modules
│   ├── public/         # SPA assets
│   └── server.js       # Express server
└── test/
    ├── properties/     # fast-check tests
    └── unit/           # node:test examples
```