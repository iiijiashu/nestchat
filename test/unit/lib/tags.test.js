// Unit tests for tags.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizeTags, validateTags } from '../../../src/lib/tags.js';

describe('tags.js', () => {
  describe('normalizeTags', () => {
    test('returns empty array for non-array input', () => {
      assert.deepStrictEqual(normalizeTags(null), []);
      assert.deepStrictEqual(normalizeTags(undefined), []);
      assert.deepStrictEqual(normalizeTags('string'), []);
      assert.deepStrictEqual(normalizeTags(123), []);
    });

    test('lowercases tags', () => {
      const result = normalizeTags(['Hello', 'WORLD']);
      assert.deepStrictEqual(result, ['hello', 'world']);
    });

    test('trims tags', () => {
      const result = normalizeTags(['  hello  ', ' world ']);
      assert.deepStrictEqual(result, ['hello', 'world']);
    });

    test('deduplicates tags (case-insensitive)', () => {
      const result = normalizeTags(['Hello', 'hello', 'HELLO', 'world']);
      assert.deepStrictEqual(result, ['hello', 'world']);
    });

    test('drops empty tags', () => {
      const result = normalizeTags(['hello', '', '  ', 'world']);
      assert.deepStrictEqual(result, ['hello', 'world']);
    });

    test('preserves first-seen order', () => {
      const result = normalizeTags(['b', 'a', 'c', 'b', 'a']);
      assert.deepStrictEqual(result, ['b', 'a', 'c']);
    });

    test('handles mixed valid and invalid items', () => {
      const result = normalizeTags(['Hello', null, undefined, 123, 'World']);
      assert.deepStrictEqual(result, ['hello', 'world']);
    });

    test('returns empty array for all empty input', () => {
      assert.deepStrictEqual(normalizeTags(['', '  ', null]), []);
    });

    test('returns empty array for empty array', () => {
      assert.deepStrictEqual(normalizeTags([]), []);
    });
  });

  describe('validateTags', () => {
    test('returns valid for array of strings', () => {
      const result = validateTags(['hello', 'world']);
      assert.strictEqual(result.valid, true);
    });

    test('returns valid for empty array', () => {
      const result = validateTags([]);
      assert.strictEqual(result.valid, true);
    });

    test('returns invalid for non-array', () => {
      assert.strictEqual(validateTags('string').valid, false);
      assert.strictEqual(validateTags(123).valid, false);
    });

    test('returns invalid for array with non-string items', () => {
      const result = validateTags(['hello', 123, 'world']);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });
  });
});