"""WeChat desktop message automation via AppleScript + pyautogui."""

import time

import pyautogui

import scripts.automate.utils as _utils
from scripts.automate.utils import clipboard_paste, log_action, with_timeout


def _activate_wechat() -> None:
    """Bring WeChat to front. Raises RuntimeError if not running."""
    _utils.run_applescript('tell application "WeChat" to activate')
    time.sleep(0.5)


def _do_send(contact: str, message: str) -> dict:
    """Execute the actual send sequence via keyboard automation."""
    pyautogui.hotkey("command", "f")
    time.sleep(0.3)
    clipboard_paste(contact)
    time.sleep(0.5)
    pyautogui.press("enter")
    time.sleep(0.3)
    clipboard_paste(message)
    time.sleep(0.2)
    pyautogui.press("enter")
    log_action("wechat", "send_message", f"To: {contact} | Msg: {message}")
    return {"success": True, "action": "send_message", "detail": f"Sent to {contact}"}


def send_message(contact: str, message: str, confirm: bool = True) -> dict:
    if confirm:
        print(f"即将发送微信消息:\n  收件人: {contact}\n  内容: {message}")
        resp = input("确认发送? (y/n): ").strip().lower()
        if resp != "y":
            return {"success": False, "action": "send_message", "detail": "Cancelled by user"}
    try:
        _activate_wechat()
    except RuntimeError as e:
        return {"success": False, "action": "send_message", "detail": f"WeChat 未运行: {e}"}
    try:
        return with_timeout(lambda: _do_send(contact, message), timeout=30)
    except TimeoutError:
        return {"success": False, "action": "send_message", "detail": "Operation timed out (30s)"}
    except Exception as e:
        return {"success": False, "action": "send_message", "detail": f"Send failed: {e}"}
