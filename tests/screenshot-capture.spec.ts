import { test, expect } from '@playwright/test';

test.describe('Aeropod Template System Screenshots', () => {
  const baseURL = 'http://localhost:3000';
  const projectId = '13c3e41a-1d9f-40e4-9cec-7810790f9825';

  test('Capturar screenshot da home page', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/01-home-page.png',
      fullPage: true
    });
  });

  test('Capturar screenshot da API de templates', async ({ page }) => {
    await page.goto(`${baseURL}/api/templates`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/02-api-templates.png',
      fullPage: true
    });
  });

  test('Capturar screenshot de um template específico', async ({ page }) => {
    // Primeiro obter ID do template
    const response = await page.goto(`${baseURL}/api/templates`);
    const data = await response?.json();
    const templateId = data.templates[0].id;

    await page.goto(`${baseURL}/api/templates/${templateId}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/03-api-template-details.png',
      fullPage: true
    });
  });

  test('Capturar screenshot das seções do projeto', async ({ page }) => {
    await page.goto(`${baseURL}/api/projects/${projectId}/sections`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/04-api-project-sections.png',
      fullPage: true
    });
  });

  test('Capturar screenshot das seções faltantes', async ({ page }) => {
    await page.goto(`${baseURL}/api/projects/${projectId}/missing-sections`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/05-api-missing-sections.png',
      fullPage: true
    });
  });

  test('Capturar screenshot da lista de projetos', async ({ page }) => {
    await page.goto(`${baseURL}/api/projects`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/06-api-projects.png',
      fullPage: true
    });
  });
});
