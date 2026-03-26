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
