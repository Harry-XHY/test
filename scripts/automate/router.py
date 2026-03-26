"""Unified CLI entry point: parse natural language → dispatch to modules."""
from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path

CONTACTS_FILE = str(Path(__file__).parent / "contacts.json")

# --- Intent patterns (priority order, first match wins) ---

WECHAT_PATTERNS = [
    re.compile(r"给(.+?)发微信\s+(.+)", re.DOTALL),
    re.compile(r"微信发给(.+?)\s+(.+)", re.DOTALL),
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

    if args.no_confirm and intent["module"] == "wechat":
        intent["params"]["confirm"] = False

    result = dispatch(intent)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
