# NestChat Core Chat Functionality - Implementation Tasks

## Project Scaffolding

[ ] 1. Create `package.json` with ESM support, dependencies (express, node:test, fast-check), and scripts
[ ] 2. Create `src/` directory structure (`src/lib/`, `src/public/`)
[ ] 3. Create `data/` directory for JSON persistence
[ ] 4. Create `test/unit/` and `test/properties/` directory structure
[ ] 5. Initialize git repository and create `.gitignore` (exclude `data/`)

## Pure Library Modules

[ ] 6. Implement `src/lib/messages.js` — validation and message creation
[ ] 7. Implement `src/lib/search.js` — case-insensitive substring search
[ ] 8. Implement `src/lib/pagination.js` — pagination utilities
[ ] 9. Implement `src/lib/tags.js` — tag normalization and validation
[ ] 10. Implement `src/lib/conversation-store.js` — CRUD operations and JSON persistence
[ ] 11. Implement `src/lib/assistant.js` — interface and local provider implementation

## Server Layer

[ ] 12. Implement `src/server.js` — Express app with middleware
[ ] 13. Implement GET `/api/conversations` endpoint
[ ] 14. Implement POST `/api/conversations` endpoint
[ ] 15. Implement GET `/api/conversations/:id` endpoint
[ ] 16. Implement POST `/api/conversations/:id/messages` endpoint
[ ] 17. Implement POST `/api/conversations/:id/archive` endpoint
[ ] 18. Implement POST `/api/conversations/:id/unarchive` endpoint
[ ] 19. Implement GET `/api/search` endpoint
[ ] 20. Implement error handling middleware

## Unit Tests

[ ] 21. Implement `test/unit/lib/messages.test.js` — message validation and creation
[ ] 22. Implement `test/unit/lib/search.test.js` — search correctness
[ ] 23. Implement `test/unit/lib/pagination.test.js` — pagination edge cases
[ ] 24. Implement `test/unit/lib/tags.test.js` — tag normalization
[ ] 25. Implement `test/unit/lib/conversation-store.test.js` — CRUD operations
[ ] 26. Implement `test/unit/lib/assistant.test.js` — deterministic response
[ ] 27. Implement `test/unit/server.test.js` — endpoint integration tests

## Property Tests

[ ] 28. Implement `test/properties/messages-properties.test.js` — P1 validation invariants
[ ] 29. Implement `test/properties/search-properties.test.js` — P2 search completeness
[ ] 30. Implement `test/properties/pagination-properties.test.js` — P3 pagination disjointness
[ ] 31. Implement `test/properties/tags-properties.test.js` — P4 normalization round-trip
[ ] 32. Implement `test/properties/archive-properties.test.js` — P5 archive immutability
[ ] 33. Implement `test/properties/assistant-properties.test.js` — P6 deterministic output
[ ] 34. Implement `test/properties/conversation-properties.test.js` — P7, P8 state invariants

## MCP Server

[ ] 35. Implement `mcp/server.js` — MCP server with tools for chat operations
[ ] 36. Define MCP tools: listConversations, createConversation, sendMessage, searchMessages, archiveConversation

## Custom Agents (Optional)

[ ] 37. Create `agent-chat-operations.json` — agent for chat-related tasks
[ ] 38. Create `agent-testing.json` — agent for running tests and validating properties

## Hooks

[ ] 39. Create hook for running tests after file save (`PostFileSave`)
[ ] 40. Create hook for linting source files (`PostFileSave`)
[ ] 41. Create hook for pre-commit validation (`UserPromptSubmit`)

## Documentation

[ ] 42. Update `README.md` with project overview, setup instructions, and API documentation
[ ] 43. Add inline code comments for complex logic
[ ] 44. Document environment variables in README (`ASSISTANT_PROVIDER`)

## Verification

[ ] 45. Run all unit tests (`npm test`) — verify all pass
[ ] 46. Run all property tests (`npm run test:properties`) — verify all pass
[ ] 47. Test manually via browser to verify SPA functionality
[ ] 48. Test MCP server integration
[ ] 49. Verify data persistence across restarts
