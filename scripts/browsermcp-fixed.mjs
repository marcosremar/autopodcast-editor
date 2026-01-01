#!/usr/bin/env node

/**
 * Fixed Browser MCP wrapper
 * Patches the infinite recursion bug in server.close()
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find the original package
const npxCachePath = process.env.HOME + '/.npm/_npx';
let mcpPath = null;

// Search for the browsermcp package in npx cache
const dirs = fs.readdirSync(npxCachePath);
for (const dir of dirs) {
  const potentialPath = join(npxCachePath, dir, 'node_modules/@browsermcp/mcp/dist/index.js');
  if (fs.existsSync(potentialPath)) {
    mcpPath = potentialPath;
    break;
  }
}

if (!mcpPath) {
  console.error('Could not find @browsermcp/mcp package');
  process.exit(1);
}

// Read and patch the source
let source = fs.readFileSync(mcpPath, 'utf-8');

// Fix the infinite recursion bug
const buggyCode = `server.close = async () => {
    await server.close();`;

const fixedCode = `const originalClose = server.close.bind(server);
  server.close = async () => {
    await originalClose();`;

if (source.includes(buggyCode)) {
  source = source.replace(buggyCode, fixedCode);
  console.error('[browsermcp-fixed] Patched infinite recursion bug');
}

// Write patched version to temp file
const tempPath = '/tmp/browsermcp-patched.mjs';
fs.writeFileSync(tempPath, source);

// Import and run the patched version
const patched = await import(tempPath);
