#!/usr/bin/env python3
"""
Teste automatizado INTELIGENTE da funcionalidade de preview na timeline
Usa Browser Use com LLM para navegação adaptativa
"""

import asyncio
import os
from browser_use import Agent
from langchain_openai import ChatOpenAI

async def test_chat_preview_with_llm():
    """
    Teste inteligente usando LLM para navegar e testar a aplicação
    """

    # Configure LLM - usando OpenRouter para acesso a vários modelos
    llm = ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", ""),
        model="anthropic/claude-3.5-sonnet",
        temperature=0.1,  # Baixa temperatura para testes mais determinísticos
    )

    # Criar agente de teste
    agent = Agent(
        task="""
Você é um testador automatizado inteligente. Sua missão é testar a funcionalidade de preview na timeline do editor de podcast.

PASSOS A SEGUIR:

1. FAZER LOGIN:
   - Vá para http://localhost:3000/login
   - Preencha email: demo@aeropod.com
   - Preencha senha: demo
   - Clique no botão de login
   - Aguarde carregar a dashboard

2. ACESSAR EDITOR:
   - Navegue para http://localhost:3000/editor/54c8dae8-21ea-4383-bd95-9fdddf8ac3c4
   - Aguarde a página carregar completamente
   - Tire um screenshot para documentar o estado inicial

3. TESTAR CHAT:
   - Localize o chat de edição na página (pode estar na parte inferior ou lateral)
   - No campo de entrada do chat, digite: "me mostra a introdução"
   - Envie a mensagem
   - Aguarde a resposta da IA (pode demorar ~8 segundos)
   - Tire um screenshot após receber a resposta

4. VERIFICAR AÇÕES:
   - Procure por botões de ação na resposta do chat
   - Se encontrar botões de ação, clique no primeiro
   - Aguarde a timeline reagir

5. VALIDAR PREVIEW MODE:
   - Verifique se a timeline mudou para modo "preview"
   - Procure por indicador visual de preview (texto "Preview", mudança de cor, etc)
   - Verifique se alguns segmentos estão destacados/iluminados
   - Verifique se outros segmentos estão escurecidos/dimmed
   - Tire um screenshot final mostrando o resultado

6. REPORTAR RESULTADOS:
   - Descreva em detalhes o que você observou
   - Indique se a funcionalidade está funcionando corretamente
   - Liste quaisquer problemas encontrados
   - Mencione se os logs do console mostram mensagens de debug ([Editor], [Timeline])

IMPORTANTE:
- Seja adaptativo: se algo não funcionar exatamente como descrito, tente alternativas razoáveis
- Documente tudo com screenshots
- Reporte com detalhes o que aconteceu em cada passo
- Se encontrar erros, capture e reporte-os
""",
        llm=llm,
        use_vision=True,  # Usar visão para entender melhor a interface
        max_actions_per_step=10,
        save_conversation_path="/tmp/browser_use_conversation.json",
    )

    print("="*80)
    print("🤖 TESTE INTELIGENTE COM LLM - Chat Preview Timeline")
    print("="*80)
    print("\n🧠 Usando LLM: anthropic/claude-3.5-sonnet via OpenRouter")
    print("🌐 Navegação adaptativa habilitada")
    print("\n")

    try:
        # Executar o agente
        result = await agent.run()

        print("\n" + "="*80)
        print("✅ TESTE CONCLUÍDO!")
        print("="*80)
        print("\n📊 RESULTADO DO AGENTE:")
        print(result)
        print("\n💾 Conversação salva em: /tmp/browser_use_conversation.json")
        print("📸 Screenshots salvos em: /tmp/")

        return True

    except Exception as e:
        print("\n" + "="*80)
        print("❌ ERRO NO TESTE")
        print("="*80)
        print(f"\n⚠️  Erro: {e}")
        print("\n💡 Dica: Verifique se:")
        print("   - O servidor está rodando em localhost:3000")
        print("   - A variável OPENROUTER_API_KEY está configurada")
        print("   - O navegador conseguiu ser iniciado")
        return False

if __name__ == "__main__":
    # Verificar se API key está configurada
    if not os.getenv("OPENROUTER_API_KEY"):
        print("⚠️  ATENÇÃO: OPENROUTER_API_KEY não está configurada!")
        print("   Configure com: export OPENROUTER_API_KEY='sua-chave-aqui'")
        print()

    # Executar teste
    result = asyncio.run(test_chat_preview_with_llm())
    exit(0 if result else 1)
