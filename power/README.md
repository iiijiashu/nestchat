# NestChat Development Power

A Kiro power for developing the NestChat AI chat workspace application.

## What This Power Provides

- **Add REST Endpoint Skill** — Step-by-step guide for adding new REST API endpoints to `src/server.js`
- **Write Property Tests Skill** — Instructions for writing fast-check property-based tests for `src/lib` modules
- **Bundled MCP Server** — NestChat's MCP server for workspace tools (list conversations, search messages, add messages, get stats)

## Installation

1. Open the Kiro Powers panel
2. Click "Add Custom Power"
3. Select "Import from GitHub"
4. Enter: `https://github.com/iiijiashu/nestchat`
5. The power will be loaded from the `power/` directory

## Skills

### Add REST Endpoint

Guides you through adding new REST endpoints following NestChat conventions:
- Error response shape: `{ error: { code, message } }`
- Using `src/lib` modules for validation
- Proper error handling patterns

### Write Property-Based Tests

Covers writing fast-check property tests for pure `src/lib` modules. Includes known project invariants:
- Search subset: results always match query
- Pagination partition: paged results consistent with total
- Tag idempotence: setting tags twice produces same result
- Archived-rejects-messages: archived conversations reject new messages
- Trimmed-length validation: text inputs are trimmed and validated

## MCP Server

The bundled MCP server provides tools:
- `list_conversations` — List all active conversations
- `search_messages` — Search messages with pagination
- `add_message` — Append a message to a conversation
- `get_stats` — Get workspace statistics