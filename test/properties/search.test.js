// Property-based tests for search.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

import { searchMessages } from '../../src/lib/search.js';

describe('search.js property tests', () => {
  const generateMessage = fc.record({
    id: fc.string(),
    role: fc.constantFrom('user', 'assistant'),
    text: fc.string(),
    timestamp: fc.date()
  });

  const generateConversation = fc.record({
    id: fc.string(),
    archivedAt: fc.oneof(fc.constant(null), fc.date()),
    tags: fc.array(fc.string()),
    messages: fc.array(generateMessage)
  });

  const generateConversations = fc.array(generateConversation);

  const generateQuery = fc.oneof(
    fc.string(),
    fc.constant(''),
    fc.constant(null),
    fc.constant(undefined)
  );

  describe('P1: Case-insensitive search', () => {
    test('returns only messages whose text contains query (case-insensitive)', () => {
      fc.assert(
        fc.property(generateConversations, generateQuery, (conversations, query) => {
          const result = searchMessages(conversations, query);

          if (!query || typeof query !== 'string' || query.trim().length === 0) {
            assert.deepStrictEqual(result.results, []);
            return;
          }

          const searchTerm = query.toLowerCase();
          result.results.forEach(match => {
            assert.ok(
              match.message.text.toLowerCase().includes(searchTerm),
              `Message text should contain query`
            );
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P2: Whitespace/empty query returns zero results', () => {
    test('empty query returns no results', () => {
      fc.assert(
        fc.property(generateConversations, (conversations) => {
          const result = searchMessages(conversations, '');
          assert.deepStrictEqual(result.results, []);
        }),
        { numRuns: 50 }
      );
    });

    test('whitespace-only query returns no results', () => {
      fc.assert(
        fc.property(generateConversations, (conversations) => {
          const result = searchMessages(conversations, '   ');
          assert.deepStrictEqual(result.results, []);
        }),
        { numRuns: 50 }
      );
    });

    test('null query returns no results', () => {
      fc.assert(
        fc.property(generateConversations, (conversations) => {
          const result = searchMessages(conversations, null);
          assert.deepStrictEqual(result.results, []);
        }),
        { numRuns: 50 }
      );
    });

    test('undefined query returns no results', () => {
      fc.assert(
        fc.property(generateConversations, (conversations) => {
          const result = searchMessages(conversations, undefined);
          assert.deepStrictEqual(result.results, []);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P3: Results are subset of input messages', () => {
    test('all result messages exist in input conversations', () => {
      fc.assert(
        fc.property(generateConversations, fc.string(), (conversations, query) => {
          const result = searchMessages(conversations, query);

          if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return;
          }

          const allMessages = [];
          conversations.forEach(conv => {
            if (Array.isArray(conv.messages)) {
              conv.messages.forEach(msg => allMessages.push(msg));
            }
          });

          result.results.forEach(match => {
            assert.ok(
              allMessages.includes(match.message),
              `Result message should exist in input conversations`
            );
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P4: Determinism', () => {
    test('identical inputs give identical results', () => {
      fc.assert(
        fc.property(generateConversations, fc.string(), (conversations, query) => {
          const result1 = searchMessages(conversations, query);
          const result2 = searchMessages(conversations, query);

          assert.deepStrictEqual(result1, result2);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Additional properties', () => {
    test('archived conversations are excluded from search', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              archivedAt: fc.oneof(fc.constant(null), fc.constant('2026-09-27T12:00:00Z')),
              messages: fc.array(generateMessage)
            })
          ),
          fc.string().filter(s => s && s.trim().length > 0),
          (conversations, query) => {
            const result = searchMessages(conversations, query);

            result.results.forEach(match => {
              const conv = conversations.find(c => c.id === match.conversationId);
              assert.strictEqual(
                conv.archivedAt,
                null,
                'Archived conversations should not appear in search results'
              );
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('case variations of query return same matches', () => {
      fc.assert(
        fc.property(
          fc.array(generateConversation),
          fc.string().filter(s => s && s.trim().length > 0),
          (conversations, query) => {
            const resultLower = searchMessages(conversations, query.toLowerCase());
            const resultUpper = searchMessages(conversations, query.toUpperCase());

            assert.strictEqual(
              resultLower.results.length,
              resultUpper.results.length,
              `Case variations should return same number of results`
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
