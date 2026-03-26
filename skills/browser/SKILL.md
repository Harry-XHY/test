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
