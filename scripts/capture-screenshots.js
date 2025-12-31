const { chromium } = require('playwright');

async function captureScreenshots() {
  console.log('🚀 Iniciando captura de screenshots...');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const baseURL = 'http://localhost:3000';
  const projectId = '13c3e41a-1d9f-40e4-9cec-7810790f9825';

  try {
    // 1. Home page
    console.log('📸 Capturando home page...');
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/01-home-page.png',
      fullPage: true
    });

    // 2. API Templates
    console.log('📸 Capturando API de templates...');
    await page.goto(`${baseURL}/api/templates`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/02-api-templates.png',
      fullPage: true
    });

    // 3. Template específico
    console.log('📸 Capturando template específico...');
    const response = await page.goto(`${baseURL}/api/templates`);
    const data = await response.json();
    const templateId = data.templates[0].id;

    await page.goto(`${baseURL}/api/templates/${templateId}`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/03-api-template-details.png',
      fullPage: true
    });

    // 4. Seções do projeto
    console.log('📸 Capturando seções do projeto...');
    await page.goto(`${baseURL}/api/projects/${projectId}/sections`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/04-api-project-sections.png',
      fullPage: true
    });

    // 5. Seções faltantes
    console.log('📸 Capturando seções faltantes...');
    await page.goto(`${baseURL}/api/projects/${projectId}/missing-sections`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/05-api-missing-sections.png',
      fullPage: true
    });

    // 6. Lista de projetos
    console.log('📸 Capturando lista de projetos...');
    await page.goto(`${baseURL}/api/projects`, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/06-api-projects.png',
      fullPage: true
    });

    console.log('✅ Todos os screenshots capturados com sucesso!');
    console.log('📁 Screenshots salvos em: /tmp/aeropod-relatorio-final/screenshots/');

  } catch (error) {
    console.error('❌ Erro ao capturar screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
