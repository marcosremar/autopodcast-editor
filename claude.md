# Instruções para Claude

## Regras de Desenvolvimento

### Testes Automáticos com Browser Use

**IMPORTANTE**: Sempre que implementar uma nova funcionalidade ou fazer alterações significativas na interface do usuário, você DEVE:

1. Testar automaticamente a implementação usando Browser Use em modo headless
2. Verificar se a funcionalidade está funcionando conforme esperado
3. **SEMPRE capturar screenshots** para validar o comportamento visual
4. Reportar os resultados dos testes ao usuário

### Configuração Obrigatória do Browser Use

**Modelo LLM Requerido**: `google/gemini-3-flash-preview`

**Por que este modelo?**
- Possui capacidades avançadas de análise visual
- Ajuda a navegar pela interface de forma mais inteligente
- Consegue validar mudanças visuais e comportamentos complexos
- É mais eficiente para testar funcionalidades que dependem de feedback visual

**Configuração do Browser Use**:
```python
from browser_use import Agent
import asyncio

async def test_feature():
    agent = Agent(
        task="Testar funcionalidade X",
        llm=ChatOpenAI(
            model="google/gemini-3-flash-preview",
            base_url="https://openrouter.ai/api/v1",
            api_key="sk-or-v1-..."  # Use a chave fornecida pelo usuário
        ),
        browser_config={
            "headless": True,
            "disable_security": False,
        }
    )

    result = await agent.run()
    return result
```

### Processo de Teste Obrigatório

1. **Implementar funcionalidade**: Fazer todas as mudanças de código necessárias
2. **Limpar cache**: Executar `rm -rf .next` se houver mudanças estruturais
3. **Garantir servidor rodando**: Verificar que `npm run dev` está ativo na porta 3000
4. **Criar script de teste**: Usar Browser Use com google/gemini-3-flash-preview
5. **Executar teste automatizado**: Rodar em modo headless
6. **Capturar screenshots**: SEMPRE tirar prints das telas importantes
7. **Validação visual**: O LLM deve analisar se as mudanças visuais estão corretas
8. **Reportar resultados**: Informar ao usuário se passou ou falhou, incluindo screenshots

### Exemplo de Fluxo Completo

```
1. Implementar funcionalidade "Preview Mode com Loop"
   - Modificar AdvancedTimeline.tsx
   - Adicionar botão de loop
   - Implementar lógica de playback

2. Limpar cache Next.js
   $ rm -rf .next

3. Garantir servidor rodando
   $ npm run dev
   ✓ Rodando em localhost:3000

4. Criar test_preview_loop.py com Browser Use
   - Configurar com google/gemini-3-flash-preview
   - Task: "Testar preview mode e loop button"
   - Capturar screenshots em cada etapa

5. Executar teste
   $ python test_preview_loop.py

6. Validar resultados
   ✓ Preview mode ativado?
   ✓ Loop button visível?
   ✓ Segmentos destacados corretamente?
   ✓ Playback limitado à área destacada?
   ✓ Screenshots capturados?

7. Reportar ao usuário
   "✅ Teste passou! Preview mode + loop funcionando.
    Screenshots salvos em /tmp/test_*.png"
```

### Estrutura de Testes

**Localização**: Criar arquivos de teste na raiz do projeto
- `test_[feature_name].py` - Teste básico
- `test_[feature_name]_llm.py` - Teste com Browser Use + LLM

**Template Disponível**: `/test_template_browser_use.py`
- Copie este arquivo como base para novos testes
- Já vem configurado com google/gemini-3-flash-preview
- Inclui estrutura completa com análise visual
- Basta personalizar o `task` do agente

**Credenciais de Teste**:
- Email: `demo@aeropod.com`
- Senha: `demo`
- Projeto de teste: Criado via `scripts/create-demo-project.ts`

**Screenshots**:
- Salvar em `/tmp/test_*.png`
- Capturar ANTES e DEPOIS de ações importantes
- Nomear descritivamente: `test_loop_active.png`, `test_preview_mode.png`

### Análise Visual Obrigatória

O modelo google/gemini-3-flash-preview deve ser usado para:

1. **Validar elementos visuais**:
   - Botões estão visíveis e no lugar certo?
   - Cores e estilos estão corretos?
   - Animações estão funcionando? (ex: pulse, fade)

2. **Verificar estados**:
   - Modo preview ativo tem badge visível?
   - Segmentos dimmed têm opacity reduzida?
   - Loop button muda de cor quando ativo?

3. **Confirmar comportamento**:
   - Chat responde adequadamente?
   - Timeline destaca segmentos corretos?
   - Playback respeita limites do preview?

### Checklist de Teste para Novas Funcionalidades

Antes de considerar uma funcionalidade completa, verificar:

- [ ] Código implementado e funcionando localmente
- [ ] Cache Next.js limpo (se necessário)
- [ ] Servidor rodando em localhost:3000
- [ ] Script de teste criado com Browser Use
- [ ] Modelo configurado como `google/gemini-3-flash-preview`
- [ ] Teste executado em modo headless
- [ ] Screenshots capturados de estados importantes
- [ ] Análise visual realizada pelo LLM
- [ ] Resultados reportados ao usuário com evidências
- [ ] Todos os testes passaram ✅

## Notas Técnicas

### Quando Usar Playwright vs Browser Use

**Playwright** (básico):
- Testes simples de login/navegação
- Validação de elementos DOM específicos
- Quando não precisa de análise visual inteligente

**Browser Use + LLM** (recomendado):
- Validação de funcionalidades complexas
- Análise visual de estados e animações
- Testes que requerem navegação adaptativa
- Quando mudanças visuais são críticas

### Troubleshooting

**Erro: Python 3.11+ required**
- Browser Use requer Python 3.11 ou superior
- Verificar versão: `python --version`
- Considerar usar Playwright como fallback temporário

**Erro: OpenRouter API key inválida**
- Solicitar nova chave ao usuário
- Formato: `sk-or-v1-...`

**Erro: Navegador não encontra elemento**
- Aumentar timeouts: `await page.wait_for_timeout(3000)`
- Verificar se página carregou completamente
- Usar seletores mais específicos

**Erro: Screenshots vazios**
- Garantir que ação já foi concluída antes do screenshot
- Aguardar animações terminarem
- Verificar se elemento está visível no viewport

## Exemplos de Testes Bem-Sucedidos

### 1. Preview Mode + Loop (test_preview_loop.py)
```python
✅ Login OK
✅ Editor carregado
✅ Mensagem enviada: "me mostra a introdução"
✅ Preview mode ATIVO
✅ Botão de loop ENCONTRADO
✅ Loop button CLICADO
✅ Segmentos dimmed: 2
✅ Segmentos focused: 2
✅ Loop ativo (pulse): True
✅ TESTE PASSOU!
```

### 2. Chat Message Persistence
```python
✅ Login realizado
✅ Chat aberto
✅ Mensagem enviada
✅ Resposta recebida
✅ Página recarregada
✅ Histórico mantido ✓
```

## Resumo

**Regra de Ouro**: Implementou funcionalidade? Teste SEMPRE com Browser Use + google/gemini-3-flash-preview + Screenshots!

Não considere uma tarefa completa até que os testes automatizados passem e você tenha evidências visuais (screenshots) de que está funcionando.
