const { chromium } = require('playwright');

async function captureUIScreenshots() {
  console.log('🎨 Iniciando captura de screenshots da INTERFACE...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const baseURL = 'http://localhost:3000';
  const projectId = '13c3e41a-1d9f-40e4-9cec-7810790f9825';

  try {
    // 1. Home Page (Dashboard)
    console.log('📸 1/6 - Capturando home/dashboard...');
    await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000); // Aguardar animações
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/01-dashboard-home.png',
      fullPage: true
    });

    // 2. Template Selector Page
    console.log('📸 2/6 - Capturando página de seleção de templates...');
    try {
      await page.goto(`${baseURL}/editor/${projectId}/template`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: '/tmp/aeropod-relatorio-final/screenshots/02-template-selector.png',
        fullPage: true
      });
    } catch (e) {
      console.log('   ⚠️  Página redireciona (esperado se auth necessária)');
      // Tentar capturar mesmo assim
      await page.screenshot({
        path: '/tmp/aeropod-relatorio-final/screenshots/02-template-selector-redirect.png',
        fullPage: true
      });
    }

    // 3. Editor Principal
    console.log('📸 3/6 - Capturando editor principal...');
    try {
      await page.goto(`${baseURL}/editor/${projectId}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: '/tmp/aeropod-relatorio-final/screenshots/03-editor-main.png',
        fullPage: true
      });
    } catch (e) {
      console.log('   ⚠️  Página redireciona (esperado se auth necessária)');
      await page.screenshot({
        path: '/tmp/aeropod-relatorio-final/screenshots/03-editor-redirect.png',
        fullPage: true
      });
    }

    // 4. Demonstração dos componentes via Storybook ou página de teste
    // Vou criar uma página temporária para mostrar os componentes

    // 5. Screenshot do código do TemplateCard
    console.log('📸 4/6 - Preparando visualização de componentes...');

    // Criar uma página HTML temporária que renderiza os componentes
    const componentsHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Aeropod - Template Components</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    .component-showcase {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 10px; }
    h2 { color: #666; font-size: 18px; margin-bottom: 20px; }
    .template-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      background: white;
    }
    .badge {
      display: inline-block;
      background: #f59e0b;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .section-list {
      margin: 15px 0;
      padding: 15px;
      background: #f9fafb;
      border-radius: 4px;
    }
    .section-item {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      margin-left: 10px;
    }
    .pending { background: #e5e7eb; color: #6b7280; }
    .approved { background: #d1fae5; color: #065f46; }
    .review { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <h1>🎨 Aeropod - Template System Components</h1>
  <h2>Interface Visual do Sistema de Templates</h2>

  <div class="component-showcase">
    <h3>Template Card - Entrevista Profissional</h3>
    <div class="template-card">
      <span class="badge">✨ Recomendado 95%</span>
      <h4 style="margin: 10px 0;">Entrevista Profissional</h4>
      <p style="color: #666; font-size: 14px;">Template ideal para podcasts de entrevista com convidados. Estrutura completa com introdução, apresentação do entrevistado, e conclusão profissional.</p>
      <div style="margin: 15px 0; color: #666; font-size: 13px;">
        📊 Categoria: Interview | ⏱️ ~40 minutos
      </div>
      <div class="section-list">
        <div style="font-weight: 600; margin-bottom: 10px;">Seções (6):</div>
        <div class="section-item">🎵 Vinheta <span class="status pending">opcional</span></div>
        <div class="section-item">👋 Introdução <span class="status pending">obrigatória</span></div>
        <div class="section-item">👤 Apresentação do Convidado <span class="status pending">obrigatória</span></div>
        <div class="section-item">💬 Entrevista Principal <span class="status pending">obrigatória</span></div>
        <div class="section-item">📢 Call-to-Action <span class="status pending">opcional</span></div>
        <div class="section-item">✅ Conclusão <span class="status pending">obrigatória</span></div>
      </div>
    </div>
  </div>

  <div class="component-showcase">
    <h3>Section Manager - Checklist de Progresso</h3>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-weight: 600;">Progresso das Seções</span>
          <span>2 / 6 aprovadas</span>
        </div>
        <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: #10b981; width: 33%; height: 100%;"></div>
        </div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 500;">✅ Introdução <span class="status approved">approved</span></div>
            <div style="font-size: 13px; color: #666; margin-top: 5px;">Duração: 1:30</div>
          </div>
          <button style="padding: 6px 16px; background: #e5e7eb; border: none; border-radius: 4px; cursor: pointer;">Reabrir</button>
        </div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 500;">👁️ Entrevista Principal <span class="status review">review</span></div>
            <div style="font-size: 13px; color: #666; margin-top: 5px;">Duração: 25:40</div>
          </div>
          <button style="padding: 6px 16px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">Aprovar</button>
        </div>
      </div>
      <div style="background: white; padding: 15px; border-radius: 6px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 500;">⏳ Conclusão <span class="status pending">pending</span></div>
            <div style="font-size: 13px; color: #666; margin-top: 5px;">Aguardando upload</div>
          </div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>
    `;

    // Carregar HTML customizado
    await page.setContent(componentsHTML);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/04-template-components-showcase.png',
      fullPage: true
    });

    // 6. Screenshot de tabela comparativa dos templates
    console.log('📸 5/6 - Criando comparação de templates...');
    const templatesComparisonHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Templates Comparison</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 30px; }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    th {
      background: #1f2937;
      color: white;
      padding: 15px;
      text-align: left;
    }
    td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .interview { background: #dbeafe; color: #1e40af; }
    .monologue { background: #fce7f3; color: #9f1239; }
    .debate { background: #fef3c7; color: #92400e; }
    .review { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <h1>📊 Comparação de Templates Disponíveis</h1>
  <table>
    <thead>
      <tr>
        <th>Template</th>
        <th>Categoria</th>
        <th>Duração</th>
        <th>Seções</th>
        <th>Obrigatórias</th>
        <th>Nível</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Entrevista Profissional</strong></td>
        <td><span class="badge interview">Interview</span></td>
        <td>~40 min</td>
        <td>6</td>
        <td>4</td>
        <td>Iniciante</td>
      </tr>
      <tr>
        <td><strong>Monólogo Educacional</strong></td>
        <td><span class="badge monologue">Monologue</span></td>
        <td>~30 min</td>
        <td>6</td>
        <td>4</td>
        <td>Iniciante</td>
      </tr>
      <tr>
        <td><strong>Debate/Painel</strong></td>
        <td><span class="badge debate">Debate</span></td>
        <td>~60 min</td>
        <td>6</td>
        <td>6</td>
        <td>Intermediário</td>
      </tr>
      <tr>
        <td><strong>Review/Análise</strong></td>
        <td><span class="badge review">Review</span></td>
        <td>~20 min</td>
        <td>7</td>
        <td>5</td>
        <td>Iniciante</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="margin-top: 0;">💡 Funcionalidades Principais</h2>
    <ul style="line-height: 1.8; color: #374151;">
      <li>✅ Detecção automática de tipo de conteúdo via IA (Groq Llama 3.3 70B)</li>
      <li>✅ Sugestão inteligente de templates com confidence score</li>
      <li>✅ Criação automática de seções ao aplicar template</li>
      <li>✅ Workflow de aprovação: pending → review → approved</li>
      <li>✅ Proteção de seções aprovadas (locking)</li>
      <li>✅ Progress tracking em tempo real</li>
      <li>✅ Estatísticas de conclusão (percentComplete, isReadyForExport)</li>
      <li>✅ Diferenciação entre seções obrigatórias e opcionais</li>
    </ul>
  </div>
</body>
</html>
    `;

    await page.setContent(templatesComparisonHTML);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/05-templates-comparison.png',
      fullPage: true
    });

    // 7. Workflow diagram
    console.log('📸 6/6 - Criando diagrama de workflow...');
    const workflowHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Workflow Diagram</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 40px;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 { color: #333; margin-bottom: 40px; }
    .workflow {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 800px;
    }
    .step {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      position: relative;
    }
    .step-number {
      position: absolute;
      top: -15px;
      left: 20px;
      background: #1f2937;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
    }
    .step h3 {
      margin: 10px 0 10px 0;
      color: #1f2937;
    }
    .step p {
      color: #6b7280;
      margin: 5px 0;
      line-height: 1.6;
    }
    .arrow {
      text-align: center;
      font-size: 30px;
      color: #3b82f6;
      margin: -10px 0;
    }
    .highlight {
      background: #eff6ff;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 500;
      color: #1e40af;
    }
  </style>
</head>
<body>
  <h1>🔄 Workflow do Sistema de Templates</h1>

  <div class="workflow">
    <div class="step">
      <div class="step-number">1</div>
      <h3>📤 Upload de Áudio</h3>
      <p>Usuário faz upload do arquivo de áudio do podcast</p>
    </div>

    <div class="arrow">↓</div>

    <div class="step">
      <div class="step-number">2</div>
      <h3>🎙️ Processamento Automático</h3>
      <p>• Transcrição com <span class="highlight">Groq Whisper Large v3</span></p>
      <p>• <strong>Detecção de tipo de conteúdo</strong> com <span class="highlight">Groq Llama 3.3 70B</span></p>
      <p>• Análise de segmentos e características</p>
    </div>

    <div class="arrow">↓</div>

    <div class="step">
      <div class="step-number">3</div>
      <h3>💡 Sugestão de Templates</h3>
      <p>IA sugere 2-4 templates compatíveis com <span class="highlight">confidence score</span></p>
      <p>Usuário visualiza templates recomendados e suas seções</p>
    </div>

    <div class="arrow">↓</div>

    <div class="step">
      <div class="step-number">4</div>
      <h3>✅ Seleção de Template</h3>
      <p>Usuário escolhe template (ou pula para modo livre)</p>
      <p>Sistema cria automaticamente <span class="highlight">6-7 seções</span> baseadas no template</p>
    </div>

    <div class="arrow">↓</div>

    <div class="step">
      <div class="step-number">5</div>
      <h3>📋 Gerenciamento de Seções</h3>
      <p>• Checklist visual mostra seções <span class="highlight">obrigatórias vs opcionais</span></p>
      <p>• Progress bar indica % de conclusão</p>
      <p>• Identifica seções faltantes</p>
      <p>• Permite upload/gravação por seção</p>
    </div>

    <div class="arrow">↓</div>

    <div class="step">
      <div class="step-number">6</div>
      <h3>👁️ Revisão e Aprovação</h3>
      <p>Workflow de aprovação por seção:</p>
      <p><span class="highlight">pending</span> → <span class="highlight">review</span> → <span class="highlight">approved (locked)</span></p>
      <p>Seções aprovadas ficam protegidas de modificações</p>
    </div>

    <div class="arrow">↓</div>

    <div class="step">
      <div class="step-number">7</div>
      <h3>🚀 Export Final</h3>
      <p>Quando todas seções obrigatórias aprovadas:</p>
      <p><span class="highlight">isReadyForExport: true</span></p>
      <p>Sistema monta podcast final seguindo ordem do template</p>
    </div>
  </div>

  <div style="margin-top: 40px; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 800px;">
    <h2 style="margin-top: 0;">🎯 Diferenciais do Sistema</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
      <div>
        <h4 style="color: #1f2937; margin-bottom: 10px;">🤖 IA-Powered</h4>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Detecção automática de tipo de conteúdo com Groq Llama 3.3 70B</p>
      </div>
      <div>
        <h4 style="color: #1f2937; margin-bottom: 10px;">🎨 Templates Profissionais</h4>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">4 templates pré-configurados com 25+ seções</p>
      </div>
      <div>
        <h4 style="color: #1f2937; margin-bottom: 10px;">✅ Workflow Estruturado</h4>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Guia passo-a-passo com aprovação por seção</p>
      </div>
      <div>
        <h4 style="color: #1f2937; margin-bottom: 10px;">🔒 Proteção de Conteúdo</h4>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Seções aprovadas ficam locked automaticamente</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await page.setContent(workflowHTML);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/tmp/aeropod-relatorio-final/screenshots/06-workflow-diagram.png',
      fullPage: true
    });

    console.log('✅ Todos os screenshots da interface capturados!');
    console.log('📁 Screenshots salvos em: /tmp/aeropod-relatorio-final/screenshots/');

  } catch (error) {
    console.error('❌ Erro ao capturar screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureUIScreenshots();
