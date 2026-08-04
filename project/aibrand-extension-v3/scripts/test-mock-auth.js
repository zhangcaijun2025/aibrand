/**
 * AiBrand Extension Mock Auth Test Script
 * 使用 Playwright 自动化测试 Chrome 扩展的模拟登录功能
 */

const { chromium } = require('playwright');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../.output/chrome-mv3');
const USER_DATA_DIR = path.resolve(__dirname, '../.tmp-chrome-profile');

async function main() {
  console.log('🚀 启动 Chrome 浏览器并加载 AiBrand 扩展...');

  // 启动带扩展的 Chrome
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: 1280, height: 800 },
  });

  // 获取扩展 ID
  let extensionId = null;
  
  // 访问扩展管理页面
  console.log('📋 打开扩展管理页面...');
  const page = await context.newPage();
  await page.goto('chrome://extensions/');
  
  // 等待扩展加载
  await page.waitForTimeout(2000);
  
  // 尝试获取扩展 ID
  try {
    const extensions = await page.evaluate(() => {
      const items = document.querySelectorAll('extensions-item');
      const result = [];
      items.forEach(item => {
        const name = item.shadowRoot?.querySelector('#name')?.textContent;
        const id = item.getAttribute('id');
        if (name && id) {
          result.push({ name, id });
        }
      });
      return result;
    });
    
    const aibrand = extensions.find(e => e.name.includes('AiBrand'));
    if (aibrand) {
      extensionId = aibrand.id;
      console.log('✅ 找到扩展:', aibrand.name, 'ID:', extensionId);
    }
  } catch (e) {
    console.log('⚠️  无法从扩展页面获取 ID，尝试其他方法...');
  }

  // 打开测试页面
  console.log('🌐 打开测试页面...');
  const testPage = await context.newPage();
  await testPage.goto('https://www.baidu.com');
  
  // 等待内容脚本加载
  await testPage.waitForTimeout(3000);

  // 截图初始状态
  await testPage.screenshot({ path: 'screenshots/01-initial-page.png' });
  console.log('📸 已截图: 初始页面');

  // 尝试通过扩展的 service worker 来执行命令
  // 首先打开扩展的 popup 或 background page
  
  // 方法1: 通过 chrome.runtime.sendMessage 通信
  console.log('🔐 尝试通过内容脚本触发模拟登录...');
  
  try {
    // 注入脚本测试认证状态
    const authState = await testPage.evaluate(async () => {
      return new Promise((resolve) => {
        // 尝试向扩展发送消息
        if (window.chrome && chrome.runtime) {
          chrome.runtime.sendMessage(
            { action: 'AIBRAND_GET_AUTH_STATE' },
            (response) => {
              resolve(response || { error: 'no response' });
            }
          );
        } else {
          resolve({ error: 'chrome.runtime not available' });
        }
      });
    });
    
    console.log('📊 初始认证状态:', authState);
  } catch (e) {
    console.log('⚠️  无法通过页面获取认证状态:', e.message);
  }

  // 方法2: 打开扩展后台页面 (service worker)
  if (extensionId) {
    console.log('🔧 打开扩展后台页面...');
    
    const bgPage = await context.newPage();
    await bgPage.goto(`chrome-extension://${extensionId}/background.html`);
    
    // 或者打开 service worker devtools (这在自动化中比较复杂)
    // 我们可以直接在 background page 执行代码
    
    await bgPage.waitForTimeout(2000);
    await bgPage.screenshot({ path: 'screenshots/02-background-page.png' });
    console.log('📸 已截图: 后台页面');
  }

  // 方法3: 在页面中注入代码，通过内容脚本桥接
  console.log('💬 执行模拟登录命令 (通过内容脚本)...');
  
  // 由于内容脚本有 world: MAIN，我们可以直接在页面上访问 AiBrandMockAuth
  // 但需要先检查是否可用
  
  const mockAuthAvailable = await testPage.evaluate(() => {
    return typeof window.AiBrandMockAuth !== 'undefined';
  });
  
  if (mockAuthAvailable) {
    console.log('✅ AiBrandMockAuth 在页面中可用');
    
    // 执行管理员登录
    console.log('👑 执行管理员登录...');
    const adminResult = await testPage.evaluate(async () => {
      try {
        await window.AiBrandMockAuth.loginAsAdmin();
        return await window.AiBrandMockAuth.getMockAuthState();
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('👑 管理员登录结果:', JSON.stringify(adminResult, null, 2));
    
    await testPage.screenshot({ path: 'screenshots/03-admin-login.png' });
    console.log('📸 已截图: 管理员登录');
    
    // 执行普通用户登录
    console.log('👤 执行普通用户登录...');
    const userResult = await testPage.evaluate(async () => {
      try {
        await window.AiBrandMockAuth.loginAsUser();
        return await window.AiBrandMockAuth.getMockAuthState();
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('👤 普通用户登录结果:', JSON.stringify(userResult, null, 2));
    
    await testPage.screenshot({ path: 'screenshots/04-user-login.png' });
    console.log('📸 已截图: 普通用户登录');
    
    // 执行开发者登录
    console.log('💻 执行开发者登录...');
    const devResult = await testPage.evaluate(async () => {
      try {
        await window.AiBrandMockAuth.loginAsDeveloper();
        return await window.AiBrandMockAuth.getMockAuthState();
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('💻 开发者登录结果:', JSON.stringify(devResult, null, 2));
    
    await testPage.screenshot({ path: 'screenshots/05-developer-login.png' });
    console.log('📸 已截图: 开发者登录');
    
    // 登出
    console.log('🚪 执行登出...');
    const logoutResult = await testPage.evaluate(async () => {
      try {
        await window.AiBrandMockAuth.logout();
        return await window.AiBrandMockAuth.getMockAuthState();
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('🚪 登出结果:', JSON.stringify(logoutResult, null, 2));
    
    await testPage.screenshot({ path: 'screenshots/06-logout.png' });
    console.log('📸 已截图: 登出');
    
  } else {
    console.log('⚠️  AiBrandMockAuth 在页面中不可用');
    console.log('   可能原因: 内容脚本未注入或注册在不同的 context');
    
    // 尝试查看页面上有哪些全局变量
    const globalVars = await testPage.evaluate(() => {
      const vars = [];
      for (const key of Object.keys(window)) {
        if (key.toLowerCase().includes('aibrand')) {
          vars.push(key);
        }
      }
      return vars;
    });
    
    console.log('🔍 页面上的 AiBrand 相关全局变量:', globalVars);
  }

  // 保持浏览器打开 10 秒供查看
  console.log('\n⏳ 保持浏览器打开 10 秒...');
  console.log('   您可以手动打开扩展控制台查看详细日志');
  console.log('   操作方法:');
  console.log('   1. 打开 chrome://extensions/');
  console.log('   2. 找到 AiBrand 扩展');
  console.log('   3. 点击 "服务工作者" 打开后台控制台');
  console.log('   4. 在控制台输入: await AiBrandMockAuth.loginAsAdmin()');
  
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\n✅ 测试完成！');
  console.log('📁 截图保存在: screenshots/ 目录');
  
  await context.close();
}

main().catch(console.error);
