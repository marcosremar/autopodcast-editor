import { chromium } from 'playwright';

async function testAgentChat() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  console.log('Testing agent-first chat interface...\n');

  // Step 1: Login via API
  console.log('1. Logging in...');
  const loginResponse = await page.request.post('http://localhost:3000/api/auth/login', {
    data: {
      email: 'demo@aeropod.com',
      password: 'demo'
    }
  });

  const loginData = await loginResponse.json();
  console.log('   Login response:', loginData.success ? 'Success!' : loginData.error);

  if (!loginData.success) {
    console.log('   Login failed. Ensure demo user exists (run: npx tsx scripts/seed-demo-user.ts)');
    await browser.close();
    return;
  }

  // Step 2: Navigate to editor
  console.log('\n2. Navigating to editor...');
  await page.goto('http://localhost:3000/editor/13c3e41a-1d9f-40e4-9cec-7810790f9825', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log('   Current URL:', currentUrl);

  if (!currentUrl.includes('/editor/')) {
    console.log('   Redirected away from editor. Authentication issue?');
    await page.screenshot({ path: '/tmp/test_redirect.png' });
    await browser.close();
    return;
  }

  console.log('   Successfully on editor page!\n');

  // Take screenshot (viewport only, not fullPage to avoid timeout)
  await page.screenshot({ path: '/tmp/test_editor_main.png' });
  console.log('3. Main editor screenshot: /tmp/test_editor_main.png');

  // Look for the chat interface / Assistente IA button
  await page.waitForTimeout(2000);

  // Check for the chat button that opens the assistant
  const assistantButton = await page.locator('button:has-text("Assistente IA"), button:has-text("Assistente")').first();
  const chatVisible = await assistantButton.isVisible().catch(() => false);

  if (chatVisible) {
    console.log('\n4. Found assistant button, clicking...');
    await assistantButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/test_chat_open.png' });
    console.log('   Chat open screenshot: /tmp/test_chat_open.png');
  } else {
    console.log('\n4. Assistant button not visible, chat may be inline');
  }

  // Look for quick action buttons in chat
  await page.waitForTimeout(1000);
  const templateButton = await page.locator('button:has-text("Ver Template")').first();
  const autoMapButton = await page.locator('button:has-text("Auto-Mapear")').first();
  const gapsButton = await page.locator('button:has-text("Ver Gaps"), button:has-text("Gaps")').first();
  const gravarButton = await page.locator('button:has-text("Gravar")').first();

  console.log('\n5. Checking agent-first UI elements:');
  console.log('   - Ver Template button:', await templateButton.isVisible().catch(() => false) ? 'FOUND' : 'not found');
  console.log('   - Auto-Mapear button:', await autoMapButton.isVisible().catch(() => false) ? 'FOUND' : 'not found');
  console.log('   - Ver Gaps button:', await gapsButton.isVisible().catch(() => false) ? 'FOUND' : 'not found');
  console.log('   - Gravar button:', await gravarButton.isVisible().catch(() => false) ? 'FOUND' : 'not found');

  // Try clicking "Ver Template" if visible
  const templateVisible = await templateButton.isVisible().catch(() => false);
  if (templateVisible) {
    console.log('\n6. Testing "Ver Template" action...');
    await templateButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/test_template_action.png' });
    console.log('   Template action screenshot: /tmp/test_template_action.png');
  }

  // Check for chat input
  const chatInput = await page.locator('input[placeholder*="Pergunte"], input[placeholder*="comando"]').first();
  const hasInput = await chatInput.isVisible().catch(() => false);
  console.log('\n7. Chat input found:', hasInput ? 'YES' : 'NO');

  if (hasInput) {
    // Try typing a message
    console.log('   Typing test message...');
    await chatInput.fill('Status do template');
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/test_typed_message.png' });
    console.log('   Typed message screenshot: /tmp/test_typed_message.png');
  }

  // Final screenshot
  await page.screenshot({ path: '/tmp/test_agent_first_final.png' });
  console.log('\n8. Final screenshot: /tmp/test_agent_first_final.png');

  console.log('\n   Browser will close in 3 seconds...');
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('\nTest complete!');
}

testAgentChat().catch(console.error);
