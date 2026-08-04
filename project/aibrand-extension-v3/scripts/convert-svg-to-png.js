#!/usr/bin/env node
/**
 * AiBrand SVG to PNG Converter
 * 将 SVG 资源转换为 Chrome 商店要求的 PNG 格式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 资源映射：SVG 文件 → PNG 输出配置
const resources = [
  {
    svg: 'public/icon.svg',
    png: 'public/icon-128.png',
    size: 128,
    description: 'Chrome 商店扩展图标',
  },
  {
    svg: 'public/icon.svg',
    png: 'public/icon-48.png',
    size: 48,
    description: '扩展图标 48x48',
  },
  {
    svg: 'public/icon.svg',
    png: 'public/icon-32.png',
    size: 32,
    description: '扩展图标 32x32',
  },
  {
    svg: 'public/icon.svg',
    png: 'public/icon-16.png',
    size: 16,
    description: '扩展图标 16x16',
  },
  {
    svg: 'public/promo-small.svg',
    png: 'public/promo-small.png',
    size: 440,
    width: 440,
    height: 280,
    description: 'Chrome 商店小宣传图',
  },
  {
    svg: 'public/screenshot-1-main.svg',
    png: 'public/screenshot-1-main.png',
    size: 1280,
    width: 1280,
    height: 800,
    description: '截图 1: 主功能 - 侧边面板发布流程',
  },
  {
    svg: 'public/screenshot-2-agent.svg',
    png: 'public/screenshot-2-agent.png',
    size: 1280,
    width: 1280,
    height: 800,
    description: '截图 2: AI Agent 智能助手',
  },
  {
    svg: 'public/screenshot-3-actions.svg',
    png: 'public/screenshot-3-actions.png',
    size: 1280,
    width: 1280,
    height: 800,
    description: '截图 3: 一键互动操作',
  },
  {
    svg: 'public/screenshot-4-comments.svg',
    png: 'public/screenshot-4-comments.png',
    size: 1280,
    width: 1280,
    height: 800,
    description: '截图 4: 评论任务管理',
  },
];

/**
 * 检查转换工具是否可用
 */
function checkTool(tool) {
  try {
    execSync(`${tool} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 使用 sharp 库转换（推荐，跨平台）
 */
async function convertWithSharp() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('⚠️  sharp 未安装，正在尝试安装...');
    try {
      execSync('npm install sharp --no-save', { stdio: 'inherit' });
      sharp = require('sharp');
    } catch (err) {
      throw new Error('无法安装 sharp 库');
    }
  }

  for (const res of resources) {
    const svgPath = path.resolve(res.svg);
    const pngPath = path.resolve(res.png);

    if (!fs.existsSync(svgPath)) {
      console.log(`❌ SVG 文件不存在: ${res.svg}`);
      continue;
    }

    const svgContent = fs.readFileSync(svgPath, 'utf-8');

    await sharp(Buffer.from(svgContent))
      .resize(res.width || res.size, res.height || res.size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(pngPath);

    const stats = fs.statSync(pngPath);
    console.log(`✅ ${res.description}`);
    console.log(`   ${res.png} (${(stats.size / 1024).toFixed(2)} KB)`);
  }
}

/**
 * 使用 ImageMagick 转换
 */
function convertWithImageMagick() {
  for (const res of resources) {
    const svgPath = path.resolve(res.svg);
    const pngPath = path.resolve(res.png);

    if (!fs.existsSync(svgPath)) {
      console.log(`❌ SVG 文件不存在: ${res.svg}`);
      continue;
    }

    const w = res.width || res.size;
    const h = res.height || res.size;
    const cmd = `magick convert -density 300 -background white -resize ${w}x${h} "${svgPath}" "${pngPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      const stats = fs.statSync(pngPath);
      console.log(`✅ ${res.description}`);
      console.log(`   ${res.png} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.log(`❌ 转换失败: ${res.svg}`);
    }
  }
}

/**
 * 使用 Inkscape 转换
 */
function convertWithInkscape() {
  for (const res of resources) {
    const svgPath = path.resolve(res.svg);
    const pngPath = path.resolve(res.png);

    if (!fs.existsSync(svgPath)) {
      console.log(`❌ SVG 文件不存在: ${res.svg}`);
      continue;
    }

    const w = res.width || res.size;
    const h = res.height || res.size;
    const cmd = `inkscape "${svgPath}" --export-type=png --export-filename="${pngPath}" -w ${w} -h ${h}`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      const stats = fs.statSync(pngPath);
      console.log(`✅ ${res.description}`);
      console.log(`   ${res.png} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.log(`❌ 转换失败: ${res.svg}`);
    }
  }
}

/**
 * 使用 rsvg-convert 转换
 */
function convertWithRsvg() {
  for (const res of resources) {
    const svgPath = path.resolve(res.svg);
    const pngPath = path.resolve(res.png);

    if (!fs.existsSync(svgPath)) {
      console.log(`❌ SVG 文件不存在: ${res.svg}`);
      continue;
    }

    const w = res.width || res.size;
    const h = res.height || res.size;
    const cmd = `rsvg-convert -w ${w} -h ${h} "${svgPath}" -o "${pngPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      const stats = fs.statSync(pngPath);
      console.log(`✅ ${res.description}`);
      console.log(`   ${res.png} (${(stats.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.log(`❌ 转换失败: ${res.svg}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🎨 AiBrand SVG → PNG 转换工具\n');
  console.log(`📁 资源数量: ${resources.length}\n`);

  // 检查可用的转换工具
  const hasSharp = (() => {
    try {
      require.resolve('sharp');
      return true;
    } catch {
      return false;
    }
  })();

  const hasMagick = checkTool('magick');
  const hasInkscape = checkTool('inkscape');
  const hasRsvg = checkTool('rsvg-convert');

  console.log('🔍 可用工具检测:');
  console.log(`   sharp:        ${hasSharp ? '✅' : '❌'}`);
  console.log(`   ImageMagick:  ${hasMagick ? '✅' : '❌'}`);
  console.log(`   Inkscape:     ${hasInkscape ? '✅' : '❌'}`);
  console.log(`   rsvg-convert: ${hasRsvg ? '✅' : '❌'}\n`);

  if (hasSharp) {
    console.log('🚀 使用 sharp 转换...\n');
    await convertWithSharp();
  } else if (hasMagick) {
    console.log('🚀 使用 ImageMagick 转换...\n');
    convertWithImageMagick();
  } else if (hasInkscape) {
    console.log('🚀 使用 Inkscape 转换...\n');
    convertWithInkscape();
  } else if (hasRsvg) {
    console.log('🚀 使用 rsvg-convert 转换...\n');
    convertWithRsvg();
  } else {
    console.log('❌ 未找到可用的 SVG 转换工具！\n');
    console.log('请安装以下任一工具:');
    console.log('  - sharp:     npm install sharp');
    console.log('  - ImageMagick: https://imagemagick.org/');
    console.log('  - Inkscape:   https://inkscape.org/');
    console.log('  - librsvg:    apt install librsvg2-bin\n');
    process.exit(1);
  }

  console.log('\n✨ 全部转换完成！');
  console.log('\n📋 下一步:');
  console.log('  1. 检查 public/ 目录下的 PNG 文件');
  console.log('  2. 访问 https://chrome.google.com/webstore/devconsole');
  console.log('  3. 上传 ZIP 包和资源文件');
  console.log('  4. 提交审核\n');
}

main().catch((err) => {
  console.error('❌ 转换失败:', err.message);
  process.exit(1);
});
