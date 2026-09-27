// Property-based tests for tags.js

import { test, describe } from 'node:test';
import assert from 'node:assert';
import fc from 'fast-check';

import { normalizeTags } from '../../src/lib/tags.js';

describe('tags.js property tests', () => {
  const generateTags = fc.array(fc.string());

  describe('P1: All tags are lowercase', () => {
    test('normalizeTags returns all lowercase tags', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const normalized = normalizeTags(tags);

          normalized.forEach(tag => {
            assert.strictEqual(tag, tag.toLowerCase(), `Tag "${tag}" should be lowercase`);
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P2: All tags are trimmed and non-empty', () => {
    test('no empty tags in result', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const normalized = normalizeTags(tags);

          normalized.forEach(tag => {
            assert.ok(tag.length > 0, `Tag "${tag}" should not be empty`);
          });
        }),
        { numRuns: 50 }
      );
    });

    test('no whitespace-only tags in result', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()),
          (tags) => {
            const normalized = normalizeTags(tags);

            normalized.forEach(tag => {
              assert.ok(tag.trim() === tag, `Tag "${tag}" should not have leading/trailing whitespace`);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P3: All tags are unique (no duplicates)', () => {
    test('no duplicate tags in result', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const normalized = normalizeTags(tags);

          const seen = new Set();
          normalized.forEach(tag => {
            assert.ok(!seen.has(tag), `Duplicate tag "${tag}" found in result`);
            seen.add(tag);
          });
        }),
        { numRuns: 50 }
      );
    });

    test('case-insensitive deduplication (Hello and hello only keeps one)', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          // Add case variants
          const withVariants = [
            ...tags,
            ...tags.map(s => s.toUpperCase()),
            ...tags.map(s => s.toLowerCase())
          ];
          const normalized = normalizeTags(withVariants);

          // Should have exactly one of each unique lowercase non-empty tag
          const uniqueTags = new Set(
            tags
              .filter(s => s && s.trim().length > 0)
              .map(s => s.toLowerCase())
          );
          const uniqueCount = uniqueTags.size;
          assert.strictEqual(normalized.length, uniqueCount, `Expected ${uniqueCount} unique tags, got ${normalized.length}`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P4: Output length never exceeds input length', () => {
    test('normalized length <= original length', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const normalized = normalizeTags(tags);
          assert.ok(normalized.length <= tags.length, `Normalized length ${normalized.length} should not exceed input length ${tags.length}`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P5: First-seen order preserved', () => {
    test('normalized tags preserve first-seen order', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const normalized = normalizeTags(tags);

          // Build expected order from first occurrence
          const seen = new Set();
          const expected = [];
          for (const tag of tags) {
            const normalizedTag = String(tag).trim().toLowerCase();
            if (normalizedTag.length > 0 && !seen.has(normalizedTag)) {
              seen.add(normalizedTag);
              expected.push(normalizedTag);
            }
          }

          assert.deepStrictEqual(normalized, expected, `Order should be preserved`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P6: Idempotence', () => {
    test('normalizing twice equals normalizing once', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const first = normalizeTags(tags);
          const second = normalizeTags(first);
          assert.deepStrictEqual(second, first, `Double normalization should equal single normalization`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('P7: Empty input handling', () => {
    test('empty array returns empty array', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          if (tags.length === 0) {
            const normalized = normalizeTags([]);
            assert.deepStrictEqual(normalized, []);
          }
        }),
        { numRuns: 50 }
      );
    });

    test('all-empty or whitespace-only input returns empty array', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()),
          (tags) => {
            // Force all to be empty/whitespace
            const allEmpty = tags.map(() => '');
            const normalized = normalizeTags(allEmpty);
            assert.deepStrictEqual(normalized, []);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P8: Non-array input handling', () => {
    test('non-array input returns empty array', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.object()
          ),
          (input) => {
            const normalized = normalizeTags(input);
            assert.deepStrictEqual(normalized, []);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('P9: Type filtering', () => {
    test('non-string items are filtered out', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.string(),
              fc.constant(null),
              fc.constant(undefined),
              fc.integer(),
              fc.boolean(),
              fc.object()
            )
          ),
          (tags) => {
            const normalized = normalizeTags(tags);
            normalized.forEach(tag => {
              assert.strictEqual(typeof tag, 'string', `Normalized tag should be a string`);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Determinism', () => {
    test('identical inputs give identical results', () => {
      fc.assert(
        fc.property(generateTags, (tags) => {
          const result1 = normalizeTags(tags);
          const result2 = normalizeTags(tags);
          assert.deepStrictEqual(result1, result2);
        }),
        { numRuns: 50 }
      );
    });
  });
});
