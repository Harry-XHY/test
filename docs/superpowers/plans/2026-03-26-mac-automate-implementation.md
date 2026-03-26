# Mac Automate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python GUI automation toolkit integrated into Claude Code, enabling natural language control of WeChat, browsers, and macOS apps.

**Architecture:** Modular Python scripts under `scripts/automate/` with a regex-based router as the unified entry point. Each automation domain (wechat, browser, app) is a standalone module. Claude Code integration via slash commands and CLAUDE.md intent routing.

**Tech Stack:** Python 3.9+, pyautogui, pyperclip, pyobjc-framework-Quartz, Playwright, AppleScript

**Spec:** `docs/superpowers/specs/2026-03-26-mac-automate-design.md`

---

## File Structure

```
scripts/automate/
├── __init__.py            # Package marker
├── router.py              # CLI entry + intent parsing + module dispatch
├── wechat.py              # WeChat message automation
├── browser.py             # Playwright browser automation
├── app.py                 # Generic macOS app control
├── utils.py               # Shared utilities (clipboard, logging, screenshots)
├── contacts.json          # WeChat contact alias mapping
├── tests/
│   ├── __init__.py
│   ├── test_router.py     # Router parsing + dispatch tests
│   ├── test_utils.py      # Utility function tests
│   ├── test_wechat.py     # WeChat module tests (mocked)
│   ├── test_browser.py    # Browser module tests
│   └── test_app.py        # App module tests (mocked)
└── logs/                  # Runtime operation logs (gitignored)

skills/
├── wechat/SKILL.md        # /wechat slash command
├── browser/SKILL.md       # /browser slash command
└── app/SKILL.md           # /app slash command
```

---

### Task 1: Project Setup & Dependencies

**Files:**
- Create: `pyproject.toml`
- Create: `scripts/automate/__init__.py`
- Create: `scripts/automate/tests/__init__.py`
- Create: `.gitignore` (append)

- [ ] **Step 1: Create pyproject.toml with dependencies**

```toml
[project]
name = "mac-automate"
version = "0.1.0"
requires-python = ">=3.9"
dependencies = [
    "pyautogui>=0.9.54",
    "pyperclip>=1.8.2",
    "pyobjc-framework-Quartz>=10.0",
    "playwright>=1.58.0",
    "pillow>=11.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
]
```

- [ ] **Step 2: Create package init files**

```bash
mkdir -p scripts/automate/tests scripts/automate/logs
touch scripts/automate/__init__.py scripts/automate/tests/__init__.py
```

- [ ] **Step 3: Add logs dir to .gitignore**

Append to `.gitignore`:
```
scripts/automate/logs/
```

- [ ] **Step 4: Install dependencies**

```bash
uv sync
uv sync --extra dev
```

Verify: `python -c "import pyautogui; import pyperclip; print('OK')"`

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml scripts/automate/__init__.py scripts/automate/tests/__init__.py .gitignore
git commit -m "chore: initialize mac-automate project structure and dependencies"
```

---

### Task 2: utils.py — Shared Utilities

**Files:**
- Create: `scripts/automate/utils.py`
- Create: `scripts/automate/tests/test_utils.py`

- [ ] **Step 1: Write failing tests for utils**

```python
# scripts/automate/tests/test_utils.py
import os
import json
from datetime import date
from unittest.mock import patch, MagicMock


def test_ensure_logs_dir_creates_directory(tmp_path):
    from scripts.automate.utils import ensure_logs_dir
    logs_dir = tmp_path / "logs"
    ensure_logs_dir(str(logs_dir))
    assert logs_dir.exists()


def test_ensure_logs_dir_idempotent(tmp_path):
    from scripts.automate.utils import ensure_logs_dir
    logs_dir = tmp_path / "logs"
    ensure_logs_dir(str(logs_dir))
    ensure_logs_dir(str(logs_dir))  # should not raise
    assert logs_dir.exists()


def test_log_action_writes_to_file(tmp_path):
    from scripts.automate.utils import log_action
    log_file = tmp_path / f"{date.today()}.log"
    log_action("wechat", "send_message", "sent to 张三", logs_dir=str(tmp_path))
    assert log_file.exists()
    content = log_file.read_text()
    assert "wechat" in content
    assert "send_message" in content
    assert "张三" in content


@patch("pyperclip.copy")
@patch("pyperclip.paste", return_value="original_clipboard")
@patch("pyautogui.hotkey")
def test_clipboard_paste_saves_and_restores(mock_hotkey, mock_paste, mock_copy):
    from scripts.automate.utils import clipboard_paste
    clipboard_paste("测试文本")
    # Should: save original → copy new text → paste → restore original
    assert mock_paste.call_count == 1
    calls = mock_copy.call_args_list
    assert calls[0].args[0] == "测试文本"
    assert calls[1].args[0] == "original_clipboard"
    mock_hotkey.assert_called_once_with("command", "v")


def test_take_screenshot_returns_path(tmp_path):
    from scripts.automate.utils import take_screenshot
    with patch("pyautogui.screenshot") as mock_ss:
        mock_img = MagicMock()
        mock_ss.return_value = mock_img
        path = take_screenshot(str(tmp_path / "test.png"))
        assert path == str(tmp_path / "test.png")
        mock_img.save.assert_called_once_with(str(tmp_path / "test.png"))


@patch("pyautogui.locateOnScreen", return_value=(100, 200, 50, 50))
def test_wait_for_image_found(mock_locate):
    from scripts.automate.utils import wait_for_image
    result = wait_for_image("test.png", timeout=5)
    assert result == (100, 200, 50, 50)


@patch("pyautogui.locateOnScreen", return_value=None)
def test_wait_for_image_timeout(mock_locate):
    from scripts.automate.utils import wait_for_image
    result = wait_for_image("test.png", timeout=1)
    assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest scripts/automate/tests/test_utils.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.automate.utils'`

- [ ] **Step 3: Implement utils.py**

```python
# scripts/automate/utils.py
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
    import time as _time
    deadline = _time.time() + timeout
    while _time.time() < deadline:
        location = pyautogui.locateOnScreen(image_path, confidence=0.8)
        if location is not None:
            return location
        _time.sleep(0.5)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest scripts/automate/tests/test_utils.py -v
```

Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/automate/utils.py scripts/automate/tests/test_utils.py
git commit -m "feat: add shared utilities (clipboard, logging, screenshots)"
```

---

### Task 3: router.py — Intent Parser & Dispatcher

**Files:**
- Create: `scripts/automate/router.py`
- Create: `scripts/automate/contacts.json`
- Create: `scripts/automate/tests/test_router.py`

- [ ] **Step 1: Create contacts.json**

```json
{
  "媳妇": "张三",
  "老板": "李四"
}
```

Note: User should edit this with real contact names. Keys are aliases, values are actual WeChat contact names.

- [ ] **Step 2: Write failing tests for router**

```python
# scripts/automate/tests/test_router.py
import json
import pytest
from unittest.mock import patch, MagicMock


def test_parse_wechat_send():
    from scripts.automate.router import parse_intent
    result = parse_intent("给媳妇发微信 你在干嘛")
    assert result["module"] == "wechat"
    assert result["action"] == "send_message"
    assert result["params"]["contact"] == "媳妇"
    assert result["params"]["message"] == "你在干嘛"


def test_parse_wechat_send_alt_format():
    from scripts.automate.router import parse_intent
    result = parse_intent("微信发给老板 明天开会")
    assert result["module"] == "wechat"
    assert result["params"]["contact"] == "老板"
    assert result["params"]["message"] == "明天开会"


def test_parse_browser_open():
    from scripts.automate.router import parse_intent
    result = parse_intent("打开网页 https://baidu.com")
    assert result["module"] == "browser"
    assert result["action"] == "open_url"
    assert "baidu.com" in result["params"]["url"]


def test_parse_browser_screenshot():
    from scripts.automate.router import parse_intent
    result = parse_intent("截图 https://example.com")
    assert result["module"] == "browser"
    assert result["action"] == "screenshot"


def test_parse_app_open():
    from scripts.automate.router import parse_intent
    result = parse_intent("打开 Finder")
    assert result["module"] == "app"
    assert result["action"] == "activate"
    assert result["params"]["app_name"] == "Finder"


def test_parse_unknown_returns_none():
    from scripts.automate.router import parse_intent
    result = parse_intent("今天天气怎么样")
    assert result is None


def test_wechat_priority_over_app():
    """'发微信' should match wechat, not app (even though it contains '打开')."""
    from scripts.automate.router import parse_intent
    result = parse_intent("给媳妇发微信 在吗")
    assert result["module"] == "wechat"


def test_contact_alias_resolution():
    from scripts.automate.router import resolve_contact
    with patch("builtins.open", MagicMock()):
        with patch("json.load", return_value={"媳妇": "张三"}):
            assert resolve_contact("媳妇") == "张三"


def test_contact_alias_passthrough():
    from scripts.automate.router import resolve_contact
    with patch("builtins.open", MagicMock()):
        with patch("json.load", return_value={"媳妇": "张三"}):
            assert resolve_contact("王五") == "王五"
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest scripts/automate/tests/test_router.py -v
```

Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement router.py**

```python
# scripts/automate/router.py
"""Unified CLI entry point: parse natural language → dispatch to modules."""

import asyncio
import json
import re
import sys
from pathlib import Path

CONTACTS_FILE = str(Path(__file__).parent / "contacts.json")

# --- Intent patterns (priority order, first match wins) ---

WECHAT_PATTERNS = [
    # "给XX发微信 消息" or "发微信给XX 消息"
    re.compile(r"给(.+?)发微信\s+(.+)", re.DOTALL),
    # "微信发给XX 消息"
    re.compile(r"微信发给(.+?)\s+(.+)", re.DOTALL),
    # "发微信 XX 消息" (fallback)
    re.compile(r"发微信\s+(.+?)\s+(.+)", re.DOTALL),
]

BROWSER_PATTERNS = [
    (re.compile(r"截图\s+(https?://\S+)"), "screenshot"),
    (re.compile(r"抓取\s+(https?://\S+)(?:\s+(.+))?"), "scrape"),
    (re.compile(r"填表\s+(https?://\S+)"), "fill_form"),
    (re.compile(r"执行脚本\s+(https?://\S+)\s+(.+)", re.DOTALL), "run_script"),
    (re.compile(r"(?:打开网页|访问)\s+(https?://\S+)"), "open_url"),
    (re.compile(r"(?:打开网页|访问)\s+(\S+)"), "open_url"),
]

APP_PATTERNS = [
    re.compile(r"(?:打开|启动|切换到)\s+(.+?)(?:\s+应用)?$"),
]


def resolve_contact(alias: str) -> str:
    """Resolve a contact alias to real name via contacts.json."""
    try:
        with open(CONTACTS_FILE, "r", encoding="utf-8") as f:
            contacts = json.load(f)
        return contacts.get(alias, alias)
    except (FileNotFoundError, json.JSONDecodeError):
        return alias


def parse_intent(text: str) -> dict | None:
    """Parse natural language into structured intent. Returns None if no match."""
    text = text.strip()

    # Priority 1: WeChat
    for pattern in WECHAT_PATTERNS:
        m = pattern.match(text)
        if m:
            return {
                "module": "wechat",
                "action": "send_message",
                "params": {
                    "contact": m.group(1).strip(),
                    "message": m.group(2).strip(),
                },
            }

    # Priority 2: Browser
    for pattern, action in BROWSER_PATTERNS:
        m = pattern.match(text)
        if m:
            params = {"url": m.group(1)}
            if action == "scrape" and m.lastindex >= 2 and m.group(2):
                params["selector"] = m.group(2).strip()
            return {"module": "browser", "action": action, "params": params}

    # Priority 3: App
    for pattern in APP_PATTERNS:
        m = pattern.match(text)
        if m:
            return {
                "module": "app",
                "action": "activate",
                "params": {"app_name": m.group(1).strip()},
            }

    return None


def dispatch(intent: dict) -> dict:
    """Dispatch a parsed intent to the appropriate module."""
    module = intent["module"]
    action = intent["action"]
    params = intent["params"]

    if module == "wechat":
        from scripts.automate.wechat import send_message
        params["contact"] = resolve_contact(params["contact"])
        return send_message(**params)

    elif module == "browser":
        from scripts.automate.browser import open_url, screenshot, scrape, fill_form, run_script
        fn_map = {
            "open_url": open_url,
            "screenshot": screenshot,
            "scrape": scrape,
            "fill_form": fill_form,
            "run_script": run_script,
        }
        fn = fn_map[action]
        return asyncio.run(fn(**params))

    elif module == "app":
        from scripts.automate.app import activate
        return activate(**params)

    return {"success": False, "action": action, "detail": f"Unknown module: {module}"}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Mac Automate CLI")
    parser.add_argument("command", nargs="+", help="Natural language command")
    parser.add_argument("--no-confirm", action="store_true", help="Skip confirmation prompts")
    args = parser.parse_args()

    text = " ".join(args.command)
    intent = parse_intent(text)

    if intent is None:
        print(json.dumps({"success": False, "detail": f"Cannot parse: {text}"}, ensure_ascii=False))
        sys.exit(1)

    # Pass no-confirm flag to wechat module
    if args.no_confirm and intent["module"] == "wechat":
        intent["params"]["confirm"] = False

    result = dispatch(intent)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest scripts/automate/tests/test_router.py -v
```

Expected: All 9 tests PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/automate/router.py scripts/automate/contacts.json scripts/automate/tests/test_router.py
git commit -m "feat: add intent router with regex parsing and contact aliases"
```

---

### Task 4: app.py — Generic macOS App Control

**Files:**
- Create: `scripts/automate/app.py`
- Create: `scripts/automate/tests/test_app.py`

- [ ] **Step 1: Write failing tests**

```python
# scripts/automate/tests/test_app.py
from unittest.mock import patch, call


@patch("scripts.automate.utils.run_applescript")
def test_activate_app(mock_as):
    from scripts.automate.app import activate
    mock_as.return_value = ""
    result = activate("Finder")
    assert result["success"] is True
    assert "Finder" in mock_as.call_args.args[0]


@patch("pyautogui.click")
def test_click_coordinates(mock_click):
    from scripts.automate.app import click
    result = click(100, 200)
    assert result["success"] is True
    mock_click.assert_called_once_with(100, 200)


@patch("scripts.automate.utils.clipboard_paste")
def test_type_text(mock_paste):
    from scripts.automate.app import type_text
    result = type_text("你好")
    assert result["success"] is True
    mock_paste.assert_called_once_with("你好")


@patch("pyautogui.hotkey")
def test_hotkey(mock_hk):
    from scripts.automate.app import hotkey
    result = hotkey("command", "c")
    assert result["success"] is True
    mock_hk.assert_called_once_with("command", "c")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest scripts/automate/tests/test_app.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement app.py**

```python
# scripts/automate/app.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest scripts/automate/tests/test_app.py -v
```

Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/automate/app.py scripts/automate/tests/test_app.py
git commit -m "feat: add generic macOS app control module"
```

---

### Task 5: wechat.py — WeChat Message Automation

**Files:**
- Create: `scripts/automate/wechat.py`
- Create: `scripts/automate/tests/test_wechat.py`

- [ ] **Step 1: Write failing tests**

```python
# scripts/automate/tests/test_wechat.py
import time
from unittest.mock import patch, call, MagicMock


@patch("scripts.automate.wechat._do_send")
@patch("scripts.automate.utils.run_applescript")
def test_send_message_activates_wechat(mock_as, mock_send):
    from scripts.automate.wechat import send_message
    mock_send.return_value = {"success": True, "action": "send_message", "detail": "Sent"}
    result = send_message("张三", "你好", confirm=False)
    # Should activate WeChat via AppleScript
    assert any("WeChat" in str(c) or "微信" in str(c) for c in mock_as.call_args_list)


@patch("scripts.automate.wechat._do_send")
@patch("scripts.automate.utils.run_applescript")
def test_send_message_returns_success(mock_as, mock_send):
    from scripts.automate.wechat import send_message
    mock_send.return_value = {"success": True, "action": "send_message", "detail": "Sent to 张三"}
    result = send_message("张三", "你好", confirm=False)
    assert result["success"] is True


@patch("scripts.automate.utils.run_applescript", side_effect=RuntimeError("WeChat not running"))
def test_send_message_wechat_not_running(mock_as):
    from scripts.automate.wechat import send_message
    result = send_message("张三", "你好", confirm=False)
    assert result["success"] is False
    assert "not running" in result["detail"].lower() or "未运行" in result["detail"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest scripts/automate/tests/test_wechat.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement wechat.py**

```python
# scripts/automate/wechat.py
"""WeChat desktop message automation via AppleScript + pyautogui."""

import time

import pyautogui

from scripts.automate.utils import run_applescript, clipboard_paste, log_action, with_timeout


def _activate_wechat() -> None:
    """Bring WeChat to front. Raises RuntimeError if not running."""
    run_applescript('tell application "WeChat" to activate')
    time.sleep(0.5)


def _do_send(contact: str, message: str) -> dict:
    """Execute the actual send sequence via keyboard automation."""
    # Cmd+F to open search
    pyautogui.hotkey("command", "f")
    time.sleep(0.3)

    # Type contact name via clipboard (CJK safe)
    clipboard_paste(contact)
    time.sleep(0.5)

    # Press Enter to select first search result
    pyautogui.press("enter")
    time.sleep(0.3)

    # Type message via clipboard
    clipboard_paste(message)
    time.sleep(0.2)

    # Press Enter to send
    pyautogui.press("enter")

    log_action("wechat", "send_message", f"To: {contact} | Msg: {message}")
    return {"success": True, "action": "send_message", "detail": f"Sent to {contact}"}


def send_message(contact: str, message: str, confirm: bool = True) -> dict:
    """
    Send a WeChat message.

    Args:
        contact: Contact name (real name, not alias — alias resolved by router).
        message: Message text to send.
        confirm: If True, print confirmation before sending.
    """
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest scripts/automate/tests/test_wechat.py -v
```

Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/automate/wechat.py scripts/automate/tests/test_wechat.py
git commit -m "feat: add WeChat message automation module"
```

---

### Task 6: browser.py — Playwright Browser Automation

**Files:**
- Create: `scripts/automate/browser.py`
- Create: `scripts/automate/tests/test_browser.py`

- [ ] **Step 1: Write failing tests**

```python
# scripts/automate/tests/test_browser.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

pytest_plugins = ["pytest_asyncio"]


@pytest.mark.asyncio
async def test_open_url_returns_title():
    from scripts.automate.browser import open_url
    with patch("scripts.automate.browser._get_page") as mock_get:
        mock_page = AsyncMock()
        mock_page.title = AsyncMock(return_value="Example Domain")
        mock_page.url = "https://example.com"
        mock_get.return_value = (mock_page, AsyncMock())
        result = await open_url("https://example.com")
        assert result["success"] is True
        assert result["detail"]["title"] == "Example Domain"


@pytest.mark.asyncio
async def test_screenshot_saves_file():
    from scripts.automate.browser import screenshot
    with patch("scripts.automate.browser._get_page") as mock_get:
        mock_page = AsyncMock()
        mock_page.screenshot = AsyncMock()
        mock_get.return_value = (mock_page, AsyncMock())
        result = await screenshot("https://example.com", "/tmp/test.png")
        assert result["success"] is True
        mock_page.screenshot.assert_called_once()


@pytest.mark.asyncio
async def test_scrape_returns_texts():
    from scripts.automate.browser import scrape
    with patch("scripts.automate.browser._get_page") as mock_get:
        mock_page = AsyncMock()
        mock_el1 = AsyncMock()
        mock_el1.text_content = AsyncMock(return_value="Hello")
        mock_el2 = AsyncMock()
        mock_el2.text_content = AsyncMock(return_value="World")
        mock_page.query_selector_all = AsyncMock(return_value=[mock_el1, mock_el2])
        mock_get.return_value = (mock_page, AsyncMock())
        result = await scrape("https://example.com", "h1")
        assert result["success"] is True
        assert result["detail"]["texts"] == ["Hello", "World"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest scripts/automate/tests/test_browser.py -v
```

Expected: FAIL

- [ ] **Step 3: Implement browser.py**

```python
# scripts/automate/browser.py
"""Browser automation via Playwright."""

from playwright.async_api import async_playwright

from scripts.automate.utils import log_action


async def _get_page(url: str, headless: bool = False):
    """Launch browser, navigate to URL, return (page, cleanup_fn)."""
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=headless)
    page = await browser.new_page()
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)

    async def cleanup():
        await browser.close()
        await pw.stop()

    return page, cleanup


async def open_url(url: str) -> dict:
    """Open a URL and return page title."""
    try:
        page, cleanup = await _get_page(url)
        title = await page.title()
        current_url = page.url
        await cleanup()
        log_action("browser", "open_url", f"{url} → {title}")
        return {"success": True, "action": "open_url", "detail": {"title": title, "url": current_url}}
    except Exception as e:
        return {"success": False, "action": "open_url", "detail": str(e)}


async def screenshot(url: str, path: str = "screenshot.png") -> dict:
    """Take a screenshot of a web page."""
    try:
        page, cleanup = await _get_page(url)
        await page.screenshot(path=path, full_page=True)
        await cleanup()
        log_action("browser", "screenshot", f"{url} → {path}")
        return {"success": True, "action": "screenshot", "detail": {"path": path}}
    except Exception as e:
        return {"success": False, "action": "screenshot", "detail": str(e)}


async def scrape(url: str, selector: str = "body") -> dict:
    """Extract text content matching a CSS selector."""
    try:
        page, cleanup = await _get_page(url)
        elements = await page.query_selector_all(selector)
        texts = []
        for el in elements:
            text = await el.text_content()
            if text:
                texts.append(text.strip())
        await cleanup()
        log_action("browser", "scrape", f"{url} [{selector}] → {len(texts)} results")
        return {"success": True, "action": "scrape", "detail": {"texts": texts, "count": len(texts)}}
    except Exception as e:
        return {"success": False, "action": "scrape", "detail": str(e)}


async def fill_form(url: str, fields: dict, submit_selector: str = None) -> dict:
    """Fill form fields on a page. fields = {css_selector: value}."""
    try:
        page, cleanup = await _get_page(url)
        for selector, value in fields.items():
            el = await page.query_selector(selector)
            if el is None:
                await cleanup()
                return {"success": False, "action": "fill_form", "detail": f"Selector not found: {selector}"}
            tag = await el.evaluate("el => el.tagName.toLowerCase()")
            if tag == "select":
                await el.select_option(value)
            elif await el.evaluate("el => el.type") in ("checkbox", "radio"):
                if value:
                    await el.check()
                else:
                    await el.uncheck()
            else:
                await el.fill(value)
        if submit_selector:
            await page.click(submit_selector)
            await page.wait_for_load_state("domcontentloaded")
        await cleanup()
        log_action("browser", "fill_form", f"{url} → {len(fields)} fields")
        return {"success": True, "action": "fill_form", "detail": f"Filled {len(fields)} fields"}
    except Exception as e:
        return {"success": False, "action": "fill_form", "detail": str(e)}


async def run_script(url: str, script: str) -> dict:
    """Execute JavaScript on a page."""
    try:
        page, cleanup = await _get_page(url)
        result = await page.evaluate(script)
        await cleanup()
        log_action("browser", "run_script", f"{url} → script executed")
        return {"success": True, "action": "run_script", "detail": result}
    except Exception as e:
        return {"success": False, "action": "run_script", "detail": str(e)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest scripts/automate/tests/test_browser.py -v
```

Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/automate/browser.py scripts/automate/tests/test_browser.py
git commit -m "feat: add Playwright browser automation module"
```

---

### Task 7: Claude Code Slash Commands

**Files:**
- Create: `skills/wechat/SKILL.md`
- Create: `skills/browser/SKILL.md`
- Create: `skills/app/SKILL.md`

- [ ] **Step 1: Create /wechat skill**

```markdown
<!-- skills/wechat/SKILL.md -->
---
name: wechat
description: Send WeChat messages via GUI automation. Usage: /wechat <contact> <message>
---

Send a WeChat message using the mac-automate toolkit.

## Usage

The user provides a contact name and message. Execute:

\`\`\`bash
python scripts/automate/router.py "给<contact>发微信 <message>"
\`\`\`

Parse the arguments from the user's input after `/wechat`.
Example: `/wechat 媳妇 你在干嘛` → `python scripts/automate/router.py "给媳妇发微信 你在干嘛"`

Before executing, confirm with the user:
- 收件人: <contact>
- 内容: <message>

Pass `--no-confirm` to the script since Claude Code handles confirmation.
```

- [ ] **Step 2: Create /browser skill**

```markdown
<!-- skills/browser/SKILL.md -->
---
name: browser
description: Browser automation - open URLs, take screenshots, scrape content. Usage: /browser <action> <args>
---

Browser automation using the mac-automate Playwright toolkit.

## Actions

- `/browser open <url>` → `python scripts/automate/router.py "打开网页 <url>"`
- `/browser screenshot <url>` → `python scripts/automate/router.py "截图 <url>"`
- `/browser scrape <url> <selector>` → `python scripts/automate/router.py "抓取 <url> <selector>"`

Parse the action and arguments from user input, then execute via router.py.
```

- [ ] **Step 3: Create /app skill**

```markdown
<!-- skills/app/SKILL.md -->
---
name: app
description: Control macOS apps - open, click, type, hotkeys. Usage: /app <action> <args>
---

macOS app automation using the mac-automate toolkit.

## Actions

- `/app open <name>` → `python scripts/automate/router.py "打开 <name>"`
- `/app click <x> <y>` → Direct call to `scripts/automate/app.py click(x, y)`
- `/app type <text>` → Direct call to `scripts/automate/app.py type_text(text)`
- `/app hotkey <keys>` → Direct call to `scripts/automate/app.py hotkey(*keys)`

Parse the action and arguments from user input, then execute the appropriate function.
```

- [ ] **Step 4: Commit**

```bash
git add skills/wechat/SKILL.md skills/browser/SKILL.md skills/app/SKILL.md
git commit -m "feat: add Claude Code slash commands for wechat, browser, app"
```

---

### Task 8: CLAUDE.md Intent Routing Integration

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add automate intents to the routing table in CLAUDE.md**

Add these rows to the existing `技能自动路由` table:

```markdown
| 「发微信」「微信发给」「给XX发消息」     | `wechat`              | `/wechat`                   |
| 「打开网页」「截图网页」「抓取网页」     | `browser`             | `/browser`                  |
| 「打开应用」「启动XX」「切换到XX」       | `app`                 | `/app`                      |
```

- [ ] **Step 2: Add automate section to CLAUDE.md**

Add after the existing Skill routing table:

```markdown
## Mac Automate — GUI 自动化

本项目包含本机 GUI 自动化工具集，位于 `scripts/automate/`。

当用户表达发微信、打开网页、操作应用等意图时：
1. 优先使用对应 slash 命令（`/wechat`、`/browser`、`/app`）
2. 也可直接执行：`python scripts/automate/router.py "<自然语言指令>"`
3. 微信联系人别名配置：`scripts/automate/contacts.json`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add mac-automate intent routing to CLAUDE.md"
```

---

### Task 9: End-to-End Smoke Test

**Files:** None (manual verification)

- [ ] **Step 1: Run all unit tests**

```bash
pytest scripts/automate/tests/ -v
```

Expected: All tests PASS

- [ ] **Step 2: Test router CLI parsing**

```bash
python scripts/automate/router.py "给媳妇发微信 你好"
python scripts/automate/router.py "打开 Finder"
python scripts/automate/router.py "今天天气怎么样"
```

Expected:
- First: Routes to wechat module (may fail if WeChat not open — that's OK, routing works)
- Second: Opens Finder
- Third: Returns parse error JSON

- [ ] **Step 3: Test app module — open Finder**

```bash
python -c "from scripts.automate.app import activate; print(activate('Finder'))"
```

Expected: Finder activates, returns `{"success": true, ...}`

- [ ] **Step 4: Test browser module — screenshot**

```bash
python -c "
import asyncio
from scripts.automate.browser import screenshot
result = asyncio.run(screenshot('https://example.com', '/tmp/automate_test.png'))
print(result)
"
```

Expected: Screenshot saved, returns success

- [ ] **Step 5: Verify all tests pass one final time**

```bash
pytest scripts/automate/tests/ -v --tb=short
```

Expected: All tests PASS. No commit needed — smoke test is verification only.
