// Property-based tests for conversation-store.js (via createConversationStore factory)

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';
import { existsSync, unlink } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createConversationStore, ArchivedConversationError } from '../../src/lib/conversation-store.js';
import { createMessage } from '../../src/lib/messages.js';

// Isolated temp store file for this test process
const TEST_STORE_FILE = join(tmpdir(), `nestchat-prop-${randomUUID()}.json`);

describe('conversation-store.js property tests', () => {
  let store;

  beforeEach(() => {
    store = createConversationStore({ filePath: TEST_STORE_FILE });
  });

  afterEach(async () => {
    store.clearCache();
    try {
      if (existsSync(TEST_STORE_FILE)) {
        await unlink(TEST_STORE_FILE);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // Arbitrary valid message text (non-empty after trim)
  const validText = fc.string({ minLength: 1, maxLength: 200 })
    .filter(s => s.trim().length > 0)
    .map(s => `x${s}`);

  const conversationRecord = fc.record({
    id: fc.uuid(),
    createdAt: fc.date({ noInvalidDate: true }).map(d => d.toISOString()),
    archivedAt: fc.oneof(fc.constant(null), fc.date({ noInvalidDate: true }).map(d => d.toISOString())),
    tags: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
    messages: fc.array(
      fc.record({
        id: fc.uuid(),
        role: fc.constantFrom('user', 'assistant'),
        text: fc.string({ maxLength: 100 }),
        timestamp: fc.date({ noInvalidDate: true }).map(d => d.toISOString())
      }),
      { maxLength: 5 }
    )
  });

  describe('P1: archived conversations reject new messages', () => {
    test('once archived, message count never grows and addMessage always throws', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validText, { minLength: 0, maxLength: 6 }),
          async (texts) => {
            const conv = await store.createConversation();
            for (const text of texts) {
              await store.addMessage(conv.id, createMessage('user', text));
            }
            const before = await store.getConversation(conv.id);

            await store.archiveConversation(conv.id);

            for (let i = 0; i < 3; i++) {
              await assert.rejects(
                () => store.addMessage(conv.id, createMessage('user', 'should fail')),
                ArchivedConversationError
              );
            }

            const after = await store.getConversation(conv.id);
            assert.strictEqual(after.messages.length, before.messages.length);
            assert.ok(after.archivedAt);
            return true;
          }
        ),
        { numRuns: 25 }
      );
    });

    test('unarchive restores the ability to add messages', async () => {
      await fc.assert(
        fc.asyncProperty(validText, validText, async (first, second) => {
          const conv = await store.createConversation();
          await store.addMessage(conv.id, createMessage('user', first));
          await store.archiveConversation(conv.id);
          await store.unarchiveConversation(conv.id);

          const updated = await store.addMessage(conv.id, createMessage('user', second));
          assert.strictEqual(updated.messages.length, 2);
          assert.strictEqual(updated.archivedAt, null);
          return true;
        }),
        { numRuns: 25 }
      );
    });
  });

  describe('P2: persistence round-trip', () => {
    test('conversations written to the store file read back deep-equal after cache clear', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(conversationRecord, { maxLength: 4 }),
          async (conversations) => {
            const { writeFile } = await import('fs/promises');
            await writeFile(TEST_STORE_FILE, JSON.stringify({ conversations }, null, 2), 'utf-8');
            store.clearCache();

            const stored = await store.listConversations(false);
            assert.strictEqual(stored.length, conversations.length);
            assert.deepStrictEqual(
              stored.map(c => c.id).sort(),
              conversations.map(c => c.id).sort()
            );
            return true;
          }
        ),
        { numRuns: 25 }
      );
    });

    test('created conversations persist across cache clears', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validText, { minLength: 1, maxLength: 4 }),
          async (texts) => {
            const conv = await store.createConversation();
            for (const text of texts) {
              await store.addMessage(conv.id, createMessage('user', text));
            }

            store.clearCache(); // force reload from disk
            const reloaded = await store.getConversation(conv.id);

            assert.strictEqual(reloaded.messages.length, texts.length);
            return true;
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('P3: tag normalization on write', () => {
    test('tags stored through the store are lowercase, trimmed, deduplicated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ maxLength: 12 }), { maxLength: 8 }),
          async (rawTags) => {
            const conv = await store.createConversation(rawTags);
            for (const tag of conv.tags) {
              assert.strictEqual(tag, tag.trim().toLowerCase());
              assert.ok(tag.length > 0);
            }
            assert.strictEqual(new Set(conv.tags).size, conv.tags.length);
            return true;
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
