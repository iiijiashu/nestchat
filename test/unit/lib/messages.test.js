// Unit tests for messages.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateMessage, createMessage, MESSAGE_TYPES } from '../../../src/lib/messages.js';

describe('messages.js', () => {
  describe('validateMessage', () => {
    test('returns valid for normal message', () => {
      const result = validateMessage('Hello, world!');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.error, undefined);
    });

    test('returns valid for message at max length (4000)', () => {
      const text = 'a'.repeat(4000);
      const result = validateMessage(text);
      assert.strictEqual(result.valid, true);
    });

    test('returns invalid for empty string', () => {
      const result = validateMessage('');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    test('returns invalid for whitespace only', () => {
      const result = validateMessage('   ');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    test('returns invalid for message over 4000 chars (4001)', () => {
      const text = 'a'.repeat(4001);
      const result = validateMessage(text);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('4000'));
    });

    test('returns invalid for non-string input', () => {
      assert.strictEqual(validateMessage(null).valid, false);
      assert.strictEqual(validateMessage(undefined).valid, false);
      assert.strictEqual(validateMessage(123).valid, false);
    });

    test('trims whitespace before validation', () => {
      const result = validateMessage('  hello  ');
      assert.strictEqual(result.valid, true);
    });
  });

  describe('createMessage', () => {
    test('creates user message', () => {
      const message = createMessage('user', 'Hello');
      assert.strictEqual(message.role, 'user');
      assert.strictEqual(message.text, 'Hello');
      assert.ok(message.id);
      assert.ok(message.timestamp);
    });

    test('creates assistant message', () => {
      const message = createMessage('assistant', 'Hi there!');
      assert.strictEqual(message.role, 'assistant');
      assert.strictEqual(message.text, 'Hi there!');
    });

    test('throws for invalid role', () => {
      assert.throws(() => createMessage('invalid', 'text'));
    });

    test('throws for empty text', () => {
      assert.throws(() => createMessage('user', ''));
    });

    test('throws for whitespace-only text', () => {
      assert.throws(() => createMessage('user', '   '));
    });

    test('throws for text over 4000 chars', () => {
      assert.throws(() => createMessage('user', 'a'.repeat(4001)));
    });

    test('trims text on creation', () => {
      const message = createMessage('user', '  Hello  ');
      assert.strictEqual(message.text, 'Hello');
    });

    test('includes ISO timestamp', () => {
      const message = createMessage('user', 'Test');
      const timestamp = new Date(message.timestamp);
      assert.ok(timestamp instanceof Date);
      assert.ok(!isNaN(timestamp.getTime()));
    });
  });

  describe('MESSAGE_TYPES', () => {
    test('contains user and assistant', () => {
      assert.ok(MESSAGE_TYPES.includes('user'));
      assert.ok(MESSAGE_TYPES.includes('assistant'));
      assert.strictEqual(MESSAGE_TYPES.length, 2);
    });
  });
});