const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]:', error.message);
  });

  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api') || request.url().includes('/ws')) {
      console.log(`[REQUEST]: ${request.method()} ${request.url()}`);
    }
  });

  // Capture network responses
  page.on('response', response => {
    if (response.url().includes('/api') || response.url().includes('/ws')) {
      console.log(`[RESPONSE]: ${response.status()} ${response.url()}`);
    }
  });

  // Capture WebSocket frames
  page.on('websocket', ws => {
    console.log('[WEBSOCKET] Created:', ws.url());
    ws.on('framesent', frame => console.log('[WS SENT]:', frame.payload));
    ws.on('framereceived', frame => console.log('[WS RECEIVED]:', frame.payload));
    ws.on('close', () => console.log('[WEBSOCKET] Closed'));
  });

  try {
    console.log('[NAVIGATION] Navegando para http://192.168.139.209:7000/projects/aeropod-main');
    await page.goto('http://192.168.139.209:7000/projects/aeropod-main', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('[PAGE] Aguardando 5 segundos...');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/playwright-debug.png', fullPage: true });
    console.log('[SCREENSHOT] Salvo em /tmp/playwright-debug.png');

    // Get page title
    const title = await page.title();
    console.log('[PAGE TITLE]:', title);

    // Check if terminal element exists
    const terminalExists = await page.locator('[class*="xterm"]').count();
    console.log('[TERMINAL] Elementos xterm encontrados:', terminalExists);

  } catch (error) {
    console.error('[ERROR]:', error.message);
  } finally {
    await browser.close();
  }
})();
