import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '../prompts/acceptance-prompt'

const MAX_CHUNK_LENGTH = 12000

// 支持的模型供应商配置
// 开发环境用本地代理绕过 CORS，生产环境用直连或服务端代理
const isDev = import.meta.env.DEV

const PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    apiUrl: isDev ? '/api/deepseek/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    keyPrefix: 'sk-',
    getKey: 'https://platform.deepseek.com',
    supportsJsonFormat: true,
  },
  minimax: {
    name: 'MiniMax',
    apiUrl: isDev ? '/api/minimax/v1/text/chatcompletion_v2' : 'https://api.minimax.chat/v1/text/chatcompletion_v2',
    model: 'MiniMax-Text-01',
    keyPrefix: 'eyJ',
    getKey: 'https://platform.minimaxi.com',
    supportsJsonFormat: false,
  },
  'minimax-2.7': {
    name: 'MiniMax M2.7',
    apiUrl: isDev ? '/api/minimax-anthropic/v1/messages' : 'https://api.minimaxi.com/anthropic/v1/messages',
    model: 'MiniMax-M2.7',
    keyPrefix: '',
    getKey: 'https://platform.minimaxi.com',
    supportsJsonFormat: false,
    apiFormat: 'anthropic',
  },
}

function getConfig() {
  const provider = localStorage.getItem('ai_provider') || 'deepseek'
  const apiKey = localStorage.getItem('ai_api_key')
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key')
  }
  return { ...PROVIDERS[provider], apiKey, providerId: provider }
}

export function getProviders() {
  return PROVIDERS
}

function splitIntoChunks(text) {
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

async function callApi(config, userContent) {
  let body, headers

  if (config.apiFormat === 'anthropic') {
    // MiniMax Anthropic 兼容格式
    body = {
      model: config.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userContent },
      ],
    }
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    }
  } else {
    // OpenAI 兼容格式（DeepSeek / MiniMax）
    body = {
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
    }
    if (config.supportsJsonFormat) {
      body.response_format = { type: 'json_object' }
    }
    headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    }
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`${config.name} 服务错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()

  // 兼容不同供应商的返回格式
  let content = null
  if (config.apiFormat === 'anthropic') {
    // Anthropic / MiniMax M2.7 格式：data.content 是数组
    // M2.7 是推理模型，content 可能包含 thinking 块 + text 块
    // 取最后一个 type=text 的块（跳过 thinking）
    if (Array.isArray(data.content)) {
      const textBlocks = data.content.filter((b) => b.type === 'text' && b.text)
      if (textBlocks.length > 0) {
        content = textBlocks[textBlocks.length - 1].text
      } else {
        // 如果没有 text 字段，可能所有内容都在 thinking 里
        // 尝试取最后一个块的 thinking 或 text
        const lastBlock = data.content[data.content.length - 1]
        content = lastBlock?.text || lastBlock?.thinking || null
      }
    }
  } else if (data.choices?.[0]?.message?.content) {
    // OpenAI 兼容格式
    content = data.choices[0].message.content
  } else if (data.reply) {
    // MiniMax 旧格式
    content = data.reply
  } else if (data.choices?.[0]?.text) {
    content = data.choices[0].text
  }

  if (!content) {
    console.error('API 返回数据:', JSON.stringify(data).slice(0, 500))
    throw new Error(`${config.name} 返回数据格式不识别，请检查 API Key 和模型配置`)
  }

  // 从返回内容中提取 JSON（处理可能包含 markdown 代码块的情况）
  let jsonStr = content
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  try {
    return JSON.parse(jsonStr)
  } catch {
    console.error('JSON 解析失败，原始内容:', content.slice(0, 500))
    throw new Error(`${config.name} 返回格式异常，请重试`)
  }
}

export async function generateChecklist(docText, onProgress) {
  const config = getConfig()
  const chunks = splitIntoChunks(docText)
  const allModules = []

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) {
      onProgress({ current: i + 1, total: chunks.length, provider: config.name })
    }

    const result = await callApi(config, USER_PROMPT_TEMPLATE(chunks[i]))
    if (result.modules) {
      allModules.push(...result.modules)
    }
  }

  return mergeModules(allModules)
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
      p0_count: result.reduce(
        (s, m) => s + m.items.filter((i) => i.priority === 'P0').length,
        0
      ),
      p1_count: result.reduce(
        (s, m) => s + m.items.filter((i) => i.priority === 'P1').length,
        0
      ),
      p2_count: result.reduce(
        (s, m) => s + m.items.filter((i) => i.priority === 'P2').length,
        0
      ),
    },
  }
}

// 使用本地 mock 数据进行演示
export function generateMockChecklist() {
  return {
    modules: [
      {
        name: '用户注册',
        items: [
          { id: '1.1', description: '手机号注册流程正常完成', priority: 'P0', category: 'functional', expected_result: '用户成功注册并跳转到首页' },
          { id: '1.2', description: '邮箱注册流程正常完成', priority: 'P0', category: 'functional', expected_result: '用户成功注册并收到验证邮件' },
          { id: '1.3', description: '已注册手机号重复注册提示', priority: 'P1', category: 'boundary', expected_result: '提示"该手机号已注册"' },
          { id: '1.4', description: '密码强度不足时拒绝注册', priority: 'P1', category: 'boundary', expected_result: '提示密码要求并阻止提交' },
          { id: '1.5', description: '注册接口防暴力破解', priority: 'P1', category: 'security', expected_result: '同一IP短时间多次请求被限流' },
          { id: '1.6', description: '验证码过期后无法使用', priority: 'P2', category: 'security', expected_result: '提示验证码已过期，请重新获取' },
        ],
      },
      {
        name: '用户登录',
        items: [
          { id: '2.1', description: '正确账号密码登录成功', priority: 'P0', category: 'functional', expected_result: '登录成功跳转到首页' },
          { id: '2.2', description: '错误密码登录失败', priority: 'P0', category: 'functional', expected_result: '提示"账号或密码错误"' },
          { id: '2.3', description: '连续输错密码锁定账号', priority: 'P1', category: 'security', expected_result: '5次错误后锁定15分钟' },
          { id: '2.4', description: '记住登录状态功能', priority: 'P2', category: 'functional', expected_result: '勾选后7天内免登录' },
          { id: '2.5', description: '登录页面响应式布局', priority: 'P2', category: 'performance', expected_result: '移动端和桌面端正常显示' },
        ],
      },
      {
        name: '订单管理',
        items: [
          { id: '3.1', description: '创建订单流程正常', priority: 'P0', category: 'functional', expected_result: '订单创建成功并显示订单号' },
          { id: '3.2', description: '订单列表分页加载', priority: 'P1', category: 'functional', expected_result: '每页20条，翻页正常' },
          { id: '3.3', description: '订单状态流转正确', priority: 'P0', category: 'functional', expected_result: '待支付→已支付→已发货→已完成' },
          { id: '3.4', description: '取消订单后库存回滚', priority: 'P0', category: 'boundary', expected_result: '取消后商品库存恢复' },
          { id: '3.5', description: '大量并发下单不超卖', priority: 'P1', category: 'performance', expected_result: '库存不出现负数' },
          { id: '3.6', description: '订单金额计算精度', priority: 'P1', category: 'boundary', expected_result: '金额精确到分，无浮点误差' },
        ],
      },
    ],
    summary: {
      total_items: 17,
      p0_count: 6,
      p1_count: 7,
      p2_count: 4,
    },
  }
}
