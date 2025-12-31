#!/usr/bin/env python3.11
"""
Teste de Preview Mode + Loop com análise visual usando google/gemini-3-flash-preview
"""

import asyncio
import os
from langchain_openai import ChatOpenAI
from browser_use import Agent, Controller
from browser_use.browser.browser import Browser, BrowserConfig


async def test_preview_loop_with_gemini():
    """
    Testa funcionalidade de preview mode + loop usando LLM para análise visual
    """

    # Configurar LLM com google/gemini-3-flash-preview via OpenRouter
    llm = ChatOpenAI(
        model="google/gemini-3-flash-preview",
        base_url="https://openrouter.ai/api/v1",
        api_key="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",
        temperature=0.5,
        default_headers={"HTTP-Referer": "http://localhost:3000"}
    )

    # Configurar browser
    browser = Browser(
        config=BrowserConfig(
            headless=True,
            disable_security=False,
        )
    )

    # Criar agente com capacidade de análise visual
    agent = Agent(
        task="""
        Você está testando a funcionalidade de Preview Mode + Loop no Aeropod (editor de podcast).

        PASSOS:
        1. Acesse http://localhost:3000/login
        2. Faça login clicando no botão "Acessar Demo"
        3. Navegue para o projeto de teste: http://localhost:3000/editor/54c8dae8-21ea-4383-bd95-9fdddf8ac3c4
        4. Localize o input de chat (campo de texto para comandos de edição)
        5. Digite a mensagem: "me mostra a introdução"
        6. Aguarde a resposta da IA (pode demorar alguns segundos)

        ANÁLISE VISUAL OBRIGATÓRIA:
        Após a IA responder, verifique visualmente:

        ✓ PREVIEW MODE:
          - Existe um badge "Preview" visível na timeline?
          - Cor do badge é violeta/roxo?
          - Alguns segmentos da timeline estão destacados (coloridos)?
          - Outros segmentos estão esmaecidos/cinza (opacity reduzida)?

        ✓ BOTÃO DE LOOP:
          - Existe um botão com ícone de "Repeat" (setas circulares) próximo ao badge Preview?
          - O botão é clicável?
          - Ao clicar, ele muda de cor (fica roxo brilhante)?
          - Quando ativo, tem animação de pulse?

        ✓ COMPORTAMENTO:
          - A timeline rolou automaticamente para mostrar os segmentos destacados?
          - Os segmentos destacados correspondem à "introdução" do podcast?

        REPORTE FINAL:
        Descreva em detalhes o que você viu:
        - Preview mode está funcionando? (badge visível, segmentos destacados)
        - Botão de loop está presente e funcional?
        - Visual está correto? (cores, animações, destaque)
        - Encontrou algum problema ou bug?

        Se tudo estiver funcionando corretamente, termine com a frase: "TESTE PASSOU - Funcionalidade operacional"
        Se encontrar problemas, termine com: "TESTE FALHOU - [descrição do problema]"
        """,
        llm=llm,
        browser=browser,
    )

    try:
        print("=" * 80)
        print("🤖 TESTE COM GEMINI - Preview Mode + Loop")
        print("=" * 80)
        print("\nModelo: google/gemini-3-flash-preview")
        print("Capacidade: Análise visual inteligente\n")
        print("🚀 Iniciando agente...\n")

        # Executar agente
        result = await agent.run()

        print("\n" + "=" * 80)
        print("📊 RESULTADO DA ANÁLISE VISUAL")
        print("=" * 80)
        print(result)
        print("=" * 80)

        # Verificar se teste passou
        result_str = str(result)

        if "TESTE PASSOU" in result_str or "operacional" in result_str.lower():
            print("\n✅ TESTE PASSOU - Gemini confirmou funcionalidade!")
            return True
        elif "TESTE FALHOU" in result_str or "problema" in result_str.lower() or "bug" in result_str.lower():
            print("\n❌ TESTE FALHOU - Gemini detectou problemas!")
            return False
        else:
            print("\n⚠️  RESULTADO INCONCLUSIVO")
            print("Análise do Gemini não foi clara sobre sucesso/falha")
            return None

    except Exception as e:
        print(f"\n❌ ERRO DURANTE TESTE: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║           TESTE VISUAL - PREVIEW MODE + LOOP (GEMINI)                    ║
    ║                                                                          ║
    ║  O modelo Gemini irá:                                                   ║
    ║  • Navegar pela interface automaticamente                               ║
    ║  • Analisar visualmente os elementos (cores, animações, badges)         ║
    ║  • Verificar se preview mode está destacando segmentos corretamente     ║
    ║  • Validar presença e funcionamento do botão de loop                    ║
    ║  • Reportar análise detalhada com conclusão clara                       ║
    ║                                                                          ║
    ╚══════════════════════════════════════════════════════════════════════════╝
    """)

    # Verificar servidor
    import urllib.request
    try:
        urllib.request.urlopen("http://localhost:3000", timeout=2)
        print("✅ Servidor Next.js rodando em localhost:3000\n")
    except:
        print("❌ ERRO: Servidor não detectado em localhost:3000")
        print("Execute 'npm run dev' antes de continuar\n")
        exit(1)

    # Executar teste
    print("⏳ Executando teste com análise visual do Gemini...")
    print("   (Isso pode levar 30-60 segundos)\n")

    result = asyncio.run(test_preview_loop_with_gemini())

    # Exit code
    if result is True:
        exit(0)
    elif result is False:
        exit(1)
    else:
        exit(2)
