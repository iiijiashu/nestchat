#!/usr/bin/env node

import { readFileSync } from 'fs';

// Read hook event JSON from STDIN - accumulate all data
let stdinData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  stdinData += chunk;
});

process.stdin.on('end', () => {
  if (!stdinData) {
    process.exit(0);
  }

  try {
    const hookEvent = JSON.parse(stdinData);

    // Extract command from tool input
    let command = '';

    // Check tool input for the command
    if (hookEvent?.toolUse?.input?.command) {
      command = hookEvent.toolUse.input.command;
    }

    // Also check session context (for PreToolUse with user prompts)
    if (hookEvent?.session?.context?.prompt) {
      command = hookEvent.session.context.prompt;
    }

    if (!command) {
      process.exit(0);
    }

    // Patterns that indicate a force push
    const forcePushPatterns = [
      /git\s+push.*\s+-f\s/,           // git push -f
      /git\s+push.*\s+--force\s/,       // git push --force
      /git\s+push.*--force-with-lease/, // git push --force-with-lease
      /git\s+push\s+origin\s+\+\w+/,    // git push origin +main
      /git\s+push\s+\+\w+:/,            // git push +branch:ref
    ];

    const isForcePush = forcePushPatterns.some(pattern => pattern.test(command));

    if (isForcePush) {
      console.error('BLOCKED: Force push detected. Force pushing can overwrite remote history and cause data loss.');
      console.error(`Command: ${command}`);
      process.exit(2);
    }

    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});

process.stdin.on('error', () => {
  process.exit(0);
});