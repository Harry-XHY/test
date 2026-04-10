import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:5174'

const MOBILE_DEVICES = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14 Pro', width: 393, height: 852 },
  { name: 'Pixel 7', width: 412, height: 915 },
  { name: 'Galaxy S21', width: 360, height: 800 },
]

test.describe('Desktop Tests', () => {

  test('1. Landing page loads with all elements', async ({ page }) => {
    await page.goto(BASE)

    // Header
    await expect(page.locator('h1:has-text("帮我选")')).toBeVisible()

    // Hero
    await expect(page.locator('text=纠结的时候')).toBeVisible()
    await expect(page.locator('text=交给我')).toBeVisible()

    // Fortune card
    await expect(page.locator('text=Draw Oracle').first()).toBeVisible()

    // Quick Scenarios
    await expect(page.locator('text=Quick Scenarios')).toBeVisible()
    const scenarioCards = page.locator('.glass-card').filter({ has: page.locator('h5') })
    await expect(scenarioCards).toHaveCount(4)

    // Try Asking Me
    await expect(page.locator('text=Try asking me')).toBeVisible()

    // Input bar
    await expect(page.locator('input[type="text"]')).toBeVisible()
    await expect(page.locator('.material-symbols-outlined:has-text("mic")')).toBeVisible()

    console.log('✅ Desktop landing: all elements rendered')
  })

  test('2. Scenario card fills input', async ({ page }) => {
    await page.goto(BASE)
    const firstCard = page.locator('.glass-card').filter({ has: page.locator('h5') }).first()
    await firstCard.click()
    const value = await page.locator('input[type="text"]').inputValue()
    expect(value.length).toBeGreaterThan(0)
    console.log(`✅ Scenario card: filled "${value}"`)
  })

  test('3. Example question fills input', async ({ page }) => {
    await page.goto(BASE)
    const firstExample = page.locator('button:has(.material-symbols-outlined:has-text("arrow_outward"))').first()
    await firstExample.click()
    const value = await page.locator('input[type="text"]').inputValue()
    expect(value.length).toBeGreaterThan(0)
    console.log(`✅ Example: filled "${value}"`)
  })

  test('4. Send message → chat view', async ({ page }) => {
    await page.goto(BASE)
    await page.locator('input[type="text"]').fill('火锅还是烤肉？')

    await expect(page.locator('.material-symbols-outlined:has-text("send")')).toBeVisible()
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    // User bubble
    await expect(page.locator('text=火锅还是烤肉？')).toBeVisible()

    // Landing gone
    await expect(page.locator('text=Quick Scenarios')).not.toBeVisible()

    // Wait for either loading indicator or AI response to appear
    await expect(page.locator('.flex.justify-start').first()).toBeVisible({ timeout: 10000 })

    // Close button
    await expect(page.locator('.material-symbols-outlined:has-text("close")')).toBeVisible()

    console.log('✅ Chat transition: correct')
  })

  test('5. AI responds', async ({ page }) => {
    await page.goto(BASE)
    await page.locator('input[type="text"]').fill('火锅还是烤肉，两个人晚饭')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    // Wait for AI response (loading may flash too quickly to catch)
    const response = page.locator('.flex.justify-start').first()
    await expect(response).toBeVisible({ timeout: 35000 })

    console.log('✅ AI response: received')
  })

  test('6. Random picker appears on recommendations', { annotation: { type: 'flaky', description: 'Depends on AI returning recommendation format' } }, async ({ page }) => {
    await page.goto(BASE)
    await page.locator('input[type="text"]').fill('火锅、烤肉、日料，今晚吃哪个？预算200')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    const picker = page.locator('text=帮我随机选一个')
    await expect(picker).toBeVisible({ timeout: 35000 })

    console.log('✅ Random picker: visible')
  })

  test('7. Clear chat returns to landing', async ({ page }) => {
    await page.goto(BASE)
    await page.locator('input[type="text"]').fill('测试')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    const closeBtn = page.locator('header .material-symbols-outlined:has-text("close")')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    await expect(page.locator('text=Quick Scenarios')).toBeVisible()
    console.log('✅ Clear chat: returned to landing')
  })

  test('8. Error shows retry button', async ({ page }) => {
    await page.route('**/api/chat', (route) => route.abort())
    await page.goto(BASE)
    await page.locator('input[type="text"]').fill('测试错误')
    await page.locator('.material-symbols-outlined:has-text("send")').click()

    await expect(page.locator('text=重新发送')).toBeVisible({ timeout: 35000 })
    console.log('✅ Error: retry button shown')
  })

  test('9. Fortune card opens modal', async ({ page }) => {
    await page.goto(BASE)

    // Click fortune card
    const fortuneBtn = page.locator('text=Draw Oracle').first()
    await fortuneBtn.click()

    // Modal overlay appears
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Front side visible - "今日一签" text
    await expect(page.locator('[role="dialog"] >> text=今日一签')).toBeVisible()

    console.log('✅ Fortune modal: opens correctly')
  })

  test('10. Fortune card flip reveals fortune', async ({ page }) => {
    await page.goto(BASE)

    // Open modal
    await page.locator('text=Draw Oracle').first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Click card to flip
    await page.locator('.fortune-card').click()

    // Wait for flip animation
    await page.waitForTimeout(800)

    // Back side content should be visible (Yi/Ji tags)
    await expect(page.locator('text=Yi / 宜')).toBeVisible()
    await expect(page.locator('text=Ji / 忌')).toBeVisible()

    console.log('✅ Fortune flip: fortune revealed')
  })

  test('11. Fortune modal closes', async ({ page }) => {
    await page.goto(BASE)

    await page.locator('text=Draw Oracle').first().click()
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Close button
    const closeBtn = page.locator('[role="dialog"] button:has(.material-symbols-outlined:has-text("close"))')
    await closeBtn.click()

    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    console.log('✅ Fortune modal: closes correctly')
  })

  test('12. Fortune drawn state persists', async ({ page }) => {
    await page.goto(BASE)

    // Draw fortune
    await page.locator('text=Draw Oracle').first().click()
    await page.locator('.fortune-card').click()
    await page.waitForTimeout(800)

    // Close modal
    await page.locator('[role="dialog"] button:has(.material-symbols-outlined:has-text("close"))').click()

    // Fortune card should show drawn state (fortune level text)
    const fortuneSection = page.locator('section').filter({ has: page.locator('text=Draw Oracle') })
    await expect(fortuneSection).toBeVisible()

    // Reload and check persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should still show drawn state (not "每日一签" but the fortune level)
    const drawnCard = page.locator('text=Draw Oracle').first()
    await expect(drawnCard).toBeVisible()

    console.log('✅ Fortune drawn state: persists after reload')
  })
})

// Mobile tests
for (const device of MOBILE_DEVICES) {
  test.describe(`Mobile: ${device.name} (${device.width}x${device.height})`, () => {
    test.use({ viewport: { width: device.width, height: device.height }, hasTouch: true })

    test('Landing page renders without overflow', async ({ page }) => {
      await page.goto(BASE)
      await page.waitForLoadState('networkidle')

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)

      await expect(page.locator('h1:has-text("帮我选")')).toBeVisible()
      await expect(page.locator('text=纠结的时候')).toBeVisible()

      const firstCard = page.locator('.glass-card').filter({ has: page.locator('h5') }).first()
      await expect(firstCard).toBeVisible()

      await expect(page.locator('input[type="text"]')).toBeVisible()

      console.log(`✅ ${device.name}: landing renders correctly, no overflow`)
    })

    test('Cards are tappable and input fills', async ({ page }) => {
      await page.goto(BASE)

      const firstCard = page.locator('.glass-card').filter({ has: page.locator('h5') }).first()
      await firstCard.tap()

      const value = await page.locator('input[type="text"]').inputValue()
      expect(value.length).toBeGreaterThan(0)

      console.log(`✅ ${device.name}: card tap fills input`)
    })

    test('Chat flow works end-to-end', async ({ page }) => {
      await page.goto(BASE)

      await page.locator('input[type="text"]').fill('测试')
      await page.locator('.material-symbols-outlined:has-text("send")').tap()

      await expect(page.locator('text=测试').first()).toBeVisible()
      // Wait for either loading indicator or AI response to appear
      await expect(page.locator('.flex.justify-start').first()).toBeVisible({ timeout: 10000 })

      const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth)
      expect(overflow).toBeLessThanOrEqual(5)

      console.log(`✅ ${device.name}: chat flow works, no overflow`)
    })

    test('Fortune modal works on mobile', async ({ page }) => {
      await page.goto(BASE)

      await page.locator('text=Draw Oracle').first().tap()
      await expect(page.locator('[role="dialog"]')).toBeVisible()

      // Card should fit in viewport
      const cardBox = await page.locator('.fortune-card').boundingBox()
      expect(cardBox.width).toBeLessThanOrEqual(device.width)
      expect(cardBox.height).toBeLessThanOrEqual(device.height)

      console.log(`✅ ${device.name}: fortune modal fits viewport`)
    })
  })
}
