#!/usr/bin/env node

/**
 * Fixed Browser MCP Server
 * - Patches infinite recursion bug in server.close()
 * - WebSocket runs on port 9009
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Path to the local package
const mcpPath = path.join(projectRoot, 'node_modules/@browsermcp/mcp/dist/index.js');

if (!fs.existsSync(mcpPath)) {
  console.error('[browsermcp] Package not found at:', mcpPath);
  console.error('[browsermcp] Run: npm install @browsermcp/mcp');
  process.exit(1);
}

console.error('[browsermcp] Found package at:', mcpPath);

// Read source
let source = fs.readFileSync(mcpPath, 'utf-8');

// Fix the infinite recursion bug in server.close()
const buggyPattern = /server\.close = async \(\) => \{\s*await server\.close\(\);/;

if (buggyPattern.test(source)) {
  const fixedCode = `const _originalServerClose = server.close.bind(server);
  server.close = async () => {
    await _originalServerClose();`;

  source = source.replace(buggyPattern, fixedCode);

  // Backup original
  const backupPath = mcpPath + '.backup';
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(mcpPath, backupPath);
    console.error('[browsermcp] ✓ Created backup at:', backupPath);
  }

  // Write patched version in-place
  fs.writeFileSync(mcpPath, source);
  console.error('[browsermcp] ✓ Patched infinite recursion bug');
} else {
  console.error('[browsermcp] ℹ Bug already patched or not found');
}

console.error('[browsermcp] Starting server on WebSocket port 9009...');
console.error('[browsermcp] Make sure Chrome extension is connected!\n');

// Now run the patched module
await import(mcpPath);
