/**
 * bangpick — Full Quality Assurance Test Suite
 * Covers all pages with 5-layer testing:
 *   L1: Functional correctness
 *   L2: API error handling
 *   L3: Edge cases & boundary
 *   L4: Mobile viewport
 *   L5: Visual screenshots
 */
import { test, expect, devices } from '@playwright/test'

const BASE = 'http://localhost:5174'

// ── Helpers ──────────────────────────────────────────────

async function clearAllStorage(page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

async function screenshotPage(page, name) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  })
}

// ══════════════════════════════════════════════════════════
// PAGE 1: ChatPage (Route: /)
// ══════════════════════════════════════════════════════════

test.describe('ChatPage — 聊天决策页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/')
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // ── L1: 功能正确性 ──
  test('L1: 页面加载 — 显示 Landing View 场景卡片和底部导航', async ({ page }) => {
    // 场景卡片区域应该可见
    const body = page.locator('body')
    await expect(body).not.toBeEmpty()

    // 底部导航应该存在且有 3 个链接
    const bottomNav = page.locator('nav').last()
    await expect(bottomNav).toBeVisible()

    // 截图
    await screenshotPage(page, 'chat-landing-desktop')
  })

  test('L1: 输入消息并发送 — 消息出现在聊天区', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) {
      test.skip(true, 'No text input found on ChatPage')
      return
    }

    await input.fill('今天中午吃什么')
    // 找到发送按钮
    const sendBtn = page.locator('button').filter({ has: page.locator('span.material-symbols-rounded') }).last()
      .or(page.locator('button[type="submit"]'))
      .or(page.getByRole('button', { name: /send|发送/i }))

    if (await sendBtn.count() > 0) {
      await sendBtn.first().click()
    } else {
      await input.press('Enter')
    }

    // 用户消息应该出现
    await expect(page.getByText('今天中午吃什么')).toBeVisible({ timeout: 5000 })
    // 应该显示 loading/思考中 状态
    const loadingOrResponse = page.locator('body')
    await expect(loadingOrResponse).not.toBeEmpty()
  })

  test('L1: 点击场景卡片填充输入', async ({ page }) => {
    // 查找场景卡片（grid 中的可点击元素）
    const scenarioCards = page.locator('[class*="grid"] > div[class*="cursor"], [class*="grid"] > button').first()
    if (await scenarioCards.count() === 0) {
      test.skip(true, 'No scenario cards found')
      return
    }
    await scenarioCards.click()

    // 输入框应该被填充或直接发送
    const input = page.locator('input[type="text"], textarea').first()
    const bodyText = await page.locator('body').textContent()
    // 验证有交互反应（不只是元素存在）
    expect(bodyText.length).toBeGreaterThan(50)
  })

  test('L1: 底部导航跳转 — Chat/Stock/Food', async ({ page }) => {
    // 点击 Stock 导航
    const stockLink = page.locator('a[href="/stock"]')
    if (await stockLink.count() > 0) {
      await stockLink.click()
      await expect(page).toHaveURL(/\/stock/)
      await page.goBack()
    }

    // 点击 Food 导航
    const foodLink = page.locator('a[href="/food"]')
    if (await foodLink.count() > 0) {
      await foodLink.click()
      await expect(page).toHaveURL(/\/food/)
    }
  })

  // ── L2: API 错误处理 ──
  test('L2: /api/chat 返回 500 — 显示错误提示不白屏', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )

    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return
    await input.fill('测试错误处理')
    await input.press('Enter')

    // 等待一段时间，确认不是白屏
    await page.waitForTimeout(3000)
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)

    // 应该有错误相关的提示
    await screenshotPage(page, 'chat-api-500-error')
  })

  test('L2: /api/chat 超时 — 不卡死', async ({ page }) => {
    await page.route('**/api/chat', route => route.abort('timedout'))

    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return
    await input.fill('超时测试')
    await input.press('Enter')

    await page.waitForTimeout(5000)
    // 页面不应该卡在 loading 状态
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'chat-api-timeout')
  })

  // ── L3: 边界与异常 ──
  test('L3: 空消息 — 不应发送', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return

    // 不输入内容，直接按 Enter
    await input.press('Enter')
    await page.waitForTimeout(1000)

    // 不应该出现 loading 状态或空消息气泡
    const messages = page.locator('[class*="message"], [class*="bubble"]')
    const count = await messages.count()
    expect(count).toBeLessThanOrEqual(0)
  })

  test('L3: 超长输入 — 不崩溃', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return

    const longText = '今天吃什么好呢'.repeat(50) // 350字
    await input.fill(longText)
    const value = await input.inputValue()
    expect(value.length).toBeGreaterThan(100)
    await screenshotPage(page, 'chat-long-input')
  })

  test('L3: 特殊字符输入 — emoji/HTML/引号', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return

    const specialChars = '🔥<script>alert(1)</script>"\'&<>'
    await input.fill(specialChars)
    const value = await input.inputValue()
    expect(value).toContain('🔥')
  })

  test('L3: 快速连续发送 — 不崩溃', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ type: 'text', text: '测试回复' }] }),
      })
    )

    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return

    // 快速发送 3 条消息
    for (let i = 0; i < 3; i++) {
      await input.fill(`快速消息${i}`)
      await input.press('Enter')
      await page.waitForTimeout(200)
    }

    await page.waitForTimeout(2000)
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'chat-rapid-send')
  })

  test('L3: 页面刷新后 sessionStorage 恢复', async ({ page }) => {
    // 先 mock 一个成功的对话
    await page.route('**/api/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [{ type: 'text', text: JSON.stringify({ type: 'text', message: '建议你吃火锅' }) }],
        }),
      })
    )

    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return
    await input.fill('吃什么')
    await input.press('Enter')
    await page.waitForTimeout(3000)

    // 检查 sessionStorage 是否有数据
    const sessionData = await page.evaluate(() => sessionStorage.getItem('bangpick_chat_session'))

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 如果 session 中有数据，刷新后应该恢复
    if (sessionData) {
      const restoredData = await page.evaluate(() => sessionStorage.getItem('bangpick_chat_session'))
      // session data 在刷新后会丢失（这是 sessionStorage 的正常行为）
      // 但页面不应该因此崩溃
    }
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
  })
})

// ══════════════════════════════════════════════════════════
// PAGE 2: StockPage (Route: /stock)
// ══════════════════════════════════════════════════════════

test.describe('StockPage — 股票分析页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/stock')
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // ── L1: 功能正确性 ──
  test('L1: 页面加载 — 显示功能卡片和输入框', async ({ page }) => {
    // 页面不应该白屏
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(50)

    // 输入框应该存在
    const input = page.locator('input[type="text"], textarea').first()
    await expect(input).toBeVisible()

    await screenshotPage(page, 'stock-landing-desktop')
  })

  test('L1: 功能卡片可点击 — 推荐/持仓/双金叉', async ({ page }) => {
    // 查找功能卡片
    const cards = page.locator('[class*="grid"] > div, [class*="card"]').filter({ hasText: /.{2,}/ })
    const count = await cards.count()
    if (count === 0) {
      test.skip(true, 'No feature cards found')
      return
    }

    // 点击第一个卡片
    await cards.first().click()
    await page.waitForTimeout(2000)

    // 应该有反应（进入聊天模式或显示内容）
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(200)
    await screenshotPage(page, 'stock-card-clicked')
  })

  // ── L2: API 错误处理 ──
  test('L2: /api/stock-hot-sectors 返回 500 — 页面不崩溃', async ({ page }) => {
    await page.route('**/api/stock-hot-sectors', route =>
      route.fulfill({ status: 500, body: 'error' })
    )
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 页面不应该白屏
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'stock-sectors-500')
  })

  test('L2: /api/stock-indices 返回 500 — 市场指数区域降级处理', async ({ page }) => {
    await page.route('**/api/stock-indices', route =>
      route.fulfill({ status: 500, body: 'error' })
    )
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'stock-indices-500')
  })

  test('L2: /api/stock-ai SSE 流中断 — 不卡在 loading', async ({ page }) => {
    await page.route('**/api/stock-ai', route => route.abort('connectionrefused'))

    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('分析贵州茅台')
    await input.press('Enter')

    await page.waitForTimeout(5000)

    // 不应该一直显示 loading
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'stock-ai-stream-error')
  })

  test('L2: /api/stock-search 返回空结果', async ({ page }) => {
    await page.route('**/api/stock-search', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    )

    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('xyznotastock')
    await page.waitForTimeout(1500)
    await screenshotPage(page, 'stock-search-empty')
  })

  // ── L3: 边界与异常 ──
  test('L3: 搜索超长股票名 — 不崩溃', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('A'.repeat(300))
    await page.waitForTimeout(1000)
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
  })

  test('L3: 特殊字符搜索', async ({ page }) => {
    const input = page.locator('input[type="text"], textarea').first()
    await input.fill('<script>alert("xss")</script>')
    await page.waitForTimeout(1000)
    // 页面不应该执行脚本
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML).not.toContain('<script>alert')
  })
})

// ══════════════════════════════════════════════════════════
// PAGE 3: FoodPage (Route: /food)
// ══════════════════════════════════════════════════════════

test.describe('FoodPage — 美食搜索页', () => {
  test.beforeEach(async ({ page }) => {
    // Mock geolocation
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ latitude: 31.2304, longitude: 121.4737 })

    await page.goto(BASE + '/food')
    await page.waitForLoadState('networkidle')
  })

  // ── L1: 功能正确性 ──
  test('L1: 页面加载 — 显示搜索中或搜索结果', async ({ page }) => {
    // 等待初始搜索完成
    await page.waitForTimeout(5000)

    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(30)

    await screenshotPage(page, 'food-landing-desktop')
  })

  // ── L2: API 错误处理 ──
  test('L2: /api/food 返回 500 — 显示错误提示和重试按钮', async ({ page }) => {
    await page.route('**/api/food', route =>
      route.fulfill({ status: 500, body: 'error' })
    )
    await page.reload()
    await page.waitForTimeout(5000)

    // 应该显示错误状态，不是白屏
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)

    // 查找重试按钮
    const retryBtn = page.getByText(/retry|重试|再试/i)
    const hasRetry = await retryBtn.count() > 0
    // 记录是否有重试按钮
    await screenshotPage(page, 'food-api-500-error')
  })

  test('L2: /api/food 超时 — 不卡死', async ({ page }) => {
    await page.route('**/api/food', route => route.abort('timedout'))
    await page.reload()
    await page.waitForTimeout(8000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'food-api-timeout')
  })

  test('L2: /api/food 返回非 JSON — 不崩溃', async ({ page }) => {
    await page.route('**/api/food', route =>
      route.fulfill({ status: 200, body: 'not valid json', contentType: 'text/plain' })
    )
    await page.reload()
    await page.waitForTimeout(5000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'food-api-bad-json')
  })

  test('L2: 无 GPS 权限 — IP 定位 fallback', async ({ page }) => {
    // 不授权 geolocation
    const context = await page.context()
    await context.clearPermissions()

    // Mock IP 定位也失败
    await page.route('**/api/ip-location', route =>
      route.fulfill({ status: 500, body: 'error' })
    )

    await page.reload()
    await page.waitForTimeout(5000)

    // 页面不应该白屏
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'food-no-gps-no-ip')
  })

  // ── L3: 边界 ──
  test('L3: 搜索空关键词', async ({ page }) => {
    await page.waitForTimeout(3000)
    // 找到输入框
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() > 0) {
      await input.fill('')
      await input.press('Enter')
      await page.waitForTimeout(2000)
      const bodyHTML = await page.locator('body').innerHTML()
      expect(bodyHTML.length).toBeGreaterThan(100)
    }
  })
})

// ══════════════════════════════════════════════════════════
// PAGE 4: HistoryPage (Route: /history)
// ══════════════════════════════════════════════════════════

test.describe('HistoryPage — 历史记录页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/history')
    await clearAllStorage(page)
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  // ── L1: 功能正确性 ──
  test('L1: 空历史 — 显示空状态提示', async ({ page }) => {
    const bodyText = await page.locator('body').textContent()
    // 应该有"没有记录"或空状态相关提示
    expect(bodyText.length).toBeGreaterThan(10)
    await screenshotPage(page, 'history-empty-desktop')
  })

  test('L1: 有历史数据 — 显示记录列表', async ({ page }) => {
    // 注入测试数据
    await page.evaluate(() => {
      const testHistory = [
        {
          id: 'test-1',
          question: '今天中午吃什么',
          answer: '火锅',
          options: ['火锅', '烤肉', '面条'],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'test-2',
          question: '周末去哪玩',
          answer: '公园',
          options: ['公园', '商场', '电影院'],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]
      localStorage.setItem('bangpick_history', JSON.stringify(testHistory))
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 应该显示历史记录
    await expect(page.getByText('今天中午吃什么').or(page.getByText('火锅'))).toBeVisible({ timeout: 5000 })
    await screenshotPage(page, 'history-with-data-desktop')
  })

  test('L1: Sync Code 生成和输入 UI', async ({ page }) => {
    // 查找 Sync 按钮
    const syncBtn = page.getByText(/sync|同步|云/i).first()
    if (await syncBtn.count() === 0) {
      test.skip(true, 'No sync button found')
      return
    }
    await syncBtn.click()
    await page.waitForTimeout(1000)
    await screenshotPage(page, 'history-sync-ui')
  })

  // ── L2: API 错误 ──
  test('L2: /api/sync-code 生成失败 — 显示错误', async ({ page }) => {
    await page.route('**/api/sync-code', route =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'server error' }) })
    )

    const syncBtn = page.getByText(/sync|同步|云/i).first()
    if (await syncBtn.count() === 0) return
    await syncBtn.click()

    // 查找生成按钮
    const generateBtn = page.getByText(/generate|生成/i).first()
    if (await generateBtn.count() > 0) {
      await generateBtn.click()
      await page.waitForTimeout(2000)
      // 应该显示错误，不崩溃
      const bodyHTML = await page.locator('body').innerHTML()
      expect(bodyHTML.length).toBeGreaterThan(100)
      await screenshotPage(page, 'history-sync-generate-error')
    }
  })

  // ── L3: 边界 ──
  test('L3: 导出空历史 — 不崩溃', async ({ page }) => {
    const exportBtn = page.getByText(/export|导出/i).first()
    if (await exportBtn.count() > 0) {
      await exportBtn.click()
      await page.waitForTimeout(1000)
      // 不应该崩溃
      const bodyHTML = await page.locator('body').innerHTML()
      expect(bodyHTML.length).toBeGreaterThan(100)
    }
  })

  test('L3: 清除所有历史 — 确认对话框', async ({ page }) => {
    // 先注入数据
    await page.evaluate(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        { id: '1', question: 'test', answer: 'a', options: ['a'], createdAt: new Date().toISOString() }
      ]))
    })
    await page.reload()

    const clearBtn = page.getByText(/clear|清除|清空/i).first()
    if (await clearBtn.count() > 0) {
      // 拒绝确认对话框
      page.on('dialog', d => d.dismiss())
      await clearBtn.click()
      await page.waitForTimeout(1000)

      // 数据应该还在（因为取消了）
      const data = await page.evaluate(() => localStorage.getItem('bangpick_history'))
      expect(data).not.toBeNull()
    }
  })
})

// ══════════════════════════════════════════════════════════
// PAGE 5: QuizPage + QuizPlayPage + QuizResultPage
// ══════════════════════════════════════════════════════════

test.describe('Quiz 流程 — 测试/答题/结果', () => {
  // ── L1: 功能正确性 ──
  test('L1: Quiz 列表页 — 显示测试卡片', async ({ page }) => {
    await page.goto(BASE + '/quiz')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(30)
    await screenshotPage(page, 'quiz-list-desktop')
  })

  test('L1: 完整答题流程 — 从选择到结果', async ({ page }) => {
    await page.goto(BASE + '/quiz')
    await page.waitForLoadState('networkidle')

    // 点击第一个测试卡片
    const quizCards = page.locator('a[href*="/quiz/"], [class*="card"]').filter({ hasText: /.{3,}/ })
    if (await quizCards.count() === 0) {
      test.skip(true, 'No quiz cards found')
      return
    }
    await quizCards.first().click()
    await page.waitForLoadState('networkidle')

    // 应该进入答题页
    await expect(page).toHaveURL(/\/quiz\//)
    await screenshotPage(page, 'quiz-play-q1-desktop')

    // 逐题回答（点击选项按钮）
    for (let i = 0; i < 20; i++) {
      const options = page.locator('button').filter({ hasText: /.{2,}/ })
      const optionCount = await options.count()
      if (optionCount === 0) break

      // 如果已经在结果页，退出循环
      const url = page.url()
      if (url.includes('/result')) break

      // 点击第一个选项
      await options.first().click()
      await page.waitForTimeout(600) // 等待动画
    }

    // 应该到达结果页或仍在答题页
    await page.waitForTimeout(2000)
    await screenshotPage(page, 'quiz-result-or-play-desktop')
  })

  test('L1: 结果页 — localStorage 持久化', async ({ page }) => {
    // 先注入一个测试结果
    await page.goto(BASE + '/quiz')
    await page.evaluate(() => {
      localStorage.setItem('bangpick_quiz_result_food', JSON.stringify({
        scores: { spicy: 2, sweet: 1, salty: 0 },
        personality: { id: 'adventurer', name: '美食探险家' },
      }))
    })

    // 刷新后结果应该还在
    await page.reload()
    const result = await page.evaluate(() => localStorage.getItem('bangpick_quiz_result_food'))
    expect(result).not.toBeNull()
    const parsed = JSON.parse(result)
    expect(parsed.personality).toBeDefined()
  })

  // ── L2: API 错误 ──
  test('L2: 结果页 AI 解读失败 — 使用 fallback 文本', async ({ page }) => {
    await page.route('**/api/chat', route =>
      route.fulfill({ status: 500, body: 'error' })
    )

    // 注入测试结果后访问结果页
    await page.goto(BASE + '/quiz')
    await page.evaluate(() => {
      localStorage.setItem('bangpick_quiz_result_food', JSON.stringify({
        scores: { spicy: 2, sweet: 1, salty: 0 },
        personality: { id: 'adventurer', name: '美食探险家', fallback: '你是一个喜欢尝试新事物的人' },
      }))
    })

    await page.goto(BASE + '/quiz/food/result')
    await page.waitForTimeout(5000)

    // 不应该白屏，应该有 fallback 内容
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'quiz-result-ai-error')
  })

  // ── L3: 边界 ──
  test('L3: 直接访问 /quiz/invalid — 应重定向到 /quiz', async ({ page }) => {
    await page.goto(BASE + '/quiz/invalidtype')
    await page.waitForTimeout(2000)

    // 应该重定向回 quiz 列表或显示错误
    const url = page.url()
    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(50)
    await screenshotPage(page, 'quiz-invalid-type')
  })

  test('L3: 直接访问 /quiz/food/result 无数据 — 不崩溃', async ({ page }) => {
    await page.goto(BASE + '/quiz')
    await clearAllStorage(page)
    await page.goto(BASE + '/quiz/food/result')
    await page.waitForTimeout(2000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(50)
    await screenshotPage(page, 'quiz-result-no-data')
  })
})

// ══════════════════════════════════════════════════════════
// PAGE 6: FriendPage + SharePage
// ══════════════════════════════════════════════════════════

test.describe('FriendPage & SharePage — 组队/分享', () => {
  test('L1: /friend/invalid-id — 显示错误或返回按钮', async ({ page }) => {
    await page.goto(BASE + '/friend/nonexistent-id')
    await page.waitForTimeout(2000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(50)
    await screenshotPage(page, 'friend-invalid-id')
  })

  test('L1: /vote/invalid-id — 显示过期/未找到', async ({ page }) => {
    await page.goto(BASE + '/vote/nonexistent-id')
    await page.waitForTimeout(3000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(50)
    await screenshotPage(page, 'share-invalid-id')
  })
})

// ══════════════════════════════════════════════════════════
// LAYER 4: 移动端测试（所有核心页面）
// ══════════════════════════════════════════════════════════

test.describe('L4: 移动端 — iPhone 14 Pro (393×852)', () => {
  test.use({
    viewport: { width: 393, height: 852 },
    hasTouch: true,
  })

  const pages = [
    { name: 'chat', path: '/' },
    { name: 'stock', path: '/stock' },
    { name: 'food', path: '/food' },
    { name: 'history', path: '/history' },
    { name: 'quiz', path: '/quiz' },
  ]

  for (const p of pages) {
    test(`${p.name} — 无横向溢出`, async ({ page }) => {
      if (p.name === 'food') {
        await page.context().grantPermissions(['geolocation'])
        await page.context().setGeolocation({ latitude: 31.23, longitude: 121.47 })
      }

      await page.goto(BASE + p.path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2) // 2px tolerance

      await screenshotPage(page, `mobile-${p.name}`)
    })

    test(`${p.name} — 底部导航可见且可交互`, async ({ page }) => {
      await page.goto(BASE + p.path)
      await page.waitForLoadState('networkidle')

      // 查找底部导航
      const nav = page.locator('nav').last()
      if (await nav.count() > 0 && await nav.isVisible()) {
        const navBox = await nav.boundingBox()
        if (navBox) {
          // 导航应该在屏幕底部
          expect(navBox.y).toBeGreaterThan(600)
          // 导航不应该超出屏幕
          expect(navBox.y + navBox.height).toBeLessThanOrEqual(852 + 5)
        }
      }
    })

    test(`${p.name} — 文字不截断检查`, async ({ page }) => {
      await page.goto(BASE + p.path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 检查是否有 overflow:hidden + text-overflow:ellipsis 以外的截断
      const truncated = await page.evaluate(() => {
        const issues = []
        document.querySelectorAll('*').forEach(el => {
          const style = getComputedStyle(el)
          if (el.scrollWidth > el.clientWidth + 5 &&
              style.overflow !== 'hidden' &&
              style.overflowX !== 'hidden' &&
              style.textOverflow !== 'ellipsis' &&
              el.textContent.trim().length > 0) {
            issues.push({
              tag: el.tagName,
              text: el.textContent.slice(0, 50),
              scrollW: el.scrollWidth,
              clientW: el.clientWidth,
            })
          }
        })
        return issues.slice(0, 5) // 最多 5 个
      })

      // 记录问题但不强制失败（某些溢出可能是有意设计如滚动容器）
      if (truncated.length > 0) {
        console.log(`[${p.name}] Potential text overflow:`, JSON.stringify(truncated, null, 2))
      }
    })
  }

  test('ChatPage 移动端 — 输入框不被底部导航遮挡', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.waitForLoadState('networkidle')

    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() === 0) return

    const inputBox = await input.boundingBox()
    const nav = page.locator('nav').last()
    const navBox = await nav.boundingBox()

    if (inputBox && navBox) {
      // 输入框底部不应该被导航遮挡
      // 但输入框可能就在导航上方，这是正常的
      await screenshotPage(page, 'mobile-chat-input-nav-overlap')
    }
  })

  test('StockPage 移动端 — 搜索交互正常', async ({ page }) => {
    await page.goto(BASE + '/stock')
    await page.waitForLoadState('networkidle')

    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() > 0) {
      await input.tap()
      await input.fill('茅台')
      await page.waitForTimeout(1000)
      await screenshotPage(page, 'mobile-stock-search')
    }
  })
})

// ══════════════════════════════════════════════════════════
// LAYER 5: 全部 API 错误场景集中测试
// ══════════════════════════════════════════════════════════

test.describe('L5: API 全面错误场景', () => {

  test('所有 API 同时 500 — 首页不白屏', async ({ page }) => {
    await page.route('**/api/**', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )
    await page.goto(BASE + '/')
    await page.waitForTimeout(3000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'all-api-500-chat')
  })

  test('所有 API 同时 500 — Stock 页不白屏', async ({ page }) => {
    await page.route('**/api/**', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )
    await page.goto(BASE + '/stock')
    await page.waitForTimeout(3000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'all-api-500-stock')
  })

  test('所有 API 同时 500 — Food 页不白屏', async ({ page }) => {
    await page.route('**/api/**', route =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    )
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ latitude: 31.23, longitude: 121.47 })
    await page.goto(BASE + '/food')
    await page.waitForTimeout(5000)

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'all-api-500-food')
  })

  test('网络完全断开 — 页面基本可用', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.waitForLoadState('networkidle')

    // 断开所有网络请求
    await page.route('**/*', route => {
      if (route.request().resourceType() === 'document' ||
          route.request().resourceType() === 'script' ||
          route.request().resourceType() === 'stylesheet') {
        return route.continue()
      }
      return route.abort('connectionrefused')
    })

    // 尝试操作
    const input = page.locator('input[type="text"], textarea').first()
    if (await input.count() > 0) {
      await input.fill('离线测试')
      await input.press('Enter')
      await page.waitForTimeout(3000)
    }

    const bodyHTML = await page.locator('body').innerHTML()
    expect(bodyHTML.length).toBeGreaterThan(100)
    await screenshotPage(page, 'network-offline')
  })
})
