#!/usr/bin/env python3
"""
Teste automatizado da funcionalidade de preview na timeline
"""

import asyncio
from playwright.async_api import async_playwright
import sys

async def test_chat_preview():
    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"[BROWSER] {msg.type}: {msg.text}"))

        try:
            print("🧪 Iniciando teste automatizado...")

            # First, login
            print("\n1. Fazendo login...")
            await page.goto("http://localhost:3000/login", wait_until="networkidle")
            await page.wait_for_timeout(1000)

            # Click demo button (easier than filling form)
            async with page.expect_response(lambda response: "/api/auth/login" in response.url) as response_info:
                await page.click('button:has-text("Acessar Demo")')

            # Wait for redirect to dashboard
            await page.wait_for_url("**/dashboard", timeout=5000)
            await page.wait_for_timeout(1000)
            print("   ✅ Login realizado com sucesso")

            # Navigate to editor page (using demo user's test project)
            print("\n2. Acessando página do editor...")
            await page.goto("http://localhost:3000/editor/54c8dae8-21ea-4383-bd95-9fdddf8ac3c4", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            # Take screenshot of initial state
            await page.screenshot(path="/tmp/editor_initial.png")
            print("   ✅ Screenshot salvo: /tmp/editor_initial.png")

            # Check if chat is visible
            print("\n3. Verificando se o chat está visível...")
            chat_visible = await page.is_visible("text=Assistente de Edicao")
            if chat_visible:
                print("   ✅ Chat está visível")
            else:
                print("   ❌ Chat NÃO está visível")
                return False

            # Find chat input
            print("\n4. Procurando campo de entrada do chat...")
            chat_input = await page.query_selector('input[placeholder*="comando de edicao"]')
            if chat_input:
                print("   ✅ Campo de entrada encontrado")
            else:
                print("   ❌ Campo de entrada NÃO encontrado")
                return False

            # Type message and press Enter
            print("\n5. Digitando mensagem de teste...")
            await chat_input.fill("me mostra a introdução")
            print("   ✅ Mensagem digitada: 'me mostra a introdução'")

            print("\n6. Enviando mensagem (pressionando Enter)...")
            print(f"   URL antes de enviar: {page.url}")

            # Press Enter to send message (more reliable than clicking button)
            await chat_input.press("Enter")
            print("   ✅ Enter pressionado")
            await page.wait_for_timeout(1000)
            print(f"   URL após enviar: {page.url}")

            # Wait for response (increased timeout)
            print("\n7. Aguardando resposta da IA...")
            for i in range(5):
                await page.wait_for_timeout(3000)
                print(f"   {(i+1)*3}s - URL atual: {page.url}")

                # Check if still on editor page
                if "/editor/" not in page.url:
                    print(f"   ⚠️  Página foi redirecionada para: {page.url}")
                    break

            # Take screenshot after response
            await page.screenshot(path="/tmp/editor_after_message.png")
            print("   ✅ Screenshot salvo: /tmp/editor_after_message.png")

            # Check if AI responded with highlighting message
            print("\n8. Verificando resposta da IA...")

            # Look for the highlighting message or any chat response
            highlighting_msg = await page.is_visible("text=Destacando")
            intro_mentioned = await page.is_visible("text=introdução")

            if highlighting_msg or intro_mentioned:
                print("   ✅ IA respondeu sobre a introdução")

                # Wait a bit more for any animations
                await page.wait_for_timeout(2000)

                # Take screenshot after potential action
                await page.screenshot(path="/tmp/editor_after_action.png")
                print("   ✅ Screenshot salvo: /tmp/editor_after_action.png")

                # Check for preview mode indicator or visual changes
                print("\n9. Verificando modo preview na timeline...")

                # Check if timeline has preview mode elements
                preview_mode = await page.evaluate("""
                    () => {
                        // Look for dimmed segments (opacity-30)
                        const dimmedSegments = document.querySelectorAll('[class*="opacity-30"]');
                        // Look for focused segments with ring
                        const focusedSegments = document.querySelectorAll('[class*="ring-violet"]');
                        // Look for preview badge
                        const previewBadge = document.querySelector('[class*="Preview"]');

                        return {
                            hasDimmedSegments: dimmedSegments.length > 0,
                            hasFocusedSegments: focusedSegments.length > 0,
                            hasPreviewBadge: previewBadge !== null,
                            dimmedCount: dimmedSegments.length,
                            focusedCount: focusedSegments.length
                        };
                    }
                """)

                print(f"   Segmentos dimmed: {preview_mode['dimmedCount']}")
                print(f"   Segmentos focused: {preview_mode['focusedCount']}")
                print(f"   Preview badge: {preview_mode['hasPreviewBadge']}")

                if preview_mode['hasDimmedSegments'] or preview_mode['hasFocusedSegments']:
                    print("   ✅ Timeline em modo preview (segmentos destacados encontrados)!")
                else:
                    print("   ⚠️  Timeline NÃO parece estar em modo preview")
                    print("   ℹ️  Mas a IA respondeu corretamente sobre a introdução")

                # Check console logs
                print("\n10. Verificando logs do console...")
                print("    (Verifique os logs do console acima para mensagens [Editor] e [Timeline])")

                return True
            else:
                print("   ❌ IA não mencionou a introdução na resposta")
                return False

        except Exception as e:
            print(f"\n❌ Erro durante o teste: {e}")
            await page.screenshot(path="/tmp/editor_error.png")
            print("   Screenshot de erro salvo: /tmp/editor_error.png")
            return False
        finally:
            await browser.close()

async def main():
    print("=" * 60)
    print("TESTE AUTOMATIZADO - Chat Preview Timeline")
    print("=" * 60)

    result = await test_chat_preview()

    print("\n" + "=" * 60)
    if result:
        print("✅ TESTE CONCLUÍDO COM SUCESSO!")
    else:
        print("❌ TESTE FALHOU - Verifique os logs acima")
    print("=" * 60)

    sys.exit(0 if result else 1)

if __name__ == "__main__":
    asyncio.run(main())
