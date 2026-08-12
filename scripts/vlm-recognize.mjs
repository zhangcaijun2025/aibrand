#!/usr/bin/env node
/**
 * vlm-recognize — 首要识图工具（智谱 GLM-4V 视觉模型）
 *
 * 用途：识别截图/图片内容，供 Codex 在收到用户截图时自动调用。
 * 默认模型：glm-4v-flash（免费）；可用 --model glm-4v-plus 升级。
 *
 * 用法：
 *   node vlm-recognize.mjs <图片路径...> [--prompt "自定义提示词"] [--model glm-4v-plus]
 *
 * 密钥：优先取环境变量 GLM_API_KEY，其次读项目 .env.local。
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DEFAULT_PROMPT =
  '请详细描述这张截图/图片的全部内容：界面布局、每个可见的文字、按钮、图标、图片、颜色、报错信息、异常状态。这是网页应用或系统截图，请尽量精确完整，按区域组织描述。'

function readGlmKey() {
  if (process.env.GLM_API_KEY) return process.env.GLM_API_KEY
  const candidates = [
    resolve('D:/king2046/project/aibrand-studio/.env.local'),
    resolve('D:/king2046/project/aibrand-studio/.env'),
    resolve('D:/king2046/.env.local'),
  ]
  for (const file of candidates) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf-8')
    const m = text.match(/^GLM_API_KEY=(.+)$/m)
    if (m) return m[1].trim()
  }
  throw new Error('未找到 GLM_API_KEY（环境变量或 project/aibrand-studio/.env.local）')
}

function toBase64DataUri(path) {
  const abs = resolve(path)
  if (!existsSync(abs)) throw new Error(`图片不存在: ${abs}`)
  const buf = readFileSync(abs)
  const ext = abs.toLowerCase().endsWith('.jpg') || abs.toLowerCase().endsWith('.jpeg') ? 'jpeg' : 'png'
  return `data:image/${ext};base64,${buf.toString('base64')}`
}

function parseArgs(argv) {
  const images = []
  let prompt = DEFAULT_PROMPT
  let model = 'glm-4v-flash'
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--prompt') prompt = argv[++i]
    else if (a === '--model') model = argv[++i]
    else images.push(a)
  }
  return { images, prompt, model }
}

async function recognize(images, prompt, model) {
  const apiKey = readGlmKey()
  const content = [
    { type: 'text', text: prompt },
    ...images.map((p) => ({ type: 'image_url', image_url: { url: toBase64DataUri(p) } })),
  ]
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0.2,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`GLM-4V API ${res.status}: ${text.slice(0, 600)}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? '(无识别结果)'
}

async function main() {
  const { images, prompt, model } = parseArgs(process.argv.slice(2))
  if (!images.length) {
    console.error('用法: node vlm-recognize.mjs <图片路径...> [--prompt "..."] [--model glm-4v-plus]')
    process.exit(2)
  }
  console.error(`[vlm-recognize] model=${model} images=${images.length}`)
  const text = await recognize(images, prompt, model)
  console.log(text)
}

main().catch((err) => {
  console.error(`[vlm-recognize] ${err.message}`)
  process.exit(1)
})
