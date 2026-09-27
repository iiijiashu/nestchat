#!/usr/bin/env node

import { spawn } from 'child_process';
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

    // Extract the file path from the tool use event
    let filePath = null;

    // Check for fs_write, str_replace, or fs_append operations
    const toolName = hookEvent?.toolUse?.name;

    if (toolName === 'fs_write' || toolName === 'str_replace' || toolName === 'fs_append') {
      filePath = hookEvent?.toolUse?.input?.path;
    }

    if (!filePath) {
      process.exit(0);
    }

    // Only check .js files
    if (!filePath.endsWith('.js')) {
      process.exit(0);
    }

    // Run node --check on the file
    const checkProcess = spawn('node', ['--check', filePath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    checkProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    checkProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Syntax error in ${filePath}:`);
        console.error(stderr);
        process.exit(1);
      }
      process.exit(0);
    });
  } catch (e) {
    process.exit(0);
  }
});

process.stdin.on('error', () => {
  process.exit(0);
});