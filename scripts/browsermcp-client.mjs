#!/usr/bin/env node

/**
 * Browser MCP Client - Test client for Browser MCP WebSocket
 *
 * Usage:
 *   node browsermcp-client.mjs navigate "http://localhost:3000"
 *   node browsermcp-client.mjs snapshot
 *   node browsermcp-client.mjs click "Login button"
 */

import WebSocket from 'ws';

const WS_PORT = 9009;
const WS_URL = `ws://localhost:${WS_PORT}`;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

async function sendMessage(ws, type, payload, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const id = generateId();
    const message = { id, type, payload };

    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for response after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.type === 'messageResponse' && response.payload?.requestId === id) {
          clearTimeout(timeout);
          ws.off('message', handler);
          if (response.payload.error) {
            reject(new Error(response.payload.error));
          } else {
            resolve(response.payload.result);
          }
        }
      } catch (e) {
        // Ignore parse errors for other messages
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify(message));
  });
}

async function connectAndRun(action, args) {
  console.log(`🔌 Connecting to Browser MCP at ${WS_URL}...`);

  const ws = new WebSocket(WS_URL);

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', (err) => reject(new Error(`Connection failed: ${err.message}`)));
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });

  console.log('✅ Connected!\n');

  try {
    let result;

    switch (action) {
      case 'navigate':
        console.log(`🌐 Navigating to: ${args[0]}`);
        result = await sendMessage(ws, 'browser_navigate', { url: args[0] });
        break;

      case 'snapshot':
        console.log('📸 Taking snapshot...');
        result = await sendMessage(ws, 'browser_snapshot', {});
        break;

      case 'click':
        console.log(`🖱️ Clicking: ${args[0]}`);
        result = await sendMessage(ws, 'browser_click', {
          element: args[0],
          ref: args[1] || args[0]
        });
        break;

      case 'type':
        console.log(`⌨️ Typing in: ${args[0]}`);
        result = await sendMessage(ws, 'browser_type', {
          element: args[0],
          ref: args[1] || args[0],
          text: args[2] || ''
        });
        break;

      case 'screenshot':
        console.log('📷 Taking screenshot...');
        result = await sendMessage(ws, 'browser_screenshot', {});
        break;

      case 'scroll':
        console.log(`📜 Scrolling: ${args[0] || 'down'}`);
        result = await sendMessage(ws, 'browser_scroll', {
          direction: args[0] || 'down'
        });
        break;

      case 'status':
        console.log('📊 Getting status...');
        result = await sendMessage(ws, 'status', {});
        break;

      case 'tools':
        console.log('🔧 Listing available tools...');
        result = await sendMessage(ws, 'listTools', {});
        break;

      default:
        console.log(`❓ Unknown action: ${action}`);
        console.log('\nAvailable actions:');
        console.log('  navigate <url>     - Navigate to URL');
        console.log('  snapshot           - Get page snapshot');
        console.log('  click <element>    - Click element');
        console.log('  type <element> <ref> <text> - Type text');
        console.log('  screenshot         - Take screenshot');
        console.log('  scroll [up|down]   - Scroll page');
        console.log('  status             - Get server status');
        console.log('  tools              - List available tools');
        ws.close();
        return;
    }

    console.log('\n📤 Result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    ws.close();
  }
}

// Main
const [action, ...args] = process.argv.slice(2);

if (!action) {
  console.log('Browser MCP Test Client\n');
  console.log('Usage: node browsermcp-client.mjs <action> [args...]');
  console.log('\nActions:');
  console.log('  navigate <url>     - Navigate to URL');
  console.log('  snapshot           - Get page snapshot');
  console.log('  click <element>    - Click element');
  console.log('  type <element> <ref> <text> - Type text');
  console.log('  screenshot         - Take screenshot');
  console.log('  scroll [up|down]   - Scroll page');
  console.log('  status             - Get server status');
  console.log('  tools              - List available tools');
  console.log('\nExample:');
  console.log('  node browsermcp-client.mjs navigate "http://localhost:3000"');
  process.exit(0);
}

connectAndRun(action, args).catch(console.error);
