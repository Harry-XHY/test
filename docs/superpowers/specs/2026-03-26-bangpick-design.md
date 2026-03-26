# BangPick（帮我选）— AI 决策助手设计文档

## 概述

AI 驱动的移动端 H5 决策助手。自己用时极简对话秒出推荐，朋友场景一键切换为投票/转盘互动页面。

**目标用户**：自己 + 朋友小圈子
**核心场景**：吃什么、去哪玩、买哪个、选 A 还是 B 等日常决策
**AI 后端**：MiniMax-M2.7（Anthropic 兼容格式）

## 技术栈

- **前端**：React + Vite + TailwindCSS（与 SoulTalk / AcceptBot 一致）
- **AI API**：MiniMax-M2.7 via `api.minimaxi.com/anthropic/v1/messages`
- **API 代理**：开发环境 Vite proxy，生产环境 Netlify Functions
- **存储**：localStorage（对话历史、用户偏好），URL hash（分享数据）
- **部署**：Netlify

## 两种模式

### 快问模式（默认）

对话式交互。用户输入问题，AI 返回 2-3 个推荐选项，每个含名称、理由、标签。支持追问（「换一批」「再便宜点」）。

### 朋友模式（一键切换）

将任意一次 AI 推荐转为互动页面：
- **投票**：朋友各选一个，发起人收集结果
- **转盘**：选项放进转盘，随机决定

v1 投票不实时同步（每人独立投票），v2 加后端实时同步。

## 页面结构

### ① 首页/对话页

- 顶部：logo + 历史记录入口
- 中间：对话流（用户问题 → AI 推荐卡片）
- 底部：输入框 + 发送按钮
- AI 回复渲染为推荐卡片（名称、理由、标签）
- 每条 AI 回复下方有「朋友来选」按钮

### ② 朋友模式页

- 顶部：发起人的问题（如「周五晚上吃什么？」）
- 中间：AI 推荐选项卡片
- 两种互动可切换：投票 / 转盘
- 底部：分享按钮

### ③ 分享落地页

- 朋友打开链接直接参与，无需登录
- 展示选项 + 投票或转盘交互

### ④ 历史记录页

- 按时间倒序展示过去的决策
- 标记是否用了朋友模式 + 最终结果

## 数据模型

```typescript
interface Decision {
  id: string;
  question: string;
  options: Option[];
  mode: 'quick' | 'friend';
  createdAt: number;
  result?: string; // 最终选择
}

interface Option {
  id: string;
  name: string;
  reason: string;
  tags: string[];
  votes: number;
}

interface Vote {
  optionId: string;
  voter: string; // 昵称
  timestamp: number;
}
```

## 存储方案

### localStorage

- `bangpick_history`: Decision[] — 对话历史
- `bangpick_preferences`: 用户偏好（口味、预算、位置等）

### URL 编码（朋友模式分享）

选项数据 Base64 编码拼入 URL hash：
```
bangpick.app/#/vote/eyJxIjoi5ZGo5LqU5pma5LiK5ZCD5LuA5LmIPyIsIm9wdGlvbnMiOi4uLn0=
```

## AI 调用设计

### API 配置

```javascript
// Anthropic 兼容格式
POST /api/chat
{
  model: "MiniMax-M2.7",
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userQuestion }
  ]
}
```

### System Prompt 策略

- 角色：果断的决策顾问，不说「都可以」
- 输出：强制 JSON 格式，2-3 个选项含 name/reason/tags
- 上下文：注入用户偏好（从 localStorage 读取）
- 信息不足时：反问最多 1 个关键问题
- 支持追问：「换一批」「再便宜点」等二次筛选

### Prompt 模板

```
你是「帮我选」决策顾问。用户遇到选择困难，你要果断给出推荐。

规则：
1. 给出 2-3 个选项，必须有明确的推荐排序（第一个是最推荐的）
2. 每个选项包含：名称、推荐理由（一句话）、标签（1-3 个关键词）
3. 不要说「都不错」「看你喜欢」，必须有态度
4. 如果信息不足，只问 1 个最关键的问题
5. 回复用 JSON 格式：
{
  "type": "recommendation" | "question",
  "question": "反问内容（仅 type=question 时）",
  "options": [
    { "name": "选项名", "reason": "推荐理由", "tags": ["标签1", "标签2"] }
  ]
}

用户偏好：{{preferences}}
```

## 分享机制

### 生成分享

1. 将 Decision 数据 Base64 编码拼入 URL
2. 生成分享文案：「我在纠结：{{question}}，快来帮我选！」+ 链接

### 分享渠道

- 优先调用 `navigator.share()`（微信/Safari/Chrome 原生支持）
- 降级：复制链接 + 文案到剪贴板

### 转盘实现

- 纯前端 CSS 动画（rotate transform + easing）
- 选项从 URL 解析，随机角度停止

## v1 范围与 v2 预留

### v1（当前）

- 快问模式完整功能
- 朋友模式（投票 + 转盘，不实时同步）
- 分享链接生成
- 历史记录
- localStorage 存储

### v2（后续）

- 实时投票同步（WebSocket / Supabase Realtime）
- 用户偏好学习（基于历史决策自动优化推荐）
- 更多互动玩法（排名、淘汰赛）
- 位置感知推荐（调用地图 API）

## 项目结构

```
bangpick/
├── index.html
├── vite.config.js
├── package.json
├── netlify.toml
├── netlify/functions/
│   └── chat.js              # AI API 代理
├── src/
│   ├── main.jsx
│   ├── App.jsx               # 路由配置
│   ├── components/
│   │   ├── ChatInput.jsx     # 输入框
│   │   ├── OptionCard.jsx    # 推荐选项卡片
│   │   ├── VotePanel.jsx     # 投票面板
│   │   ├── SpinWheel.jsx     # 转盘组件
│   │   └── ShareButton.jsx   # 分享按钮
│   ├── pages/
│   │   ├── ChatPage.jsx      # 首页/对话页
│   │   ├── FriendPage.jsx    # 朋友模式页
│   │   ├── SharePage.jsx     # 分享落地页
│   │   └── HistoryPage.jsx   # 历史记录页
│   ├── lib/
│   │   ├── minimax.js        # AI API 调用
│   │   ├── storage.js        # localStorage 操作
│   │   ├── share.js          # 分享/URL 编解码
│   │   └── prompt.js         # Prompt 模板
│   └── styles/
│       └── index.css         # TailwindCSS 入口
└── public/
    └── favicon.svg
```
