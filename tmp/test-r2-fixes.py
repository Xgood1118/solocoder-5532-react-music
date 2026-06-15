"""R2 verification for 5532-react-music."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright
import os
import time

URL = "http://localhost:5175"

console_logs = []
page_errors = []

# Generate small wav file in /tmp
WAV_PATH = "C:/Users/白东鑫/work01/SoloCoder/5532-react-music/tmp/test.wav"

def make_wav(path, duration_sec=3, freq=440, sample_rate=22050):
    """Generate a simple sine wave WAV."""
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
    print(f"Generated test.wav: {os.path.getsize(WAV_PATH)} bytes")
WAV2_PATH = WAV_PATH.replace(".wav", "_2.wav")
if not os.path.exists(WAV2_PATH):
    make_wav(WAV2_PATH, duration_sec=2, freq=880)
    print(f"Generated test_2.wav: {os.path.getsize(WAV2_PATH)} bytes")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        '--autoplay-policy=no-user-gesture-required',
    ])
    context = browser.new_context()
    page = context.new_page()

    page.on("console", lambda m: console_logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    print("=== STEP 1: Navigate ===")
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    print("=== STEP 2: Click start ===")
    page.wait_for_selector("text=点击开始", timeout=5000)
    page.click("text=点击开始")
    page.wait_for_timeout(1500)
    page.screenshot(path="screenshot_R2_after_start.png")

    # Set the hidden audio file input to upload 2 files
    print("=== STEP 3: Upload 2 audio files via hidden input ===")
    file_input = page.locator('input[type="file"]').first
    file_input.set_input_files([WAV_PATH, WAV2_PATH])
    page.wait_for_timeout(3000)
    page.screenshot(path="screenshot_R2_loaded_tracks.png")

    # Check if tracks are loaded
    tracks_count = page.evaluate("""() => {
        const items = document.querySelectorAll('[draggable], .track-item, li');
        return items.length;
    }""")
    print(f"DOM track-like items: {tracks_count}")

    # Get current track name from bottom bar
    bottom_text = page.locator(".bottom-bar, [class*='bottom'], footer").first.inner_text() if page.locator(".bottom-bar, [class*='bottom'], footer").count() > 0 else ""
    print(f"Bottom bar text: {bottom_text[:200]}")

    # Test bug 1: track switching
    print("\n=== STEP 4: Test bug 1 fix (Ctrl+Right to switch tracks) ===")
    # First click on the visualizer to ensure focus
    page.locator('canvas').first.click()
    page.wait_for_timeout(500)

    # Get current track name before
    def get_current_track():
        return page.evaluate("""() => {
            const all = document.body.innerText;
            // Look for track name in bottom bar
            const m = all.match(/([^\\s]+\\.wav)/);
            return m ? m[1] : '';
        }""")

    t1 = get_current_track()
    print(f"Initial track: {t1}")

    # Press Ctrl+Right 3 times to switch (Ctrl+Arrow)
    print("Pressing Ctrl+ArrowRight 3 times...")
    for i in range(3):
        page.keyboard.press("Control+ArrowRight")
        page.wait_for_timeout(800)
        cur = get_current_track()
        print(f"  After Ctrl+Right #{i+1}: {cur}")

    # Test ArrowUp/ArrowDown
    print("\nPressing ArrowDown 2 times...")
    for i in range(2):
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(800)
        cur = get_current_track()
        print(f"  After ArrowDown #{i+1}: {cur}")

    # Test Enter
    print("\nPressing Enter (next track?)")
    page.keyboard.press("Enter")
    page.wait_for_timeout(800)
    cur = get_current_track()
    print(f"  After Enter: {cur}")

    # Test ArrowRight/ArrowLeft
    print("\nPressing ArrowRight (seek forward 5s?)")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(500)
    print("Pressing ArrowLeft (seek backward 5s?)")
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(500)

    # Test bug 3: export state cleanup
    print("\n=== STEP 5: Test bug 3 fix (export state cleanup) ===")
    # Find export button
    page.screenshot(path="screenshot_R2_pre_export.png")

    # Look for export-related controls
    page_text = page.evaluate("document.body.innerText")
    has_export_btn = "导出" in page_text
    print(f"Has 导出 button: {has_export_btn}")

    if has_export_btn:
        export_btn = page.locator("text=导出").last
        export_btn.click()
        page.wait_for_timeout(1500)
        page.screenshot(path="screenshot_R2_during_export.png")

        # Check for "正在录制视频" text
        is_recording = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
        print(f"'正在录制视频' shown during export: {is_recording}")

        # Click cancel to test state reset
        cancel_count = page.locator("text=取消").count()
        print(f"Cancel buttons: {cancel_count}")
        if cancel_count > 0:
            page.locator("text=取消").first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="screenshot_R2_after_cancel.png")
            is_recording_after = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
            print(f"'正在录制视频' after cancel: {is_recording_after}")
            if is_recording_after:
                print("BUG 3 NOT FIXED: '正在录制视频' still showing after cancel")
            else:
                print("BUG 3 OK: '正在录制视频' cleared after cancel")
        else:
            # Wait for natural finish (mock a short audio)
            print("Waiting for natural export completion...")
            page.wait_for_timeout(20000)
            is_recording_after = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
            print(f"'正在录制视频' after natural finish: {is_recording_after}")

    # Test bug 2 indirectly: WebM audio track
    # Hard to test in headless; just check exporter.js state
    print("\n=== STEP 6: Verify exporter code uses audio stream ===")
    # Read the exporter.js content
    exporter_content = open("src/utils/exporter.js").read()
    uses_stream = "audioStream" in exporter_content and "audioEl" not in exporter_content.replace("audioEl", "")  # crude check
    audio_manager_uses_stream = "streamDest" in open("src/utils/audio.js").read()
    print(f"exporter.js uses audioStream param: {'audioStream' in exporter_content}")
    print(f"audio.js creates MediaStreamDestination: {audio_manager_uses_stream}")

    # Final state
    print("\n=== Page errors during session ===")
    if page_errors:
        for e in page_errors:
            print(f"  PAGE ERROR: {e}")
    else:
        print("  None")

    print("\n=== Console errors during session ===")
    error_logs = [l for l in console_logs if "[error]" in l.lower()]
    print(f"Total error logs: {len(error_logs)}")
    for l in error_logs[:10]:
        print(f"  {l}")

    browser.close()

print("\n=== DONE ===")