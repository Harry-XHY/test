# Mac Automate — 本机 GUI 自动化工具集

## 概述

基于 Python 的本机 GUI 自动化工具集，集成到 Claude Code 中，支持自然语言触发和 slash 命令。覆盖三大场景：微信消息、浏览器自动化、通用 App 操作。

## 目标

- 在 Claude Code 对话中直接说「给媳妇发微信」即可执行
- 支持浏览器自动化（网页操作、数据采集、测试）
- 可扩展的通用 App 操作框架
- 安全可控，关键操作有确认机制

## 架构

```
scripts/automate/
├── router.py          # 统一入口，自然语言 → 模块分发
├── wechat.py          # 微信消息模块
├── browser.py         # 浏览器自动化模块
├── app.py             # 通用 App 操作模块
├── utils.py           # 共享工具（截图、等待、日志）
└── logs/              # 操作日志目录
```

### 数据流

```
用户自然语言 → Claude Code Hook/Slash 命令
  → router.py 解析意图
    → wechat.py / browser.py / app.py
      → pyautogui / Playwright / AppleScript 执行
        → 返回结果
```

## 模块设计

### 1. router.py — 统一入口

**职责：** 接收自然语言或结构化指令，路由到对应模块。

**路由规则：**

| 关键词 | 目标模块 | 动作 |
|--------|----------|------|
| 微信、发消息、发给 | wechat | send_message |
| 打开网页、访问、抓取、截图、填表 | browser | open_url / scrape / screenshot / fill_form |
| 打开应用、点击、输入 | app | activate / click / type_text |

**CLI 入口：**

```bash
python scripts/automate/router.py "给媳妇发微信 你在干嘛"
python scripts/automate/router.py "打开百度搜索 Claude Code"
python scripts/automate/router.py "打开 Finder"
```

**返回格式：** JSON，包含 `success`、`action`、`detail` 字段。

### 2. wechat.py — 微信消息

**技术：** AppleScript（激活窗口） + pyautogui（键鼠操作）

**核心函数：**

```python
def send_message(contact: str, message: str) -> dict:
    """
    发送微信消息
    1. AppleScript 激活微信窗口
    2. Cmd+F 打开搜索
    3. 输入联系人名称
    4. 等待搜索结果，点击匹配项
    5. 输入消息内容
    6. 回车发送
    """
```

**关键细节：**
- 使用 `pyautogui.locateOnScreen()` 辅助定位搜索结果
- 中文输入通过 `pyperclip` + Cmd+V 粘贴（避免输入法问题）
- 发送前打印确认信息，支持 `--no-confirm` 跳过

**局限：**
- 依赖微信桌面版已登录且窗口可访问
- 屏幕分辨率/缩放变化可能影响定位
- 同名联系人需额外处理

### 3. browser.py — 浏览器自动化

**技术：** Playwright（已安装 1.58.0）

**核心函数：**

```python
async def open_url(url: str) -> dict:
    """打开网页，返回页面标题"""

async def fill_form(url: str, fields: dict) -> dict:
    """自动填表，fields 为 {selector: value} 映射"""

async def scrape(url: str, selector: str) -> dict:
    """提取页面内容，返回匹配元素的文本列表"""

async def screenshot(url: str, path: str) -> dict:
    """网页截图，保存到指定路径"""

async def run_script(url: str, script: str) -> dict:
    """在页面上执行自定义 JavaScript"""
```

**特性：**
- 默认使用 Chromium，支持切换 Firefox/WebKit
- 支持 headless 和 headed 模式（默认 headed，方便观察）
- Cookie/session 持久化，避免重复登录

### 4. app.py — 通用 App 操作

**技术：** AppleScript + pyautogui

**核心函数：**

```python
def activate(app_name: str) -> dict:
    """通过 AppleScript 激活指定应用"""

def click(x: int, y: int) -> dict:
    """点击屏幕指定坐标"""

def type_text(text: str) -> dict:
    """输入文本（支持中文粘贴）"""

def hotkey(*keys: str) -> dict:
    """模拟快捷键，如 hotkey('command', 'c')"""

def run_applescript(script: str) -> dict:
    """执行任意 AppleScript"""

def screenshot_region(x, y, w, h, path: str) -> dict:
    """截取屏幕区域"""
```

**预留扩展点：** 后续可为飞书、钉钉等 App 添加专用子模块。

### 5. utils.py — 共享工具

```python
def wait_for_image(image_path: str, timeout: int = 10) -> tuple:
    """等待屏幕上出现指定图片，返回坐标"""

def log_action(module: str, action: str, detail: str):
    """记录操作日志到 logs/"""

def take_screenshot(path: str = None) -> str:
    """全屏截图，返回保存路径"""

def clipboard_paste(text: str):
    """复制文本到剪贴板并粘贴（解决中文输入问题）"""
```

## Claude Code 集成

### Hook 配置（自动触发）

在 `.claude/settings.local.json` 中添加 hook，当用户消息包含特定意图时自动调用 router.py：

```json
{
  "hooks": {
    "UserMessage": [
      {
        "match": "发微信|微信发|打开网页|浏览器|截图|打开.*应用",
        "command": "python scripts/automate/router.py \"$MESSAGE\""
      }
    ]
  }
}
```

> 注：Hook 的具体配置格式以 Claude Code 实际支持的 hook API 为准，实现时需验证。

### Slash 命令（手动触发）

创建 skill 文件实现 slash 命令：

- `/wechat <联系人> <消息>` — 发微信消息
- `/browser open <url>` — 打开网页
- `/browser scrape <url> <selector>` — 抓取内容
- `/browser screenshot <url>` — 网页截图
- `/app open <应用名>` — 打开应用
- `/app click <x> <y>` — 点击坐标

## 依赖

### 需新安装

```bash
pip3 install pyautogui pyperclip pyobjc-framework-Quartz
```

### 已有

- Python 3.9.6
- Playwright 1.58.0
- Pillow 11.3.0
- macOS AppleScript (`/usr/bin/osascript`)

### 系统权限

- **辅助功能权限：** pyautogui 需要「系统偏好设置 → 隐私与安全 → 辅助功能」中授权终端/iTerm
- **屏幕录制权限：** 截图功能需要屏幕录制权限

## 安全机制

1. **操作确认：** 发消息等不可逆操作默认弹确认，`--no-confirm` 可跳过
2. **操作日志：** 所有操作记录到 `scripts/automate/logs/YYYY-MM-DD.log`
3. **紧急停止：** pyautogui failsafe 开启（鼠标移至屏幕左上角立即中止）
4. **超时保护：** 每个操作设 30 秒超时，防止卡死

## 错误处理

- 微信未打开 → 尝试通过 AppleScript 启动，失败则报错
- 联系人搜索无结果 → 返回错误提示，不执行发送
- 网页加载超时 → 返回超时错误，附带已加载内容
- App 未安装 → 返回明确错误信息

## 后续扩展

- 微信群消息支持
- 微信发送图片/文件
- 浏览器 Cookie 持久化管理
- 特定 App 专用模块（飞书、Telegram 等）
- 定时任务集成（结合 cron）
