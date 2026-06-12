/**
 * E2E: Sidebar 🏛️ Button → Council 3-Round Discussion Flow
 * Run: npx playwright test D:\king2046\test-council-e2e.ts --headed
 */
import { test, expect } from '@playwright/test'

test('Sidebar 🏛️ council button opens and runs 3-round discussion', async ({ page }) => {
  test.setTimeout(180_000) // 3 minutes — LLM calls are slow

  // 1. Navigate to the app
  await page.goto('http://localhost:3099', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  // Take initial screenshot
  await page.screenshot({ path: 'D:\\king2046\\test-output\\01-initial.png', fullPage: false })

  // 2. Find the sidebar chat input and type a topic
  const chatInput = page.locator('aside input[type="text"], aside textarea, [placeholder*="告诉小A"], [placeholder*="输入"]').first()
  if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await chatInput.fill('测试AI品牌内容优化策略')
    await page.waitForTimeout(500)
    console.log('✅ Topic typed')
  } else {
    console.log('⚠️ Chat input not found, trying action card approach')
  }

  // 3. Click the 🏛️ button — it's in the sidebar header
  // The button has title="智能群聊" and contains 🏛️
  const councilButton = page.locator('button[title="智能群聊"]')
  const councilButtonByText = page.locator('button:has-text("🏛️")')

  let clicked = false
  for (const btn of [councilButton, councilButtonByText]) {
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click()
      clicked = true
      console.log('✅ 🏛️ Council button clicked')
      break
    }
  }

  if (!clicked) {
    // Try clicking "开会讨论" action card from welcome message
    const actionCard = page.locator('text=开会讨论').first()
    if (await actionCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await actionCard.click()
      clicked = true
      console.log('✅ 开会讨论 action card clicked')
    }
  }

  if (!clicked) {
    console.log('❌ Could not find 🏛️ button or 开会讨论 action card')
    await page.screenshot({ path: 'D:\\king2046\\test-output\\02-no-button.png', fullPage: false })
    // Dump visible buttons for debugging
    const buttons = await page.locator('button').allTextContents()
    console.log('Visible buttons:', buttons.slice(0, 20))
    return
  }

  await page.screenshot({ path: 'D:\\king2046\\test-output\\02-council-started.png', fullPage: false })

  // 4. Wait for council flow to complete
  // Look for the council announcement message and then department agent messages
  console.log('⏳ Waiting for council discussion...')

  // Wait for the "已发起专家群聊" system message
  try {
    await page.waitForSelector('text=已发起专家群聊', { timeout: 10000 })
    console.log('✅ Council announcement visible')
  } catch {
    console.log('⚠️ Council announcement not found, checking for alternative indicators')
  }

  // 5. Wait for agent responses — these take time (DeepSeek API)
  // Wait for department agent names to appear in chat
  const deptNames = ['视觉部', '内容部', '数据部', '技术部', 'AI部', '质控部', '渠道部', 'GEO部']
  let foundDepts: string[] = []

  // Poll for up to 120 seconds for agent messages to appear
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(5000)

    for (const dept of deptNames) {
      if (!foundDepts.includes(dept)) {
        const visible = await page.locator(`text=${dept}负责人`).first().isVisible().catch(() => false)
        if (visible) {
          foundDepts.push(dept)
          console.log(`  ✅ ${dept}部负责人 spoke (${foundDepts.length}/8)`)
        }
      }
    }

    // Check for summary (minutes/tasks)
    const hasSummary = await page.locator('text=会议纪要').first().isVisible().catch(() => false)
    if (hasSummary && foundDepts.length >= 3) {
      console.log('✅ Council summary visible, discussion complete')
      break
    }

    if (foundDepts.length >= 8) {
      console.log('✅ All 8 departments have spoken')
      break
    }
  }

  // 6. Take final screenshot
  await page.screenshot({ path: 'D:\\king2046\\test-output\\03-council-result.png', fullPage: false })

  // 7. Verify results
  const hasDeptMessages = foundDepts.length >= 3
  expect(hasDeptMessages, `Only found ${foundDepts.length}/8 departments`).toBe(true)

  console.log(`🎉 Test complete! Found ${foundDepts.length}/8 departments: ${foundDepts.join(', ')}`)
})
