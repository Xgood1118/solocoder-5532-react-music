"""R2 verification for 5532-react-music - natural completion test."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright
import os

URL = "http://localhost:5175"

# Use a 2-second wav so the export can finish naturally with quick settings
WAV_PATH = "C:/Users/白东鑫/work01/SoloCoder/5532-react-music/tmp/test_natural.wav"

def make_wav(path, duration_sec=2, freq=440, sample_rate=22050):
    import struct
    import math
    import wave
    n_frames = int(duration_sec * sample_rate)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for i in range(n_frames):
            sample = int(32767 * 0.5 * math.sin(2 * math.pi * freq * i / sample_rate))
            w.writeframesraw(struct.pack('<h', sample))

if not os.path.exists(WAV_PATH):
    make_wav(WAV_PATH)

console_logs = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    page.on("console", lambda m: console_logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.click("text=点击开始")
    page.wait_for_timeout(1500)

    file_input = page.locator('input[type="file"]').first
    file_input.set_input_files([WAV_PATH])
    page.wait_for_timeout(3000)

    # Click on canvas to focus
    page.locator('canvas').first.click()
    page.wait_for_timeout(500)

    # Start the audio playback so export has audio content
    print("Pressing Space to start playback...")
    page.keyboard.press("Space")
    page.wait_for_timeout(500)

    # Find export button
    export_btn = page.locator("text=导出").last
    print("Clicking export...")
    export_btn.click()
    page.wait_for_timeout(1000)

    is_recording = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
    print(f"'正在录制视频' visible during export: {is_recording}")

    # Wait for natural completion (audio is 2s long)
    print("Waiting for natural completion (audio is 2s long)...")
    page.wait_for_timeout(8000)
    page.screenshot(path="screenshot_R2_natural_done.png")

    is_recording_after = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
    print(f"'正在录制视频' after natural completion: {is_recording_after}")

    if is_recording_after:
        print("BUG 3 NOT FIXED ON NATURAL COMPLETION")
    else:
        print("BUG 3 OK: '正在录制视频' cleared on natural completion")

    # Check progress bar / percent display
    page_text = page.evaluate("() => document.body.innerText")
    has_progress = "%" in page_text or "进度" in page_text
    print(f"Progress text contains %: {'%' in page_text}, contains 进度: {'进度' in page_text}")

    # Verify download
    downloads = []
    def handle_download(d):
        downloads.append(d)

    page.on("download", handle_download)
    # Wait again to see if download fired
    page.wait_for_timeout(2000)

    print(f"Downloads captured: {len(downloads)}")
    for d in downloads:
        path = d.path()
        if path and os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  Download: {d.suggested_filename}, size={size} bytes")

    print("\n=== Page errors ===")
    for e in page_errors[:5]:
        print(f"  {e}")

    error_logs = [l for l in console_logs if "[error]" in l.lower()]
    print(f"\n=== Console errors: {len(error_logs)} ===")
    for l in error_logs[:5]:
        print(f"  {l}")

    browser.close()

print("\n=== DONE ===")