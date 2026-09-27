// pagination.js - Pagination utilities

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Paginates an array of items
 * @param {any[]} items - Array of items to paginate
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {{items: any[], page: number, pageSize: number, total: number, totalPages: number}}
 */
export function paginate(items, page, pageSize) {
  // Validate and clamp inputs
  const total = Array.isArray(items) ? items.length : 0;

  // Clamp page to valid range (minimum 1)
  const inputPage = Math.floor(page) || 1;
  let validPage = Math.max(1, inputPage);

  // Clamp pageSize to valid range (1 to MAX_PAGE_SIZE)
  const rawPageSize = pageSize === undefined ? DEFAULT_PAGE_SIZE : pageSize;
  let validPageSize = Math.floor(rawPageSize) || 1;
  validPageSize = Math.max(1, Math.min(validPageSize, MAX_PAGE_SIZE));

  const totalPages = Math.ceil(total / validPageSize);

  // If page > totalPages, return empty items but still report clamped page
  const pageBeyondTotal = totalPages > 0 && validPage > totalPages;

  if (pageBeyondTotal) {
    return {
      items: [],
      page: totalPages,  // Clamp to last page for reporting
      pageSize: validPageSize,
      total,
      totalPages
    };
  }

  // Clamp page to total pages for valid requests
  if (totalPages > 0 && validPage > totalPages) {
    validPage = totalPages;
  }

  // Calculate start and end indices
  const startIndex = (validPage - 1) * validPageSize;
  const endIndex = Math.min(startIndex + validPageSize, total);

  // Return empty items for out-of-range pages
  if (startIndex >= total || totalPages === 0) {
    return {
      items: [],
      page: validPage,
      pageSize: validPageSize,
      total,
      totalPages
    };
  }

  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    page: validPage,
    pageSize: validPageSize,
    total,
    totalPages
  };
}