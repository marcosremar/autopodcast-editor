#!/usr/bin/env python3
"""
Template para testes com Browser Use + google/gemini-3-flash-preview
Use este arquivo como base para criar novos testes de funcionalidades
"""

import asyncio
import os
from langchain_openai import ChatOpenAI
from browser_use import Agent


async def test_feature_with_llm():
    """
    Template de teste usando Browser Use com LLM para análise visual

    IMPORTANTE: Requer Python 3.11+
    Instalar: pip install browser-use langchain-openai playwright
              playwright install chromium
    """

    # Configurar LLM com google/gemini-3-flash-preview
    llm = ChatOpenAI(
        model="google/gemini-3-flash-preview",
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", "sk-or-v1-..."),  # Use variável de ambiente
        temperature=0.7,
    )

    # Criar agente com capacidade de análise visual
    agent = Agent(
        task="""
        Acesse http://localhost:3000/login e faça login com:
        - Email: demo@aeropod.com
        - Senha: demo

        Depois navegue para o editor do projeto de teste.

        Teste a funcionalidade [DESCREVER FUNCIONALIDADE AQUI].

        Verifique visualmente:
        1. [CRITÉRIO VISUAL 1]
        2. [CRITÉRIO VISUAL 2]
        3. [CRITÉRIO VISUAL 3]

        Tire screenshots de cada etapa importante.

        Reporte se a funcionalidade está funcionando corretamente.
        """,
        llm=llm,
        browser_config={
            "headless": True,  # Executar sem interface gráfica
            "disable_security": False,
            "chrome_instance_path": None,  # Usa chromium do Playwright
        },
    )

    try:
        print("=" * 80)
        print("🤖 TESTE COM LLM - Browser Use + google/gemini-3-flash-preview")
        print("=" * 80)
        print("\n🚀 Iniciando agente...\n")

        # Executar agente
        result = await agent.run()

        print("\n" + "=" * 80)
        print("📊 RESULTADO DO TESTE")
        print("=" * 80)
        print(result)

        # Verificar se teste passou
        # O LLM deve incluir palavras-chave como "funcionando", "correto", "passou"
        success_keywords = ["funcionando", "correto", "passou", "sucesso", "ok"]
        failure_keywords = ["falhou", "erro", "incorreto", "problema", "bug"]

        result_lower = str(result).lower()

        if any(keyword in result_lower for keyword in success_keywords):
            print("\n✅ TESTE PASSOU!")
            return True
        elif any(keyword in result_lower for keyword in failure_keywords):
            print("\n❌ TESTE FALHOU!")
            return False
        else:
            print("\n⚠️  RESULTADO INCONCLUSIVO - Verifique manualmente")
            return None

    except Exception as e:
        print(f"\n❌ ERRO DURANTE TESTE: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║                    TEMPLATE DE TESTE - BROWSER USE                       ║
    ║                                                                          ║
    ║  Modelo LLM: google/gemini-3-flash-preview                              ║
    ║  Capacidades: Navegação inteligente + Análise visual                    ║
    ║                                                                          ║
    ║  Antes de executar:                                                     ║
    ║  1. Certifique-se que npm run dev está rodando (localhost:3000)        ║
    ║  2. Configure OPENROUTER_API_KEY como variável de ambiente             ║
    ║  3. Personalize o 'task' do agente com sua funcionalidade              ║
    ║                                                                          ║
    ╚══════════════════════════════════════════════════════════════════════════╝
    """)

    # Verificar se servidor está rodando
    import urllib.request
    try:
        urllib.request.urlopen("http://localhost:3000", timeout=2)
        print("✅ Servidor Next.js detectado em localhost:3000\n")
    except:
        print("⚠️  AVISO: Servidor não detectado em localhost:3000")
        print("   Execute 'npm run dev' antes de continuar\n")
        exit(1)

    # Executar teste
    result = asyncio.run(test_feature_with_llm())

    # Exit code baseado no resultado
    if result is True:
        exit(0)  # Sucesso
    elif result is False:
        exit(1)  # Falha
    else:
        exit(2)  # Inconclusivo
