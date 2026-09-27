// mcp/server.js - NestChat's Model Context Protocol stdio server
//
// Implements JSON-RPC 2.0 over stdin/stdout with newline-delimited messages.
// No external dependencies; uses only Node.js builtins.

import { createConversationStore } from '../src/lib/conversation-store.js';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve data path relative to the mcp/ directory (cross-platform)
const dataPath = join(__dirname, '..', 'data', 'conversations.json');

// Create a store instance for the MCP server
const store = createConversationStore({ filePath: dataPath });

/**
 * JSON-RPC 2.0 error response
 */
function makeErrorResponse(id, code, message) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message
    }
  };
}

/**
 * JSON-RPC 2.0 success response
 */
function makeSuccessResponse(id, result) {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

/**
 * List conversations tool handler
 */
async function listConversationsHandler(s) {
  return s.listConversations(true);
}

/**
 * Search messages tool handler
 */
async function searchMessagesHandler(s, { query, page = 1, pageSize = 20 }) {
  return s.search(query, { page, pageSize });
}

/**
 * Add message tool handler
 */
async function addMessageHandler(s, { conversationId, role, text }) {
  const validRoles = ['user', 'assistant'];
  if (!validRoles.includes(role)) {
    return {
      isError: true,
      error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`
    };
  }

  const conversation = await s.getConversation(conversationId);
  if (!conversation) {
    return {
      isError: true,
      error: `Conversation not found: ${conversationId}`
    };
  }

  const message = {
    role,
    text,
    timestamp: new Date().toISOString()
  };

  const updated = await s.addMessage(conversationId, message);
  return updated.messages[updated.messages.length - 1];
}

/**
 * Get stats tool handler
 */
async function getStatsHandler(s) {
  const conversations = await s.listConversations(false);
  
  const totalMessages = conversations.reduce((sum, c) => {
    return sum + (c.messages ? c.messages.length : 0);
  }, 0);

  const archivedCount = conversations.filter(c => c.archivedAt).length;
  const activeCount = conversations.length - archivedCount;

  // Collect all unique tags
  const tagSet = new Set();
  for (const conv of conversations) {
    if (conv.tags && Array.isArray(conv.tags)) {
      for (const tag of conv.tags) {
        tagSet.add(tag);
      }
    }
  }

  return {
    conversationCount: conversations.length,
    activeConversationCount: activeCount,
    archivedConversationCount: archivedCount,
    messageCount: totalMessages,
    tagCount: tagSet.size
  };
}

/**
 * Tool registry
 */
const TOOLS = {
  list_conversations: {
    name: 'list_conversations',
    description: 'List all active conversations',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  search_messages: {
    name: 'search_messages',
    description: 'Search messages across active conversations',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        page: { type: 'number', description: 'Page number (1-indexed)' },
        pageSize: { type: 'number', description: 'Items per page' }
      },
      required: ['query']
    }
  },
  add_message: {
    name: 'add_message',
    description: 'Append a message to a conversation',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: { type: 'string', description: 'Conversation ID' },
        role: { type: 'string', enum: ['user', 'assistant'], description: 'Message role' },
        text: { type: 'string', description: 'Message text content' }
      },
      required: ['conversationId', 'role', 'text']
    }
  },
  get_stats: {
    name: 'get_stats',
    description: 'Get summary statistics for the workspace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
};

/**
 * Handle a single MCP message and return the response
 * @param {object} message - The incoming JSON-RPC message
 * @param {object} [activeStore] - Store instance to operate on (defaults to the module store)
 * @returns {Promise<object|null>} - Response message or null for notifications
 */
export async function handleMessage(message, activeStore = store) {
  // Validate JSON-RPC structure
  if (!message || message.jsonrpc !== '2.0') {
    return makeErrorResponse(null, -32600, 'Invalid Request');
  }

  const { id, method, params } = message;

  // Notifications (no id) - no response
  if (id === undefined || id === null) {
    // Ignore all notifications (initialized and unknown ones)
    return null;
  }

  // Requests with id
  try {
    if (method === 'initialize') {
      return makeSuccessResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'nestchat-tools',
          version: '1.0.0'
        }
      });
    }

    if (method === 'tools/list') {
      return makeSuccessResponse(id, {
        tools: Object.values(TOOLS)
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;

      let result;
      if (name === 'list_conversations') {
        result = await listConversationsHandler(activeStore);
      } else if (name === 'search_messages') {
        result = await searchMessagesHandler(activeStore, args || {});
      } else if (name === 'add_message') {
        result = await addMessageHandler(activeStore, args || {});
      } else if (name === 'get_stats') {
        result = await getStatsHandler(activeStore);
      } else {
        return makeSuccessResponse(id, {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` })
          }],
          isError: true
        });
      }

      // Handler-level errors surface at the result level per MCP convention
      if (result && result.isError) {
        return makeSuccessResponse(id, {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: result.error })
          }],
          isError: true
        });
      }

      return makeSuccessResponse(id, {
        content: [{
          type: 'text',
          text: JSON.stringify(result)
        }]
      });
    }

    if (method === 'ping') {
      return makeSuccessResponse(id, {});
    }

    // Unknown request with id
    return makeErrorResponse(id, -32601, `Method not found: ${method}`);
  } catch (error) {
    return makeErrorResponse(id, -32603, error.message);
  }
}

/**
 * Create a server instance bound to a specific store.
 * @param {object} [storeInstance] - Store from createConversationStore (defaults to the module store)
 * @returns {function} - handleMessage bound to the given store
 */
export function createServer(storeInstance) {
  const bound = storeInstance || store;
  return (message) => handleMessage(message, bound);
}

// Run stdio loop if executed directly (cross-platform main-module check)
const isMainModule = process.argv[1] ? resolve(process.argv[1]) === __filename : false;

if (isMainModule) {
  // Read from stdin, write to stdout
  let buffer = '';
  process.stdin.setEncoding('utf-8');
  
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      
      if (line.trim() === '') continue;
      
      try {
        const message = JSON.parse(line);
        handleMessage(message).then(response => {
          if (response !== null) {
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        }).catch(err => {
          const errorResponse = makeErrorResponse(null, -32603, err.message);
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        });
      } catch (e) {
        // Log parse errors to stderr (not stdout)
        process.stderr.write(`Parse error: ${e.message}\n`);
      }
    }
  });

  process.stdin.on('end', () => {
    if (buffer.trim() !== '') {
      try {
        const message = JSON.parse(buffer);
        handleMessage(message).then(response => {
          if (response !== null) {
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        }).catch(err => {
          const errorResponse = makeErrorResponse(null, -32603, err.message);
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        });
      } catch (e) {
        process.stderr.write(`Parse error: ${e.message}\n`);
      }
    }
  });
}
