// Unit tests for conversation-store.js

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createConversationStore, ArchivedConversationError } from '../../../src/lib/conversation-store.js';
import { createMessage } from '../../../src/lib/messages.js';

// Isolated temp store file per test process - never touches data/conversations.json
const TEST_STORE_FILE = join(tmpdir(), `nestchat-unit-${randomUUID()}.json`);
let store;

describe('conversation-store.js', () => {
  beforeEach(() => {
    store = createConversationStore({ filePath: TEST_STORE_FILE });
  });

  afterEach(async () => {
    store.clearCache();
    // Clean up the temp test data file after each test
    try {
      if (existsSync(TEST_STORE_FILE)) {
        await unlink(TEST_STORE_FILE);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('createConversation', () => {
    test('creates a new conversation', async () => {
      const conv = await store.createConversation();
      assert.ok(conv.id);
      assert.ok(conv.createdAt);
      assert.strictEqual(conv.archivedAt, null);
      assert.deepStrictEqual(conv.tags, []);
      assert.deepStrictEqual(conv.messages, []);
    });

    test('creates conversation with tags', async () => {
      const conv = await store.createConversation(['Hello', 'WORLD', 'hello']);
      assert.deepStrictEqual(conv.tags, ['hello', 'world']);
    });

    test('assigns unique IDs', async () => {
      const conv1 = await store.createConversation();
      const conv2 = await store.createConversation();
      assert.notStrictEqual(conv1.id, conv2.id);
    });
  });

  describe('getConversation', () => {
    test('returns null for non-existent ID', async () => {
      const result = await store.getConversation('non-existent');
      assert.strictEqual(result, null);
    });

    test('returns conversation by ID', async () => {
      const created = await store.createConversation();
      const retrieved = await store.getConversation(created.id);
      assert.strictEqual(retrieved.id, created.id);
    });
  });

  describe('listConversations', () => {
    test('returns empty array when no conversations', async () => {
      const result = await store.listConversations();
      assert.deepStrictEqual(result, []);
    });

    test('lists active conversations first', async () => {
      const active = await store.createConversation();
      const archived = await store.createConversation();
      await store.archiveConversation(archived.id);

      const list = await store.listConversations();
      assert.strictEqual(list[0].id, active.id);
    });

    test('sorts newest first', async () => {
      const conv1 = await store.createConversation();
      // Small delay to ensure different timestamps
      await new Promise(r => setTimeout(r, 10));
      const conv2 = await store.createConversation();

      const list = await store.listConversations();
      assert.strictEqual(list[0].id, conv2.id);
      assert.strictEqual(list[1].id, conv1.id);
    });

    test('includes archived when activeOnly=false', async () => {
      const active = await store.createConversation();
      const archived = await store.createConversation();
      await store.archiveConversation(archived.id);

      const list = await store.listConversations(false);
      assert.strictEqual(list.length, 2);
    });
  });

  describe('addMessage', () => {
    test('adds message to conversation', async () => {
      const conv = await store.createConversation();
      const message = createMessage('user', 'Hello there');

      const updated = await store.addMessage(conv.id, message);

      assert.strictEqual(updated.messages.length, 1);
      assert.strictEqual(updated.messages[0].text, 'Hello there');
    });

    test('returns null for non-existent conversation', async () => {
      const result = await store.addMessage('non-existent', createMessage('user', 'test'));
      assert.strictEqual(result, null);
    });

    test('rejects adding to archived conversation', async () => {
      const conv = await store.createConversation();
      await store.archiveConversation(conv.id);

      await assert.rejects(
        () => store.addMessage(conv.id, createMessage('user', 'Hello')),
        ArchivedConversationError
      );
    });
  });

  describe('archiveConversation', () => {
    test('archives active conversation', async () => {
      const conv = await store.createConversation();
      const archived = await store.archiveConversation(conv.id);

      assert.ok(archived.archivedAt);
    });

    test('returns null for non-existent conversation', async () => {
      const result = await store.archiveConversation('non-existent');
      assert.strictEqual(result, null);
    });
  });

  describe('unarchiveConversation', () => {
    test('unarchives archived conversation', async () => {
      const conv = await store.createConversation();
      await store.archiveConversation(conv.id);

      const unarchived = await store.unarchiveConversation(conv.id);
      assert.strictEqual(unarchived.archivedAt, null);
    });

    test('does nothing for active conversation', async () => {
      const conv = await store.createConversation();
      const result = await store.unarchiveConversation(conv.id);
      assert.strictEqual(result.archivedAt, null);
    });
  });

  describe('setTags', () => {
    test('sets tags on conversation', async () => {
      const conv = await store.createConversation();
      const updated = await store.setTags(conv.id, ['tag1', 'TAG1', 'tag2']);

      assert.deepStrictEqual(updated.tags, ['tag1', 'tag2']);
    });

    test('returns null for non-existent conversation', async () => {
      const result = await store.setTags('non-existent', ['tag']);
      assert.strictEqual(result, null);
    });
  });

  describe('search', () => {
    test('finds messages matching query', async () => {
      const conv = await store.createConversation();
      await store.addMessage(conv.id, createMessage('user', 'Hello world'));
      await store.addMessage(conv.id, createMessage('assistant', 'Hi there'));

      const result = await store.search('hello');
      assert.ok(result.results.length > 0);
    });

    test('returns empty for empty query', async () => {
      const result = await store.search('');
      assert.strictEqual(result.results.length, 0);
    });

    test('paginates results', async () => {
      const conv = await store.createConversation();
      for (let i = 0; i < 5; i++) {
        await store.addMessage(conv.id, createMessage('user', `test message ${i}`));
      }

      const result = await store.search('test', { page: 1, pageSize: 2 });
      assert.strictEqual(result.results.length, 2);
      assert.strictEqual(result.pagination.total, 5);
    });
  });

  describe('persistence round-trip', () => {
    test('persists across cache clears', async () => {
      const conv = await store.createConversation();
      const message = createMessage('user', 'Test message');
      await store.addMessage(conv.id, message);

      // Clear cache to force reload from disk
      store.clearCache();

      // Retrieve again
      const retrieved = await store.getConversation(conv.id);
      assert.strictEqual(retrieved.messages.length, 1);
      assert.strictEqual(retrieved.messages[0].text, 'Test message');
    });
  });
});