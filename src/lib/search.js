// search.js - Case-insensitive substring search across messages

import { paginate } from './pagination.js';

/**
 * Searches messages across active (non-archived) conversations
 * @param {object[]} conversations - Array of conversation objects
 * @param {string} query - Search query string
 * @param {object} options - Pagination options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.pageSize - Items per page
 * @returns {{results: object[], pagination: object}}
 */
export function searchMessages(conversations, query, options = {}) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  // Empty or whitespace query returns no results
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      results: [],
      pagination: {
        items: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0
      }
    };
  }

  const searchTerm = query.toLowerCase().trim();

  // Filter to only active (non-archived) conversations
  const activeConversations = conversations.filter(conv => !conv.archivedAt);

  // Find all matching messages
  const matches = [];

  for (const conversation of activeConversations) {
    if (!conversation.messages || !Array.isArray(conversation.messages)) {
      continue;
    }

    for (const message of conversation.messages) {
      if (message.text && typeof message.text === 'string') {
        if (message.text.toLowerCase().includes(searchTerm)) {
          matches.push({
            conversationId: conversation.id,
            message
          });
        }
      }
    }
  }

  // Paginate results
  const pagination = paginate(matches, page, pageSize);

  return {
    results: pagination.items,
    pagination
  };
}