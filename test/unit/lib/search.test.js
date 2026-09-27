// Unit tests for search.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { searchMessages } from '../../../src/lib/search.js';

describe('search.js', () => {
  const mockConversations = [
    {
      id: 'conv-1',
      archivedAt: null,
      messages: [
        { id: 'msg-1', role: 'user', text: 'Hello there!', timestamp: '2026-09-27T10:00:00Z' },
        { id: 'msg-2', role: 'assistant', text: 'Hi! How can I help?', timestamp: '2026-09-27T10:00:01Z' }
      ]
    },
    {
      id: 'conv-2',
      archivedAt: null,
      messages: [
        { id: 'msg-3', role: 'user', text: 'Tell me about JavaScript', timestamp: '2026-09-27T11:00:00Z' },
        { id: 'msg-4', role: 'assistant', text: 'JavaScript is a programming language', timestamp: '2026-09-27T11:00:01Z' }
      ]
    },
    {
      id: 'conv-3',
      archivedAt: '2026-09-27T12:00:00Z', // archived
      messages: [
        { id: 'msg-5', role: 'user', text: 'Secret information', timestamp: '2026-09-27T09:00:00Z' }
      ]
    }
  ];

  describe('searchMessages', () => {
    test('finds messages with matching text', () => {
      const result = searchMessages(mockConversations, 'javascript');
      assert.strictEqual(result.results.length, 2);
      assert.ok(result.results.some(r => r.conversationId === 'conv-2'));
    });

    test('is case-insensitive', () => {
      const resultLower = searchMessages(mockConversations, 'javascript');
      const resultUpper = searchMessages(mockConversations, 'JAVASCRIPT');
      const resultMixed = searchMessages(mockConversations, 'JavaScript');

      assert.strictEqual(resultLower.results.length, resultUpper.results.length);
      assert.strictEqual(resultLower.results.length, resultMixed.results.length);
    });

    test('returns empty for empty query', () => {
      assert.strictEqual(searchMessages(mockConversations, '').results.length, 0);
    });

    test('returns empty for whitespace-only query', () => {
      assert.strictEqual(searchMessages(mockConversations, '   ').results.length, 0);
    });

    test('returns empty for null query', () => {
      assert.strictEqual(searchMessages(mockConversations, null).results.length, 0);
    });

    test('returns empty for undefined query', () => {
      assert.strictEqual(searchMessages(mockConversations, undefined).results.length, 0);
    });

    test('excludes archived conversations', () => {
      const result = searchMessages(mockConversations, 'secret');
      assert.strictEqual(result.results.length, 0);
    });

    test('returns matches from multiple messages in same conversation', () => {
      const result = searchMessages(mockConversations, 'hello');
      assert.ok(result.results.length >= 1);
    });

    test('paginates results', () => {
      // Add more matching messages
      const manyConversations = Array.from({ length: 25 }, (_, i) => ({
        id: `conv-${i}`,
        archivedAt: null,
        messages: [{ id: `msg-${i}`, role: 'user', text: `Test message ${i}`, timestamp: '2026-09-27T10:00:00Z' }]
      }));

      const result = searchMessages(manyConversations, 'test', { page: 1, pageSize: 10 });
      assert.strictEqual(result.results.length, 10);
      assert.strictEqual(result.pagination.total, 25);
      assert.strictEqual(result.pagination.totalPages, 3);
    });

    test('handles conversations without messages', () => {
      const convNoMessages = [{ id: 'conv-x', archivedAt: null, messages: [] }];
      const result = searchMessages(convNoMessages, 'test');
      assert.strictEqual(result.results.length, 0);
    });

    test('handles conversations with null messages', () => {
      const convNullMessages = [{ id: 'conv-x', archivedAt: null, messages: null }];
      const result = searchMessages(convNullMessages, 'test');
      assert.strictEqual(result.results.length, 0);
    });

    test('handles empty conversations array', () => {
      const result = searchMessages([], 'test');
      assert.strictEqual(result.results.length, 0);
      assert.strictEqual(result.pagination.total, 0);
    });
  });
});