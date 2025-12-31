#!/usr/bin/env python3
"""
Test all new features in the editor interface
Uses Browser Use with Gemini for visual analysis
"""

import asyncio
import os
from datetime import datetime
from langchain_openai import ChatOpenAI
from browser_use import Agent, Browser, BrowserConfig

# Configuration
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
BASE_URL = "http://localhost:3000"
SCREENSHOT_DIR = "/tmp/aeropod_test"

# Create screenshot directory
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

async def test_all_features():
    """Test all new features in the editor"""

    print("=" * 60)
    print("AEROPOD - Testing All New Features")
    print("=" * 60)

    # Configure LLM
    llm = ChatOpenAI(
        model="google/gemini-2.0-flash-001",
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AeroPod Test"
        }
    )

    # Configure browser
    browser = Browser(
        config=BrowserConfig(
            headless=True,
            disable_security=True,
        )
    )

    task = """
    You are testing the AeroPod podcast editor interface. Follow these steps carefully and take screenshots at each step:

    1. FIRST - Go to http://localhost:3000 and take a screenshot

    2. LOGIN - Click on any login/signin button if visible. Use credentials:
       - Email: demo@aeropod.com
       - Password: demo
       Take a screenshot after login

    3. DASHBOARD - You should see a dashboard with projects. Take a screenshot.
       Click on any project that shows "Pronto" or "Completed" status to open the editor.

    4. EDITOR - You should now see the editor with:
       - A timeline at the top
       - A sidebar on the right with tabs
       Take a screenshot of the full editor view

    5. CHECK SIDEBAR TABS - Look at the right sidebar. You should see these tabs:
       - Chat
       - Transcricao (or Transcript)
       - Fillers
       - Audio
       - Clips
       - Notes
       Take a screenshot showing the tabs

    6. TEST FILLERS TAB - Click on the "Fillers" tab
       - You should see a panel for filler word detection
       - Look for stats or a list of detected filler words
       Take a screenshot of the Fillers panel

    7. TEST AUDIO TAB - Click on the "Audio" tab
       - You should see audio enhancement options
       - Look for presets like "Podcast Standard", sliders, switches
       Take a screenshot of the Audio panel

    8. TEST CLIPS TAB - Click on the "Clips" tab
       - You should see social clips generator
       - Look for format options (9:16, 1:1, 16:9)
       - Look for caption toggle
       Take a screenshot of the Clips panel

    9. TEST NOTES TAB - Click on the "Notes" tab
       - You should see show notes panel
       - Look for tabs like "Resumo", "Capitulos", "Pontos"
       Take a screenshot of the Notes panel

    10. TEST TRANSCRICAO TAB - Click on the "Transcricao" tab
        - The main area should show the transcript editor
        - Look for a search bar and segments with text
        Take a screenshot of the Transcript view

    After each step, report:
    - What you see on the screen
    - Any errors or missing elements
    - The screenshot file path

    IMPORTANT: Save all screenshots to /tmp/aeropod_test/ with descriptive names like:
    - 01_homepage.png
    - 02_login.png
    - 03_dashboard.png
    - 04_editor.png
    - 05_sidebar_tabs.png
    - 06_fillers_panel.png
    - 07_audio_panel.png
    - 08_clips_panel.png
    - 09_notes_panel.png
    - 10_transcript_panel.png
    """

    try:
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
        )

        result = await agent.run(max_steps=30)

        print("\n" + "=" * 60)
        print("TEST RESULTS")
        print("=" * 60)
        print(result)

        # List screenshots
        print("\n" + "=" * 60)
        print("SCREENSHOTS SAVED")
        print("=" * 60)
        for f in sorted(os.listdir(SCREENSHOT_DIR)):
            print(f"  - {SCREENSHOT_DIR}/{f}")

    except Exception as e:
        print(f"Error during test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_all_features())
