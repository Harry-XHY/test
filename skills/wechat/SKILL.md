---
name: wechat
description: Send WeChat messages via GUI automation. Usage: /wechat <contact> <message>
---

Send a WeChat message using the mac-automate toolkit.

## Usage

The user provides a contact name and message. Execute:

```bash
python scripts/automate/router.py "给<contact>发微信 <message>" --no-confirm
```

Parse the arguments from the user's input after `/wechat`.
Example: `/wechat 媳妇 你在干嘛` → `python scripts/automate/router.py "给媳妇发微信 你在干嘛" --no-confirm`

Before executing, confirm with the user:
- 收件人: <contact>
- 内容: <message>

The `--no-confirm` flag is passed to the script since Claude Code handles confirmation.
