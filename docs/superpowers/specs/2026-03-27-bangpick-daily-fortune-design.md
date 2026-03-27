# BangPick 每日一签功能设计

## 概述

在 bangpick（帮你选）应用首页新增"每日一签"功能。用户点击入口卡片后，通过翻牌动画揭晓今日签文，包含签等、决策箴言和宜忌。签文从预设库中按日期种子抽取，每天固定一签，所有用户看到相同内容。

## 目标

- 增加用户每日打开 app 的动力（留存）
- 贴合"帮你选"决策主题，签文围绕决策场景
- 零 API 开销，利用本地签文库

## 设计决策记录

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 内容方向 | 混合型（运势 + 决策建议） | 兼具趣味性和实用性 |
| 触发方式 | 首页入口按钮 | 不打断核心流程，主动求签更有仪式感 |
| 内容来源 | 预设签文库 | 零延迟、零成本，每日固定签文更有"天意感" |
| 交互形式 | 翻牌动画 | 开发量适中，仪式感强 |
| 内容结构 | 精简版（签等 + 箴言 + 宜忌） | 信息量够但不臃肿，匹配 app 简洁风格 |
| 展示方式 | 卡片入口 + 模态弹层 | 不影响路由和布局，模态层适合仪式感体验 |
| 入口尺寸 | 小卡片 + 副标题 | 有存在感但不喧宾夺主 |

## 架构

### 数据流

```
seedFromDate(today) → 日期种子
  ↓
seededShuffle(FORTUNES) → 取索引 0
  ↓
FortuneCard 入口（首页 hero 下方，场景卡片上方）
  ↓ 用户点击
FortuneModal 全屏模态层 → 翻牌动画
  ↓ 翻转后
签文展示 + localStorage 标记已抽签
  ↓ 再次打开 app
FortuneCard 显示已抽签摘要（签等 + 箴言缩略）
```

### 新增文件

#### `src/lib/fortunes.js` — 签文库 + 抽签逻辑

**签文数据结构：**

```js
{
  level: "上上签",           // 上上签 / 上签 / 中签 / 下签 / 下下签
  message: "今天适合果断出手，别再纠结了",
  yi: "冲动消费",            // 宜
  ji: "货比三家",            // 忌
}
```

**签文库规模：** 30-50 条预设签文，覆盖各种决策场景（购物、饮食、出行、社交、工作等）。

**签等分布：**
- 上上签：15%
- 上签：25%
- 中签：35%
- 下签：20%
- 下下签：5%

**前置改动：** `scenarios.js` 中 `seedFromDate()` 和 `seededShuffle()` 目前未导出，需先将它们导出为具名函数。注意 `seedFromDate()` 当前无参数、内部构造日期字符串且使用 0-indexed `getUTCMonth()`（3 月 → `"2026-2-27"`）。fortune 模块需复用相同的日期格式以保持一致。

**抽签逻辑：**

```js
// scenarios.js 需新增导出: export { seedFromDate, seededShuffle }
import { seedFromDate, seededShuffle } from './scenarios.js';

export function getTodayFortune() {
  // seedFromDate() 无参数，内部使用 UTC 日期构造种子
  const seed = seedFromDate();
  const shuffled = seededShuffle(FORTUNES, seed);
  // seededShuffle 内部已做数组拷贝，无需外部 spread
  return shuffled[0];
}
```

复用 `scenarios.js` 中已有的 `seedFromDate()` 和 `seededShuffle()`，保证同一天所有用户看到同一签。

#### `src/components/FortuneCard.jsx` — 首页入口卡片

**两种状态：**

1. **未抽签：** 小卡片样式，🔮 图标 + "今日一签" + "看看决策运势" 副标题 + 箭头
2. **已抽签：** 同样卡片，但显示 "上上签 · 今天适合果断出手" 摘要，点击可再次查看签文

**状态判断：** 读取 localStorage `bangpick_fortune_date`，与今天日期比较。

#### `src/components/FortuneModal.jsx` — 翻牌模态弹层

**交互流程：**

1. 打开模态层，背景半透明黑色遮罩
2. 居中显示卡牌正面（紫蓝渐变 + 🔮 + "今日一签" + "点击翻牌"）
3. 用户点击卡牌 → CSS 3D 翻转动画（`rotateY(180deg)`，0.6s ease-out）
4. 翻转后显示签文内容（签等 + 箴言 + 宜/忌分隔线布局）
5. 点击遮罩或关闭按钮退出模态层
6. 写入 localStorage 标记今日已抽签

**动画实现：**

- CSS `perspective` + `transform-style: preserve-3d`
- 正反两面用 `backface-visibility: hidden`
- 翻转触发：状态切换 `isFlipped` → `transform: rotateY(180deg)`
- 过渡：`transition: transform 0.6s ease-out`
- 使用 `@media (prefers-reduced-motion: reduce)` 跳过 3D 翻转，改为淡入

**键盘与无障碍：**

- Escape 关闭模态层
- Enter / Space 触发翻牌
- 模态层添加 `role="dialog"` + `aria-modal="true"`

### 修改文件

#### `src/lib/scenarios.js`

- 将 `seedFromDate` 和 `seededShuffle` 从模块私有函数改为具名导出（`export function`）
- 函数签名和实现不变

#### `src/lib/storage.js`

- 确保 `safeGet` / `safeSet` 已导出（如已导出则无需改动）

#### `src/pages/ChatPage.jsx`

- 引入 `FortuneCard` 和 `FortuneModal` 组件
- 在 landing 视图的 hero 区域下方、场景卡片上方插入 `<FortuneCard />`
- 新增 `showFortune` 状态控制模态层显隐
- 传递 `onOpen` / `onClose` 回调

#### `src/index.css`

- 新增模态层遮罩样式（`.fortune-overlay`）
- 新增翻牌动画相关 CSS（`.fortune-card`, `.fortune-card-inner`, `.fortune-front`, `.fortune-back`）
- 与现有玻璃拟态风格保持一致（`backdrop-filter: blur`, 半透明边框）

## 存储

使用 `storage.js` 中的 `safeGet` / `safeSet` 封装 localStorage 访问，与现有模式一致（try-catch 防御 quota 溢出等异常）：

```js
import { safeGet, safeSet } from './storage.js';

// 日期格式必须与 seedFromDate() 一致（UTC, 0-indexed month）
function getTodayDateStr() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

// 标记已抽签
safeSet('bangpick_fortune_date', getTodayDateStr());

// 检查是否已抽
const isDrawn = safeGet('bangpick_fortune_date') === getTodayDateStr();
```

需在 `storage.js` 中导出 `safeGet` / `safeSet`（如果尚未导出）。

## 视觉设计

### 入口卡片

- 背景：`linear-gradient(135deg, rgba(182,160,255,0.1), rgba(91,140,255,0.1))`
- 边框：`1px solid rgba(182,160,255,0.15)`
- 圆角：12px
- 内边距：12px 14px
- 图标：🔮 22px
- 标题：14px 600 weight
- 副标题：11px muted color

### 翻牌卡面

- 正面：紫蓝渐变背景，白色文字，阴影 `0 8px 32px rgba(126,81,255,0.3)`
- 背面：玻璃拟态（`rgba(255,255,255,0.06)` 背景 + 紫色半透明边框）
- 卡片尺寸：180px × 260px
- 圆角：20px

### 签文内容布局

- 签等：12px 紫色（#b6a0ff），居中，letter-spacing 2px
- 箴言：13px 白色，居中，line-height 1.6
- 分隔线：1px solid rgba(255,255,255,0.08)
- 宜：绿色（#22c55e）标签
- 忌：红色（#ef4444）标签

## 测试策略

### 单元测试

- `getTodayFortune()` 同一天返回相同签文
- `getTodayFortune()` 不同天返回不同签文
- 签文数据完整性（所有字段存在且非空）

### E2E 测试（Playwright）

- 首页入口卡片可见
- 点击入口 → 模态层出现
- 点击卡牌 → 翻转动画播放 → 签文内容可见
- 关闭模态层 → 回到首页
- 入口卡片变为已抽签状态
- 刷新页面 → 仍显示已抽签状态

## 不在范围内

- 签文分享功能
- 签文历史记录
- AI 生成签文
- 签文评论/互动
- 自定义签文
