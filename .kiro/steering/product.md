---
inclusion: always
---

# NestChat Product Overview

NestChat is a personal AI chat workspace web app designed for individual developers and knowledge workers who want a fast, local-first chat experience.

## Purpose

Users hold multiple concurrent conversations with an AI assistant, organized with tags, searchable history, and archiving. All data persists locally for privacy and offline access.

## Key Features

- **Multi-conversation sidebar** — Create, switch between, and manage multiple conversation threads
- **Persistent storage** — All conversations, messages, and metadata saved to local JSON files
- **Full-text search** — Instant search across message content, tags, and timestamps
- **Tagging system** — Assign multiple tags to conversations for categorization
- **Archiving** — Move completed conversations to archive, keeping active list clean
- **Message timestamps** — Every message includes precise UTC timestamps

## Target Users

Individual developers and knowledge workers who want a minimal, responsive chat workspace that runs entirely on their local machine without API keys or external dependencies.

## Tech Highlights

- Local-first architecture with JSON file persistence
- Deterministic assistant engine by default, with optional remote provider via environment variable
- Zero external service dependencies for core functionality