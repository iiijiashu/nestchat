---
name: Write Property-Based Tests
description: Guide for writing fast-check property tests for NestChat's pure src/lib modules
inclusion: auto
---

# Write Property-Based Tests

This skill covers writing property-based tests using fast-check for NestChat's pure `src/lib/` modules.

## Test File Conventions

- **Location**: `test/properties/<module-name>.test.js`
- **Framework**: `node:test` with `fast-check` (fc)
- **Pattern**: Use `createConversationStore({ filePath: ... })` for isolated testing with temp files

## Known Project Invariants

Test these properties to ensure robust behavior:

### 1. Search Subset Invariant
Search results always contain the query string (case-insensitive).

```javascript
test('search results contain query', async () => {
  await fc.assert(
    fc.asyncProperty(fc.string(), async (query) => {
      const results = await store.search(query);
      for (const r of results.results) {
        assert.ok(r.text.toLowerCase().includes(query.toLowerCase()));
      }
    })
  );
});
```

### 2. Pagination Partition Invariant
Paged results are consistent with total count.

```javascript
test('pagination partition is consistent', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 1, max: 20 }),
      async (total, pageSize) => {
        const result = await store.search('test', { page: 1, pageSize });
        const pageCount = Math.ceil(total / pageSize);
        assert.ok(result.pagination.total >= 0);
      }
    )
  );
});
```

### 3. Tag Idempotence Invariant
Setting tags twice produces the same result.

```javascript
test('tag idempotence', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.string()),
      async (tags) => {
        const conv = await store.createConversation(tags);
        const first = conv.tags;
        const again = await store.setTags(conv.id, tags);
        assert.deepStrictEqual(again.tags, first);
      }
    )
  );
});
```

### 4. Archived-Rejects-Messages Invariant
Archived conversations reject new messages and never grow.

```javascript
test('archived rejects messages', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.string({ minLength: 1 }), { maxLength: 5 }),
      async (texts) => {
        const conv = await store.createConversation();
        for (const text of texts) {
          await store.addMessage(conv.id, createMessage('user', text));
        }
        await store.archiveConversation(conv.id);
        
        // Must throw
        await assert.rejects(
          () => store.addMessage(conv.id, createMessage('user', 'fail')),
          ArchivedConversationError
        );
      }
    )
  );
});
```

### 5. Trimmed-Length Validation
Text inputs are trimmed and length-validated.

```javascript
test('trimmed text in messages', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string().filter(s => s.trim().length > 0),
      async (text) => {
        const conv = await store.createConversation();
        const msg = createMessage('user', `  ${text}  `);
        assert.strictEqual(msg.text, text.trim());
      }
    )
  );
});
```

## Test Structure Template

```javascript
// test/properties/your-module.test.js

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { existsSync, unlink } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createYourModule } from '../../src/lib/your-module.js';

const TEST_FILE = join(tmpdir(), `nestchat-test-${randomUUID()}.json`);

describe('module property tests', () => {
  let instance;

  beforeEach(() => {
    instance = createYourModule({ filePath: TEST_FILE });
  });

  afterEach(async () => {
    try {
      if (existsSync(TEST_FILE)) await unlink(TEST_FILE);
    } catch (e) { /* ignore */ }
  });

  describe('Invariant: description', () => {
    test('test name', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer(), async (input) => {
          // test logic
          return true;
        }),
        { numRuns: 25 }
      );
    });
  });
});
```

## Running Property Tests

```bash
node --test test/properties/*.test.js
```

Run with more iterations for higher confidence:
```bash
node --test test/properties/your-module.test.js -- 100
```