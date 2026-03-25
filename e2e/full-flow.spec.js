import { test, expect } from '@playwright/test'

// ============================================================
// 测试套件 1：导航栏与全局布局
// ============================================================
test.describe('导航栏与布局', () => {
  test('页面加载，导航栏可见，Logo 和链接正常', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByText('验收助手')).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: '上传文档' })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: '历史记录' })).toBeVisible()
    await expect(page.getByRole('navigation').getByRole('link', { name: '设置' })).toBeVisible()
  })

  test('导航链接跳转正确', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation').getByRole('link', { name: '历史记录' }).click()
    await expect(page).toHaveURL('/history')
    await page.getByRole('navigation').getByRole('link', { name: '设置' }).click()
    await expect(page).toHaveURL('/settings')
    await page.getByRole('navigation').getByRole('link', { name: '上传文档' }).click()
    await expect(page).toHaveURL('/')
  })

  test('API 状态指示点可见', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('ai_api_key'))
    await page.reload()
    const dot = page.locator('nav [title*="API"]')
    await expect(dot).toBeVisible()
  })
})

// ============================================================
// 测试套件 2：上传页
// ============================================================
test.describe('上传页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('上传页标题和上传区域可见', async ({ page }) => {
    await expect(page.getByText('上传需求文档')).toBeVisible()
    await expect(page.getByText('拖拽 PDF 文件到此处')).toBeVisible()
  })

  test('未配置 API Key 时显示警告', async ({ page }) => {
    await expect(page.getByText('未配置 API Key')).toBeVisible()
    await expect(page.getByText('去配置')).toBeVisible()
  })

  test('点击「直接粘贴文本」切换到文本模式', async ({ page }) => {
    await page.getByText('直接粘贴文本').click()
    await expect(page.locator('textarea')).toBeVisible()
    await expect(page.getByRole('button', { name: '生成验收清单' })).toBeVisible()
    await page.getByRole('button', { name: '返回' }).click()
    await expect(page.getByText('拖拽 PDF 文件到此处')).toBeVisible()
  })

  test('点击「查看演示」生成 mock 清单并跳转', async ({ page }) => {
    await page.getByText('查看演示').click()
    await expect(page).toHaveURL(/\/checklist\//)
    await expect(page.getByText('用户注册')).toBeVisible()
    await expect(page.getByText('用户登录')).toBeVisible()
    await expect(page.getByText('订单管理')).toBeVisible()
  })

  test('粘贴文本模式 — 空内容时按钮禁用', async ({ page }) => {
    await page.getByText('直接粘贴文本').click()
    const btn = page.getByRole('button', { name: '生成验收清单' })
    await expect(btn).toBeDisabled()
    await page.locator('textarea').fill('测试需求文档内容')
    await expect(btn).toBeEnabled()
  })

  test('粘贴文本并提交 — 使用 mock 数据', async ({ page }) => {
    await page.getByText('直接粘贴文本').click()
    await page.locator('textarea').fill('用户注册功能')
    await page.getByRole('button', { name: '生成验收清单' }).click()
    await expect(page).toHaveURL(/\/checklist\//, { timeout: 10000 })
  })
})

// ============================================================
// 测试套件 3：验收清单页 — 核心流程
// ============================================================
test.describe('验收清单页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByText('查看演示').click()
    await expect(page).toHaveURL(/\/checklist\//)
  })

  test('页面结构 — 标题、统计区、模块列表', async ({ page }) => {
    await expect(page.getByText('演示文档.pdf')).toBeVisible()
    // 统计卡片 — 使用 exact 匹配
    await expect(page.getByText('通过', { exact: true })).toBeVisible()
    await expect(page.getByText('不通过', { exact: true })).toBeVisible()
    await expect(page.getByText('跳过', { exact: true })).toBeVisible()
    await expect(page.getByText('待验收', { exact: true })).toBeVisible()
    // 圆环图
    await expect(page.getByText('0%').first()).toBeVisible()
    // 按钮
    await expect(page.getByRole('button', { name: '← 返回' })).toBeVisible()
    await expect(page.getByRole('button', { name: '导出报告' })).toBeVisible()
    // 模块
    await expect(page.getByText('用户注册')).toBeVisible()
    await expect(page.getByText('用户登录')).toBeVisible()
    await expect(page.getByText('订单管理')).toBeVisible()
  })

  test('点击 ✓ 按钮将检查项标记为通过', async ({ page }) => {
    const passButtons = page.locator('button:has-text("✓")')
    await passButtons.first().click()
    // 验证进度更新 — 已验收数从 0 变为 1
    await expect(page.getByText(/验收进度 1\/17/)).toBeVisible()
  })

  test('点击 ✗ 按钮标记不通过，自动显示备注框', async ({ page }) => {
    const failButtons = page.locator('button:has-text("✗")')
    await failButtons.first().click()
    await expect(page.locator('textarea[placeholder="输入备注..."]').first()).toBeVisible()
  })

  test('输入备注内容', async ({ page }) => {
    const failButtons = page.locator('button:has-text("✗")')
    await failButtons.first().click()
    const noteBox = page.locator('textarea[placeholder="输入备注..."]').first()
    await noteBox.fill('此功能存在 Bug')
    await expect(noteBox).toHaveValue('此功能存在 Bug')
  })

  test('点击 — 按钮标记跳过', async ({ page }) => {
    const skipButtons = page.locator('button:has-text("—")')
    await skipButtons.first().click()
    // 验证跳过数变为 1
    const statCards = page.locator('.glass-card .glass-card')
    const skipCard = statCards.filter({ hasText: '跳过' })
    await expect(skipCard.getByText('1')).toBeVisible()
  })

  test('折叠/展开模块', async ({ page }) => {
    // 点击模块标题折叠
    const moduleHeader = page.locator('button').filter({ hasText: '用户注册' }).first()
    await moduleHeader.click()
    await expect(page.getByText('手机号注册流程正常完成')).not.toBeVisible()
    // 再次点击展开
    await moduleHeader.click()
    await expect(page.getByText('手机号注册流程正常完成')).toBeVisible()
  })

  test('添加自定义检查项', async ({ page }) => {
    const addBtns = page.getByText('+ 添加检查项')
    await addBtns.first().click()
    const input = page.locator('input[placeholder="输入新的检查项..."]')
    await input.fill('验证码倒计时 60 秒')
    await page.getByRole('button', { name: '添加', exact: true }).click()
    await expect(page.getByText('验证码倒计时 60 秒')).toBeVisible()
  })

  test('返回按钮跳转到首页', async ({ page }) => {
    await page.getByRole('button', { name: '← 返回' }).click()
    await expect(page).toHaveURL('/')
  })
})

// ============================================================
// 测试套件 4：历史记录页
// ============================================================
test.describe('历史记录页', () => {
  test('空状态 — 无记录时显示提示', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/history')
    await expect(page.getByText('还没有验收记录')).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: '上传文档' })).toBeVisible()
  })

  test('有记录时 — 显示文档卡片', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByText('查看演示').click()
    await expect(page).toHaveURL(/\/checklist\//)
    await page.getByRole('navigation').getByRole('link', { name: '历史记录' }).click()
    await expect(page.getByText('演示文档.pdf')).toBeVisible()
    await expect(page.getByText('17 检查项')).toBeVisible()
  })

  test('搜索过滤功能', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByText('查看演示').click()
    await page.getByRole('navigation').getByRole('link', { name: '历史记录' }).click()

    const searchInput = page.locator('input[placeholder="搜索文件名..."]')
    await searchInput.fill('演示')
    await expect(page.getByText('演示文档.pdf')).toBeVisible()
    await searchInput.fill('不存在的文件')
    await expect(page.getByText('没有找到匹配')).toBeVisible()
  })

  test('点击卡片跳转到清单页', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByText('查看演示').click()
    await page.getByRole('navigation').getByRole('link', { name: '历史记录' }).click()
    await page.getByText('演示文档.pdf').click()
    await expect(page).toHaveURL(/\/checklist\//)
  })

  test('删除记录', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByText('查看演示').click()
    await page.getByRole('navigation').getByRole('link', { name: '历史记录' }).click()
    page.on('dialog', (d) => d.accept())
    await page.locator('button:has-text("✕")').first().click()
    await expect(page.getByText('还没有验收记录')).toBeVisible()
  })
})

// ============================================================
// 测试套件 5：设置页
// ============================================================
test.describe('设置页', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('页面结构 — 供应商选择和 API Key 输入', async ({ page }) => {
    await expect(page.getByText('AI 模型')).toBeVisible()
    await expect(page.getByRole('button', { name: /DeepSeek/ })).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible()
  })

  test('切换供应商', async ({ page }) => {
    await page.getByRole('button', { name: /MiniMax M2\.7/ }).click()
    await expect(page.getByText('MiniMax-M2.7')).toBeVisible()
  })

  test('输入并保存 API Key', async ({ page }) => {
    const input = page.locator('input[type="password"]')
    await input.fill('sk-test-key-12345')
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByText('✓ 已保存')).toBeVisible()
    const savedKey = await page.evaluate(() => localStorage.getItem('ai_api_key'))
    expect(savedKey).toBe('sk-test-key-12345')
  })

  test('数据管理 — 显示存储空间', async ({ page }) => {
    await expect(page.getByText('数据管理')).toBeVisible()
    await expect(page.getByText(/已用空间/)).toBeVisible()
    await expect(page.getByRole('button', { name: '清除所有数据' })).toBeVisible()
  })
})

// ============================================================
// 测试套件 6：隐私协议页
// ============================================================
test.describe('隐私协议页', () => {
  test('页面可访问且内容完整', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: '隐私协议' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '数据收集' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '数据用途' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '数据存储' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '第三方服务' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '您的权利' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '联系方式' })).toBeVisible()
  })
})

// ============================================================
// 测试套件 7：完整用户旅程
// ============================================================
test.describe('完整用户旅程', () => {
  test('新用户首次使用全流程', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // 1. 上传页
    await expect(page.getByText('上传需求文档')).toBeVisible()
    await expect(page.getByText('未配置 API Key')).toBeVisible()

    // 2. 演示入口
    await page.getByText('查看演示').click()
    await expect(page).toHaveURL(/\/checklist\//)

    // 3. 验收操作
    const passButtons = page.locator('button:has-text("✓")')
    await passButtons.nth(0).click()
    await passButtons.nth(1).click()
    await passButtons.nth(2).click()

    // 4. 标记不通过并加备注
    const failButtons = page.locator('button:has-text("✗")')
    await failButtons.nth(3).click()
    const noteBox = page.locator('textarea[placeholder="输入备注..."]').first()
    await noteBox.fill('功能未实现')

    // 5. 验证统计更新
    await expect(page.getByText(/验收进度 4\/17/)).toBeVisible()

    // 6. 返回首页
    await page.getByRole('button', { name: '← 返回' }).click()
    await expect(page).toHaveURL('/')

    // 7. 历史记录
    await page.getByRole('navigation').getByRole('link', { name: '历史记录' }).click()
    await expect(page.getByText('演示文档.pdf')).toBeVisible()

    // 8. 设置页
    await page.getByRole('navigation').getByRole('link', { name: '设置' }).click()
    await expect(page.getByText('AI 模型')).toBeVisible()
  })
})
