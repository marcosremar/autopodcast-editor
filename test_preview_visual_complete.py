#!/usr/bin/env python3
"""
Teste visual completo de Preview Mode + Loop com screenshots detalhados
Fallback para quando Browser Use não estiver disponível
"""

import asyncio
from playwright.async_api import async_playwright
import sys
from datetime import datetime


async def test_preview_loop_visual():
    """
    Teste com capturas visuais detalhadas em cada etapa
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        # Logs do browser
        page.on("console", lambda msg: print(f"[BROWSER {msg.type}] {msg.text}"))

        try:
            print("=" * 90)
            print("🎯 TESTE VISUAL COMPLETO - Preview Mode + Loop Functionality")
            print("=" * 90)
            print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("=" * 90)

            # ETAPA 1: Login
            print("\n📍 ETAPA 1: Realizando login...")
            await page.goto("http://localhost:3000/login", wait_until="networkidle")
            await page.wait_for_timeout(1000)

            # Screenshot da página de login
            await page.screenshot(path="/tmp/visual_test_01_login.png")
            print("   📸 Screenshot: /tmp/visual_test_01_login.png")

            await page.click('button:has-text("Acessar Demo")')
            await page.wait_for_url("**/dashboard", timeout=5000)
            print("   ✅ Login realizado com sucesso")

            # ETAPA 2: Acessar editor
            print("\n📍 ETAPA 2: Navegando para editor...")
            await page.goto(
                "http://localhost:3000/editor/54c8dae8-21ea-4383-bd95-9fdddf8ac3c4",
                wait_until="networkidle"
            )
            await page.wait_for_timeout(2000)

            # Screenshot do editor inicial
            await page.screenshot(path="/tmp/visual_test_02_editor_initial.png")
            print("   📸 Screenshot: /tmp/visual_test_02_editor_initial.png")
            print("   ✅ Editor carregado")

            # ETAPA 3: Enviar mensagem no chat
            print("\n📍 ETAPA 3: Enviando mensagem ao chat...")
            chat_input = await page.query_selector('input[placeholder*="comando de edicao"]')

            if not chat_input:
                print("   ❌ FALHA: Input do chat não encontrado")
                await page.screenshot(path="/tmp/visual_test_ERROR_no_chat.png")
                return False

            await chat_input.fill("me mostra a introdução")
            await page.screenshot(path="/tmp/visual_test_03_message_typed.png")
            print("   📸 Screenshot: /tmp/visual_test_03_message_typed.png")

            await chat_input.press("Enter")
            print("   ✅ Mensagem enviada")

            # ETAPA 4: Aguardar resposta da IA
            print("\n📍 ETAPA 4: Aguardando resposta da IA...")
            print("   ⏳ Aguardando 15 segundos para processamento...")
            await page.wait_for_timeout(15000)

            # Screenshot após resposta
            await page.screenshot(path="/tmp/visual_test_04_ai_response.png")
            print("   📸 Screenshot: /tmp/visual_test_04_ai_response.png")
            print("   ✅ IA respondeu")

            # ETAPA 5: Verificar Preview Mode
            print("\n📍 ETAPA 5: Analisando Preview Mode...")

            preview_data = await page.evaluate("""
                () => {
                    // Procurar badge "Preview"
                    const previewBadge = Array.from(document.querySelectorAll('*')).find(el =>
                        el.textContent && el.textContent.trim() === 'Preview' &&
                        (el.className.includes('violet') || el.className.includes('badge'))
                    );

                    // Procurar segmentos dimmed (esmaecidos)
                    const dimmedSegments = document.querySelectorAll('[class*="opacity-30"], [class*="opacity-40"]');

                    // Procurar segmentos focused (destacados)
                    const focusedSegments = document.querySelectorAll('[class*="ring-violet"], [class*="border-violet"]');

                    // Verificar timeline positioning
                    const timelineHasTransform = Array.from(document.querySelectorAll('div')).some(el =>
                        el.style.transform && el.style.transform.includes('translate')
                    );

                    return {
                        previewBadgeFound: previewBadge !== null && previewBadge !== undefined,
                        dimmedCount: dimmedSegments.length,
                        focusedCount: focusedSegments.length,
                        timelineScrolled: timelineHasTransform,
                    };
                }
            """)

            print(f"   📊 Preview Badge encontrado: {preview_data['previewBadgeFound']}")
            print(f"   📊 Segmentos dimmed (esmaecidos): {preview_data['dimmedCount']}")
            print(f"   📊 Segmentos focused (destacados): {preview_data['focusedCount']}")
            print(f"   📊 Timeline com scroll/transform: {preview_data['timelineScrolled']}")

            preview_mode_ok = (
                preview_data['previewBadgeFound'] and
                preview_data['dimmedCount'] > 0 and
                preview_data['focusedCount'] > 0
            )

            if preview_mode_ok:
                print("   ✅ Preview Mode FUNCIONANDO")
            else:
                print("   ⚠️  Preview Mode com problemas")

            # Screenshot dos elementos de preview
            await page.screenshot(path="/tmp/visual_test_05_preview_mode.png")
            print("   📸 Screenshot: /tmp/visual_test_05_preview_mode.png")

            # ETAPA 6: Verificar e testar botão de Loop
            print("\n📍 ETAPA 6: Testando botão de Loop...")

            loop_button_data = await page.evaluate("""
                () => {
                    // Procurar botão com ícone Repeat
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const loopButton = buttons.find(btn => {
                        const title = btn.getAttribute('title');
                        const svg = btn.querySelector('svg');

                        // Verificar por título ou se está próximo ao preview badge
                        return (title && title.toLowerCase().includes('loop')) ||
                               (title && title.toLowerCase().includes('repetir')) ||
                               (svg && btn.closest('[class*="violet"]'));
                    });

                    if (!loopButton) return { found: false };

                    const rect = loopButton.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(loopButton);

                    return {
                        found: true,
                        visible: rect.width > 0 && rect.height > 0,
                        backgroundColor: computedStyle.backgroundColor,
                        color: computedStyle.color,
                        title: loopButton.getAttribute('title'),
                        x: rect.x,
                        y: rect.y,
                    };
                }
            """)

            if loop_button_data['found']:
                print(f"   ✅ Botão de Loop ENCONTRADO")
                print(f"      Visível: {loop_button_data['visible']}")
                print(f"      Título: {loop_button_data['title']}")
                print(f"      Posição: ({loop_button_data['x']:.0f}, {loop_button_data['y']:.0f})")

                # Clicar no botão de loop
                print("   🖱️  Clicando no botão de loop...")
                loop_clicked = await page.evaluate("""
                    () => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        const loopButton = buttons.find(btn => {
                            const title = btn.getAttribute('title');
                            return title && (title.toLowerCase().includes('loop') || title.toLowerCase().includes('repetir'));
                        });

                        if (loopButton) {
                            loopButton.click();
                            return true;
                        }
                        return false;
                    }
                """)

                if loop_clicked:
                    print("   ✅ Loop button clicado")
                    await page.wait_for_timeout(1000)

                    # Verificar estado após clicar
                    loop_state_after = await page.evaluate("""
                        () => {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const loopButton = buttons.find(btn => {
                                const title = btn.getAttribute('title');
                                return title && (title.toLowerCase().includes('loop') || title.toLowerCase().includes('repetir'));
                            });

                            if (!loopButton) return {};

                            const computedStyle = window.getComputedStyle(loopButton);
                            const hasAnimation = Array.from(loopButton.querySelectorAll('svg')).some(svg =>
                                svg.className.baseVal && svg.className.baseVal.includes('pulse')
                            );

                            return {
                                backgroundColor: computedStyle.backgroundColor,
                                title: loopButton.getAttribute('title'),
                                hasAnimation: hasAnimation,
                            };
                        }
                    """)

                    print(f"      Estado após click: {loop_state_after.get('title', 'N/A')}")
                    print(f"      Animação pulse: {loop_state_after.get('hasAnimation', False)}")

                    await page.screenshot(path="/tmp/visual_test_06_loop_active.png")
                    print("   📸 Screenshot: /tmp/visual_test_06_loop_active.png")
                else:
                    print("   ⚠️  Não conseguiu clicar no botão")
            else:
                print("   ❌ Botão de Loop NÃO encontrado")
                await page.screenshot(path="/tmp/visual_test_ERROR_no_loop_button.png")

            # ETAPA 7: Screenshot final panorâmico
            print("\n📍 ETAPA 7: Capturando screenshot final...")
            await page.screenshot(path="/tmp/visual_test_07_final_state.png", full_page=True)
            print("   📸 Screenshot: /tmp/visual_test_07_final_state.png (página completa)")

            # ANÁLISE FINAL
            print("\n" + "=" * 90)
            print("📊 ANÁLISE FINAL DOS RESULTADOS")
            print("=" * 90)

            success_criteria = {
                "Preview Badge": preview_data['previewBadgeFound'],
                "Segmentos Dimmed": preview_data['dimmedCount'] > 0,
                "Segmentos Focused": preview_data['focusedCount'] > 0,
                "Botão Loop": loop_button_data['found'],
            }

            all_passed = all(success_criteria.values())

            for criterion, passed in success_criteria.items():
                status = "✅" if passed else "❌"
                print(f"{status} {criterion}")

            print("=" * 90)

            if all_passed:
                print("✅ TESTE PASSOU - Todas as funcionalidades visuais operacionais!")
                print("\n📸 Screenshots capturados:")
                print("   - /tmp/visual_test_01_login.png")
                print("   - /tmp/visual_test_02_editor_initial.png")
                print("   - /tmp/visual_test_03_message_typed.png")
                print("   - /tmp/visual_test_04_ai_response.png")
                print("   - /tmp/visual_test_05_preview_mode.png")
                print("   - /tmp/visual_test_06_loop_active.png")
                print("   - /tmp/visual_test_07_final_state.png")
                return True
            else:
                print("⚠️  TESTE COM AVISOS - Algumas funcionalidades visuais não confirmadas")
                return False

        except Exception as e:
            print(f"\n❌ ERRO DURANTE TESTE: {e}")
            import traceback
            traceback.print_exc()
            await page.screenshot(path="/tmp/visual_test_ERROR.png")
            print("📸 Screenshot de erro: /tmp/visual_test_ERROR.png")
            return False
        finally:
            await browser.close()


if __name__ == "__main__":
    print("""
    ╔════════════════════════════════════════════════════════════════════════════════╗
    ║                   TESTE VISUAL COMPLETO - PLAYWRIGHT                           ║
    ║                                                                                ║
    ║  Este teste captura screenshots em cada etapa para validação visual:          ║
    ║  • Login e acesso ao editor                                                   ║
    ║  • Envio de mensagem ao chat                                                  ║
    ║  • Resposta da IA e ativação do preview mode                                  ║
    ║  • Verificação de elementos visuais (badges, dimming, focus)                  ║
    ║  • Detecção e teste do botão de loop                                          ║
    ║  • Análise do estado final com animações                                      ║
    ║                                                                                ║
    ║  Modelo: Análise visual via DOM inspection + Screenshots                      ║
    ║                                                                                ║
    ╚════════════════════════════════════════════════════════════════════════════════╝
    """)

    result = asyncio.run(test_preview_loop_visual())
    sys.exit(0 if result else 1)
