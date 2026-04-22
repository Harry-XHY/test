/**
 * bangpick — Comprehensive Regression Test Suite
 *
 * Covers all pages, navigation, API interactions, localStorage persistence,
 * and mobile responsiveness. Designed for `npx playwright test e2e/regression.spec.js`.
 *
 * Prerequisite: dev server running on localhost:5200
 *   npm run dev -- --port 5200
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5173'

const MOBILE = { name: 'iPhone 14 Pro', width: 393, height: 852 }

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Clear all bangpick-related localStorage keys */
async function clearStorage(page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('bangpick'))
    keys.forEach(k => localStorage.removeItem(k))
    sessionStorage.clear()
  })
}

/** Mock /api/chat to return a canned recommendation JSON */
async function mockChatRecommendation(page) {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [{
          type: 'text',
          text: JSON.stringify({
            type: 'recommendation',
            options: [
              { name: '火锅', reason: '暖和', tags: ['冬季', '聚餐'] },
              { name: '烤肉', reason: '香气', tags: ['烧烤', '聚餐'] },
            ],
          }),
        }],
      }),
    })
  })
}

/** Mock /api/stock-ai SSE to return a quick response */
async function mockStockAI(page, type = 'recommend') {
  await page.route('**/api/stock-ai', async (route) => {
    const sseBody = [
      `event: meta\ndata: ${JSON.stringify({ type })}\n\n`,
      `event: delta\ndata: ${JSON.stringify({ text: '这是一条模拟的AI分析结果。' })}\n\n`,
      `event: done\ndata: {}\n\n`,
    ].join('')
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: sseBody,
    })
  })
}

/** Mock /api/stock-search */
async function mockStockSearch(page) {
  await page.route('**/api/stock-search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1 },
        { code: '000001', name: '平安银行', market: 0 },
      ]),
    })
  })
}

/** Mock /api/stock-batch */
async function mockStockBatch(page) {
  await page.route('**/api/stock-batch', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    const results = (body.stocks || []).map(s => ({
      code: s.code,
      name: s.name,
      close: 15.50,
      change: 1.2,
      changePercent: 2.35,
      volRatio: 1.45,
      ma10: 15.00,
      ma20: 14.80,
      aboveMA: true,
      macdSignal: 'golden_cross',
    }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results }),
    })
  })
}

/** Mock /api/stock-hot-sectors */
async function mockHotSectors(page) {
  await page.route('**/api/stock-hot-sectors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { sector: 'AI算力', avgChange: 3.5, upCount: 8, totalCount: 10 },
        { sector: '半导体', avgChange: 2.1, upCount: 6, totalCount: 10 },
        { sector: '新能源', avgChange: -0.5, upCount: 3, totalCount: 10 },
        { sector: '医药生物', avgChange: 1.8, upCount: 7, totalCount: 10 },
      ]),
    })
  })
}

// ═════════════════════════════════════════════════════════
// 1. NAVIGATION — BottomNav cross-page routing
// ═════════════════════════════════════════════════════════

test.describe('1. BottomNav Navigation', () => {

  test('Navigate between all 3 tabs', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('domcontentloaded')

    // Default: ChatPage (帮我选)
    await expect(page.getByRole('heading', { name: '帮我选' })).toBeVisible()

    // -> 炒股助手
    await page.getByRole('link', { name: /炒股助手/ }).click()
    await expect(page).toHaveURL(/\/stock/)
    await expect(page.getByRole('heading', { name: '炒股助手' })).toBeVisible()

    // -> 自选股
    await page.getByRole('link', { name: /自选股/ }).click()
    await expect(page).toHaveURL(/\/watchlist/)
    await expect(page.getByRole('heading', { name: '自选股' })).toBeVisible()

    // -> Back to 帮我选
    await page.getByRole('link', { name: /帮我选/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: '帮我选' })).toBeVisible()

    console.log('✅ BottomNav: all 3 tabs navigable')
  })

  test('Active tab highlights correctly', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    await page.waitForLoadState('domcontentloaded')

    const stockLink = page.getByRole('link', { name: /炒股助手/ })
    const color = await stockLink.evaluate(el => getComputedStyle(el).color)
    // Active tab should use the primary purple (#b6a0ff → rgb(182, 160, 255))
    expect(color).toContain('182')

    console.log('✅ BottomNav: active tab highlighted')
  })
})

// ═════════════════════════════════════════════════════════
// 2. CHAT PAGE (/) — Decision helper
// ═════════════════════════════════════════════════════════

test.describe('2. ChatPage — 帮我选', () => {

  test('Landing page smoke test', async ({ page }) => {
    await page.goto(BASE)

    await expect(page.locator('text=纠结的时候')).toBeVisible()
    await expect(page.locator('text=Quick Scenarios')).toBeVisible()
    await expect(page.locator('text=Try asking me')).toBeVisible()
    await expect(page.locator('text=Draw Oracle')).toBeVisible()
    await expect(page.locator('input[type="text"]')).toBeVisible()

    console.log('✅ ChatPage landing: all sections visible')
  })

  test('Scenario card fills input', async ({ page }) => {
    await page.goto(BASE)

    const card = page.locator('.glass-card').filter({ has: page.locator('h5') }).first()
    await card.click()

    const value = await page.locator('input[type="text"]').inputValue()
    expect(value.length).toBeGreaterThan(0)

    console.log('✅ ChatPage: scenario card fills input')
  })

  test('AI chat returns recommendation with option cards', async ({ page }) => {
    await mockChatRecommendation(page)
    await page.goto(BASE)

    await page.locator('input[type="text"]').fill('火锅还是烤肉')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    // User bubble
    await expect(page.locator('text=火锅还是烤肉')).toBeVisible()

    // Wait for AI response (mocked) — option cards render
    await expect(page.locator('h3:has-text("火锅")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('h3:has-text("烤肉")')).toBeVisible()

    // Random picker should appear for 2+ options
    await expect(page.locator('text=帮我随机选一个')).toBeVisible()

    console.log('✅ ChatPage: recommendation flow with option cards')
  })

  test('Clear chat returns to landing', async ({ page }) => {
    await mockChatRecommendation(page)
    await page.goto(BASE)

    await page.locator('input[type="text"]').fill('测试')
    await page.locator('.material-symbols-outlined:has-text("send")').click()
    await expect(page.locator('text=测试').first()).toBeVisible()

    // Close button
    const closeBtn = page.locator('header .material-symbols-outlined:has-text("close")')
    await closeBtn.click()

    await expect(page.locator('text=Quick Scenarios')).toBeVisible()

    console.log('✅ ChatPage: clear chat returns to landing')
  })

  test('Error shows retry button', async ({ page }) => {
    await page.route('**/api/chat', route => route.abort())
    await page.goto(BASE)

    await page.locator('input[type="text"]').fill('错误测试')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    await expect(page.locator('text=重新发送')).toBeVisible({ timeout: 15000 })

    console.log('✅ ChatPage: error retry button shown')
  })

  test('Fortune card opens, flips, and closes', async ({ page }) => {
    await page.goto(BASE)

    // Open
    await page.locator('text=Draw Oracle').first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('[role="dialog"] >> text=今日一签')).toBeVisible()

    // Flip
    await page.locator('.fortune-card').click()
    await page.waitForTimeout(800)
    await expect(page.locator('text=Yi / 宜')).toBeVisible()

    // Close
    await page.locator('[role="dialog"] button:has(.material-symbols-outlined:has-text("close"))').click()
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    console.log('✅ ChatPage: fortune card lifecycle')
  })

  test('Session chat persists on reload', async ({ page }) => {
    await mockChatRecommendation(page)
    await page.goto(BASE)

    await page.locator('input[type="text"]').fill('测试持久化')
    await page.locator('.material-symbols-outlined:has-text("send")').click()
    await expect(page.locator('text=测试持久化')).toBeVisible()

    // Wait for sessionStorage write
    await page.waitForTimeout(500)

    // Reload
    await mockChatRecommendation(page)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Chat should still be visible (sessionStorage)
    await expect(page.locator('text=测试持久化')).toBeVisible()

    console.log('✅ ChatPage: session chat persists on reload')
  })
})

// ═════════════════════════════════════════════════════════
// 3. STOCK PAGE (/stock) — Trading assistant
// ═════════════════════════════════════════════════════════

test.describe('3. StockPage — 炒股助手', () => {

  test.beforeEach(async ({ page }) => {
    await mockHotSectors(page)
    await mockStockAI(page)
    await mockStockSearch(page)
    await page.goto(`${BASE}/stock`)
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
  })

  test('Landing page with feature cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '炒股助手' })).toBeVisible()
    await expect(page.locator('text=短线交易')).toBeVisible()
    await expect(page.locator('text=数据仅供参考')).toBeVisible()
    await expect(page.getByRole('button', { name: /选股推荐/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /持仓诊断/ })).toBeVisible()
    await expect(page.locator('input[type="text"]')).toBeVisible()

    console.log('✅ StockPage: landing elements visible')
  })

  test('Hot sectors load as cards', async ({ page }) => {
    await expect(
      page.locator('text=今日热门板块').or(page.locator('text=快捷入口'))
    ).toBeVisible({ timeout: 10000 })

    console.log('✅ StockPage: hot sectors loaded')
  })

  test('选股推荐 triggers SSE flow', async ({ page }) => {
    await page.getByRole('button', { name: /选股推荐/ }).click()

    await expect(page.locator('text=推荐今日短线机会')).toBeVisible({ timeout: 5000 })
    // SSE mocked → should show AI text
    await expect(page.locator('text=模拟的AI分析结果')).toBeVisible({ timeout: 15000 })

    console.log('✅ StockPage: recommend SSE flow')
  })

  test('持仓诊断 shows search UI', async ({ page }) => {
    await page.getByRole('button', { name: /持仓诊断/ }).click()

    await expect(page.locator('text=请搜索你持有的股票')).toBeVisible({ timeout: 5000 })

    console.log('✅ StockPage: holding search shown')
  })

  test('Off-topic input rejected', async ({ page }) => {
    await page.locator('input[type="text"]').fill('今天天气怎么样')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=只能回答股票相关的问题')).toBeVisible({ timeout: 5000 })

    console.log('✅ StockPage: off-topic rejection')
  })

  test('Out-of-scope input rejected', async ({ page }) => {
    await page.locator('input[type="text"]').fill('美股怎么买')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=无法为您提供')).toBeVisible({ timeout: 5000 })

    console.log('✅ StockPage: out-of-scope rejection')
  })

  test('Unrealistic demand rejected', async ({ page }) => {
    await page.locator('input[type="text"]').fill('帮我找一个稳赚的股票')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=无法为您承诺任何盈利')).toBeVisible({ timeout: 5000 })

    console.log('✅ StockPage: unrealistic demand rejection')
  })

  test('Clear chat returns to landing', async ({ page }) => {
    await page.locator('input[type="text"]').fill('什么是均线')
    await page.locator('input[type="text"]').press('Enter')
    await expect(page.locator('text=什么是均线')).toBeVisible()

    const closeBtn = page.locator('header button:has(.material-symbols-outlined:has-text("close"))')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    await expect(page.locator('text=短线交易')).toBeVisible()

    console.log('✅ StockPage: clear chat returns to landing')
  })

  test('Stock chat persists in localStorage', async ({ page }) => {
    await page.locator('input[type="text"]').fill('什么是涨停')
    await page.locator('input[type="text"]').press('Enter')
    await expect(page.locator('text=什么是涨停')).toBeVisible()

    // Wait for debounced save (500ms)
    await page.waitForTimeout(800)

    const chat = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('bangpick_stock_chat') || '[]')
    })
    expect(chat.length).toBeGreaterThan(0)

    console.log('✅ StockPage: chat saved to localStorage')
  })

  test('URL param ?q= auto-sends', async ({ page }) => {
    await page.goto(`${BASE}/stock?q=${encodeURIComponent('帮我看看600519')}`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=帮我看看600519')).toBeVisible({ timeout: 10000 })

    console.log('✅ StockPage: ?q= param auto-sends')
  })
})

// ═════════════════════════════════════════════════════════
// 4. WATCHLIST PAGE (/watchlist) — 自选股
// ═════════════════════════════════════════════════════════

test.describe('4. WatchlistPage — 自选股', () => {

  test.beforeEach(async ({ page }) => {
    await mockStockBatch(page)
    await mockStockSearch(page)
  })

  test('Empty state shows "还没有自选股"', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=还没有自选股')).toBeVisible()
    await expect(page.getByRole('button', { name: '添加股票' })).toBeVisible()

    console.log('✅ WatchlistPage: empty state')
  })

  test('Add stock button toggles search panel', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await page.waitForLoadState('domcontentloaded')

    // Click + button in header
    const addBtn = page.locator('header button[title="添加股票"]')
    await addBtn.click()

    await expect(page.locator('input[placeholder*="输入代码或名称"]')).toBeVisible()

    // Click again to close
    await addBtn.click()
    await expect(page.locator('input[placeholder*="输入代码或名称"]')).not.toBeVisible()

    console.log('✅ WatchlistPage: add panel toggles')
  })

  test('Watchlist with pre-seeded data shows quotes', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    // Seed watchlist
    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, addedAt: new Date().toISOString() },
        { code: '000001', name: '平安银行', market: 0, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Should show stock names
    await expect(page.locator('text=贵州茅台')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=平安银行')).toBeVisible()

    // Should show mock prices
    await expect(page.locator('text=15.50').first()).toBeVisible()

    // Count indicator
    await expect(page.locator('text=2 只')).toBeVisible()

    console.log('✅ WatchlistPage: seeded data with live quotes')
  })

  test('Click stock navigates to StockPage analysis', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Click on the stock item (button wrapping name)
    await page.locator('button:has-text("贵州茅台")').first().click()

    // Should navigate to /stock?q=...
    await expect(page).toHaveURL(/\/stock\?q=/)

    console.log('✅ WatchlistPage: click navigates to analysis')
  })

  test('Refresh button fetches new quotes', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Wait for initial load
    await expect(page.locator('text=贵州茅台')).toBeVisible({ timeout: 10000 })

    // Click refresh
    let apiCalled = false
    page.on('request', req => {
      if (req.url().includes('stock-batch')) apiCalled = true
    })
    await page.locator('button[title="刷新行情"]').click()
    await page.waitForTimeout(1000)

    expect(apiCalled).toBeTruthy()

    console.log('✅ WatchlistPage: refresh button works')
  })

  test('Alert setup opens and closes', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=贵州茅台')).toBeVisible({ timeout: 10000 })

    // Click alert bell
    await page.locator('button[title="设置提醒"]').first().click()

    // AlertSetup modal should appear — check for h3 "设置提醒"
    await expect(page.locator('h3:has-text("设置提醒")')).toBeVisible({ timeout: 5000 })
    // Alert type buttons should be visible
    await expect(page.locator('button:has-text("价格突破")')).toBeVisible()

    console.log('✅ WatchlistPage: alert setup opens')
  })
})

// ═════════════════════════════════════════════════════════
// 5. HISTORY PAGE (/history) — 历史记录
// ═════════════════════════════════════════════════════════

test.describe('5. HistoryPage — 历史记录', () => {

  test('Empty state', async ({ page }) => {
    await page.goto(`${BASE}/history`)
    await clearStorage(page)
    await page.reload()

    await expect(page.locator('text=还没有决策记录')).toBeVisible()

    console.log('✅ HistoryPage: empty state')
  })

  test('Shows seeded history entries', async ({ page }) => {
    await page.goto(`${BASE}/history`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        {
          id: 'test1',
          question: '火锅还是烤肉',
          options: [{ id: 'a', name: '火锅' }, { id: 'b', name: '烤肉' }],
          createdAt: Date.now(),
        },
        {
          id: 'test2',
          question: '红色还是蓝色',
          options: [{ id: 'c', name: '红色' }, { id: 'd', name: '蓝色' }],
          createdAt: Date.now() - 86400000,
        },
      ]))
    })
    await page.reload()

    await expect(page.locator('text=火锅还是烤肉')).toBeVisible()
    await expect(page.locator('text=红色还是蓝色')).toBeVisible()

    console.log('✅ HistoryPage: seeded entries visible')
  })

  test('Back button navigates to home', async ({ page }) => {
    await page.goto(`${BASE}/history`)

    await page.locator('button:has-text("←")').click()
    await expect(page).toHaveURL(/\/$/)

    console.log('✅ HistoryPage: back to home')
  })

  test('Sync panel toggles', async ({ page }) => {
    await page.goto(`${BASE}/history`)

    await page.locator('button:has-text("同步")').click()
    await expect(page.locator('text=生成同步码')).toBeVisible()
    await expect(page.locator('text=输入同步码')).toBeVisible()

    // Switch to redeem mode
    await page.locator('button:has-text("输入同步码")').click()
    await expect(page.locator('input[placeholder="6 位数字"]')).toBeVisible()

    // Close
    await page.locator('button:has-text("关闭")').click()
    await expect(page.locator('text=生成同步码')).not.toBeVisible()

    console.log('✅ HistoryPage: sync panel toggles')
  })

  test('Weekly review panel toggles', async ({ page }) => {
    await page.goto(`${BASE}/history`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        {
          id: 'r1',
          question: '测试复盘',
          options: [{ id: 'a', name: 'A', tags: ['快餐'] }],
          createdAt: Date.now(),
        },
      ]))
    })
    await page.reload()

    await page.locator('button:has-text("复盘")').click()
    await expect(page.locator('text=本周决策复盘')).toBeVisible()

    // Stats should show
    await expect(page.locator('text=次决策')).toBeVisible()

    // Close
    await page.locator('button:has-text("收起")').click()
    await expect(page.locator('text=本周决策复盘')).not.toBeVisible()

    console.log('✅ HistoryPage: weekly review toggles')
  })

  test('Clear history button works', async ({ page }) => {
    await page.goto(`${BASE}/history`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        { id: 'x1', question: '待清除', options: [], createdAt: Date.now() },
      ]))
    })
    await page.reload()
    await expect(page.locator('text=待清除')).toBeVisible()

    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept())
    await page.locator('button:has-text("清空")').click()

    await expect(page.locator('text=还没有决策记录')).toBeVisible()

    console.log('✅ HistoryPage: clear history')
  })

  test('Export button visible when history exists', async ({ page }) => {
    await page.goto(`${BASE}/history`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        { id: 'e1', question: '导出测试', options: [], createdAt: Date.now() },
      ]))
    })
    await page.reload()

    await expect(page.locator('button:has-text("导出")')).toBeVisible()

    console.log('✅ HistoryPage: export button visible')
  })
})

// ═════════════════════════════════════════════════════════
// 6. SHARE & FRIEND PAGES
// ═════════════════════════════════════════════════════════

test.describe('6. SharePage & FriendPage', () => {

  test('SharePage shows expired message for invalid ID', async ({ page }) => {
    await page.goto(`${BASE}/vote/nonexistent123`)

    await expect(
      page.locator('text=决策已过期或不存在').or(page.locator('text=加载中'))
    ).toBeVisible({ timeout: 10000 })

    console.log('✅ SharePage: invalid ID handled')
  })

  test('FriendPage shows fallback for missing decision', async ({ page }) => {
    await page.goto(`${BASE}/friend/missing123`)

    await expect(page.locator('text=决策数据丢失')).toBeVisible()
    await expect(page.locator('text=返回首页')).toBeVisible()

    console.log('✅ FriendPage: missing decision fallback')
  })

  test('FriendPage loads from localStorage', async ({ page }) => {
    // Seed localStorage via addInitScript so it's set before React hydrates
    // Options need votes field for VotePanel
    await page.addInitScript(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        {
          id: 'test_friend',
          question: '朋友帮选测试',
          options: [{ id: 'a', name: '选项A', reason: '理由A', tags: [], votes: 0 }, { id: 'b', name: '选项B', reason: '理由B', tags: [], votes: 0 }],
          createdAt: Date.now(),
        },
      ]))
    })
    await page.goto(`${BASE}/friend/test_friend`)
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=朋友帮选测试')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /投票/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /转盘/ })).toBeVisible()

    console.log('✅ FriendPage: loaded from localStorage')
  })

  test('FriendPage vote/spin mode switch', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bangpick_history', JSON.stringify([
        {
          id: 'mode_test',
          question: '模式切换',
          options: [{ id: 'a', name: 'X', reason: '', tags: [], votes: 0 }, { id: 'b', name: 'Y', reason: '', tags: [], votes: 0 }],
          createdAt: Date.now(),
        },
      ]))
    })
    await page.goto(`${BASE}/friend/mode_test`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=模式切换')).toBeVisible({ timeout: 10000 })

    // Switch to spin mode
    await page.locator('button:has-text("转盘")').click()

    // Switch back to vote
    await page.locator('button:has-text("投票")').click()

    console.log('✅ FriendPage: vote/spin toggle')
  })
})

// ═════════════════════════════════════════════════════════
// 7. localStorage PERSISTENCE — cross-page data
// ═════════════════════════════════════════════════════════

test.describe('7. localStorage Persistence', () => {

  test('Holdings survive navigation', async ({ page }) => {
    await mockStockBatch(page)
    await page.goto(`${BASE}/stock`)

    // Seed holdings
    await page.evaluate(() => {
      localStorage.setItem('bangpick_holdings', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, costPrice: 1700, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Should show "我的持仓" section
    await expect(page.locator('text=我的持仓')).toBeVisible()
    await expect(page.locator('text=贵州茅台')).toBeVisible()

    // Navigate away and back
    await page.getByRole('link', { name: /帮我选/ }).click()
    await page.getByRole('link', { name: /炒股助手/ }).click()

    await expect(page.locator('text=贵州茅台')).toBeVisible()

    console.log('✅ Holdings persist across navigation')
  })

  test('Watchlist data persists', async ({ page }) => {
    await mockStockBatch(page)
    await page.goto(`${BASE}/watchlist`)

    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '000001', name: '平安银行', market: 0, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=平安银行')).toBeVisible({ timeout: 10000 })

    // Navigate to stock page and back
    await page.getByRole('link', { name: /炒股助手/ }).click()
    await page.getByRole('link', { name: /自选股/ }).click()

    await expect(page.locator('text=平安银行')).toBeVisible({ timeout: 10000 })

    console.log('✅ Watchlist persists across navigation')
  })
})

// ═════════════════════════════════════════════════════════
// 8. INTENT DETECTION — detectIntent client-side routing
// ═════════════════════════════════════════════════════════

test.describe('8. Intent Detection (detectIntent)', () => {

  // These tests run detectIntent in-browser to verify client-side routing

  test('Detects holding with code + cost', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('帮我看看000001 平安银行，成本15.5元')
    })

    expect(result.type).toBe('holding')
    expect(result.code).toBe('000001')
    expect(result.costPrice).toBe(15.5)

    console.log('✅ detectIntent: holding with code + cost')
  })

  test('Detects market intent', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('今天大盘怎么样')
    })
    expect(result.type).toBe('market')

    console.log('✅ detectIntent: market')
  })

  test('Detects sector recommend', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('AI算力板块有什么短线机会')
    })
    expect(result.type).toBe('recommend')
    expect(result.sector).toBe('AI算力')

    console.log('✅ detectIntent: sector recommend')
  })

  test('Rejects unrealistic demand', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('找一个稳赚不赔的股票')
    })
    expect(result.type).toBe('reject_unrealistic')

    console.log('✅ detectIntent: reject unrealistic')
  })

  test('Rejects out-of-scope', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('港股怎么买')
    })
    expect(result.type).toBe('out_of_scope')

    console.log('✅ detectIntent: out-of-scope')
  })

  test('Detects off-topic', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('今天天气怎么样')
    })
    expect(result.type).toBe('off_topic')

    console.log('✅ detectIntent: off-topic')
  })

  test('Detects QA intent', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('什么是MACD金叉')
    })
    expect(result.type).toBe('qa')

    console.log('✅ detectIntent: QA')
  })

  test('Detects news intent', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('这是一条关于某上市公司发布重大公告的新闻消息，该公司计划在下半年进行大规模资产重组，预计将大幅提升盈利能力和市场竞争力')
    })
    expect(result.type).toBe('news')

    console.log('✅ detectIntent: news')
  })

  test('Detects holding without cost (auto-analyze)', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const result = await page.evaluate(async () => {
      const { detectIntent } = await import('/src/lib/stockPrompts.js')
      return detectIntent('帮我看看600519')
    })
    expect(result.type).toBe('holding_need_cost')
    expect(result.code).toBe('600519')

    console.log('✅ detectIntent: holding without cost')
  })
})

// ═════════════════════════════════════════════════════════
// 9. ALERT SYSTEM — evaluateAlerts logic
// ═════════════════════════════════════════════════════════

test.describe('9. Alert Evaluation', () => {

  test('Price above alert triggers', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const hits = await page.evaluate(async () => {
      const { evaluateAlerts } = await import('/src/lib/alerts.js')
      const quotes = { '600519': { close: 1800, changePercent: 2, volRatio: 1.5, macdSignal: 'golden_cross' } }
      const alerts = [{ id: 'a1', code: '600519', name: '茅台', type: 'price_above', threshold: 1700, enabled: true, triggered: false }]
      return evaluateAlerts(quotes, alerts)
    })
    expect(hits.length).toBe(1)
    expect(hits[0].message).toContain('突破')

    console.log('✅ Alert: price_above triggers')
  })

  test('Price below alert triggers', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const hits = await page.evaluate(async () => {
      const { evaluateAlerts } = await import('/src/lib/alerts.js')
      const quotes = { '600519': { close: 1600, changePercent: -2, volRatio: 1.0 } }
      const alerts = [{ id: 'a2', code: '600519', name: '茅台', type: 'price_below', threshold: 1650, enabled: true, triggered: false }]
      return evaluateAlerts(quotes, alerts)
    })
    expect(hits.length).toBe(1)
    expect(hits[0].message).toContain('跌破')

    console.log('✅ Alert: price_below triggers')
  })

  test('MACD golden cross alert triggers', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const hits = await page.evaluate(async () => {
      const { evaluateAlerts } = await import('/src/lib/alerts.js')
      const quotes = { '000001': { close: 15, changePercent: 1, volRatio: 1.2, macdSignal: 'golden_cross' } }
      const alerts = [{ id: 'a3', code: '000001', name: '平安', type: 'macd_golden', threshold: null, enabled: true, triggered: false }]
      return evaluateAlerts(quotes, alerts)
    })
    expect(hits.length).toBe(1)
    expect(hits[0].message).toContain('金叉')

    console.log('✅ Alert: MACD golden cross triggers')
  })

  test('Disabled alert does NOT trigger', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const hits = await page.evaluate(async () => {
      const { evaluateAlerts } = await import('/src/lib/alerts.js')
      const quotes = { '600519': { close: 1800 } }
      const alerts = [{ id: 'a4', code: '600519', name: '茅台', type: 'price_above', threshold: 1700, enabled: false, triggered: false }]
      return evaluateAlerts(quotes, alerts)
    })
    expect(hits.length).toBe(0)

    console.log('✅ Alert: disabled alert skipped')
  })

  test('Already-triggered alert does NOT re-fire', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const hits = await page.evaluate(async () => {
      const { evaluateAlerts } = await import('/src/lib/alerts.js')
      const quotes = { '600519': { close: 1800 } }
      const alerts = [{ id: 'a5', code: '600519', name: '茅台', type: 'price_above', threshold: 1700, enabled: true, triggered: true }]
      return evaluateAlerts(quotes, alerts)
    })
    expect(hits.length).toBe(0)

    console.log('✅ Alert: already-triggered skipped')
  })

  test('Vol ratio alert triggers', async ({ page }) => {
    await page.goto(`${BASE}/stock`)
    const hits = await page.evaluate(async () => {
      const { evaluateAlerts } = await import('/src/lib/alerts.js')
      const quotes = { '000001': { close: 15, volRatio: 3.5 } }
      const alerts = [{ id: 'a6', code: '000001', name: '平安', type: 'vol_ratio_above', threshold: 2.0, enabled: true, triggered: false }]
      return evaluateAlerts(quotes, alerts)
    })
    expect(hits.length).toBe(1)
    expect(hits[0].message).toContain('量比')

    console.log('✅ Alert: vol_ratio_above triggers')
  })
})

// ═════════════════════════════════════════════════════════
// 10. MOBILE RESPONSIVENESS
// ═════════════════════════════════════════════════════════

test.describe('10. Mobile Responsiveness', () => {
  test.use({ viewport: { width: MOBILE.width, height: MOBILE.height }, hasTouch: true })

  test('ChatPage — no overflow, all sections visible', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('domcontentloaded')

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)

    await expect(page.getByRole('heading', { name: '帮我选' })).toBeVisible()
    await expect(page.locator('input[type="text"]')).toBeVisible()

    console.log('✅ Mobile ChatPage: no overflow')
  })

  test('StockPage — no overflow, feature cards visible', async ({ page }) => {
    await mockHotSectors(page)
    await page.goto(`${BASE}/stock`)
    await page.waitForLoadState('domcontentloaded')

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)

    await expect(page.getByRole('heading', { name: '炒股助手' })).toBeVisible()
    await expect(page.getByRole('button', { name: /选股推荐/ })).toBeVisible()

    console.log('✅ Mobile StockPage: no overflow')
  })

  test('WatchlistPage — no overflow', async ({ page }) => {
    await mockStockBatch(page)
    await page.goto(`${BASE}/watchlist`)
    await page.waitForLoadState('domcontentloaded')

    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(2)

    await expect(page.getByRole('heading', { name: '自选股' })).toBeVisible()

    console.log('✅ Mobile WatchlistPage: no overflow')
  })

  test('BottomNav is visible and tappable on mobile', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('domcontentloaded')

    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Tap 炒股助手
    await page.getByRole('link', { name: /炒股助手/ }).tap()
    await expect(page).toHaveURL(/\/stock/)

    // Tap 自选股
    await page.getByRole('link', { name: /自选股/ }).tap()
    await expect(page).toHaveURL(/\/watchlist/)

    console.log('✅ Mobile BottomNav: tappable')
  })

  test('Chat flow on mobile — no overflow during conversation', async ({ page }) => {
    await mockChatRecommendation(page)
    await page.goto(BASE)

    await page.locator('input[type="text"]').fill('测试移动端')
    await page.locator('.material-symbols-outlined:has-text("send")').tap()

    await expect(page.locator('text=测试移动端')).toBeVisible()

    await page.waitForTimeout(500)
    const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(5)

    console.log('✅ Mobile chat: no overflow during conversation')
  })

  test('Fortune modal fits mobile viewport', async ({ page }) => {
    await page.goto(BASE)

    await page.locator('text=Draw Oracle').first().tap()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    const cardBox = await page.locator('.fortune-card').boundingBox()
    expect(cardBox.width).toBeLessThanOrEqual(MOBILE.width)
    expect(cardBox.height).toBeLessThanOrEqual(MOBILE.height)

    console.log('✅ Mobile fortune modal: fits viewport')
  })
})

// ═════════════════════════════════════════════════════════
// 11. API ERROR HANDLING
// ═════════════════════════════════════════════════════════

test.describe('11. API Error Handling', () => {

  test('Chat API 500 shows error message', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await page.goto(BASE)
    await page.locator('input[type="text"]').fill('测试500')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    await expect(page.locator('text=重新发送')).toBeVisible({ timeout: 15000 })

    console.log('✅ API 500: error with retry shown')
  })

  test('Stock batch API failure keeps previous data', async ({ page }) => {
    await page.goto(`${BASE}/watchlist`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, addedAt: new Date().toISOString() },
      ]))
    })

    // First load succeeds
    await mockStockBatch(page)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=贵州茅台')).toBeVisible({ timeout: 10000 })

    // Second call fails
    await page.route('**/api/stock-batch', route => route.abort())
    await page.locator('button[title="刷新行情"]').click()
    await page.waitForTimeout(2000)

    // Stock should still be listed
    await expect(page.locator('text=贵州茅台')).toBeVisible()

    console.log('✅ Batch API failure: graceful degradation')
  })

  test('Stock AI network error shows retry', async ({ page }) => {
    await mockHotSectors(page)
    await page.route('**/api/stock-ai', route => route.abort())

    await page.goto(`${BASE}/stock`)
    await clearStorage(page)
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await page.locator('input[type="text"]').fill('什么是涨停板？')
    await page.locator('input[type="text"]').press('Enter')

    const errorOrRetry = page.locator('text=重新发送').or(page.locator('text=分析失败'))
    await expect(errorOrRetry).toBeVisible({ timeout: 15000 })

    console.log('✅ Stock AI error: retry shown')
  })
})

// ═════════════════════════════════════════════════════════
// 12. CROSS-PAGE INTEGRATION FLOWS
// ═════════════════════════════════════════════════════════

test.describe('12. Cross-Page Integration', () => {

  test('Decision on ChatPage → shows in HistoryPage', async ({ page }) => {
    await mockChatRecommendation(page)
    await page.goto(BASE)

    // Make a decision
    await page.locator('input[type="text"]').fill('火锅还是烤肉')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    // Wait for AI response (mocked with recommendation)
    await expect(page.locator('text=火锅').first()).toBeVisible({ timeout: 10000 })

    // Navigate to history
    await page.goto(`${BASE}/history`)

    // The decision should appear
    await expect(page.locator('text=火锅还是烤肉')).toBeVisible()

    console.log('✅ Cross-page: ChatPage decision → HistoryPage')
  })

  test('Watchlist click → StockPage with ?q= param', async ({ page }) => {
    await mockStockBatch(page)
    await mockStockAI(page, 'holding')
    await mockStockSearch(page)
    await mockHotSectors(page)

    await page.goto(`${BASE}/watchlist`)
    await page.evaluate(() => {
      localStorage.setItem('bangpick_watchlist', JSON.stringify([
        { code: '600519', name: '贵州茅台', market: 1, addedAt: new Date().toISOString() },
      ]))
    })
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    await expect(page.locator('text=贵州茅台')).toBeVisible({ timeout: 10000 })

    // Click to analyze
    await page.locator('button:has-text("贵州茅台")').first().click()

    // Should be on stock page with auto-sent query
    await expect(page).toHaveURL(/\/stock\?q=/)
    await expect(page.locator('text=帮我看看600519')).toBeVisible({ timeout: 10000 })

    console.log('✅ Cross-page: Watchlist → StockPage analysis')
  })
})
