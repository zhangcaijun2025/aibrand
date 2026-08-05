#!/usr/bin/env node
/**
 * AiBrand MCP Server (stdio) — Agent 联邦 Phase 2
 *
 * 把 AiBrand 全部模块 (dashboard/analytics/content/quality/geo/publish/workflows/visual/evolution...)
 * 通过标准 MCP 协议暴露给外部 Agent:
 *   - OpenClaw (openclaw mcp add aibrand ...)
 *   - Hermes   (config.yaml mcp servers)
 *   - 任意支持 MCP 的客户端
 *
 * 实现: 零依赖手写 MCP stdio 协议 (JSON-RPC 2.0, newline-delimited),
 * 工具定义与执行全部代理到 AiBrand 的 HTTP 端点 /api/mcp (单一事实源)。
 *
 * 环境变量:
 *   AIBRAND_MCP_URL   AiBrand 入口 (默认 http://localhost:3099)
 *   AIBRAND_MCP_COOKIE 鉴权 cookie (默认 dev_auto_login_token)
 *
 * 用法: node aibrand-mcp-server.mjs
 */
import { createInterface } from 'node:readline'

const BASE = process.env.AIBRAND_MCP_URL || 'http://localhost:3099'
const COOKIE = process.env.AIBRAND_MCP_COOKIE || 'aibrand_token=dev_auto_login_token'
const PROTOCOL_VERSION = '2025-03-26'

function log(...args) {
  console.error('[aibrand-mcp]', ...args)
}

/** 从 AiBrand HTTP MCP 层拉取工具清单 (含 schema) */
async function fetchTools() {
  const resp = await fetch(`${BASE}/api/mcp`, {
    headers: { Cookie: COOKIE },
    signal: AbortSignal.timeout(15000),
  })
  if (!resp.ok) throw new Error(`GET /api/mcp HTTP ${resp.status}`)
  const body = await resp.json()
  if (body?.code !== 0) throw new Error(`GET /api/mcp code=${body?.code}`)
  const tools = body.data?.tools || []
  return tools.map(t => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema || { type: 'object', properties: {}, required: [] },
  }))
}

/** 调用 AiBrand 工具 */
async function callTool(name, args) {
  const resp = await fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
    body: JSON.stringify({ action: 'tool_call', tool: name, args: args || {} }),
    signal: AbortSignal.timeout(120000),
  })
  const body = await resp.json().catch(() => ({ code: -1, message: 'bad response' }))
  if (body?.code !== 0) {
    const detail = body?.message ? String(body.message) : typeof body?.data === 'string' ? body.data : JSON.stringify(body?.data || 'unknown')
    return { content: [{ type: 'text', text: `[aibrand-mcp] error: ${detail}` }], isError: true }
  }
  return { content: body.data?.result || [{ type: 'text', text: 'empty' }], isError: !!body.data?.isError }
}

/* ═══════════════ MCP stdio 协议 (JSON-RPC 2.0) ═══════════════ */

let toolsCache = null

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

async function handleRequest(msg) {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'aibrand-mcp', version: '1.0.0' },
      }

    case 'tools/list':
      if (!toolsCache) toolsCache = await fetchTools()
      return { tools: toolsCache }

    case 'tools/call':
      try {
        const result = await callTool(params?.name, params?.arguments)
        return result
      } catch (err) {
        return {
          content: [{ type: 'text', text: `[aibrand-mcp] tool call failed: ${err.message}` }],
          isError: true,
        }
      }

    case 'ping':
      return {}

    default:
      return null // 未知方法 → 由调用方决定是否回 error
  }
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity })

let pending = 0

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let msg
  try {
    msg = JSON.parse(trimmed)
  } catch {
    return // 非 JSON 行忽略
  }
  if (!msg || typeof msg !== 'object' || !msg.method) return

  // notification (无 id)
  if (msg.id === undefined) return

  pending++
  try {
    const result = await handleRequest(msg)
    if (result === null) {
      send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } })
    } else {
      send({ jsonrpc: '2.0', id: msg.id, result })
    }
  } catch (err) {
    send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: err.message || String(err) } })
  } finally {
    pending--
    maybeExit()
  }
})

rl.on('close', () => {
  stdinClosed = true
  maybeExit()
})

let stdinClosed = false
function maybeExit() {
  if (stdinClosed && pending === 0) {
    // 延迟退出, 让 fetch 连接自然收尾 (Windows libuv 对正在关闭的 handle 直接 exit 会断言)
    setTimeout(() => process.exit(0), 120)
  }
}

log(`ready — proxying to ${BASE}/api/mcp`)
