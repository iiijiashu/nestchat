// Unit tests for pagination.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { paginate } from '../../../src/lib/pagination.js';

describe('pagination.js', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  describe('paginate', () => {
    test('returns first page correctly', () => {
      const result = paginate(items, 1, 3);
      assert.deepStrictEqual(result.items, [1, 2, 3]);
      assert.strictEqual(result.page, 1);
      assert.strictEqual(result.pageSize, 3);
      assert.strictEqual(result.total, 10);
      assert.strictEqual(result.totalPages, 4);
    });

    test('returns second page correctly', () => {
      const result = paginate(items, 2, 3);
      assert.deepStrictEqual(result.items, [4, 5, 6]);
      assert.strictEqual(result.page, 2);
    });

    test('returns last page correctly', () => {
      const result = paginate(items, 4, 3);
      assert.deepStrictEqual(result.items, [10]);
      assert.strictEqual(result.page, 4);
    });

    test('returns empty for page beyond total', () => {
      const result = paginate(items, 10, 3);
      assert.deepStrictEqual(result.items, []);
      assert.strictEqual(result.page, 4); // clamped to last page
    });

    test('returns empty for page before first', () => {
      const result = paginate(items, 0, 3);
      assert.deepStrictEqual(result.items, [1, 2, 3]);
      assert.strictEqual(result.page, 1); // clamped to 1
    });

    test('returns empty for negative page', () => {
      const result = paginate(items, -5, 3);
      assert.deepStrictEqual(result.items, [1, 2, 3]);
      assert.strictEqual(result.page, 1);
    });

    test('handles floating point page numbers', () => {
      const result = paginate(items, 1.7, 3);
      assert.deepStrictEqual(result.items, [1, 2, 3]);
    });

    test('clamps pageSize to minimum 1', () => {
      const result = paginate(items, 1, 0);
      assert.strictEqual(result.pageSize, 1);
    });

    test('clamps pageSize to maximum 100', () => {
      const result = paginate(items, 1, 500);
      assert.strictEqual(result.pageSize, 100);
    });

    test('handles empty array', () => {
      const result = paginate([], 1, 10);
      assert.deepStrictEqual(result.items, []);
      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.totalPages, 0);
    });

    test('handles non-array input', () => {
      const result = paginate(null, 1, 10);
      assert.deepStrictEqual(result.items, []);
      assert.strictEqual(result.total, 0);
    });

    test('handles undefined pageSize (uses default)', () => {
      const result = paginate(items, 1);
      assert.strictEqual(result.pageSize, 20);
    });

    test('handles undefined page (uses default)', () => {
      const result = paginate(items, undefined, 10);
      assert.strictEqual(result.page, 1);
    });

    test('clamps page to totalPages when page > totalPages', () => {
      const result = paginate(items, 5, 3);
      assert.strictEqual(result.page, 4);
    });
  });
});