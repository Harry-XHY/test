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

**解析算法：** 基于正则匹配 + 优先级，按顺序匹配，首个命中生效：

| 优先级 | 正则模式 | 目标模块 | 参数提取 |
|--------|----------|----------|----------|
| 1 | `(发微信|微信发|发给).+` | wechat | 提取联系人（别名→真名映射）和消息体 |
| 2 | `(打开网页|访问|抓取|截图|填表).+` | browser | 提取 URL 和可选参数 |
| 3 | `(打开|启动|切换到).+应用|打开\s+\w+` | app | 提取应用名 |

**参数提取示例：**
- `"给媳妇发微信 你在干嘛"` → `wechat.send_message(contact="媳妇", message="你在干嘛")`
- 解析规则：「给/发给」后为联系人，「发微信」后为消息体；使用正则 `给?(.+?)发微信\s+(.+)` 提取

**异步桥接：** router.py 为同步 CLI 入口，调用 browser.py 的 async 函数时使用 `asyncio.run()` 包装。

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

**联系人别名映射：** 使用 `scripts/automate/contacts.json` 存储别名：

```json
{
  "媳妇": "张三",
  "老板": "李四",
  "妈": "妈妈"
}
```

路由时自动将别名转为真实联系人名。无映射则直接使用原文搜索。

**关键细节：**
- 优先使用 AppleScript accessibility API（`System Events`）定位 UI 元素，`pyautogui.locateOnScreen()` 仅作 fallback
- 中文输入通过 `clipboard_paste()`（带剪贴板保存/恢复）粘贴
- 发送前打印确认信息，支持 `--no-confirm` 跳过

**局限：**
- 依赖微信桌面版已登录且窗口可访问
- 屏幕分辨率/缩放变化可能影响 fallback 图像定位
- 同名联系人取搜索结果第一个匹配项

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

**fill_form 字段说明：** `fields` 使用 Playwright CSS 选择器作为 key，支持 `input`/`textarea`/`select` 元素。下拉框使用 `select_option()`，复选框使用 `check()`。填写完成后不自动提交，需显式传 `submit_selector` 参数。

**特性：**
- 默认使用 Chromium，支持切换 Firefox/WebKit
- 支持 headless 和 headed 模式（默认 headed，方便观察）
- v1 不含 Cookie 持久化，后续扩展中实现

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
    """保存当前剪贴板 → 复制文本 → Cmd+V 粘贴 → 恢复原剪贴板"""

def ensure_logs_dir():
    """确保 logs/ 目录存在，不存在则创建"""
```

## Claude Code 集成

### Hook 配置（自动触发）— TBD

Hook 自动触发需要验证 Claude Code 实际 hook API 格式。实现时需做一个 spike 确认：
1. Claude Code hook 是否支持用户消息匹配
2. 如果不支持，fallback 方案为仅使用 Slash 命令 + Claude 主动调用 Bash 执行 router.py

**Fallback 方案：** 不配置 hook，而是在 CLAUDE.md 的技能路由表中添加 automate 相关意图，Claude 识别意图后主动执行 `python scripts/automate/router.py "..."` 命令。

### Slash 命令（手动触发）

在 `skills/` 目录下创建 skill 文件：

```
skills/
├── wechat/SKILL.md      # /wechat slash 命令
├── browser/SKILL.md      # /browser slash 命令
└── app/SKILL.md          # /app slash 命令
```

每个 SKILL.md 包含命令说明和参数格式，触发后调用 router.py 执行。

- `/wechat <联系人> <消息>` — 发微信消息
- `/browser open <url>` — 打开网页
- `/browser scrape <url> <selector>` — 抓取内容
- `/browser screenshot <url>` — 网页截图
- `/app open <应用名>` — 打开应用
- `/app click <x> <y>` — 点击坐标

## 依赖

### 需新安装

通过项目 `pyproject.toml` 管理，使用 `uv` 安装：

```bash
uv add pyautogui pyperclip pyobjc-framework-Quartz
uv sync
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

## 测试计划

### 单元测试（pytest）
- **router.py：** 测试意图解析、参数提取、优先级匹配、别名映射
- **utils.py：** 测试 clipboard 保存/恢复、日志写入、目录创建

### 集成烟测（手动）
- **wechat：** 发送测试消息给自己（文件传输助手）
- **browser：** 打开网页 + 截图 + 抓取标题
- **app：** 打开 Finder + 激活窗口

### 运行方式

```bash
pytest scripts/automate/tests/
```

## 后续扩展

- 微信群消息支持
- 微信发送图片/文件
- 浏览器 Cookie 持久化管理
- 特定 App 专用模块（飞书、Telegram 等）
- 定时任务集成（结合 cron）
