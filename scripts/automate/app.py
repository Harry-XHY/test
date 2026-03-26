"""Generic macOS app control via AppleScript + pyautogui."""

import pyautogui

from scripts.automate.utils import run_applescript, clipboard_paste, log_action


def activate(app_name: str) -> dict:
    """Activate (bring to front) a macOS application."""
    try:
        run_applescript(f'tell application "{app_name}" to activate')
        log_action("app", "activate", app_name)
        return {"success": True, "action": "activate", "detail": f"Activated {app_name}"}
    except RuntimeError as e:
        return {"success": False, "action": "activate", "detail": str(e)}


def click(x: int, y: int) -> dict:
    """Click at screen coordinates."""
    pyautogui.click(x, y)
    log_action("app", "click", f"({x}, {y})")
    return {"success": True, "action": "click", "detail": f"Clicked ({x}, {y})"}


def type_text(text: str) -> dict:
    """Type text using clipboard paste (supports CJK)."""
    clipboard_paste(text)
    log_action("app", "type_text", text)
    return {"success": True, "action": "type_text", "detail": f"Typed: {text}"}


def hotkey(*keys: str) -> dict:
    """Press a keyboard shortcut."""
    pyautogui.hotkey(*keys)
    log_action("app", "hotkey", "+".join(keys))
    return {"success": True, "action": "hotkey", "detail": f"Pressed {'+'.join(keys)}"}


def screenshot_region(x: int, y: int, w: int, h: int, path: str) -> dict:
    """Capture a screen region."""
    img = pyautogui.screenshot(region=(x, y, w, h))
    img.save(path)
    log_action("app", "screenshot_region", f"({x},{y},{w},{h}) → {path}")
    return {"success": True, "action": "screenshot_region", "detail": path}
