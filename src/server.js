// server.js - Express 5 HTTP server for NestChat

import express from 'express';
import { createAssistant } from './lib/assistant.js';
import { createMessage, validateMessage } from './lib/messages.js';
import {
  createConversation,
  getConversation,
  listConversations,
  addMessage,
  archiveConversation,
  unarchiveConversation,
  setTags,
  search,
  ArchivedConversationError
} from './lib/conversation-store.js';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Static files - serve SPA from src/public at root
app.use(express.static(join(__dirname, 'public')));

// Error response helper
function errorResponse(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET /api/conversations - List active conversations (newest first)
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await listConversations(true);
    res.json({ conversations });
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Failed to list conversations');
  }
});

// POST /api/conversations - Create new conversation
app.post('/api/conversations', async (req, res) => {
  try {
    const tags = req.body?.tags || [];
    const conversation = await createConversation(tags);
    res.status(201).json({ conversation });
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Failed to create conversation');
  }
});

// GET /api/conversations/:id - Get conversation with messages
app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = await getConversation(req.params.id);
    if (!conversation) {
      return errorResponse(res, 404, 'not_found', 'Conversation not found');
    }
    res.json({ conversation });
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Failed to get conversation');
  }
});

// POST /api/conversations/:id/messages - Add user message and generate assistant reply
app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};

    // Validate message text
    const validation = validateMessage(text);
    if (!validation.valid) {
      return errorResponse(res, 400, 'validation_error', validation.error);
    }

    // Check conversation exists
    const conversation = await getConversation(id);
    if (!conversation) {
      return errorResponse(res, 404, 'not_found', 'Conversation not found');
    }

    // Check if archived
    if (conversation.archivedAt) {
      return errorResponse(res, 403, 'forbidden', 'Cannot add messages to archived conversation');
    }

    // Add user message
    const userMessage = createMessage('user', text);
    const updated = await addMessage(id, userMessage);

    if (!updated) {
      return errorResponse(res, 500, 'internal_error', 'Failed to add message');
    }

    // Generate assistant response
    const assistant = createAssistant({ provider: process.env.ASSISTANT_PROVIDER || 'local' });
    const assistantMessage = assistant.reply(updated);

    // Add assistant message
    const finalConversation = await addMessage(id, assistantMessage);

    res.status(201).json({
      message: userMessage,
      assistantResponse: assistantMessage
    });
  } catch (err) {
    if (err instanceof ArchivedConversationError) {
      return errorResponse(res, 403, 'forbidden', err.message);
    }
    errorResponse(res, 500, 'internal_error', 'Failed to process message');
  }
});

// POST /api/conversations/:id/archive - Archive conversation
app.post('/api/conversations/:id/archive', async (req, res) => {
  try {
    const conversation = await archiveConversation(req.params.id);
    if (!conversation) {
      return errorResponse(res, 404, 'not_found', 'Conversation not found');
    }
    res.json({ conversation });
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Failed to archive conversation');
  }
});

// POST /api/conversations/:id/unarchive - Unarchive conversation
app.post('/api/conversations/:id/unarchive', async (req, res) => {
  try {
    const conversation = await unarchiveConversation(req.params.id);
    if (!conversation) {
      return errorResponse(res, 404, 'not_found', 'Conversation not found');
    }
    res.json({ conversation });
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Failed to unarchive conversation');
  }
});

// PUT /api/conversations/:id/tags - Set tags for conversation
app.put('/api/conversations/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body || {};

    if (!Array.isArray(tags)) {
      return errorResponse(res, 400, 'validation_error', 'Tags must be an array');
    }

    const conversation = await setTags(id, tags);
    if (!conversation) {
      return errorResponse(res, 404, 'not_found', 'Conversation not found');
    }
    res.json({ conversation });
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Failed to set tags');
  }
});

// GET /api/search - Search messages
app.get('/api/search', async (req, res) => {
  try {
    const { q, page, pageSize } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 20;

    if (size < 1 || size > 100) {
      return errorResponse(res, 400, 'validation_error', 'pageSize must be between 1 and 100');
    }

    const result = await search(q || '', { page: pageNum, pageSize: size });
    res.json(result);
  } catch (err) {
    errorResponse(res, 500, 'internal_error', 'Search failed');
  }
});

// Seed data on startup if conversations.json doesn't exist
async function seedIfNeeded() {
  const PROJECT_ROOT = join(__dirname, '..');
  const DATA_DIR = join(PROJECT_ROOT, 'data');
  const SEED_FILE = join(DATA_DIR, 'seed.json');
  const CONV_FILE = join(DATA_DIR, 'conversations.json');

  // Check if conversations.json exists
  if (existsSync(CONV_FILE)) {
    return;
  }

  // Check if seed.json exists
  if (!existsSync(SEED_FILE)) {
    return;
  }

  try {
    const seedContent = await readFile(SEED_FILE, 'utf-8');
    const seedData = JSON.parse(seedContent);

    // Ensure data directory exists
    const { mkdir } = await import('fs/promises');
    await mkdir(DATA_DIR, { recursive: true });

    // Write conversations.json from seed
    await writeFile(CONV_FILE, JSON.stringify(seedData, null, 2), 'utf-8');
    console.log('Seeded conversations from data/seed.json');
  } catch (err) {
    console.error('Failed to seed data:', err);
  }
}

// Start server
async function start() {
  await seedIfNeeded();
  app.listen(PORT, () => {
    console.log(`NestChat server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});