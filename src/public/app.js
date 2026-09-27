// app.js - Client-side SPA logic for NestChat

const API_BASE = '';

// State
let conversations = [];
let currentConversation = null;
let currentFilter = 'active';

// DOM Elements
const conversationList = document.getElementById('conversation-list');
const newConversationBtn = document.getElementById('new-conversation-btn');
const searchInput = document.getElementById('search-input');
const filterTabs = document.querySelectorAll('.filter-tab');
const welcomeView = document.getElementById('welcome-view');
const conversationView = document.getElementById('conversation-view');
const searchResultsView = document.getElementById('search-results-view');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const archiveBtn = document.getElementById('archive-btn');
const editTagsBtn = document.getElementById('edit-tags-btn');
const conversationDate = document.getElementById('conversation-date');
const tagChips = document.getElementById('tag-chips');
const backToConversations = document.getElementById('back-to-conversations');
const searchResultsList = document.getElementById('search-results-list');
const tagModal = document.getElementById('tag-modal');
const tagInput = document.getElementById('tag-input');
const saveTagsBtn = document.getElementById('save-tags-btn');
const cancelTagsBtn = document.getElementById('cancel-tags-btn');

// API Helpers
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Request failed');
  }
  return res.json();
}

async function apiPost(url, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Request failed');
  }
  return res.json();
}

async function apiPut(url, body = {}) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Request failed');
  }
  return res.json();
}

// Load conversations
async function loadConversations() {
  try {
    const data = await apiGet(`${API_BASE}/api/conversations`);
    conversations = data.conversations;
    renderConversationList();
  } catch (err) {
    console.error('Failed to load conversations:', err);
  }
}

// Render conversation list
function renderConversationList() {
  const filtered = currentFilter === 'archived'
    ? conversations.filter(c => c.archivedAt)
    : conversations.filter(c => !c.archivedAt);

  if (filtered.length === 0) {
    conversationList.innerHTML = '<div class="empty-list">No conversations</div>';
    return;
  }

  conversationList.innerHTML = filtered.map(conv => `
    <div class="conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}" data-id="${conv.id}">
      <div class="conversation-title">${formatDate(conv.createdAt)}</div>
      <div class="conversation-preview">${getPreview(conv)}</div>
      ${conv.tags?.length ? `<div class="conversation-tags">${conv.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => selectConversation(item.dataset.id));
  });
}

// Get preview text from last message
function getPreview(conversation) {
  if (!conversation.messages || conversation.messages.length === 0) {
    return 'Empty conversation';
  }
  const lastMsg = conversation.messages[conversation.messages.length - 1];
  const text = lastMsg.text.substring(0, 50);
  return text + (lastMsg.text.length > 50 ? '...' : '');
}

// Format date
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Select conversation
async function selectConversation(id) {
  try {
    const data = await apiGet(`${API_BASE}/api/conversations/${id}`);
    currentConversation = data.conversation;
    showConversationView();
    renderMessages();
    renderConversationHeader();
  } catch (err) {
    console.error('Failed to load conversation:', err);
  }
}

// Render messages
function renderMessages() {
  if (!currentConversation?.messages) {
    messagesContainer.innerHTML = '';
    return;
  }

  messagesContainer.innerHTML = currentConversation.messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="message-bubble">${escapeHtml(msg.text)}</div>
      <div class="message-timestamp">${formatTimestamp(msg.timestamp)}</div>
    </div>
  `).join('');

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format timestamp
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

// Render conversation header
function renderConversationHeader() {
  conversationDate.textContent = formatDate(currentConversation.createdAt);

  // Tags
  tagChips.innerHTML = currentConversation.tags?.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('') || '';

  // Archive button
  archiveBtn.textContent = currentConversation.archivedAt ? 'Unarchive' : 'Archive';
}

// Show/hide views
function showConversationView() {
  welcomeView.classList.add('hidden');
  conversationView.classList.remove('hidden');
  searchResultsView.classList.add('hidden');
}

function showWelcomeView() {
  welcomeView.classList.remove('hidden');
  conversationView.classList.add('hidden');
  searchResultsView.classList.add('hidden');
  currentConversation = null;
}

function showSearchResultsView() {
  welcomeView.classList.add('hidden');
  conversationView.classList.add('hidden');
  searchResultsView.classList.remove('hidden');
}

// Create new conversation
async function createConversation() {
  try {
    const data = await apiPost(`${API_BASE}/api/conversations`);
    await loadConversations();
    selectConversation(data.conversation.id);
  } catch (err) {
    console.error('Failed to create conversation:', err);
  }
}

// Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentConversation) return;

  try {
    const data = await apiPost(`${API_BASE}/api/conversations/${currentConversation.id}/messages`, { text });
    messageInput.value = '';

    // Reload conversation to get updated messages
    await selectConversation(currentConversation.id);
    await loadConversations();
  } catch (err) {
    alert(err.message);
  }
}

// Archive/unarchive
async function toggleArchive() {
  if (!currentConversation) return;

  const endpoint = currentConversation.archivedAt
    ? 'unarchive'
    : 'archive';

  try {
    await apiPost(`${API_BASE}/api/conversations/${currentConversation.id}/${endpoint}`);
    await loadConversations();

    // Switch to the other filter if needed
    if (currentFilter === 'active' && currentConversation.archivedAt) {
      currentFilter = 'archived';
      document.querySelector('[data-filter="active"]').classList.remove('active');
      document.querySelector('[data-filter="archived"]').classList.add('active');
      renderConversationList();
    }

    showWelcomeView();
  } catch (err) {
    console.error('Failed to archive:', err);
  }
}

// Search
async function performSearch(query) {
  if (!query.trim()) {
    showWelcomeView();
    return;
  }

  try {
    const data = await apiGet(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
    renderSearchResults(data.results);
    showSearchResultsView();
  } catch (err) {
    console.error('Search failed:', err);
  }
}

// Render search results
function renderSearchResults(results) {
  if (results.length === 0) {
    searchResultsList.innerHTML = '<div class="empty-list">No results found</div>';
    return;
  }

  searchResultsList.innerHTML = results.map(result => `
    <div class="search-result" data-conversation-id="${result.conversationId}">
      <div class="search-result-conv">Conversation: ${formatDate(result.message.timestamp)}</div>
      <div class="search-result-text">${highlightMatch(escapeHtml(result.message.text), searchInput.value)}</div>
      <div class="search-result-time">${formatTimestamp(result.message.timestamp)}</div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.search-result').forEach(item => {
    item.addEventListener('click', () => {
      selectConversation(item.dataset.conversationId);
    });
  });
}

// Highlight search match
function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Tag modal
function openTagModal() {
  tagInput.value = currentConversation.tags?.join(', ') || '';
  tagModal.classList.remove('hidden');
}

function closeTagModal() {
  tagModal.classList.add('hidden');
}

async function saveTags() {
  const tags = tagInput.value.split(',').map(t => t.trim()).filter(t => t);
  try {
    await apiPut(`${API_BASE}/api/conversations/${currentConversation.id}/tags`, { tags });
    await selectConversation(currentConversation.id);
    await loadConversations();
    closeTagModal();
  } catch (err) {
    alert(err.message);
  }
}

// Event Listeners
newConversationBtn.addEventListener('click', createConversation);

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderConversationList();
  });
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

archiveBtn.addEventListener('click', toggleArchive);
editTagsBtn.addEventListener('click', openTagModal);
saveTagsBtn.addEventListener('click', saveTags);
cancelTagsBtn.addEventListener('click', closeTagModal);

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(searchInput.value);
  }, 300);
});

backToConversations.addEventListener('click', () => {
  searchInput.value = '';
  showWelcomeView();
});

// Close modal on outside click
tagModal.addEventListener('click', (e) => {
  if (e.target === tagModal) closeTagModal();
});

// Initialize
loadConversations();