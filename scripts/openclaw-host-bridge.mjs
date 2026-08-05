#!/usr/bin/env node
/**
 * OpenClaw Host Bridge — 宿主机 OpenClaw Gateway 的 HTTP 包装
 *
 * 用途: aibrand-web 运行在 Docker 容器内, 容器版 OpenClaw 无法操作宿主机
 *       Windows (容器隔离)。宿主机 OpenClaw Gateway (127.0.0.1:18789)
 *       拥有完整宿主操作能力 (exec/文件/网络)。本桥接服务跑在宿主机
 *       (默认 18792 端口), 容器通过 host.docker.internal:18792 调用。
 *
 * 端点:
 *   GET  /health        → { ok, version }
 *   POST /chat          → { reply, sessionId }  body: { message, sessionId?, agent? }
 *   POST /task          → { accepted, message }  body: { task, schedule? }
 *
 * 用法: node openclaw-host-bridge.mjs [--port 18792]
 * 自启: 已加入 scripts/aibrand-autostart.ps1
 */
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

const PORT = Number(process.env.OPENCLAW_BRIDGE_PORT || process.argv.find((_, i) => process.argv[i - 1] === '--port') || 18792)
/** 宿主机 OpenClaw Gateway (loopback, 只有本机能访问; 容器版占用 0.0.0.0:18789, 宿主用 127.0.0.1 独占) */
const GATEWAY_URL = process.env.OPENCLAW_BRIDGE_GATEWAY_URL || 'http://127.0.0.1:18789'
/** 从宿主 openclaw.json 读取 token (环境变量优先) */
const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || 'D:\\king2046\\.openclaw\\openclaw.json'
const TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || readTokenFromConfig()
const TIMEOUT_MS = Number(process.env.OPENCLAW_BRIDGE_TIMEOUT_MS || 120000)

function readTokenFromConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8')
    const m = raw.match(/"token"\s*:\s*"([^"]+)"/)
    return m ? m[1] : ''
  } catch { return '' }
}

function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 调宿主机 Gateway /v1/chat/completions (完整 agent 路径: 身份/记忆/工具/技能) */
async function gatewayChat(message, sessionKey, agent) {
  if (!TOKEN) throw new Error('OPENCLAW_GATEWAY_TOKEN 未配置 (读取 ' + CONFIG_PATH + ' 失败)')
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  }
  const body = {
    model: agent ? `openclaw/${agent}` : 'openclaw/main',
    messages: [{ role: 'user', content: message }],
  }
  if (sessionKey) headers['x-openclaw-session-key'] = sessionKey

  const resp = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`gateway HTTP ${resp.status}: ${errText.slice(0, 200)}`)
  }
  const data = await resp.json()
  const reply = data?.choices?.[0]?.message?.content
  if (!reply?.trim()) throw new Error('gateway 返回空回复')
  return { reply, sessionId: sessionKey || `oc_host_${Date.now()}` }
}

/** 宿主机 Gateway 健康检查 */
async function gatewayHealth() {
  try {
    const resp = await fetch(`${GATEWAY_URL}/health`, { signal: AbortSignal.timeout(5000) })
    const data = await resp.json().catch(() => ({}))
    return { ok: data.ok !== false, version: data.version || 'OpenClaw Gateway' }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})
  const url = new URL(req.url, `http://${req.headers.host}`)

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const h = await gatewayHealth()
      return json(res, h.ok ? 200 : 502, h)
    }

    if (req.method === 'POST' && url.pathname === '/chat') {
      let body = {}
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { error: 'invalid JSON' }) }
      const { message, sessionId, agent } = body || {}
      if (!message?.trim()) return json(res, 400, { error: 'message 为必填' })
      try {
        const result = await gatewayChat(message, sessionId, agent)
        return json(res, 200, result)
      } catch (err) {
        return json(res, 502, { error: err instanceof Error ? err.message : String(err), exitCode: -1 })
      }
    }

    if (req.method === 'POST' && url.pathname === '/task') {
      let body = {}
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { error: 'invalid JSON' }) }
      const { task, schedule, agent } = body || {}
      if (!task?.trim()) return json(res, 400, { error: 'task 为必填' })
      try {
        const result = await gatewayChat(task, undefined, agent)
        return json(res, 200, { accepted: true, message: result.reply })
      } catch (err) {
        return json(res, 502, { accepted: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    return json(res, 404, { error: 'not found' })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : String(err) })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[openclaw-host-bridge] listening on http://127.0.0.1:${PORT} (gateway=${GATEWAY_URL})`)
})
