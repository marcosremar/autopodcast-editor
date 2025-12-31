import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const PROJECT_ID = '54c8dae8-21ea-4383-bd95-9fdddf8ac3c4';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTemplateMappingFlow() {
  console.log('🚀 Iniciando testes do Template Mapping...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // 1. Testar API de templates
    console.log('1️⃣ Testando API de templates...');
    const templatesResponse = await page.request.get(`${BASE_URL}/api/templates`);
    const templatesData = await templatesResponse.json();
    console.log(`   ✅ Templates encontrados: ${templatesData.templates?.length || 0}`);
    if (templatesData.templates?.length > 0) {
      console.log(`   📋 Primeiro template: ${templatesData.templates[0].name}`);
    }

    // 2. Testar API de projetos
    console.log('\n2️⃣ Testando API de projetos...');
    const projectsResponse = await page.request.get(`${BASE_URL}/api/projects`);
    const projectsData = await projectsResponse.json();
    console.log(`   ✅ Projetos encontrados: ${projectsData.projects?.length || 0}`);

    // 3. Testar página de seleção de template
    console.log('\n3️⃣ Testando página de seleção de template...');
    await page.goto(`${BASE_URL}/editor/${PROJECT_ID}/template`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);
    await page.screenshot({ path: '/tmp/test_01_template_selection.png' });
    console.log(`   📍 URL: ${page.url()}`);

    // Verificar elementos da página
    const pageTitle = await page.locator('h1').first().textContent().catch(() => 'N/A');
    console.log(`   📝 Título: ${pageTitle}`);

    const templateCards = await page.locator('[class*="card"]').count();
    console.log(`   📋 Cards encontrados: ${templateCards}`);

    // 4. Verificar se há templates visíveis
    console.log('\n4️⃣ Verificando templates visíveis...');
    const templateTitles = await page.locator('h3, [class*="CardTitle"]').allTextContents();
    console.log(`   📝 Títulos: ${templateTitles.slice(0, 5).join(', ')}`);

    // Capturar screenshot com templates
    await page.screenshot({ path: '/tmp/test_02_templates_visible.png', fullPage: true });

    // 5. Testar API de auto-map (GET)
    console.log('\n5️⃣ Testando API de auto-map (GET)...');
    const autoMapGetResponse = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}/auto-map`);
    const autoMapGetData = await autoMapGetResponse.json();
    console.log(`   ✅ Success: ${autoMapGetData.success}`);
    console.log(`   📊 Sections: ${autoMapGetData.sections?.length || 0}`);
    console.log(`   📊 Mappings: ${autoMapGetData.mappings?.length || 0}`);
    console.log(`   📊 Unmapped: ${autoMapGetData.unmappedSegments?.length || 0}`);

    // 6. Testar seleção de template via API
    console.log('\n6️⃣ Testando seleção de template via API...');
    if (templatesData.templates?.length > 0) {
      const templateId = templatesData.templates[0].id;
      console.log(`   🔄 Selecionando template: ${templatesData.templates[0].name}`);

      const selectResponse = await page.request.post(
        `${BASE_URL}/api/projects/${PROJECT_ID}/select-template`,
        {
          data: { templateId, autoDetected: false }
        }
      );
      const selectData = await selectResponse.json();
      console.log(`   ✅ Resultado: ${selectData.success ? 'Sucesso' : selectData.error}`);
    }

    // 7. Testar página de mapeamento
    console.log('\n7️⃣ Testando página de mapeamento...');
    await page.goto(`${BASE_URL}/editor/${PROJECT_ID}/mapping`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);
    await page.screenshot({ path: '/tmp/test_03_mapping_page.png' });
    console.log(`   📍 URL: ${page.url()}`);

    // Verificar elementos da página de mapeamento
    const mappingTitle = await page.locator('h1').first().textContent().catch(() => 'N/A');
    console.log(`   📝 Título: ${mappingTitle}`);

    // Verificar botão de Auto-Map
    const autoMapButton = await page.locator('button:has-text("Auto-Mapear"), button:has-text("Auto-Map")').count();
    console.log(`   🤖 Botão Auto-Map: ${autoMapButton > 0 ? 'Encontrado' : 'Não encontrado'}`);

    // Verificar painel de Gaps
    const gapPanel = await page.locator('text=Analise de Gaps, text=Gap Analysis').count();
    console.log(`   📊 Painel de Gaps: ${gapPanel > 0 ? 'Encontrado' : 'Não encontrado'}`);

    await page.screenshot({ path: '/tmp/test_04_mapping_elements.png', fullPage: true });

    // 8. Testar Auto-Map via API (POST)
    console.log('\n8️⃣ Testando Auto-Map via API (POST)...');
    const autoMapPostResponse = await page.request.post(
      `${BASE_URL}/api/projects/${PROJECT_ID}/auto-map`,
      { data: { save: true } }
    );
    const autoMapPostData = await autoMapPostResponse.json();
    console.log(`   ✅ Success: ${autoMapPostData.success}`);
    if (autoMapPostData.success) {
      console.log(`   📊 Mappings criados: ${autoMapPostData.mappings?.length || 0}`);
      console.log(`   📊 Confiança: ${Math.round((autoMapPostData.overallConfidence || 0) * 100)}%`);
      console.log(`   💬 Mensagem: ${autoMapPostData.message}`);
    } else {
      console.log(`   ❌ Erro: ${autoMapPostData.error}`);
    }

    // 9. Testar página do editor principal
    console.log('\n9️⃣ Testando página do editor principal...');
    await page.goto(`${BASE_URL}/editor/${PROJECT_ID}`);
    await page.waitForLoadState('networkidle');
    await sleep(2000);
    await page.screenshot({ path: '/tmp/test_05_editor_main.png' });
    console.log(`   📍 URL: ${page.url()}`);

    // Verificar botão Template no header
    const templateButton = await page.locator('button:has-text("Template")').count();
    console.log(`   🔘 Botão Template no header: ${templateButton > 0 ? 'Encontrado' : 'Não encontrado'}`);

    // 10. Testar detecção de tipo
    console.log('\n🔟 Testando detecção de tipo de conteúdo...');
    const detectResponse = await page.request.get(`${BASE_URL}/api/projects/${PROJECT_ID}/detect-type`);
    const detectData = await detectResponse.json();
    console.log(`   ✅ Success: ${detectData.success}`);
    if (detectData.detection) {
      console.log(`   📝 Tipo: ${detectData.detection.detectedType}`);
      console.log(`   📊 Confiança: ${Math.round((detectData.detection.confidence || 0) * 100)}%`);
    }

    console.log('\n✅ Todos os testes concluídos!');
    console.log('📸 Screenshots salvos em /tmp/test_*.png');

    // Listar screenshots
    console.log('\n📁 Arquivos gerados:');
    console.log('   - /tmp/test_01_template_selection.png');
    console.log('   - /tmp/test_02_templates_visible.png');
    console.log('   - /tmp/test_03_mapping_page.png');
    console.log('   - /tmp/test_04_mapping_elements.png');
    console.log('   - /tmp/test_05_editor_main.png');

  } catch (error: any) {
    console.error('\n❌ Erro durante os testes:', error.message);
    await page.screenshot({ path: '/tmp/test_error.png' });
  } finally {
    await browser.close();
  }
}

// Executar testes
testTemplateMappingFlow();
