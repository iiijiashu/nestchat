// assistant.js - Pluggable assistant provider interface

import { createMessage } from './messages.js';

const AVAILABLE_PROVIDERS = ['local', 'remote'];

export { AVAILABLE_PROVIDERS };

// Local deterministic response templates
const LOCAL_RESPONSES = {
  greeting: [
    'Hello! How can I help you today?',
    'Hi there! What can I assist you with?',
    'Hey! I\'m here to help. What would you like to discuss?',
    'Greetings! How may I assist you?'
  ],
  question: [
    'That\'s an interesting question. Let me think about it...',
    'Great question! Here\'s what I know about that:',
    'I\'d be happy to help with that. Here are my thoughts:',
    'You raise a good point. Let me share some insights:'
  ],
  code: [
    'Here\'s a code example that might help:',
    'I can help you with that. Let me show you:',
    'Sure, here\'s how you might approach this:',
    'Consider this implementation:'
  ],
  keywordEcho: [
    'I understand you\'re interested in that topic. Would you like more details?',
    'That\'s a good point to explore further.',
    'I see you\'re focusing on that area. Let me elaborate:',
    'Good thinking. Here\'s some additional context:'
  ],
  default: [
    'I\'m here to help. Could you provide more details?',
    'That\'s interesting. Tell me more about what you\'re working on.',
    'I understand. How can I assist you further?',
    'Thanks for sharing. What would you like to explore next?'
  ]
};

/**
 * Generates a deterministic response based on message content
 * @param {string} messageText - The user's message text
 * @param {object[]} context - Previous messages in conversation
 * @returns {string} Generated response text
 */
function localProvider(messageText, context = []) {
  const text = messageText.toLowerCase().trim();

  // Greeting detection
  const greetingWords = ['hello', 'hi', 'hey', 'greetings', 'howdy', 'hiya'];
  if (greetingWords.some(word => text === word || text.startsWith(word + ' '))) {
    return deterministicResponse(text, 'greeting', context);
  }

  // Question detection
  if (text.includes('?') || text.startsWith('what') || text.startsWith('how') ||
      text.startsWith('why') || text.startsWith('when') || text.startsWith('where') ||
      text.startsWith('can you') || text.startsWith('could you') || text.startsWith('do you')) {
    return deterministicResponse(text, 'question', context);
  }

  // Code-related keywords
  const codeKeywords = ['code', 'function', 'class', 'export', 'import', 'async', 'await',
                        'return', 'const', 'let', 'var', 'javascript', 'js', 'node'];
  if (codeKeywords.some(keyword => text.includes(keyword))) {
    return deterministicResponse(text, 'code', context);
  }

  // Keyword echo - respond to specific topics
  const topics = {
    'bug': 'Bugs can be tricky to track down. Have you tried adding console logs or using a debugger?',
    'error': 'Errors often have stack traces that point to the root cause. What does the error message say?',
    'test': 'Testing is important! Have you considered unit tests or integration tests?',
    'api': 'APIs are great for connecting services. What specific API are you working with?',
    'database': 'Databases require careful schema design. What type are you using?',
    'git': 'Git is powerful for version control. Have you checked your branch and commit history?',
    'deploy': 'Deployment involves many considerations. Are you using a platform like Vercel or Netlify?'
  };

  for (const [keyword, response] of Object.entries(topics)) {
    if (text.includes(keyword)) {
      return response;
    }
  }

  return deterministicResponse(text, 'default', context);
}

/**
 * Generates a deterministic response based on seed text and category
 * @param {string} seedText - Seed text for determinism
 * @param {string} category - Response category
 * @param {object[]} context - Conversation context
 * @returns {string}
 */
function deterministicResponse(seedText, category, context) {
  const templates = LOCAL_RESPONSES[category] || LOCAL_RESPONSES.default;

  // Use message content and context length to deterministically select response
  const seed = seedText.length + (context.length * 7);
  const index = seed % templates.length;

  return templates[index];
}

/**
 * Creates an assistant instance with the specified provider
 * @param {object} options - Assistant options
 * @param {string} options.provider - Provider name ('local' or 'remote')
 * @returns {object} Assistant instance with .reply() method
 */
export function createAssistant(options = {}) {
  const provider = options.provider || 'local';

  if (!AVAILABLE_PROVIDERS.includes(provider)) {
    throw new Error(`Unknown provider: ${provider}. Available: ${AVAILABLE_PROVIDERS.join(', ')}`);
  }

  return {
    /**
     * Generate a reply message for a conversation
     * @param {object} conversation - Conversation object with messages
     * @returns {object} Assistant message object
     */
    reply(conversation) {
      if (!conversation || !Array.isArray(conversation.messages)) {
        throw new Error('Invalid conversation: must have messages array');
      }

      const messages = conversation.messages;
      const lastUserMessage = messages
        .filter(m => m.role === 'user')
        .pop();

      const messageText = lastUserMessage ? lastUserMessage.text : '';
      const context = messages.filter(m => m.role !== 'user');

      let responseText;

      if (provider === 'local') {
        responseText = localProvider(messageText, context);
      } else {
        // Remote provider placeholder - would make external API call
        throw new Error('Remote provider not implemented');
      }

      return createMessage('assistant', responseText);
    },

    /**
     * Get the current provider name
     * @returns {string}
     */
    getProvider() {
      return provider;
    }
  };
}

/**
 * Generate a response (standalone function for testing)
 * @param {string} messageText - User message text
 * @param {object[]} context - Conversation context
 * @returns {string}
 */
export function generateResponse(messageText, context = []) {
  return localProvider(messageText, context);
}