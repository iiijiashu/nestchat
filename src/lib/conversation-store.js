// conversation-store.js - JSON file persistence for conversations
//
// Exposes createConversationStore({ filePath }) for dependency injection
// (tests, MCP server) plus a default instance bound to data/conversations.json
// re-exported as named exports for the HTTP server.

import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root relative to src/lib
const PROJECT_ROOT = join(__dirname, '..', '..');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const DEFAULT_STORE_FILE = join(DATA_DIR, 'conversations.json');

/**
 * Custom error for archived conversation operations
 */
export class ArchivedConversationError extends Error {
  constructor(message = 'Conversation is archived. New messages are not allowed.') {
    super(message);
    this.name = 'ArchivedConversationError';
  }
}

/**
 * Normalizes tags input
 * @param {string[]} tags
 * @returns {string[]}
 */
function normalizeTagsInput(tags) {
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
 * Generates a UUID v4-like string
 * @returns {string}
 */
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Creates a conversation store bound to a specific JSON file.
 * @param {object} [options]
 * @param {string} [options.filePath] - Store file path (defaults to data/conversations.json)
 * @returns {object} Store API
 */
export function createConversationStore(options = {}) {
  const storeFile = options.filePath || DEFAULT_STORE_FILE;
  let conversationsCache = null;

  async function ensureStore() {
    const dir = dirname(storeFile);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    if (!existsSync(storeFile)) {
      await writeFile(storeFile, JSON.stringify({ conversations: [] }, null, 2), 'utf-8');
    }
  }

  async function loadConversations() {
    await ensureStore();

    if (conversationsCache !== null) {
      return conversationsCache;
    }

    const content = await readFile(storeFile, 'utf-8');
    const data = JSON.parse(content);
    conversationsCache = data.conversations || [];
    return conversationsCache;
  }

  async function saveConversations(conversations) {
    await ensureStore();

    const data = { conversations };
    const tempFile = storeFile + '.tmp';

    await writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    await rename(tempFile, storeFile);

    conversationsCache = conversations;
  }

  async function createConversation(tags = []) {
    const conversations = await loadConversations();

    const conversation = {
      id: generateUuid(),
      createdAt: new Date().toISOString(),
      archivedAt: null,
      tags: normalizeTagsInput(tags),
      messages: []
    };

    conversations.push(conversation);
    await saveConversations(conversations);

    return { ...conversation };
  }

  async function getConversation(id) {
    const conversations = await loadConversations();
    return conversations.find(c => c.id === id) || null;
  }

  async function listConversations(activeOnly = true) {
    const conversations = await loadConversations();

    const filtered = activeOnly
      ? conversations.filter(c => !c.archivedAt)
      : conversations;

    return filtered.sort((a, b) => {
      if (a.archivedAt && !b.archivedAt) return 1;
      if (!a.archivedAt && b.archivedAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  async function addMessage(conversationId, message) {
    const conversations = await loadConversations();
    const index = conversations.findIndex(c => c.id === conversationId);

    if (index === -1) {
      return null;
    }

    const conversation = conversations[index];

    if (conversation.archivedAt) {
      throw new ArchivedConversationError();
    }

    conversation.messages = conversation.messages || [];
    conversation.messages.push({
      id: generateUuid(),
      role: message.role,
      text: message.text,
      timestamp: message.timestamp || new Date().toISOString()
    });

    await saveConversations(conversations);

    return { ...conversation };
  }

  async function archiveConversation(id) {
    const conversations = await loadConversations();
    const index = conversations.findIndex(c => c.id === id);

    if (index === -1) {
      return null;
    }

    const conversation = conversations[index];

    if (!conversation.archivedAt) {
      conversation.archivedAt = new Date().toISOString();
      await saveConversations(conversations);
    }

    return { ...conversation };
  }

  async function unarchiveConversation(id) {
    const conversations = await loadConversations();
    const index = conversations.findIndex(c => c.id === id);

    if (index === -1) {
      return null;
    }

    const conversation = conversations[index];

    if (conversation.archivedAt) {
      conversation.archivedAt = null;
      await saveConversations(conversations);
    }

    return { ...conversation };
  }

  async function setTags(id, tags) {
    const conversations = await loadConversations();
    const index = conversations.findIndex(c => c.id === id);

    if (index === -1) {
      return null;
    }

    conversations[index].tags = normalizeTagsInput(tags);
    await saveConversations(conversations);

    return { ...conversations[index] };
  }

  async function search(query, options = {}) {
    const conversations = await loadConversations();
    const { searchMessages } = await import('./search.js');

    return searchMessages(conversations, query, options);
  }

  function clearCache() {
    conversationsCache = null;
  }

  return {
    filePath: storeFile,
    createConversation,
    getConversation,
    listConversations,
    addMessage,
    archiveConversation,
    unarchiveConversation,
    setTags,
    search,
    clearCache
  };
}

// Default instance bound to data/conversations.json (used by the HTTP server).
const defaultStore = createConversationStore();

export const createConversation = defaultStore.createConversation;
export const getConversation = defaultStore.getConversation;
export const listConversations = defaultStore.listConversations;
export const addMessage = defaultStore.addMessage;
export const archiveConversation = defaultStore.archiveConversation;
export const unarchiveConversation = defaultStore.unarchiveConversation;
export const setTags = defaultStore.setTags;
export const search = defaultStore.search;
export const clearCache = defaultStore.clearCache;
