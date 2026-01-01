#!/usr/bin/env python3
"""
Test all new features in the editor interface using Playwright
"""

import asyncio
import os
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"
SCREENSHOT_DIR = "/tmp/aeropod_test"

os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def test_features():
    print("=" * 60)
    print("AEROPOD - Testing All New Features with Playwright")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        try:
            # 1. Go directly to login page
            print("\n[1] Loading login page...")
            await page.goto(f"{BASE_URL}/login", wait_until="networkidle")
            await page.screenshot(path=f"{SCREENSHOT_DIR}/01_login_page.png", full_page=True)
            print(f"    Screenshot: {SCREENSHOT_DIR}/01_login_page.png")

            # 2. Click "Acessar Demo" button
            print("\n[2] Clicking 'Acessar Demo'...")
            demo_btn = page.locator("text=Acessar Demo")
            if await demo_btn.count() > 0:
                await demo_btn.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)
                print(f"    Clicked demo button")
            else:
                print("    Demo button not found, trying login...")
                await page.locator('input[type="email"]').first.fill("demo@aeropod.com")
                await page.locator('input[type="password"]').first.fill("demo")
                await page.locator('button[type="submit"]').first.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(2)

            await page.screenshot(path=f"{SCREENSHOT_DIR}/02_after_demo.png", full_page=True)
            print(f"    Screenshot: {SCREENSHOT_DIR}/02_after_demo.png")
            print(f"    Current URL: {page.url}")

            # 3. Check if we're on dashboard
            print("\n[3] Checking dashboard...")
            if "/dashboard" not in page.url:
                await page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
                await asyncio.sleep(1)

            await page.screenshot(path=f"{SCREENSHOT_DIR}/03_dashboard.png", full_page=True)
            print(f"    Screenshot: {SCREENSHOT_DIR}/03_dashboard.png")

            # 4. Find and click on a project
            print("\n[4] Looking for projects...")

            # Click on a completed project from the dashboard
            print("    Looking for completed projects...")
            completed_project = page.locator("text=Completed").first
            if await completed_project.count() > 0:
                # Click on the parent card of the completed project
                await completed_project.click()
                await page.wait_for_load_state("networkidle")
                await asyncio.sleep(3)
                print("    Clicked on completed project")
            else:
                print("    No completed projects found, trying first project card...")
                project_card = page.locator("[class*='cursor-pointer']").first
                if await project_card.count() > 0:
                    await project_card.click()
                    await page.wait_for_load_state("networkidle")
                    await asyncio.sleep(3)

            await page.screenshot(path=f"{SCREENSHOT_DIR}/04_after_click.png", full_page=True)
            print(f"    Screenshot: {SCREENSHOT_DIR}/04_after_click.png")
            print(f"    Current URL: {page.url}")

            # 5. Test sidebar tabs if we're in editor
            if "/editor/" in page.url:
                print("\n[5] IN EDITOR! Waiting for page to load...")

                # Wait for the loading spinner to disappear
                await page.wait_for_selector('text=Carregando', state='hidden', timeout=30000)
                await asyncio.sleep(3)  # Extra wait for UI to render

                await page.screenshot(path=f"{SCREENSHOT_DIR}/05_editor_full.png", full_page=True)
                print(f"    Screenshot: {SCREENSHOT_DIR}/05_editor_full.png")

                tabs_to_test = [
                    ("Chat", "06_chat"),
                    ("Transcricao", "07_transcricao"),
                    ("Fillers", "08_fillers"),
                    ("Audio", "09_audio"),
                    ("Clips", "10_clips"),
                    ("Notes", "11_notes"),
                ]

                # Special test for transcript editing
                print("\n    Testing transcript text editing...")
                transcript_tab = page.locator("button:has-text('Transcricao')").first
                if await transcript_tab.count() > 0:
                    await transcript_tab.click()
                    await page.wait_for_timeout(1000)

                    # Take initial screenshot
                    await page.screenshot(path=f"{SCREENSHOT_DIR}/12_transcript_view.png", full_page=True)
                    print(f"    OK - View mode: {SCREENSHOT_DIR}/12_transcript_view.png")

                    # Try to double-click on a segment to enter edit mode
                    segment_div = page.locator("[id^='segment-']").first
                    if await segment_div.count() > 0:
                        await segment_div.dblclick()
                        await page.wait_for_timeout(500)
                        await page.screenshot(path=f"{SCREENSHOT_DIR}/13_edit_mode.png", full_page=True)
                        print(f"    OK - Edit mode (double-click): {SCREENSHOT_DIR}/13_edit_mode.png")

                        # Check if textarea appeared
                        textarea = page.locator("textarea").first
                        if await textarea.count() > 0:
                            print(f"    OK - Textarea found for text editing")

                for tab_name, screenshot_name in tabs_to_test:
                    print(f"\n    Testing {tab_name} tab...")
                    tab_btn = page.locator(f"button:has-text('{tab_name}')").first

                    if await tab_btn.count() > 0:
                        await tab_btn.click()
                        await page.wait_for_timeout(800)
                        await page.screenshot(path=f"{SCREENSHOT_DIR}/{screenshot_name}.png", full_page=True)
                        print(f"    OK - Screenshot: {SCREENSHOT_DIR}/{screenshot_name}.png")
                    else:
                        print(f"    ERROR - Tab '{tab_name}' NOT FOUND")
            else:
                print("\n[5] Not in editor yet. Checking page content...")

                # Check page content for debugging
                content = await page.content()
                if "Processando" in content:
                    print("    Project is still processing")
                elif "Pronto" in content:
                    print("    Found 'Pronto' text - project available")

                await page.screenshot(path=f"{SCREENSHOT_DIR}/05_not_editor.png", full_page=True)

            # Final summary
            print("\n" + "=" * 60)
            print("TEST COMPLETE")
            print("=" * 60)
            print(f"Screenshots saved to: {SCREENSHOT_DIR}")
            for f in sorted(os.listdir(SCREENSHOT_DIR)):
                if f.endswith('.png'):
                    print(f"  - {f}")

        except Exception as e:
            print(f"\nError: {e}")
            await page.screenshot(path=f"{SCREENSHOT_DIR}/error.png", full_page=True)
            print(f"Error screenshot saved: {SCREENSHOT_DIR}/error.png")
            import traceback
            traceback.print_exc()

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_features())
