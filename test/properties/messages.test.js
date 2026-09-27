// Property-based tests for messages.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

import { validateMessage, createMessage, MESSAGE_TYPES } from '../../src/lib/messages.js';

describe('messages.js property tests', () => {
  const generateText = fc.string();

  describe('P1: validateMessage accepts iff trimmed length is between 1 and 4000', () => {
    test('validates based on trimmed length (1-4000)', () => {
      fc.assert(
        fc.property(generateText, (text) => {
          const trimmedLength = String(text).trim().length;
          const result = validateMessage(text);

          const shouldBeValid = trimmedLength >= 1 && trimmedLength <= 4000;

          if (shouldBeValid) {
            assert.strictEqual(result.valid, true, `Text with length ${trimmedLength} should be valid`);
          } else {
            assert.strictEqual(result.valid, false, `Text with length ${trimmedLength} should be invalid`);
          }
        }),
        { numRuns: 50 }
      );
    });

    test('exact boundary at 1 char (valid)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 1 }).filter(s => s.trim().length === 1), (text) => {
          const result = validateMessage(text);
          assert.strictEqual(result.valid, true, `1-char text should be valid`);
        }),
        { numRuns: 50 }
      );
    });

    test('exact boundary at 4000 chars (valid)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 4000, maxLength: 4000 }).filter(s => s.trim().length === 4000), (text) => {
          const result = validateMessage(text);
          assert.strictEqual(result.valid, true, `4000-char text should be valid`);
        }),
        { numRuns: 50 }
      );
    });

    test('4001 chars is invalid', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 4001, maxLength: 4001 }).filter(s => s.trim().length === 4001), (text) => {
          const result = validateMessage(text);
          assert.strictEqual(result.valid, false, `4001-char text should be invalid`);
        }),
        { numRuns: 50 }
      );
    });

    test('empty string is invalid', () => {
      fc.assert(
        fc.property(fc.constant(''), (text) => {
          const result = validateMessage(text);
          assert.strictEqual(result.valid, false, 'Empty string should be invalid');
        }),
        { numRuns: 50 }
      );
    });

    test('whitespace-only is invalid', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const result = validateMessage('   ');
          assert.strictEqual(result.valid, false, 'Whitespace-only should be invalid');
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P2: createMessage produces valid output structure', () => {
    test('creates message with role in {user, assistant}', () => {
      fc.assert(
        fc.property(fc.constantFrom('user', 'assistant'), generateText, (role, text) => {
          const validText = String(text).trim() || 'test message';
          const message = createMessage(role, validText);
          assert.ok(MESSAGE_TYPES.includes(message.role), `Role should be in ${MESSAGE_TYPES.join(', ')}`);
        }),
        { numRuns: 50 }
      );
    });

    test('creates message with ISO-8601 timestamp', () => {
      fc.assert(
        fc.property(fc.constantFrom('user', 'assistant'), generateText, (role, text) => {
          const validText = String(text).trim() || 'test message';
          const message = createMessage(role, validText);

          const timestamp = new Date(message.timestamp);
          assert.ok(timestamp instanceof Date, 'Timestamp should be a Date object');
          assert.ok(!isNaN(timestamp.getTime()), 'Timestamp should be valid');
          assert.ok(message.timestamp.includes('T'), 'Timestamp should be ISO-8601 format');
        }),
        { numRuns: 50 }
      );
    });

    test('creates message with text equal to input (after trim)', () => {
      fc.assert(
        fc.property(fc.constantFrom('user', 'assistant'), generateText, (role, text) => {
          const inputText = String(text).trim() || 'test message';
          const message = createMessage(role, inputText);
          assert.strictEqual(message.text, inputText, `Text should equal trimmed input`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P3: createMessage validation', () => {
    test('throws for invalid role', () => {
      fc.assert(
        fc.property(fc.string(), generateText, (role, text) => {
          const validText = String(text).trim() || 'test';
          if (!MESSAGE_TYPES.includes(role)) {
            assert.throws(
              () => createMessage(role, validText),
              Error,
              'Should throw for invalid role'
            );
          }
        }),
        { numRuns: 50 }
      );
    });

    test('throws for empty text', () => {
      fc.assert(
        fc.property(fc.constantFrom('user', 'assistant'), fc.constant(''), (role, text) => {
          assert.throws(
            () => createMessage(role, text),
            Error,
            'Should throw for empty text'
          );
        }),
        { numRuns: 50 }
      );
    });

    test('throws for text over 4000 chars', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('user', 'assistant'),
          fc.string({ minLength: 4001, maxLength: 4001 }).filter(s => s.trim().length === 4001),
          (role, text) => {
            assert.throws(
              () => createMessage(role, text),
              Error,
              'Should throw for text over 4000 chars'
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P4: Non-string input handling', () => {
    test('validateMessage rejects non-string input', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean(),
            fc.object()
          ),
          (input) => {
            const result = validateMessage(input);
            assert.strictEqual(result.valid, false, `Non-string input should be invalid`);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P5: Whitespace trimming', () => {
    test('trims whitespace from message text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('user', 'assistant'),
          fc.string().filter(s => s.trim().length > 0),
          (role, text) => {
            const message = createMessage(role, `  ${text}  `);
            assert.ok(message.text.trim() === message.text, 'Message text should be trimmed');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P6: Message id generation', () => {
    test('creates unique IDs for each message', () => {
      fc.assert(
        fc.property(fc.constantFrom('user', 'assistant'), generateText, (role, text) => {
          const validText = String(text).trim() || 'test message';
          const message1 = createMessage(role, validText);
          const message2 = createMessage(role, validText);

          assert.ok(message1.id, 'Message should have an ID');
          assert.ok(message2.id, 'Message should have an ID');
          assert.ok(message1.id !== message2.id, 'Each message should have a unique ID');
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Determinism', () => {
    test('validateMessage is deterministic', () => {
      fc.assert(
        fc.property(generateText, (text) => {
          const result1 = validateMessage(text);
          const result2 = validateMessage(text);
          assert.deepStrictEqual(result1, result2);
        }),
        { numRuns: 50 }
      );
    });
  });
});
