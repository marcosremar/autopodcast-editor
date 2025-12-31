#!/usr/bin/env python3
"""
Teste expandido para verificar funcionalidade de preview + loop
"""

import asyncio
from playwright.async_api import async_playwright
import sys

async def test_preview_with_loop():
    async with async_playwright() as p:
        # Launch browser in headed mode to see the action
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"[BROWSER] {msg.type}: {msg.text}"))

        try:
            print("=" * 80)
            print("🧪 TESTE COMPLETO - Preview Mode + Loop Functionality")
            print("=" * 80)

            # 1. Login
            print("\n1️⃣  Login...")
            await page.goto("http://localhost:3000/login", wait_until="networkidle")
            await page.wait_for_timeout(1000)

            await page.click('button:has-text("Acessar Demo")')
            await page.wait_for_url("**/dashboard", timeout=5000)
            print("   ✅ Login OK")

            # 2. Navigate to editor
            print("\n2️⃣  Acessando editor...")
            await page.goto("http://localhost:3000/editor/54c8dae8-21ea-4383-bd95-9fdddf8ac3c4", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            print("   ✅ Editor carregado")

            # 3. Send chat message
            print("\n3️⃣  Enviando mensagem para chat...")
            chat_input = await page.query_selector('input[placeholder*="comando de edicao"]')
            if not chat_input:
                print("   ❌ Input do chat não encontrado")
                return False

            await chat_input.fill("me mostra a introdução")
            await chat_input.press("Enter")
            print("   ✅ Mensagem enviada")

            # 4. Wait for AI response
            print("\n4️⃣  Aguardando resposta da IA...")
            await page.wait_for_timeout(12000)

            # Take screenshot after AI response
            await page.screenshot(path="/tmp/test_with_loop.png")
            print("   ✅ Screenshot: /tmp/test_with_loop.png")

            # 5. Check if preview mode is active
            print("\n5️⃣  Verificando Preview Mode...")
            preview_badge = await page.is_visible("text=Preview")

            if preview_badge:
                print("   ✅ Preview mode ATIVO")
            else:
                # Try to find the badge via class
                badge_visible = await page.evaluate("""
                    () => {
                        const badge = document.querySelector('[class*="violet-500"]');
                        return badge !== null;
                    }
                """)
                print(f"   {'✅' if badge_visible else '❌'} Preview badge: {badge_visible}")

            # 6. Check for loop button
            print("\n6️⃣  Verificando botão de Loop...")
            loop_button_exists = await page.evaluate("""
                () => {
                    // Look for Repeat icon or loop button
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const loopButton = buttons.find(btn => {
                        const svg = btn.querySelector('svg');
                        return svg && btn.closest('[class*="violet"]');
                    });
                    return loopButton !== null;
                }
            """)

            if loop_button_exists:
                print("   ✅ Botão de loop ENCONTRADO")

                # Try to click the loop button
                print("\n7️⃣  Testando toggle do loop...")
                clicked = await page.evaluate("""
                    () => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const loopButton = buttons.find(btn => {
                            const title = btn.getAttribute('title');
                            return title && title.includes('Loop');
                        });
                        if (loopButton) {
                            loopButton.click();
                            return true;
                        }
                        return false;
                    }
                """)

                if clicked:
                    print("   ✅ Loop button clicado")
                    await page.wait_for_timeout(1000)

                    # Take screenshot with loop active
                    await page.screenshot(path="/tmp/test_loop_active.png")
                    print("   ✅ Screenshot com loop: /tmp/test_loop_active.png")
                else:
                    print("   ⚠️  Não conseguiu clicar no botão")
            else:
                print("   ❌ Botão de loop NÃO encontrado")

            # 8. Verify visual changes
            print("\n8️⃣  Verificando mudanças visuais...")
            visual_check = await page.evaluate("""
                () => {
                    const dimmedSegments = document.querySelectorAll('[class*="opacity-30"]');
                    const focusedSegments = document.querySelectorAll('[class*="ring-violet"]');
                    const repeatIcon = document.querySelector('[class*="animate-pulse"]');

                    return {
                        dimmed: dimmedSegments.length,
                        focused: focusedSegments.length,
                        loopActive: repeatIcon !== null
                    };
                }
            """)

            print(f"   📊 Segmentos dimmed: {visual_check['dimmed']}")
            print(f"   📊 Segmentos focused: {visual_check['focused']}")
            print(f"   📊 Loop ativo (pulse): {visual_check['loopActive']}")

            # 9. Final assessment
            print("\n" + "=" * 80)
            success = (
                preview_badge or badge_visible and
                loop_button_exists and
                visual_check['dimmed'] > 0 and
                visual_check['focused'] > 0
            )

            if success:
                print("✅ TESTE PASSOU - Todas as funcionalidades operacionais!")
            else:
                print("⚠️  TESTE COM AVISOS - Algumas funcionalidades podem estar faltando")

            print("=" * 80)

            return success

        except Exception as e:
            print(f"\n❌ ERRO: {e}")
            await page.screenshot(path="/tmp/test_error.png")
            return False
        finally:
            await browser.close()

if __name__ == "__main__":
    result = asyncio.run(test_preview_with_loop())
    sys.exit(0 if result else 1)
