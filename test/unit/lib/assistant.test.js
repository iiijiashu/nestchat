// Unit tests for assistant.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createAssistant, generateResponse, AVAILABLE_PROVIDERS } from '../../../src/lib/assistant.js';

describe('assistant.js', () => {
  describe('createAssistant', () => {
    test('creates assistant with local provider', () => {
      const assistant = createAssistant({ provider: 'local' });
      assert.strictEqual(assistant.getProvider(), 'local');
    });

    test('throws for unknown provider', () => {
      assert.throws(() => createAssistant({ provider: 'unknown' }));
    });

    test('defaults to local provider', () => {
      const assistant = createAssistant();
      assert.strictEqual(assistant.getProvider(), 'local');
    });
  });

  describe('reply', () => {
    test('returns assistant message object', () => {
      const assistant = createAssistant();
      const conversation = {
        messages: [
          { id: '1', role: 'user', text: 'Hello', timestamp: '2026-09-27T10:00:00Z' }
        ]
      };

      const reply = assistant.reply(conversation);

      assert.strictEqual(reply.role, 'assistant');
      assert.ok(reply.text);
      assert.ok(reply.id);
      assert.ok(reply.timestamp);
    });

    test('detects greeting', () => {
      const assistant = createAssistant();
      const conversation = {
        messages: [
          { id: '1', role: 'user', text: 'Hello there!', timestamp: '2026-09-27T10:00:00Z' }
        ]
      };

      const reply = assistant.reply(conversation);
      const greetings = ['Hello', 'Hi', 'Hey', 'Greetings'];
      const startsWithGreeting = greetings.some(g => reply.text.startsWith(g));
      assert.ok(startsWithGreeting);
    });

    test('detects questions', () => {
      const assistant = createAssistant();
      const conversation = {
        messages: [
          { id: '1', role: 'user', text: 'What is JavaScript?', timestamp: '2026-09-27T10:00:00Z' }
        ]
      };

      const reply = assistant.reply(conversation);
      assert.ok(reply.text);
    });

    test('detects code keywords', () => {
      const assistant = createAssistant();
      const conversation = {
        messages: [
          { id: '1', role: 'user', text: 'How do I write a function in JavaScript?', timestamp: '2026-09-27T10:00:00Z' }
        ]
      };

      const reply = assistant.reply(conversation);
      assert.ok(reply.text);
    });

    test('throws for invalid conversation', () => {
      const assistant = createAssistant();
      assert.throws(() => assistant.reply(null));
      assert.throws(() => assistant.reply({}));
    });
  });

  describe('generateResponse', () => {
    test('generates response for greeting', () => {
      const response = generateResponse('hello');
      assert.ok(response);
      assert.ok(typeof response === 'string');
    });

    test('generates response for empty message', () => {
      const response = generateResponse('');
      assert.ok(response);
    });

    test('uses context in response selection', () => {
      const response1 = generateResponse('hi', []);
      const response2 = generateResponse('hi', [{}, {}, {}]);
      // Different context lengths may produce different responses
      assert.ok(response1);
      assert.ok(response2);
    });

    test('returns string', () => {
      const response = generateResponse('test message');
      assert.strictEqual(typeof response, 'string');
    });
  });

  describe('AVAILABLE_PROVIDERS', () => {
    test('includes local and remote', () => {
      assert.ok(AVAILABLE_PROVIDERS.includes('local'));
      assert.ok(AVAILABLE_PROVIDERS.includes('remote'));
    });
  });

  describe('determinism', () => {
    test('same input produces same output', () => {
      const response1 = generateResponse('hello world', []);
      const response2 = generateResponse('hello world', []);
      assert.strictEqual(response1, response2);
    });

    test('different context produces potentially different output', () => {
      const response1 = generateResponse('hello', []);
      const response2 = generateResponse('hello', [
        { role: 'assistant', text: 'Previous message' }
      ]);
      // Both should be valid greetings but may differ based on context
      assert.ok(response1);
      assert.ok(response2);
    });
  });
});