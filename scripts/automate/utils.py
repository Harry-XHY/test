"""Shared utilities for mac-automate: clipboard, logging, screenshots."""

import os
import time
from datetime import datetime
from pathlib import Path

import pyautogui
import pyperclip

# Enable pyautogui failsafe (move mouse to top-left corner to abort)
pyautogui.FAILSAFE = True

LOGS_DIR = str(Path(__file__).parent / "logs")


def ensure_logs_dir(logs_dir: str = LOGS_DIR) -> None:
    """Ensure the logs directory exists."""
    os.makedirs(logs_dir, exist_ok=True)


def log_action(module: str, action: str, detail: str, logs_dir: str = LOGS_DIR) -> None:
    """Append an operation log entry to today's log file."""
    ensure_logs_dir(logs_dir)
    log_file = os.path.join(logs_dir, f"{datetime.now().date()}.log")
    timestamp = datetime.now().isoformat()
    entry = f"[{timestamp}] [{module}] [{action}] {detail}\n"
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(entry)


def clipboard_paste(text: str) -> None:
    """Save clipboard → copy text → Cmd+V paste → restore clipboard."""
    original = pyperclip.paste()
    try:
        pyperclip.copy(text)
        pyautogui.hotkey("command", "v")
        time.sleep(0.1)
    finally:
        pyperclip.copy(original)


def take_screenshot(path: str = None) -> str:
    """Take a full screenshot, save to path. Returns the saved path."""
    if path is None:
        ensure_logs_dir()
        path = os.path.join(LOGS_DIR, f"screenshot_{int(time.time())}.png")
    img = pyautogui.screenshot()
    img.save(path)
    return path


def wait_for_image(image_path: str, timeout: int = 10):
    """Wait for an image to appear on screen. Returns location tuple or None."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        location = pyautogui.locateOnScreen(image_path, confidence=0.8)
        if location is not None:
            return location
        time.sleep(0.5)
    return None


def run_applescript(script: str) -> str:
    """Execute an AppleScript and return stdout."""
    import subprocess
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise RuntimeError(f"AppleScript failed: {result.stderr.strip()}")
    return result.stdout.strip()


def with_timeout(fn, timeout: int = 30):
    """Run a callable with a timeout. Raises TimeoutError if exceeded."""
    import threading
    result = [None]
    error = [None]

    def target():
        try:
            result[0] = fn()
        except Exception as e:
            error[0] = e

    thread = threading.Thread(target=target)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise TimeoutError(f"Operation timed out after {timeout}s")
    if error[0]:
        raise error[0]
    return result[0]
