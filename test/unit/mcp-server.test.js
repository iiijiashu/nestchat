// Unit tests for mcp/server.js

import { test, describe, beforeEach, afterEach } from 'node:test';
import { strictEqual, ok, deepStrictEqual } from 'node:assert';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createConversationStore } from '../../src/lib/conversation-store.js';
import { createServer, handleMessage } from '../../mcp/server.js';

// Isolated temp store file per test process
const TEST_STORE_FILE = join(tmpdir(), `nestchat-mcp-test-${randomUUID()}.json`);

describe('mcp-server.js', () => {
  let serverHandleMessage;
  let store;

  beforeEach(() => {
    store = createConversationStore({ filePath: TEST_STORE_FILE });
    serverHandleMessage = createServer(store);
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

  describe('initialize', () => {
    test('returns serverInfo and protocolVersion', async () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'initialize' };
      const response = await serverHandleMessage(request);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      strictEqual(response.result.protocolVersion, '2024-11-05');
      deepStrictEqual(response.result.capabilities.tools, {});
      strictEqual(response.result.serverInfo.name, 'nestchat-tools');
      strictEqual(response.result.serverInfo.version, '1.0.0');
    });
  });

  describe('tools/list', () => {
    test('returns four tools with schemas', async () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
      const response = await serverHandleMessage(request);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      ok(Array.isArray(response.result.tools));
      strictEqual(response.result.tools.length, 4);
      
      const toolNames = response.result.tools.map(t => t.name);
      strictEqual(toolNames.includes('list_conversations'), true);
      strictEqual(toolNames.includes('search_messages'), true);
      strictEqual(toolNames.includes('add_message'), true);
      strictEqual(toolNames.includes('get_stats'), true);
      
      for (const tool of response.result.tools) {
        strictEqual(tool.inputSchema.type, 'object');
        ok('properties' in tool.inputSchema);
      }
    });
  });

  describe('tools/call list_conversations', () => {
    test('returns conversations from seeded store', async () => {
      // Seed the temp store
      await store.createConversation({ tags: ['javascript'] });
      await store.createConversation({ tags: ['git'] });
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_conversations' }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      ok(Array.isArray(result));
      strictEqual(result.length, 2);
      ok(result[0].id);
      ok(result[0].createdAt);
    });
  });

  describe('tools/call search_messages', () => {
    test('returns matching messages', async () => {
      const conv = await store.createConversation();
      await store.addMessage(conv.id, { role: 'user', text: 'Hello world' });
      await store.addMessage(conv.id, { role: 'assistant', text: 'Hi there' });
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'search_messages', arguments: { query: 'hello' } }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      ok(Array.isArray(result.results));
      strictEqual(result.results.length, 1);
    });

    test('paginates results', async () => {
      const conv = await store.createConversation();
      for (let i = 0; i < 5; i++) {
        await store.addMessage(conv.id, { role: 'user', text: `test message ${i}` });
      }
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'search_messages', arguments: { query: 'test', page: 1, pageSize: 2 } }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);
      
      strictEqual(result.results.length, 2);
      strictEqual(result.pagination.total, 5);
    });
  });

  describe('tools/call add_message', () => {
    test('appends message to conversation', async () => {
      const conv = await store.createConversation();
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'add_message',
          arguments: {
            conversationId: conv.id,
            role: 'user',
            text: 'New message'
          }
        }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      strictEqual(result.role, 'user');
      strictEqual(result.text, 'New message');
      ok(result.timestamp);
    });

    test('returns error for non-existent conversation', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'add_message',
          arguments: {
            conversationId: 'non-existent',
            role: 'user',
            text: 'Test'
          }
        }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);

      strictEqual(response.result.isError, true);
      ok(result.error.includes('not found'));
    });
  });

  describe('tools/call get_stats', () => {
    test('returns totals', async () => {
      const conv1 = await store.createConversation();
      await store.addMessage(conv1.id, { role: 'user', text: 'Hello' });
      
      const conv2 = await store.createConversation();
      await store.addMessage(conv2.id, { role: 'assistant', text: 'Hi' });
      await store.addMessage(conv2.id, { role: 'user', text: 'How are you?' });
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'get_stats' }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      strictEqual(result.conversationCount, 2);
      strictEqual(result.messageCount, 3);
      strictEqual(result.archivedConversationCount, 0);
      strictEqual(result.tagCount, 0);
    });
  });

  describe('ping', () => {
    test('returns empty object', async () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'ping' };
      const response = await serverHandleMessage(request);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      strictEqual(typeof response.result, 'object');
      strictEqual(Object.keys(response.result).length, 0);
    });
  });

  describe('notifications/initialized', () => {
    test('returns null (no response)', async () => {
      const request = { jsonrpc: '2.0', method: 'notifications/initialized' };
      const response = await serverHandleMessage(request);
      
      strictEqual(response, null);
    });
  });

  describe('unknown notification', () => {
    test('ignores and returns null', async () => {
      const request = { jsonrpc: '2.0', method: 'unknown/notification' };
      const response = await serverHandleMessage(request);
      
      strictEqual(response, null);
    });
  });

  describe('unknown request with id', () => {
    test('returns error response', async () => {
      const request = { jsonrpc: '2.0', id: 1, method: 'unknown/method' };
      const response = await serverHandleMessage(request);
      
      strictEqual(response.jsonrpc, '2.0');
      strictEqual(response.id, 1);
      strictEqual(response.error.code, -32601);
      ok(response.error.message.includes('Method not found'));
    });
  });

  describe('unknown tool call', () => {
    test('returns error result', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'unknown_tool', arguments: {} }
      };
      
      const response = await serverHandleMessage(request);
      const result = JSON.parse(response.result.content[0].text);

      strictEqual(response.result.isError, true);
      ok(result.error.includes('Unknown tool'));
    });
  });
});
