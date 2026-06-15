"""R2 final E2E test - play, export, wait for natural finish."""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright
import os

URL = "http://localhost:5175"
WAV_PATH = "C:/Users/白东鑫/work01/SoloCoder/5532-react-music/tmp/test_short.wav"

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
downloads = []

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-ui-for-media-stream',
        ]
    )
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    page.on("console", lambda m: console_logs.append(f"[{m.type}] {m.text}"))
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    page.on("download", lambda d: downloads.append(d))

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

    # Get state
    state_before = page.evaluate("""() => {
        const all = document.body.innerText;
        return {
            hasCanvas: document.querySelectorAll('canvas').length,
            hasPlaying: all.includes('暂停') || all.includes('Play'),
            bodySnippet: all.substring(0, 500)
        };
    }""")
    print(f"State: {state_before}")

    # Start export WITHOUT playing first (test cancel flow)
    print("\n=== Click export, then cancel ===")
    page.locator("text=导出").last.click()
    page.wait_for_timeout(1000)

    is_exporting = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
    print(f"Exporting overlay shown: {is_exporting}")

    # Cancel it
    page.locator("text=取消导出").click()
    page.wait_for_timeout(1000)

    is_exporting_after = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
    print(f"Exporting overlay after cancel: {is_exporting_after}")

    # Test natural completion: play audio, start export, wait for audio end
    print("\n=== Test natural export completion ===")
    # Start playback
    page.keyboard.press("Space")
    page.wait_for_timeout(500)

    play_state = page.evaluate("() => document.body.innerText.includes('暂停')")
    print(f"Play button text changed (showing 暂停): {play_state}")

    # Click export
    page.locator("text=导出").last.click()
    page.wait_for_timeout(500)

    # Audio is 2s, wait 5s to let it finish
    page.wait_for_timeout(5000)

    is_exporting_natural = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
    print(f"Exporting overlay after audio end (5s wait): {is_exporting_natural}")

    if is_exporting_natural:
        print("BUG 3 PARTIAL: Natural completion doesn't auto-stop")
        # Click cancel to clean up
        page.locator("text=取消导出").click()
        page.wait_for_timeout(1000)
        final_state = page.evaluate("() => document.body.innerText.includes('正在录制视频')")
        print(f"After final cancel: {final_state}")

    print(f"\nDownloads captured: {len(downloads)}")
    for d in downloads:
        try:
            path = d.path()
            if path and os.path.exists(path):
                size = os.path.getsize(path)
                print(f"  {d.suggested_filename}: {size} bytes")
                # Check for audio track in webm
                with open(path, 'rb') as f:
                    head = f.read(200)
                has_audio_codec = b'opus' in head or b'vorbis' in head
                has_video_codec = b'vp8' in head or b'vp9' in head
                print(f"  Has audio codec (opus/vorbis): {has_audio_codec}")
                print(f"  Has video codec (vp8/vp9): {has_video_codec}")
        except Exception as e:
            print(f"  Error reading download: {e}")

    print("\n=== Console errors ===")
    error_logs = [l for l in console_logs if "[error]" in l.lower()]
    print(f"Total: {len(error_logs)}")
    for l in error_logs[:5]:
        print(f"  {l}")

    print("\n=== Page errors ===")
    for e in page_errors:
        print(f"  {e}")

    browser.close()

print("\n=== DONE ===")