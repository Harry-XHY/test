import { MERGE_SYSTEM_PROMPT, buildMergeUserPrompt } from './merge-prompt'

const MAX_CHUNK = 12000

function getConfig() {
  const provider = localStorage.getItem('ai_provider') || 'minimax-2.7'
  const apiKey = localStorage.getItem('ai_api_key')
  if (!apiKey) throw new Error('请先在设置中配置 API Key')

  const isDev = import.meta.env.DEV
  return {
    name: 'MiniMax M2.7',
    apiUrl: isDev
      ? '/api/minimax-anthropic/v1/messages'
      : 'https://api.minimaxi.com/anthropic/v1/messages',
    model: 'MiniMax-M2.7',
    apiKey,
    apiFormat: 'anthropic',
  }
}

async function callMergeApi(systemPrompt, userContent) {
  const config = getConfig()
  const body = {
    model: config.model,
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI 服务错误 (${response.status}): ${errText}`)
  }

  const data = await response.json()

  if (Array.isArray(data.content)) {
    const textBlocks = data.content.filter((b) => b.type === 'text' && b.text)
    if (textBlocks.length > 0) return textBlocks[textBlocks.length - 1].text
    const last = data.content[data.content.length - 1]
    if (last?.text || last?.thinking) return last.text || last.thinking
  }

  throw new Error('AI 返回格式异常')
}

/**
 * 整合多个文档为一份 Markdown PRD
 * @param {Array<{name: string, text: string}>} documents - 按版本顺序排列
 * @param {function} onProgress - 进度回调 ({percent, message})
 * @returns {Promise<string>} Markdown 文本
 */
export async function mergeDocuments(documents, onProgress) {
  const totalText = documents.map((d) => d.text).join('\n')

  onProgress?.({ percent: 10, message: '准备文档...' })

  if (totalText.length <= MAX_CHUNK) {
    onProgress?.({ percent: 30, message: 'AI 整合中...' })
    const userPrompt = buildMergeUserPrompt(documents)
    const result = await callMergeApi(MERGE_SYSTEM_PROMPT, userPrompt)
    onProgress?.({ percent: 100, message: '完成' })
    return result
  }

  onProgress?.({ percent: 15, message: '文档较长，分段处理...' })

  const summaries = []
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]
    const pct = 15 + Math.round((i / documents.length) * 50)
    onProgress?.({ percent: pct, message: `摘要第 ${i + 1}/${documents.length} 份文档...` })

    if (doc.text.length <= MAX_CHUNK) {
      summaries.push({ name: doc.name, text: doc.text })
    } else {
      const extractPrompt = `请提取以下文档中的所有功能需求、非功能需求和关键信息，保留原始描述，用 Markdown 列表输出：\n\n${doc.text.substring(0, MAX_CHUNK)}`
      const summary = await callMergeApi(
        '你是一个文档摘要专家，请精确提取需求内容，不要遗漏任何功能点。',
        extractPrompt
      )
      summaries.push({ name: doc.name, text: summary })
    }
  }

  onProgress?.({ percent: 75, message: 'AI 正在生成最终文档...' })
  const userPrompt = buildMergeUserPrompt(summaries)
  const result = await callMergeApi(MERGE_SYSTEM_PROMPT, userPrompt)
  onProgress?.({ percent: 100, message: '完成' })
  return result
}
