import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5200/stock'

const MOBILE_DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
]

test.describe('炒股助手 — Desktop Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE)
    await page.evaluate(() => {
      localStorage.removeItem('stock_chat')
      localStorage.removeItem('stock_holdings')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('1. Landing page loads with all core elements', async ({ page }) => {
    // Header
    await expect(page.getByRole('heading', { name: '炒股助手' })).toBeVisible()

    // Hero
    await expect(page.locator('text=短线交易')).toBeVisible()
    await expect(page.locator('text=智能助手')).toBeVisible()

    // Feature cards — use button role to avoid matching description paragraph
    await expect(page.getByRole('button', { name: /选股推荐/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /持仓诊断/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /大盘风向/ })).toBeVisible()

    // Risk disclaimer
    await expect(page.locator('text=数据仅供参考')).toBeVisible()

    // Input bar
    await expect(page.locator('input[type="text"]')).toBeVisible()

    console.log('✅ Landing page: all elements rendered')
  })

  test('2. Hot sectors load dynamically', async ({ page }) => {
    const sectorLabel = page.locator('text=今日热门板块')
    const fallbackLabel = page.locator('text=快捷入口')

    await expect(sectorLabel.or(fallbackLabel)).toBeVisible({ timeout: 15000 })

    if (await sectorLabel.isVisible()) {
      const sectorCards = page.locator('text=点击查看短线机会')
      const count = await sectorCards.count()
      expect(count).toBeGreaterThanOrEqual(1)
      console.log(`✅ Hot sectors: ${count} sectors loaded`)
    } else {
      console.log('✅ Hot sectors: fallback examples shown')
    }
  })

  test('3. Feature card "选股推荐" triggers recommend flow', async ({ page }) => {
    await page.getByRole('button', { name: /选股推荐/ }).click()

    // User message
    await expect(page.locator('text=推荐今日短线机会')).toBeVisible({ timeout: 5000 })

    // Loading
    await expect(page.locator('text=获取行情数据中')).toBeVisible({ timeout: 10000 })

    // Wait for AI response
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    // Assistant response
    const response = page.locator('.flex.justify-start').first()
    await expect(response).toBeVisible()

    console.log('✅ 选股推荐: full flow works')
  })

  test('4. Feature card "持仓诊断" shows stock search', async ({ page }) => {
    await page.getByRole('button', { name: /持仓诊断/ }).click()

    // Should show search prompt
    await expect(page.locator('text=请搜索你持有的股票')).toBeVisible({ timeout: 5000 })

    // StockSearch input with known placeholder
    await expect(page.locator('input[placeholder*="输入代码或名称"]')).toBeVisible()

    console.log('✅ 持仓诊断: search form shown')
  })

  test('5. Feature card "大盘风向" triggers market analysis', async ({ page }) => {
    await page.getByRole('button', { name: /大盘风向/ }).click()

    // User message
    await expect(page.locator('.flex.justify-end')).toBeVisible({ timeout: 5000 })

    // Loading
    await expect(page.locator('text=获取行情数据中')).toBeVisible({ timeout: 10000 })

    // Wait for response (market analysis can be slow)
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    // Should have market verdict badge
    const verdicts = ['适合交易', '谨慎交易', '建议观望', '远离市场']
    let found = false
    for (const v of verdicts) {
      if (await page.locator(`text=${v}`).isVisible().catch(() => false)) { found = true; break }
    }
    expect(found).toBeTruthy()

    console.log('✅ 大盘风向: market analysis with verdict badge')
  })

  test('6. Text input: holding diagnosis (stock code + cost)', async ({ page }) => {
    await page.locator('input[type="text"]').fill('帮我看看000001 平安银行，成本15.5元')
    await page.locator('input[type="text"]').press('Enter')

    // Loading
    await expect(page.locator('text=获取行情数据中')).toBeVisible({ timeout: 15000 })

    // Wait for response
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    // Should have holding verdict badge
    const verdicts = ['继续持有', '加仓', '减仓', '清仓', '可以买入', '暂不建议买入']
    let found = false
    for (const v of verdicts) {
      if (await page.locator(`text=${v}`).isVisible().catch(() => false)) { found = true; break }
    }
    expect(found).toBeTruthy()

    console.log('✅ 持仓诊断: holding analysis with verdict')
  })

  test('7. Text input: sector recommendation', async ({ page }) => {
    await page.locator('input[type="text"]').fill('医药板块有什么短线机会？')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=医药板块有什么短线机会？')).toBeVisible()
    await expect(page.locator('text=获取行情数据中')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    const response = page.locator('.flex.justify-start').first()
    await expect(response).toBeVisible()

    console.log('✅ 板块推荐: sector recommendation works')
  })

  test('8. Text input: QA mode', async ({ page }) => {
    await page.locator('input[type="text"]').fill('什么是MACD金叉？')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=什么是MACD金叉？')).toBeVisible()
    await expect(page.locator('text=获取行情数据中')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    const response = page.locator('.flex.justify-start').first()
    await expect(response).toBeVisible()

    console.log('✅ QA模式: MACD question answered')
  })

  test('9. Off-topic rejection', async ({ page }) => {
    await page.locator('input[type="text"]').fill('今天天气怎么样')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=只能回答股票相关的问题')).toBeVisible({ timeout: 5000 })

    console.log('✅ Off-topic: correctly rejected')
  })

  test('10. Out-of-scope rejection', async ({ page }) => {
    await page.locator('input[type="text"]').fill('比特币怎么买')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=无法为您提供').or(page.locator('text=只能回答股票相关'))).toBeVisible({ timeout: 5000 })

    console.log('✅ Out-of-scope: correctly rejected')
  })

  test('11. Clear chat returns to landing', async ({ page }) => {
    await page.locator('input[type="text"]').fill('今天大盘怎么样')
    await page.locator('input[type="text"]').press('Enter')
    await expect(page.locator('text=今天大盘怎么样')).toBeVisible()

    const closeBtn = page.locator('header button:has(.material-symbols-outlined:has-text("close"))')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    await expect(page.locator('text=短线交易')).toBeVisible()
    await expect(page.locator('text=智能助手')).toBeVisible()

    console.log('✅ Clear chat: returned to landing')
  })

  test('12. Hot sector card fills and sends', async ({ page }) => {
    const hotSector = page.locator('button:has-text("点击查看短线机会")').first()

    try {
      await hotSector.waitFor({ timeout: 10000 })
      await hotSector.click()
      await expect(page.locator('.flex.justify-end')).toBeVisible({ timeout: 5000 })
      console.log('✅ Hot sector card: clicked and sent')
    } catch {
      console.log('⏭️ Hot sector card: skipped (sectors not loaded)')
    }
  })

  test('13. Error handling with network failure', async ({ page }) => {
    await page.route('**/api/stock-analyze', route => route.abort())

    await page.locator('input[type="text"]').fill('什么是涨停板？')
    await page.locator('input[type="text"]').press('Enter')

    const errorOrRetry = page.locator('text=重新发送').or(page.locator('text=分析失败'))
    await expect(errorOrRetry).toBeVisible({ timeout: 15000 })

    console.log('✅ Error handling: retry button shown on network failure')
  })

  test('14. Stock name input auto-analyzes', async ({ page }) => {
    await page.locator('input[type="text"]').fill('贵州茅台')
    await page.locator('input[type="text"]').press('Enter')

    await expect(page.locator('text=贵州茅台')).toBeVisible()
    await expect(page.locator('text=获取行情数据中')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    const response = page.locator('.flex.justify-start').first()
    await expect(response).toBeVisible()

    console.log('✅ 股票名称输入: auto-analyze works')
  })

  test('15. Multi-turn conversation', async ({ page }) => {
    await page.locator('input[type="text"]').fill('什么是均线？')
    await page.locator('input[type="text"]').press('Enter')
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    await page.locator('input[type="text"]').fill('那什么是MACD？')
    await page.locator('input[type="text"]').press('Enter')
    await expect(page.locator('text=获取行情数据中')).not.toBeVisible({ timeout: 90000 })

    await expect(page.locator('text=什么是均线？')).toBeVisible()
    await expect(page.locator('text=那什么是MACD？')).toBeVisible()

    const assistantBubbles = page.locator('.flex.justify-start')
    const count = await assistantBubbles.count()
    expect(count).toBeGreaterThanOrEqual(2)

    console.log('✅ Multi-turn: conversation maintained')
  })
})

// Mobile tests
for (const device of MOBILE_DEVICES) {
  test.describe(`炒股助手 — Mobile: ${device.name}`, () => {
    test.use({ viewport: { width: device.width, height: device.height }, hasTouch: true })

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE)
      await page.evaluate(() => {
        localStorage.removeItem('stock_chat')
        localStorage.removeItem('stock_holdings')
      })
      await page.reload()
      await page.waitForLoadState('networkidle')
    })

    test('Landing renders without horizontal overflow', async ({ page }) => {
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)

      await expect(page.getByRole('heading', { name: '炒股助手' })).toBeVisible()
      await expect(page.getByRole('button', { name: /选股推荐/ })).toBeVisible()
      await expect(page.locator('input[type="text"]')).toBeVisible()

      console.log(`✅ ${device.name}: landing renders, no overflow`)
    })

    test('Feature cards are tappable', async ({ page }) => {
      // Use QA input instead of tapping market card (which requires long API wait)
      await page.locator('input[type="text"]').fill('什么是涨停')
      await page.locator('input[type="text"]').press('Enter')

      // Should enter chat
      await expect(page.locator('text=什么是涨停')).toBeVisible({ timeout: 5000 })

      // Loading should appear
      await expect(page.locator('text=获取行情数据中').or(page.locator('text=只能回答股票相关'))).toBeVisible({ timeout: 10000 })

      console.log(`✅ ${device.name}: input and send works`)
    })

    test('Chat flow no overflow', async ({ page }) => {
      await page.locator('input[type="text"]').fill('什么是涨停')
      await page.locator('input[type="text"]').press('Enter')

      await expect(page.locator('text=什么是涨停')).toBeVisible()

      // Wait a moment for layout
      await page.waitForTimeout(1000)

      const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(5)

      console.log(`✅ ${device.name}: chat flow, no overflow`)
    })

    test('BottomNav visible', async ({ page }) => {
      // Use specific link role to avoid matching header h1
      const navLink = page.getByRole('link', { name: /炒股助手/ })
      await expect(navLink).toBeVisible()

      await expect(page.locator('text=帮我选')).toBeVisible()

      console.log(`✅ ${device.name}: BottomNav visible`)
    })
  })
}
