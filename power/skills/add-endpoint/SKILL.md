---
name: Add REST Endpoint
description: Step-by-step guide for adding a new REST endpoint to NestChat's Express server
inclusion: auto
---

# Add REST Endpoint

This skill guides you through adding a new REST API endpoint to `src/server.js` following NestChat's conventions.

## Step 1: Understand the Error Response Shape

All endpoints use a consistent error response format:

```javascript
function errorResponse(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}
```

Example error responses:
- `400 validation_error` — Invalid request parameters
- `404 not_found` — Resource not found
- `403 forbidden` — Operation not allowed (e.g., archived conversation)
- `500 internal_error` — Server failure

## Step 2: Import Required Dependencies

If your endpoint needs data validation or business logic, import from `src/lib/` modules:

```javascript
import { createMessage, validateMessage } from './lib/messages.js';
import { getConversation, addMessage } from './lib/conversation-store.js';
```

## Step 3: Add the Route Handler

Follow this pattern for your endpoint in `src/server.js`:

```javascript
// HTTP method: GET, POST, PUT, DELETE
// Path: /api/resource-name or /api/resource/:id/sub-resource

appMETHOD('/api/your-endpoint', async (req, res) => {
  try {
    // 1. Extract and validate request parameters
    const { param } = req.query;   // GET/DELETE query params
    const { param } = req.body;    // POST/PUT body params

    // 2. Call src/lib modules for validation and business logic
    const validation = validateMessage(text);
    if (!validation.valid) {
      return errorResponse(res, 400, 'validation_error', validation.error);
    }

    // 3. Call store functions
    const data = await yourLibFunction(param);

    // 4. Handle not found
    if (!data) {
      return errorResponse(res, 404, 'not_found', 'Resource not found');
    }

    // 5. Return success response
    res.json({ /* response data */ });
  } catch (err) {
    // Handle known error types
    if (err instanceof SomeKnownError) {
      return errorResponse(res, 403, 'forbidden', err.message);
    }
    // Default to internal error
    errorResponse(res, 500, 'internal_error', 'Descriptive failure message');
  }
});
```

## Step 4: Run Tests to Verify

After implementing the endpoint:

```bash
node --test test/unit/lib/your-module.test.js
```

## Step 5: Add Property-Based Tests (Recommended)

After the unit tests pass, add invariants to `test/properties/` to catch edge cases:

- **Search subset**: Search results always match the query
- **Pagination partition**: Paged results are consistent with total count
- **Tag idempotence**: Setting tags twice produces same result
- **Archived-rejects-messages**: Archived conversations reject new messages
- **Trimmed-length validation**: Text is trimmed and length-validated

See the `write-property-tests` skill for detailed instructions.