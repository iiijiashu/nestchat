// messages.js - Message validation and creation

const MESSAGE_TYPES = ['user', 'assistant'];
const MAX_MESSAGE_LENGTH = 4000;

export { MESSAGE_TYPES };

/**
 * Validates message text content
 * @param {string} text - The text to validate
 * @returns {{valid: boolean, error?: string}}
 */
export function validateMessage(text) {
  if (typeof text !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Creates a new message object
 * @param {string} role - The role ('user' or 'assistant')
 * @param {string} text - The message text
 * @returns {object} Message object with id, role, text, and timestamp
 */
export function createMessage(role, text) {
  if (!MESSAGE_TYPES.includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be one of: ${MESSAGE_TYPES.join(', ')}`);
  }

  const validation = validateMessage(text);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    id: generateUuid(),
    role,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Generates a simple UUID v4-like string
 * @returns {string}
 */
function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}