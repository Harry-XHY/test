# AcceptBot（AI 验收助手）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 AI 驱动的验收测试工具 — 上传 PDF 需求文档，AI 自动生成验收清单，在线逐项验收，一键导出报告。

**Architecture:** React SPA（Bolt.new/Cursor 生成）+ Supabase（Auth + DB + Storage）+ DeepSeek API（AI 生成验收清单）。前端部署在 Vercel，后端全部使用 Supabase 云服务，无需自建服务器。

**Tech Stack:** React + TailwindCSS, Supabase (PostgreSQL + Auth + Storage + Edge Functions), DeepSeek API, pdfjs-dist, window.print() PDF 导出

**适配说明：** 本计划面向非开发背景用户，使用 Bolt.new / Cursor 等 AI 编程工具执行。每个任务描述了「要实现什么」和「关键代码/配置」，用户可将任务描述直接喂给 AI 工具生成代码。

---

## 文件结构（最终状态）

```
acceptbot/
├── public/
│   └── favicon.ico
├── src/
│   ├── App.jsx                    # 主应用路由
│   ├── main.jsx                   # 入口文件
│   ├── lib/
│   │   ├── supabase.js            # Supabase 客户端初始化
│   │   ├── deepseek.js            # 调用 Edge Function 封装
│   │   └── pdf-parser.js          # PDF 文本提取
│   ├── components/
│   │   ├── Layout.jsx             # 页面布局（导航栏 + 内容区）
│   │   ├── FileUpload.jsx         # PDF 上传组件
│   │   ├── ChecklistView.jsx      # 验收清单展示 + 编辑
│   │   ├── ChecklistItem.jsx      # 单个检查项（勾选 + 备注）
│   │   ├── ReportExport.jsx       # 导出报告按钮
│   │   ├── ReportView.jsx         # 可打印的报告页面
│   │   └── FeedbackWidget.jsx     # 反馈入口组件
│   ├── pages/
│   │   ├── LoginPage.jsx          # 登录页（手机号 + 验证码）
│   │   ├── UploadPage.jsx         # 上传文档页
│   │   ├── ChecklistPage.jsx      # 验收清单页（核心页面）
│   │   ├── HistoryPage.jsx        # 历史记录页（简版）
│   │   └── PrivacyPage.jsx        # 隐私协议页
│   ├── hooks/
│   │   ├── useAuth.js             # 认证状态 hook
│   │   └── useChecklist.js        # 清单数据管理 hook
│   └── prompts/
│       └── acceptance-prompt.js   # AI prompt 模板（核心资产）
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql # 数据库建表
│   └── functions/
│       └── generate-checklist/
│           └── index.ts           # Edge Function（调用 DeepSeek）
├── package.json
├── .env.local                     # 环境变量（不含 API Key）
├── vercel.json                    # Vercel 配置
└── README.md
```

---

## Task 0: 准备工作（第 0 周）

**目标：** 注册所有账号，启动 ICP 备案，准备开发环境。

- [ ] **Step 1: 注册账号**

注册以下服务（均免费）：
- Supabase: https://supabase.com — 创建新项目，记录 `Project URL` 和 `anon key`
- Vercel: https://vercel.com — 用 GitHub 账号登录
- DeepSeek: https://platform.deepseek.com — 注册并获取 API Key，充值 ¥10
- GitHub: 创建新仓库 `acceptbot`

- [ ] **Step 2: 买域名**

在阿里云/腾讯云购买域名（如 acceptbot.cn 或 yanshouzhu.com），约 ¥30-60/年。

- [ ] **Step 3: 启动 ICP 备案**

在域名服务商处提交 ICP 备案申请。需要：
- 身份证照片
- 域名证书
- 手机号验证
- 预计 2-4 周完成

- [ ] **Step 4: 准备测试用 PRD 文档**

从你过往项目中找 2-3 份真实的 PRD 文档（PDF 格式），作为后续 prompt 调试和产品测试的素材。

- [ ] **Step 5: 安装开发工具**

```bash
# 安装 Node.js（如未安装）
brew install node

# 安装 Cursor（AI 编程工具）
# 从 https://cursor.com 下载安装
```

---

## Task 1: Prompt 工程验证（第 1-2 周）

**目标：** 在写任何代码之前，验证 AI 能否从 PRD 生成高质量的验收清单。这是整个产品的核心假设。

**Files:**
- Create: `src/prompts/acceptance-prompt.js`

- [ ] **Step 1: 在 DeepSeek 网页版测试基础 prompt**

打开 https://chat.deepseek.com ，粘贴以下 prompt + 你的真实 PRD 内容：

```
你是一个拥有 10 年经验的软件测试专家。请根据以下需求文档，生成结构化的验收测试清单。

要求：
1. 按功能模块分组
2. 每个模块包含具体的检查项
3. 为每个检查项标注优先级（P0=核心流程必须通过, P1=重要功能, P2=细节体验）
4. 自动补充常见的边界条件和异常场景
5. 输出格式为 JSON

输出 JSON 格式：
{
  "modules": [
    {
      "name": "模块名称",
      "items": [
        {
          "id": "1.1",
          "description": "检查项描述",
          "priority": "P0",
          "category": "functional|boundary|security|performance",
          "expected_result": "预期结果"
        }
      ]
    }
  ]
}

以下是需求文档内容：
---
[粘贴你的 PRD 内容]
```

- [ ] **Step 2: 评估输出质量**

对照你的测试经验，评估 AI 输出：
- 功能模块划分是否合理？
- 检查项是否覆盖了你会写的内容？
- 边界条件是否有补充价值？
- 优先级标注是否准确？
- JSON 格式是否规范可解析？

记录问题，准备优化 prompt。

- [ ] **Step 3: 迭代优化 prompt**

根据评估结果调整 prompt，常见优化：
- 加入行业特定的检查维度（如「数据一致性」「权限控制」）
- 细化边界条件的生成规则
- 调整输出粒度（太粗或太细都不好）
- 至少用 3 份不同的 PRD 测试，确保 prompt 的通用性

- [ ] **Step 4: 测试分段处理**

找一份较长的 PRD（20+ 页），测试分段策略：
- 按章节/模块拆分文档内容
- 分别喂给 AI 生成清单
- 手动合并结果，评估一致性

- [ ] **Step 5: 固化 prompt 模板**

将最终调优的 prompt 保存为代码文件：

```javascript
// src/prompts/acceptance-prompt.js

export const SYSTEM_PROMPT = `你是一个拥有 10 年经验的软件测试专家，擅长从需求文档中提取验收测试清单。

你的核心能力：
- 准确识别功能模块和测试点
- 自动补充边界条件、异常场景、安全检查
- 合理标注优先级

输出规则：
- 严格按 JSON 格式输出
- 每个模块 5-15 个检查项（不要太少也不要太多）
- P0 占比约 30%，P1 约 50%，P2 约 20%
- 必须包含至少 2 个安全相关检查项`;

export const USER_PROMPT_TEMPLATE = (docContent) => `请根据以下需求文档生成验收测试清单。

输出 JSON 格式：
{
  "modules": [
    {
      "name": "模块名称",
      "items": [
        {
          "id": "1.1",
          "description": "检查项描述",
          "priority": "P0|P1|P2",
          "category": "functional|boundary|security|performance",
          "expected_result": "预期结果"
        }
      ]
    }
  ],
  "summary": {
    "total_items": 0,
    "p0_count": 0,
    "p1_count": 0,
    "p2_count": 0
  }
}

需求文档内容：
---
${docContent}`;
```

- [ ] **Step 6: 决策关卡**

如果经过调优后，AI 输出的验收清单质量仍然不可接受（覆盖率 < 60%，大量错误），则暂停项目，重新评估方向。

如果质量可接受（覆盖率 > 70%，少量需手动调整），继续推进。

---

## Task 2: 项目脚手架搭建（第 3 周）

**目标：** 用 Bolt.new 或 Cursor 生成项目基础框架。

**Files:**
- Create: 整个项目骨架
- Create: `.env.local`
- Create: `src/lib/supabase.js`

- [ ] **Step 1: 用 Bolt.new 生成项目**

打开 https://bolt.new ，输入以下 prompt：

```
创建一个 React + TailwindCSS 项目，名为 acceptbot。

功能：
- 单页应用，使用 React Router
- 页面：登录页、上传页、验收清单页、历史记录页、隐私协议页
- 使用 Supabase 做后端（认证 + 数据库 + 文件存储）
- 中文界面
- 简洁现代的 UI 风格，主色调为蓝色

请生成完整的项目结构和路由配置。
```

- [ ] **Step 2: 配置环境变量**

在项目根目录创建 `.env.local`：

```bash
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名Key
# 注意：DeepSeek API Key 不放前端，会通过 Supabase Edge Function 调用（见 Task 5）
```

- [ ] **Step 3: 初始化 Supabase 客户端**

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

- [ ] **Step 4: 本地运行验证**

```bash
npm install
npm run dev
# 打开 http://localhost:5173 确认页面能正常显示
```

- [ ] **Step 5: 推送到 GitHub**

```bash
git init
git add .
git commit -m "feat: initial project scaffold"
git remote add origin https://github.com/你的用户名/acceptbot.git
git push -u origin main
```

---

## Task 3: 数据库设计（第 3 周）

**目标：** 在 Supabase 中创建数据表。

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: 在 Supabase 控制台执行建表 SQL**

登录 Supabase Dashboard → SQL Editor，执行：

```sql
-- 文档表
create table documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_url text,
  page_count int,
  raw_text text,
  status text default 'uploaded' check (status in ('uploaded', 'parsing', 'generated', 'in_review', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 验收清单表
create table checklists (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  modules jsonb not null default '[]',
  summary jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 验收结果表
create table verifications (
  id uuid default gen_random_uuid() primary key,
  checklist_id uuid references checklists(id) on delete cascade,
  item_id text not null,
  status text default 'pending' check (status in ('pending', 'pass', 'fail', 'skip')),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 开启 RLS（行级安全）
alter table documents enable row level security;
alter table checklists enable row level security;
alter table verifications enable row level security;

-- RLS 策略：用户只能访问自己的数据
create policy "Users can CRUD own documents" on documents
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own checklists" on checklists
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own verifications" on verifications
  for all using (
    checklist_id in (
      select id from checklists where user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: 在 Supabase 开启文件存储**

Supabase Dashboard → Storage → Create bucket:
- Bucket 名称: `documents`
- 设为 Private
- 文件大小限制: 5MB
- 允许的 MIME 类型: `application/pdf`

- [ ] **Step 3: 开发阶段临时禁用 RLS**

数据库的 RLS（行级安全）策略依赖用户登录，但登录功能在 Task 9 才实现。开发期间先禁用 RLS，否则 Task 4-8 的所有数据操作都会被拒绝：

```sql
-- 开发阶段临时禁用（Task 9 完成后重新启用）
alter table documents disable row level security;
alter table checklists disable row level security;
alter table verifications disable row level security;
```

**重要：Task 9 完成后必须重新启用 RLS，否则所有用户数据互相可见！**

- [ ] **Step 4: 保存 migration 文件到代码库**

将上述 SQL 保存为 `supabase/migrations/001_initial_schema.sql`，方便版本管理。

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema for documents, checklists, verifications"
```

---

## Task 4: PDF 上传与解析（第 4-5 周）

**目标：** 实现 PDF 文件上传和文本提取功能。

**Files:**
- Create: `src/lib/pdf-parser.js`
- Create: `src/components/FileUpload.jsx`
- Create: `src/pages/UploadPage.jsx`

- [ ] **Step 1: 安装 PDF 解析库**

```bash
npm install pdfjs-dist
```

- [ ] **Step 2: 实现 PDF 文本提取**

```javascript
// src/lib/pdf-parser.js
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const MAX_PAGES = 50
const MAX_SIZE_MB = 5

export async function parsePdf(file) {
  // 校验文件大小
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`文件大小超过 ${MAX_SIZE_MB}MB 限制`)
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // 校验页数
  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`文件超过 ${MAX_PAGES} 页限制`)
  }

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += `\n--- 第 ${i} 页 ---\n${pageText}`
  }

  return {
    text: fullText,
    pageCount: pdf.numPages
  }
}
```

- [ ] **Step 3: 实现上传组件**

用 Cursor 生成 `FileUpload.jsx`，要求：
- 拖拽上传或点击选择 PDF 文件
- 显示文件名、大小、页数
- 上传进度条
- 文件校验（仅 PDF，≤5MB，≤50 页）
- 上传成功后调用 PDF 解析

- [ ] **Step 4: 实现上传页面**

用 Cursor 生成 `UploadPage.jsx`，整合 FileUpload 组件：
- 页面标题「上传需求文档」
- 说明文字「支持 PDF 格式，50 页以内」
- 上传成功后跳转到清单生成页
- 解析失败时显示「粘贴文本」的备选入口

- [ ] **Step 5: 本地测试**

用你准备的测试 PRD PDF 文件测试：
- 上传是否成功
- 文本提取是否完整
- 超大文件是否正确拦截

- [ ] **Step 6: Commit**

```bash
git add src/lib/pdf-parser.js src/components/FileUpload.jsx src/pages/UploadPage.jsx
git commit -m "feat: add PDF upload and text extraction"
```

---

## Task 5: AI 验收清单生成（第 5-6 周）

**目标：** 将提取的文本发送给 DeepSeek API，生成结构化验收清单。API Key 通过 Supabase Edge Function 保护，不暴露在前端。

**Files:**
- Create: `supabase/functions/generate-checklist/index.ts` — Edge Function（服务端调用 DeepSeek）
- Create: `src/lib/deepseek.js` — 前端调用 Edge Function 的封装
- Modify: `src/pages/UploadPage.jsx` — 上传后触发 AI 生成

- [ ] **Step 1: 创建 Supabase Edge Function**

在 Supabase Dashboard → Edge Functions 中创建函数，或使用 CLI：

```bash
# 安装 Supabase CLI（如未安装）
npm install -g supabase

# 初始化（在项目目录中）
supabase init

# 创建 Edge Function
supabase functions new generate-checklist
```

编辑 `supabase/functions/generate-checklist/index.ts`：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') // 安全存储在服务端

const SYSTEM_PROMPT = `你是一个拥有 10 年经验的软件测试专家，擅长从需求文档中提取验收测试清单。

你的核心能力：
- 准确识别功能模块和测试点
- 自动补充边界条件、异常场景、安全检查
- 合理标注优先级

输出规则：
- 严格按 JSON 格式输出
- 每个模块 5-15 个检查项
- P0 占比约 30%，P1 约 50%，P2 约 20%
- 必须包含至少 2 个安全相关检查项`

serve(async (req) => {
  // CORS 处理
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const { docText } = await req.json()

    if (!docText || docText.length === 0) {
      return new Response(JSON.stringify({ error: '文档内容为空' }), { status: 400 })
    }

    // 分段处理长文档
    const chunks = splitIntoChunks(docText)
    const allModules = []

    for (const chunk of chunks) {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(chunk) }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`DeepSeek API 错误: ${response.status} - ${errText}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      try {
        const result = JSON.parse(content)
        allModules.push(...result.modules)
      } catch {
        throw new Error('AI 返回的格式不正确，请重试')
      }
    }

    const merged = mergeModules(allModules)

    return new Response(JSON.stringify(merged), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || '生成失败，请重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    )
  }
})

function splitIntoChunks(text) {
  const MAX_CHUNK_LENGTH = 12000
  if (text.length <= MAX_CHUNK_LENGTH) return [text]

  const chunks = []
  const sections = text.split(/\n---\s*第\s*\d+\s*页\s*---\n/)
  let current = ''

  for (const section of sections) {
    if ((current + section).length > MAX_CHUNK_LENGTH) {
      if (current) chunks.push(current)
      current = section
    } else {
      current += section
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function buildUserPrompt(chunk) {
  return `请根据以下需求文档生成验收测试清单。

输出 JSON 格式：
{
  "modules": [
    {
      "name": "模块名称",
      "items": [
        {
          "id": "1.1",
          "description": "检查项描述",
          "priority": "P0|P1|P2",
          "category": "functional|boundary|security|performance",
          "expected_result": "预期结果"
        }
      ]
    }
  ]
}

需求文档内容：
---
${chunk}`
}

function mergeModules(modules) {
  const merged = new Map()
  for (const mod of modules) {
    if (merged.has(mod.name)) {
      merged.get(mod.name).items.push(...mod.items)
    } else {
      merged.set(mod.name, { ...mod })
    }
  }

  const result = Array.from(merged.values())
  result.forEach((mod, mi) => {
    mod.items.forEach((item, ii) => {
      item.id = `${mi + 1}.${ii + 1}`
    })
  })

  const totalItems = result.reduce((sum, m) => sum + m.items.length, 0)
  return {
    modules: result,
    summary: {
      total_items: totalItems,
      p0_count: result.reduce((s, m) => s + m.items.filter(i => i.priority === 'P0').length, 0),
      p1_count: result.reduce((s, m) => s + m.items.filter(i => i.priority === 'P1').length, 0),
      p2_count: result.reduce((s, m) => s + m.items.filter(i => i.priority === 'P2').length, 0)
    }
  }
}
```

- [ ] **Step 2: 设置 Edge Function 环境变量**

```bash
# 在 Supabase Dashboard → Edge Functions → Secrets 中添加：
# DEEPSEEK_API_KEY = 你的DeepSeek_API_Key

# 或使用 CLI：
supabase secrets set DEEPSEEK_API_KEY=你的Key
```

- [ ] **Step 3: 部署 Edge Function**

```bash
supabase functions deploy generate-checklist
```

- [ ] **Step 4: 前端封装调用**

```javascript
// src/lib/deepseek.js
import { supabase } from './supabase'

export async function generateChecklist(docText) {
  const { data, error } = await supabase.functions.invoke('generate-checklist', {
    body: { docText }
  })

  if (error) {
    throw new Error(error.message || '生成失败，请重试')
  }

  return data
}
```

这样 DeepSeek API Key 只存在于服务端，前端代码中完全不包含。
```

- [ ] **Step 2: 在上传页面集成 AI 生成**

修改 UploadPage：
- PDF 解析完成后，显示「正在生成验收清单...」加载状态
- 调用 `generateChecklist(text)`
- 生成成功后将结果存入 Supabase（documents + checklists 表）
- 跳转到 ChecklistPage

- [ ] **Step 3: 测试 AI 生成效果**

用 3 份测试 PRD 验证：
- 生成速度是否可接受（< 30 秒）
- JSON 解析是否成功
- 清单质量是否与 Step 1 手动测试一致
- 长文档分段是否正常工作

- [ ] **Step 4: 添加错误处理**

- API 调用失败 → 提示「生成失败，请重试」
- JSON 解析失败 → 提示「AI 输出异常，请重试或粘贴文本重新上传」
- 超时处理 → 60 秒超时，提示重试

- [ ] **Step 5: Commit**

```bash
git add src/lib/deepseek.js src/prompts/ src/pages/UploadPage.jsx
git commit -m "feat: integrate DeepSeek API for checklist generation"
```

---

## Task 6: 验收清单展示与编辑（第 6-7 周）

**目标：** 展示 AI 生成的验收清单，支持编辑（增删项、改优先级）。

**Files:**
- Create: `src/pages/ChecklistPage.jsx`
- Create: `src/components/ChecklistView.jsx`
- Create: `src/components/ChecklistItem.jsx`
- Create: `src/hooks/useChecklist.js`

- [ ] **Step 1: 实现清单数据管理 hook**

```javascript
// src/hooks/useChecklist.js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useChecklist(checklistId) {
  const [modules, setModules] = useState([])
  const [summary, setSummary] = useState({})

  // 加载清单
  const loadChecklist = useCallback(async () => {
    const { data } = await supabase
      .from('checklists')
      .select('*')
      .eq('id', checklistId)
      .single()
    if (data) {
      setModules(data.modules)
      setSummary(data.summary)
    }
  }, [checklistId])

  // 添加检查项
  const addItem = (moduleIndex, item) => {
    const updated = [...modules]
    updated[moduleIndex].items.push(item)
    setModules(updated)
    saveToDb(updated)
  }

  // 删除检查项
  const removeItem = (moduleIndex, itemIndex) => {
    const updated = [...modules]
    updated[moduleIndex].items.splice(itemIndex, 1)
    setModules(updated)
    saveToDb(updated)
  }

  // 修改优先级
  const updatePriority = (moduleIndex, itemIndex, priority) => {
    const updated = [...modules]
    updated[moduleIndex].items[itemIndex].priority = priority
    setModules(updated)
    saveToDb(updated)
  }

  // 保存到数据库
  const saveToDb = async (updatedModules) => {
    await supabase
      .from('checklists')
      .update({ modules: updatedModules, updated_at: new Date() })
      .eq('id', checklistId)
  }

  return { modules, summary, loadChecklist, addItem, removeItem, updatePriority }
}
```

- [ ] **Step 2: 用 Cursor 生成清单 UI 组件**

告诉 Cursor 生成 ChecklistView 和 ChecklistItem：
- 按模块分组显示，可折叠
- 每个检查项显示：编号、描述、优先级标签（P0 红色/P1 黄色/P2 灰色）、预期结果
- 支持删除检查项（确认弹窗）
- 支持添加自定义检查项（点击「+ 添加」按钮）
- 优先级可点击切换
- 顶部显示汇总：总数、P0/P1/P2 数量

- [ ] **Step 3: 实现清单页面**

ChecklistPage 整合所有组件：
- 从 URL 参数获取 checklistId
- 加载并显示清单
- 顶部工具栏：返回、导出报告（暂时禁用）、反馈

- [ ] **Step 4: 本地测试**

- 生成一份清单后跳转到清单页
- 测试增删检查项
- 测试优先级切换
- 刷新页面后数据是否保留（Supabase 持久化）

- [ ] **Step 5: Commit**

```bash
git add src/pages/ChecklistPage.jsx src/components/Checklist*.jsx src/hooks/useChecklist.js
git commit -m "feat: add checklist view with edit capabilities"
```

---

## Task 7: 在线验收流程（第 8-9 周）

**目标：** 用户逐项勾选验收结果（通过/不通过/跳过），可添加备注。

**Files:**
- Modify: `src/components/ChecklistItem.jsx` — 添加验收操作
- Modify: `src/hooks/useChecklist.js` — 添加验收状态管理
- Modify: `src/pages/ChecklistPage.jsx` — 添加验收进度条

- [ ] **Step 1: 扩展 ChecklistItem 组件**

为每个检查项添加验收操作：
- 三个按钮：✓ 通过（绿）、✗ 不通过（红）、— 跳过（灰）
- 点击「不通过」时展开备注输入框
- 已验收的项显示状态标记
- 未验收的项显示为待处理状态

- [ ] **Step 2: 验收状态存入数据库**

每次点击验收按钮，写入 verifications 表：

```javascript
// 在 useChecklist.js 中添加
const setVerification = async (itemId, status, note = '') => {
  const { data: existing } = await supabase
    .from('verifications')
    .select('id')
    .eq('checklist_id', checklistId)
    .eq('item_id', itemId)
    .single()

  if (existing) {
    await supabase
      .from('verifications')
      .update({ status, note, updated_at: new Date() })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('verifications')
      .insert({ checklist_id: checklistId, item_id: itemId, status, note })
  }
}
```

- [ ] **Step 3: 添加验收进度条**

在 ChecklistPage 顶部添加进度显示：
- 进度条：已验收 / 总数
- 统计：通过 X 项、不通过 X 项、跳过 X 项
- 全部验收完成时显示「验收完成，可导出报告」

- [ ] **Step 4: 测试验收流程**

- 逐项点击验收，确认状态保存正确
- 刷新页面后验收状态是否保留
- 进度条是否实时更新
- 备注输入是否正常保存

- [ ] **Step 5: Commit**

```bash
git add src/components/ChecklistItem.jsx src/hooks/useChecklist.js src/pages/ChecklistPage.jsx
git commit -m "feat: add verification flow with pass/fail/skip and notes"
```

---

## Task 8: 验收报告导出（第 9-10 周）

**目标：** 一键导出验收报告 PDF，包含汇总统计、按模块通过率和逐项明细。

**方案选择：** 使用 HTML 报告页面 + 浏览器 `window.print()` 生成 PDF。不用 jsPDF，因为 jsPDF 不原生支持中文，字体嵌入对非开发者来说坑太多。浏览器打印方案零依赖、天然支持中文。

**Files:**
- Create: `src/components/ReportExport.jsx` — 导出按钮
- Create: `src/components/ReportView.jsx` — 可打印的报告页面

- [ ] **Step 1: 创建可打印的报告组件**

```jsx
// src/components/ReportView.jsx
export function ReportView({ document, checklist, verifications }) {
  const passCount = verifications.filter(v => v.status === 'pass').length
  const failCount = verifications.filter(v => v.status === 'fail').length
  const skipCount = verifications.filter(v => v.status === 'skip').length
  const total = checklist.summary.total_items
  const passRate = total > 0 ? Math.round(passCount / total * 100) : 0

  return (
    <div id="report-content" className="print-area p-8 bg-white text-black">
      <h1 className="text-2xl font-bold text-center mb-6">验收测试报告</h1>

      {/* 基本信息 */}
      <div className="mb-6 text-sm">
        <p>文档：{document.filename}</p>
        <p>日期：{new Date().toLocaleDateString('zh-CN')}</p>
      </div>

      {/* 汇总统计 */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h2 className="font-bold mb-2">汇总</h2>
        <p>总检查项：{total} | 通过：{passCount} | 不通过：{failCount} | 跳过：{skipCount}</p>
        <p className="text-lg font-bold">整体通过率：{passRate}%</p>
      </div>

      {/* 按模块明细 */}
      {checklist.modules.map((mod, mi) => {
        const modItems = mod.items
        const modVerifications = modItems.map(item =>
          verifications.find(v => v.item_id === item.id)
        )
        const modPass = modVerifications.filter(v => v?.status === 'pass').length
        const modRate = modItems.length > 0 ? Math.round(modPass / modItems.length * 100) : 0

        return (
          <div key={mi} className="mb-6 break-inside-avoid">
            <h2 className="font-bold text-lg mb-1">
              {mod.name}
              <span className="text-sm font-normal ml-2">（通过率：{modRate}%）</span>
            </h2>
            <table className="w-full text-sm border-collapse border">
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th className="border p-2 w-12">编号</th>
                  <th className="border p-2">检查项</th>
                  <th className="border p-2 w-12">优先级</th>
                  <th className="border p-2 w-16">结果</th>
                  <th className="border p-2">备注</th>
                </tr>
              </thead>
              <tbody>
                {modItems.map((item, ii) => {
                  const v = modVerifications[ii]
                  const statusMap = { pass: '通过', fail: '不通过', skip: '跳过', pending: '未验收' }
                  const statusColor = { pass: 'text-green-600', fail: 'text-red-600', skip: 'text-gray-400' }
                  return (
                    <tr key={ii}>
                      <td className="border p-2">{item.id}</td>
                      <td className="border p-2">{item.description}</td>
                      <td className="border p-2 text-center">{item.priority}</td>
                      <td className={`border p-2 text-center ${statusColor[v?.status] || ''}`}>
                        {statusMap[v?.status] || '未验收'}
                      </td>
                      <td className="border p-2">{v?.note || ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 添加打印样式**

在全局 CSS 中添加打印样式：

```css
/* 添加到 src/index.css 或 App.css */
@media print {
  body * { visibility: hidden; }
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
```

- [ ] **Step 3: 实现导出按钮**

```jsx
// src/components/ReportExport.jsx
export function ReportExport({ disabled }) {
  const handleExport = () => {
    window.print()  // 浏览器弹出打印对话框，用户选择「另存为 PDF」
  }

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="no-print bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      导出报告 (PDF)
    </button>
  )
}
```

- [ ] **Step 4: 在清单页面集成报告**

修改 ChecklistPage：
- 添加「导出报告」按钮（验收完成后可点击）
- 点击后渲染 ReportView 组件并调用 `window.print()`
- 用户在打印对话框中选择「另存为 PDF」即可保存

- [ ] **Step 5: 测试报告导出**

- 完成一份完整验收后点击导出
- 确认中文正常显示（使用浏览器打印，天然支持中文）
- 确认每个模块有独立的通过率统计
- 确认表格排版和分页正常

- [ ] **Step 6: Commit**

```bash
git add src/components/ReportExport.jsx src/components/ReportView.jsx src/pages/ChecklistPage.jsx
git commit -m "feat: add printable report with per-module pass rates"
```

---

## Task 9: 用户认证（第 10 周）

**目标：** 实现手机号 + 短信验证码登录。

**Files:**
- Create: `src/pages/LoginPage.jsx`
- Create: `src/hooks/useAuth.js`
- Modify: `src/App.jsx` — 添加路由保护

- [ ] **Step 1: 在 Supabase 开启手机号认证**

Supabase Dashboard → Authentication → Providers:
- 开启 Phone provider
- 配置短信服务商（Supabase 内置 Twilio，或对接阿里云短信）

备选方案：如果短信对接复杂，MVP 阶段可先用**邮箱 + 密码登录**（Supabase 默认支持，零配置），后续升级为手机号。邮箱登录的代码改动很小：

```javascript
// 邮箱登录（备选方案，替换 signInWithPhone 和 verifyOtp）
const signUp = async (email, password) => {
  return await supabase.auth.signUp({ email, password })
}
const signIn = async (email, password) => {
  return await supabase.auth.signInWithPassword({ email, password })
}
```

- [ ] **Step 2: 实现认证 hook**

```javascript
// src/hooks/useAuth.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPhone = async (phone) => {
    return await supabase.auth.signInWithOtp({ phone })
  }

  const verifyOtp = async (phone, token) => {
    return await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  }

  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  return { user, loading, signInWithPhone, verifyOtp, signOut }
}
```

- [ ] **Step 3: 用 Cursor 生成登录页面**

告诉 Cursor 生成 LoginPage：
- 简洁的居中登录卡片
- Step 1: 输入手机号 → 点击「发送验证码」
- Step 2: 输入验证码 → 点击「登录」
- 60 秒倒计时重发
- 登录成功后跳转到上传页

- [ ] **Step 4: 添加路由保护**

修改 App.jsx，未登录用户只能访问登录页和隐私协议页，其他页面需登录。

- [ ] **Step 5: 重新启用 RLS**

**关键步骤！** Task 3 中临时禁用了 RLS，现在认证功能就位，必须重新启用：

```sql
-- 在 Supabase SQL Editor 中执行
alter table documents enable row level security;
alter table checklists enable row level security;
alter table verifications enable row level security;
```

启用后测试：登录用户只能看到自己的数据。

- [ ] **Step 6: 测试登录流程**

- 发送验证码是否收到
- 登录成功后是否跳转
- 刷新页面是否保持登录状态
- 退出登录是否正常

- [ ] **Step 6: Commit**

```bash
git add src/pages/LoginPage.jsx src/hooks/useAuth.js src/App.jsx
git commit -m "feat: add phone auth with OTP verification"
```

---

## Task 10: 历史记录 + 反馈 + 隐私协议（第 10-11 周）

**目标：** 补全辅助页面。

**Files:**
- Create: `src/pages/HistoryPage.jsx`
- Create: `src/pages/PrivacyPage.jsx`
- Create: `src/components/FeedbackWidget.jsx`

- [ ] **Step 1: 历史记录页**

用 Cursor 生成 HistoryPage：
- 列出用户所有文档，按时间倒序
- 每条显示：文件名、状态、创建时间、验收进度
- 点击进入对应的清单页
- 支持删除（确认弹窗）

- [ ] **Step 2: 隐私协议页**

创建 PrivacyPage，内容包括：
- 数据收集范围（文档内容、手机号）
- 数据用途（仅用于生成验收清单）
- 数据存储（Supabase 云端，30 天自动清理）
- 第三方服务（DeepSeek AI 处理）
- 用户权利（可随时删除数据）
- 联系方式

- [ ] **Step 3: 反馈组件**

创建 FeedbackWidget — 右下角浮动按钮：
- 点击展开反馈表单
- 选择类型：建议 / Bug / 其他
- 文字输入框
- 提交后存入 Supabase 新表 `feedback`

```sql
-- 在 Supabase 执行
create table feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  type text check (type in ('suggestion', 'bug', 'other')),
  content text not null,
  created_at timestamptz default now()
);

alter table feedback enable row level security;
create policy "Users can insert feedback" on feedback
  for insert with check (auth.uid() = user_id);
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/HistoryPage.jsx src/pages/PrivacyPage.jsx src/components/FeedbackWidget.jsx
git commit -m "feat: add history, privacy policy, and feedback widget"
```

---

## Task 11: UI 打磨与 Prompt 调优（第 11-12 周）

**目标：** 优化用户体验，提升 AI 输出质量。

- [ ] **Step 1: UI 优化**

用 Cursor 辅助优化：
- 响应式布局（手机也能看，但不用很完美）
- Loading 状态动画（AI 生成时）
- 空状态页面（无历史记录时）
- Toast 提示（操作成功/失败）
- 页面标题和 favicon

- [ ] **Step 2: Prompt 持续调优**

用更多真实 PRD 测试，记录问题并优化 prompt：
- 某些模块遗漏 → 补充 prompt 中的模块识别规则
- 检查项太泛 → 要求更具体的描述
- 边界条件质量低 → 提供更好的示例

- [ ] **Step 3: 性能优化**

- AI 生成过程添加流式显示（可选，如果 DeepSeek 支持 streaming）
- 大文档分段时显示进度（正在处理第 X/Y 段）
- 清单页面虚拟滚动（如果检查项超过 100 条）

- [ ] **Step 4: 全流程自测**

完整走一遍：注册 → 登录 → 上传 → 生成清单 → 编辑 → 验收 → 导出报告
记录所有 bug，修复。

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "polish: UI improvements and prompt optimization"
```

---

## Task 12: 部署上线（第 13 周）

**目标：** 部署到 Vercel，绑定域名，正式上线。

- [ ] **Step 1: 部署到 Vercel**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 设置环境变量（在 Vercel Dashboard 中）
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_DEEPSEEK_API_KEY
```

- [ ] **Step 2: 绑定域名**

Vercel Dashboard → Settings → Domains:
- 添加你的域名
- 在域名服务商处配置 DNS 解析（CNAME 指向 Vercel）

- [ ] **Step 3: 确认 ICP 备案完成**

如果备案未完成，先用 Vercel 提供的 .vercel.app 子域名临时使用。
备案完成后切换到正式域名。

- [ ] **Step 4: 上线前检查清单**

- [ ] 登录流程正常
- [ ] PDF 上传和解析正常
- [ ] AI 生成清单正常
- [ ] 验收勾选和保存正常
- [ ] PDF 报告导出正常
- [ ] 隐私协议页面内容完整
- [ ] 反馈功能正常
- [ ] 移动端基本可用

- [ ] **Step 5: Commit & Tag**

```bash
git add .
git commit -m "deploy: production deployment v1.0"
git tag v1.0.0
git push origin main --tags
```

---

## Task 13: 冷启动推广（第 14-16 周）

**目标：** 获取第一批 100 用户。

- [ ] **Step 1: 朋友圈首发（第 14 周）**

编写朋友圈推广文案：
```
做了 10 年测试，最烦的就是每次验收都要从头写清单。
做了个小工具：上传 PRD，AI 自动生成验收清单，在线打勾，一键导出报告。
免费用，求体验反馈：[链接]
```

发到：
- 个人朋友圈
- 测试/项目管理行业微信群
- 前同事私信推荐

- [ ] **Step 2: 建立用户微信群**

- 创建「验收助手用户群」
- 在产品内引导加群（反馈 Widget 旁边放二维码）
- 群内收集反馈，快速响应

- [ ] **Step 3: 知乎内容（第 14-15 周）**

撰写 2 篇知乎回答：
- 「软件验收测试怎么做才规范？」— 分享方法论 + 工具
- 「有没有好用的测试管理工具推荐？」— 对比竞品 + 推荐自己的

- [ ] **Step 4: TesterHome 发帖（第 15 周）**

在 TesterHome 发一篇经验帖：
- 「AI 时代，验收测试还需要手写用例吗？」
- 分享 AI 生成清单的实践经验
- 文末带产品链接

- [ ] **Step 5: 小红书内容（第 16 周）**

发 2-3 条小红书：
- 产品演示截图 + 「测试人效率神器」
- 「3 分钟完成验收，10 年测试老兵的工具」

- [ ] **Step 6: 第 16 周评估**

统计数据：
- 注册用户数
- 活跃用户数（完成过完整验收流程）
- 反馈内容汇总
- 各渠道获客效果

根据结果决定下一步（参考设计文档中的成功标准）。

---

## 风险与应对

| 风险 | 应对方案 |
|------|----------|
| AI 输出质量不稳定 | Task 1 先验证，不合格就暂停项目 |
| Bolt/Cursor 生成的代码有 bug | 预留 Task 11 整周修 bug，不急着上线 |
| ICP 备案延迟 | 先用 .vercel.app 域名小范围测试 |
| 短信对接复杂 | MVP 先用邮箱登录，后续升级 |
| DeepSeek API 不可用 | 切换到通义千问或 GLM-4 |
| 12 周开发时间不够 | 进一步砍功能：先不做编辑清单，只做查看 + 验收 |
