// Property-based tests for pagination.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

import { paginate } from '../../src/lib/pagination.js';

describe('pagination.js property tests', () => {
  const generateItems = fc.array(fc.anything());

  const generatePage = fc.integer({ min: -100, max: 100 });

  const generatePageSize = fc.integer({ min: 0, max: 200 });

  describe('P1: Page clamping', () => {
    test('page is clamped to minimum 1', () => {
      fc.assert(
        fc.property(generateItems, generatePage, generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.ok(result.page >= 1, `Page ${result.page} should be clamped to minimum 1`);
        }),
        { numRuns: 50 }
      );
    });

    test('pageSize is clamped to minimum 1', () => {
      fc.assert(
        fc.property(generateItems, generatePage, generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.ok(result.pageSize >= 1, `PageSize ${result.pageSize} should be clamped to minimum 1`);
        }),
        { numRuns: 50 }
      );
    });

    test('pageSize is clamped to maximum 100', () => {
      fc.assert(
        fc.property(generateItems, generatePage, fc.integer({ min: 101, max: 500 }), (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.ok(result.pageSize <= 100, `PageSize ${result.pageSize} should be clamped to maximum 100`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P2: Consistency of total and totalPages', () => {
    test('totalPages = ceil(total/pageSize)', () => {
      fc.assert(
        fc.property(generateItems, generatePage, generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          const total = result.total;
          const totalPages = result.totalPages;

          if (total === 0) {
            assert.strictEqual(totalPages, 0, 'Empty array should have totalPages of 0');
          } else {
            const expectedTotalPages = Math.ceil(total / result.pageSize);
            assert.strictEqual(totalPages, expectedTotalPages, `totalPages should equal ceil(total/pageSize)`);
          }
        }),
        { numRuns: 50 }
      );
    });

    test('items length never exceeds pageSize', () => {
      fc.assert(
        fc.property(generateItems, generatePage, generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.ok(
            result.items.length <= result.pageSize,
            `Items length ${result.items.length} should not exceed pageSize ${result.pageSize}`
          );
        }),
        { numRuns: 50 }
      );
    });

    test('items length is always non-negative', () => {
      fc.assert(
        fc.property(generateItems, generatePage, generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.ok(result.items.length >= 0, `Items length should be non-negative`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P3: Non-overlapping, contiguous slices', () => {
    test('items form contiguous slice of input', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 1000 })),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 50 }),
          (originalItems, page, pageSize) => {
            const result = paginate(originalItems, page, pageSize);
            const { items, page: resultPage, pageSize: resultPageSize, total, totalPages } = result;

            if (total === 0) {
              assert.deepStrictEqual(items, []);
              return;
            }

            // Calculate what page the pagination function actually used
            // It clamps pages > totalPages to the last page
            const clampedPage = Math.min(Math.max(1, Math.floor(page)), totalPages || 1);
            
            // Calculate expected slice based on clamped page
            const startIndex = (clampedPage - 1) * resultPageSize;
            const endIndex = Math.min(startIndex + resultPageSize, total);
            const expectedSlice = originalItems.slice(startIndex, endIndex);

            // When requested page is beyond total pages, pagination returns empty items
            const requestedPage = Math.floor(page);
            if (requestedPage > totalPages) {
              assert.deepStrictEqual(items, [], `Page ${requestedPage} beyond totalPages ${totalPages} should return empty items`);
            } else {
              assert.deepStrictEqual(items, expectedSlice, `Items should be contiguous slice at page ${clampedPage}`);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('results are disjoint across pages', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 100 })),
          fc.integer({ min: 1, max: 20 }),
          (items, pageSize) => {
            const total = items.length;
            if (total === 0) return;

            const totalPages = Math.ceil(total / pageSize);
            const allPageItems = [];

            for (let page = 1; page <= totalPages; page++) {
              const result = paginate(items, page, pageSize);
              allPageItems.push(...result.items);
            }

            // All items from all pages should equal original items
            assert.deepStrictEqual(allPageItems, items, 'Union of all pages should equal original');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P4: Edge cases', () => {
    test('empty array returns empty items', () => {
      fc.assert(
        fc.property(generatePage, generatePageSize, (page, pageSize) => {
          const result = paginate([], page, pageSize);
          assert.deepStrictEqual(result.items, []);
          assert.strictEqual(result.total, 0);
          assert.strictEqual(result.totalPages, 0);
        }),
        { numRuns: 50 }
      );
    });

    test('null/undefined items handled', () => {
      fc.assert(
        fc.property(generatePage, generatePageSize, (page, pageSize) => {
          const result = paginate(null, page, pageSize);
          assert.deepStrictEqual(result.items, []);
          assert.strictEqual(result.total, 0);
        }),
        { numRuns: 50 }
      );
    });

    test('page beyond totalPages returns empty items', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer()),
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 2, max: 10 }),
          (items, page, pageSize) => {
            const totalPages = Math.ceil(items.length / pageSize) || 0;
            const farBeyondPage = totalPages + 10;

            const result = paginate(items, farBeyondPage, pageSize);
            assert.deepStrictEqual(result.items, []);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('negative page clamped to 1', () => {
      fc.assert(
        fc.property(generateItems, fc.integer({ max: -1 }), generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.strictEqual(result.page, 1, `Negative page should be clamped to 1`);
        }),
        { numRuns: 50 }
      );
    });

    test('zero page clamped to 1', () => {
      fc.assert(
        fc.property(generateItems, fc.constant(0), generatePageSize, (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.strictEqual(result.page, 1, `Zero page should be clamped to 1`);
        }),
        { numRuns: 50 }
      );
    });

    test('zero pageSize clamped to 1', () => {
      fc.assert(
        fc.property(generateItems, generatePage, fc.constant(0), (items, page, pageSize) => {
          const result = paginate(items, page, pageSize);
          assert.strictEqual(result.pageSize, 1, `Zero pageSize should be clamped to 1`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Determinism', () => {
    test('identical inputs give identical results', () => {
      fc.assert(
        fc.property(generateItems, generatePage, generatePageSize, (items, page, pageSize) => {
          const result1 = paginate(items, page, pageSize);
          const result2 = paginate(items, page, pageSize);
          assert.deepStrictEqual(result1, result2);
        }),
        { numRuns: 50 }
      );
    });
  });
});
