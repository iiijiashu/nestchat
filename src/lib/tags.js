// tags.js - Tag normalization and validation

/**
 * Normalizes tags: lowercase, trim, deduplicate, drop empties
 * Preserves first-seen order
 * @param {string[]} tags - Array of tag strings
 * @returns {string[]} Normalized tags
 */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      continue;
    }

    const trimmed = tag.trim().toLowerCase();

    if (trimmed.length === 0) {
      continue;
    }

    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

/**
 * Validates tags array
 * @param {string[]} tags - Array of tag strings
 * @returns {{valid: boolean, error?: string}}
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Tags must be an array' };
  }

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      return { valid: false, error: 'Each tag must be a string' };
    }
  }

  return { valid: true };
}