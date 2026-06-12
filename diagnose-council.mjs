// Quick diagnostic: screenshot + find 🏛️ button
import { chromium } from 'playwright'
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto('http://localhost:3099', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Dump all buttons visible
  const buttons = await page.$$eval('button', els => els.map(el => ({
    text: el.textContent?.slice(0, 30),
    title: el.getAttribute('title') || '',
    class: el.className?.slice(0, 60),
  })))
  console.log('=== BUTTONS FOUND ===')
  buttons.slice(0, 30).forEach((b, i) => console.log(`[${i}] title="${b.title}" text="${b.text}"`))

  // Find 🏛️ button specifically
  const councilBtn = await page.$('button[title="智能群聊"]')
  console.log(`\n🏛️ button by title: ${councilBtn ? 'FOUND' : 'NOT FOUND'}`)

  // Check sidebar structure
  const sidebar = await page.$('aside')
  console.log(`Sidebar <aside>: ${sidebar ? 'FOUND' : 'NOT FOUND'}`)

  // Check for council-related text
  const councilText = await page.$('text=开会讨论')
  console.log(`"开会讨论" text: ${councilText ? 'FOUND' : 'NOT FOUND'}`)

  // Screenshot
  await page.screenshot({ path: 'D:\\king2046\\test-output\\diagnostic.png', fullPage: true })
  console.log('\nScreenshot saved to test-output/diagnostic.png')

  // If button found, click it
  if (councilBtn) {
    await councilBtn.click()
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'D:\\king2046\\test-output\\after-click.png', fullPage: true })
    console.log('Clicked 🏛️, screenshot saved')
  }

  await browser.close()
})()
