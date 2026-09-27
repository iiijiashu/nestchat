# NestChat Core Chat Functionality

## Overview

This spec covers the core chat functionality of NestChat: creating and managing conversations, sending messages, searching, tagging, and archiving.

## Requirements

### Conversation Management

1. WHEN a user creates a new conversation, THE system SHALL generate a unique ID and return the conversation object with default state (active, no messages, empty tags).
2. WHEN a user lists conversations, THE system SHALL return all active conversations in reverse chronological order (newest first).
3. WHILE a user navigates a conversation, THE system SHALL support pagination with configurable page and pageSize parameters.
4. WHEN a user archives a conversation, THE system SHALL move it from active to archived state and record the archive timestamp.
5. WHEN a user unarchives a conversation, THE system SHALL restore it to active state and clear the archive timestamp.
6. WHEN a user creates a new conversation, THE system SHALL immediately save it to `data/conversations.json`.

### Message Handling

7. WHEN a user sends a message to a conversation, THE system SHALL validate that the text is non-empty after trimming whitespace and does not exceed 4000 characters.
8. WHEN a user sends a message, THE system SHALL store it with role (user or assistant), text content, and UTC timestamp.
9. WHEN a user sends a message to a conversation, THE system SHALL append it to the conversation's message array in `data/conversations.json`.
10. WHEN a user lists messages for a conversation, THE system SHALL return messages in chronological order with pagination support.
11. WHILE a user views archived conversations, THE system SHALL reject attempts to add new messages with a 403 Forbidden error.

### Tagging System

12. WHEN a user assigns tags to a conversation, THE system SHALL normalize all tags to lowercase and remove duplicates.
13. WHEN a user queries a conversation, THE system SHALL support searching by any of its assigned tags.
14. WHILE a user adds tags to a conversation, THE system SHALL allow multiple tags per conversation as an array.
15. WHEN a user retrieves a conversation, THE system SHALL return the normalized tag array (lowercase, deduplicated).

### Search Functionality

16. WHEN a user searches messages by text query, THE system SHALL perform case-insensitive substring matching across message content.
17. WHEN a user searches, THE system SHALL return matching messages from active conversations only, with pagination support.
18. WHEN a user searches with an empty query, THE system SHALL return no results.

### Assistant Engine

19. WHEN the assistant generates a reply, THE system SHALL use the deterministic local provider by default.
20. WHEN the `ASSISTANT_PROVIDER=remote` environment variable is set, THE system SHALL delegate assistant responses to the remote provider.
21. WHEN a user sends a message, THE system SHALL wait for the assistant to generate a reply before returning the response.

## User Stories

### US-1: Create and Navigate Conversations

> As a user, I want to create new conversations and switch between them so I can organize different topics.

- User clicks "New Conversation" → system creates conversation with unique ID and empty message array
- User sees conversation in sidebar with timestamp
- User clicks conversation → system loads messages with pagination

### US-2: Send Messages

> As a user, I want to send messages to conversations and see assistant replies so I can have interactive discussions.

- User types message → system validates (non-empty, ≤4000 chars) → stores user message with timestamp
- System triggers assistant response → stores assistant message with timestamp → updates UI
- User sees messages in chronological order with correct roles

### US-3: Search History

> As a user, I want to search past messages so I can quickly find information.

- User enters search term → system searches all active conversations → returns paginated results
- System highlights matches in results
- Empty search returns no results

### US-4: Organize with Tags

> As a user, I want to tag conversations so I can categorize and find them later.

- User assigns tags to conversation → system normalizes to lowercase, deduplicates → saves to file
- User filters by tag → system returns matching conversations
- Tags persist across session restarts

### US-5: Archive Completed Work

> As a user, I want to archive conversations so my active list stays clean.

- User clicks "Archive" → system moves conversation to archived state → removes from active list
- User cannot add messages to archived conversations (403 error)
- User can unarchive → conversation returns to active list with history preserved
