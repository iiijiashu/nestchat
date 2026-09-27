# NestChat Core Chat Functionality - Technical Design

## Module Layout

### Pure Logic Modules (`src/lib/`)

- **`messages.js`** — Message validation, creation, and formatting
  - `validateMessageText(text)` — Returns {valid, error} after trim and length check
  - `createMessage(role, text)` — Returns message object with timestamp
  - `MESSAGE_TYPES = ['user', 'assistant']` — Allowed roles

- **`search.js`** — Case-insensitive substring search across messages
  - `searchMessages(conversations, query)` — Returns matching messages with conversation metadata
  - Supports empty query → empty array

- **`pagination.js`** — Pagination utilities
  - `paginate(items, page, pageSize)` — Returns {items, page, pageSize, total, totalPages}
  - Validates page/pageSize are positive integers
  - Returns empty items for out-of-range pages

- **`tags.js`** — Tag normalization and validation
  - `normalizeTags(tags)` — Lowercase, deduplicated, non-empty string array
  - `validateTags(tags)` — Returns {valid, error} for tag array

- **`conversation-store.js`** — Conversation CRUD operations
  - `createConversation()` — New conversation with ID, timestamp, empty arrays
  - `getConversations(activeOnly = true)` — List conversations
  - `getConversation(id)` — Single conversation by ID
  - `saveConversation(conversation)` — Persist to JSON
  - `archiveConversation(id)` — Set archived status
  - `unarchiveConversation(id)` — Clear archived status
  - `addMessage(conversationId, message)` — Append message to conversation

- **`assistant.js`** — Assistant reply generation interface
  - `generateResponse(messages)` — Deterministic local provider
  - `setProvider(name)` — Switch to 'remote' provider
  - `AVAILABLE_PROVIDERS = ['local', 'remote']`

### Server Layer (`src/server.js`)

Express HTTP layer with REST endpoints:

- **GET `/api/conversations`** — List active conversations (reverse chronological)
- **POST `/api/conversations`** — Create new conversation
- **GET `/api/conversations/:id`** — Get single conversation with messages
- **POST `/api/conversations/:id/messages`** — Send message (validates, stores, triggers assistant)
- **POST `/api/conversations/:id/archive`** — Archive conversation
- **POST `/api/conversations/:id/unarchive`** — Unarchive conversation
- **GET `/api/search`** — Search messages (query, page, pageSize)
- **Error handling** — JSON responses with status code and message

### Public Assets (`src/public/`)

Vanilla JavaScript SPA:

- **`index.html`** — Single entry point, loads `app.js` and `styles.css`
- **`app.js`** — Client-side routing, UI updates, API calls
- **`styles.css`** — Minimal styling for chat interface

## JSON Persistence

### `data/conversations.json`

```json
{
  "conversations": [
    {
      "id": "uuid-v4-string",
      "createdAt": "2026-09-27T12:00:00.000Z",
      "archivedAt": null,
      "tags": ["project", "research"],
      "messages": [
        {
          "id": "uuid-v4-string",
          "role": "user",
          "text": "Hello",
          "timestamp": "2026-09-27T12:00:01.000Z"
        },
        {
          "id": "uuid-v4-string",
          "role": "assistant",
          "text": "Hi there!",
          "timestamp": "2026-09-27T12:00:02.000Z"
        }
      ]
    }
  ]
}
```

### Data Directory Structure

```
data/
├── conversations.json  # All conversations (active + archived)
└── archive/            # Optional: archived conversations copied here on archive
```

## REST Endpoints

### Conversations

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/conversations` | List active conversations | — | `{conversations: [...]}` |
| POST | `/api/conversations` | Create new conversation | `{tags?: string[]}` | `{conversation: {...}}` |
| GET | `/api/conversations/:id` | Get conversation with messages | — | `{conversation: {...}}` |
| POST | `/api/conversations/:id/archive` | Archive conversation | — | `{conversation: {...}}` |
| POST | `/api/conversations/:id/unarchive` | Unarchive conversation | — | `{conversation: {...}}` |

### Messages

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/conversations/:id/messages` | Send message | `{text: string}` | `{message: {...}, assistantResponse: {...}}` |

### Search

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/search` | Search messages | `?q=query&page=1&pageSize=20` | `{results: [...], pagination: {...}}` |

## Error Handling Conventions

All errors return JSON with `{"error": "message"}` and appropriate HTTP status:

- **400 Bad Request** — Invalid input (empty text, >4000 chars, invalid page/pageSize)
- **404 Not Found** — Conversation ID not found
- **403 Forbidden** — Attempt to message archived conversation
- **500 Internal Server Error** — Unexpected server errors

Example error response:

```json
{
  "error": "Conversation is archived. New messages are not allowed."
}
```

## Correctness Properties

These invariants will be verified with property-based testing using `fast-check`:

### P1: Message Validation
- For any text input, `validateMessageText` returns valid only when trimmed text length > 0 AND ≤ 4000
- Generated messages always have valid role ('user' or 'assistant') and non-empty text

### P2: Search Completeness
- For any query string Q and conversation set C, every message in `searchMessages(C, Q)` contains Q (case-insensitive)
- For any query Q and conversation C, if a message in C contains Q, it appears in `searchMessages(C, Q)`

### P3: Pagination Disjointness
- For any item list and valid page/pageSize, pagination returns non-overlapping pages
- For any valid page index p (0 ≤ p < totalPages), the union of all pages equals the original list

### P4: Tag Normalization Round-Trip
- For any tag array, `normalizeTags(normalizeTags(tags))` equals `normalizeTags(tags)`
- All normalized tags are lowercase strings; empty strings filtered out

### P5: Archive Immutability
- Once a conversation is archived, no new messages can be added
- Archive timestamp, once set, is never modified (only cleared on unarchive)

### P6: Deterministic Assistant
- For the same message history, `generateResponse` returns identical output (local provider)
- Assistant messages always have role 'assistant' and valid text

### P7: Conversation State Consistency
- Active conversations never have `archivedAt` set
- Archived conversations always have `archivedAt` as ISO timestamp string
- Conversation ID uniqueness is guaranteed (UUID v4)

### P8: Search Pagination Consistency
- Total results count matches sum of items across all pages
- Out-of-range pages return empty results without error
