#!/usr/bin/env node
/**
 * Hermes Host Bridge — 宿主机 Hermes CLI 的 HTTP 包装
 *
 * 用途: aibrand-web 运行在 Docker 容器内,无法直接 spawn Windows 上的 hermes CLI。
 *       本桥接服务跑在宿主机 (默认 18791 端口),容器通过 host.docker.internal:18791 调用。
 *
 * 端点:
 *   GET  /health        → { ok, version }
 *   POST /chat          → { reply, sessionId, exitCode }  body: { message, sessionId?, model?, provider? }
 *   POST /task          → { accepted, message }           body: { task, schedule? }  (一次性任务; 定时 Phase 3)
 *
 * 用法: node hermes-host-bridge.mjs [--port 18791]
 * 自启: 已加入 scripts/aibrand-autostart.ps1 (检测未运行则拉起)
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const PORT = Number(process.env.HERMES_BRIDGE_PORT || process.argv.find((_, i) => process.argv[i - 1] === '--port') || 18791)
const HERMES_BIN = process.env.HERMES_BIN || 'hermes'
const TIMEOUT_MS = Number(process.env.HERMES_TIMEOUT_MS || 90000)
const TOKEN = process.env.HERMES_BRIDGE_TOKEN || '' // 可选: 简单鉴权
/** 默认 provider/model (Hermes 本机仅配置了 DeepSeek key) */
const DEFAULT_PROVIDER = process.env.HERMES_BRIDGE_PROVIDER || 'deepseek'
const DEFAULT_MODEL = process.env.HERMES_BRIDGE_MODEL || 'deepseek-v4-flash'
/** P4-B 联邦记忆桥: Hermes 记忆只读, OpenClaw 记忆追加 (宿主机文件可达) */
const HERMES_HOME = process.env.HERMES_HOME || join(process.env.LOCALAPPDATA || '', 'hermes')
const OPENCLAW_MEM_DIR = process.env.OPENCLAW_MEM_DIR || 'D:\\king2046\\.openclaw\\.openclaw\\workspace\\memory'

function readMemoryFile(path) {
  try { return existsSync(path) ? readFileSync(path, 'utf8') : null } catch { return null }
}
function hermesMemorySnapshot() {
  const memDir = join(HERMES_HOME, 'memories')
  const memory = readMemoryFile(join(memDir, 'MEMORY.md'))
  const user = readMemoryFile(join(memDir, 'USER.md'))
  return {
    hermes: {
      home: HERMES_HOME,
      memory: memory ? memory.slice(0, 12000) : null,
      user: user ? user.slice(0, 6000) : null,
    },
    openclaw: {
      memDir: OPENCLAW_MEM_DIR,
      today: join(OPENCLAW_MEM_DIR, new Date().toISOString().slice(0, 10) + '.md'),
    },
  }
}
function appendOpenClawMemory(note, tag) {
  try {
    mkdirSync(OPENCLAW_MEM_DIR, { recursive: true })
    const today = new Date().toISOString().slice(0, 10)
    const file = join(OPENCLAW_MEM_DIR, today + '.md')
    const line = "\n## 联邦记忆同步 (" + tag + ") " + new Date().toISOString() + "\n" + note.trim() + "\n"
    appendFileSync(file, line, 'utf8')
    return { ok: true, file, appended: line.length }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

function runHermes(args, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const out = [], err = []
    let settled = false
    const child = spawn(HERMES_BIN, args, { windowsHide: true, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } })
    const timer = setTimeout(() => {
      if (!settled) { try { child.kill('SIGKILL') } catch {} ; settled = true; resolve({ ok: false, stdout: out.join(''), stderr: `timeout after ${timeoutMs}ms`, exitCode: -1 }) }
    }, timeoutMs)
    child.stdout.on('data', c => out.push(c))
    child.stderr.on('data', c => err.push(c))
    child.on('error', e => { if (!settled) { settled = true; clearTimeout(timer); resolve({ ok: false, stdout: '', stderr: e.message, exitCode: -1 }) } })
    child.on('close', code => {
      if (settled) return
      settled = true; clearTimeout(timer)
      resolve({ ok: code === 0, stdout: out.join('').trim(), stderr: err.join('').trim(), exitCode: code ?? -1 })
    })
  })
}

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' })
  res.end(JSON.stringify(data))
}

async function handleChat(body) {
  const { message, sessionId, model, provider } = body || {}
  if (!message?.trim()) return { error: 'message 为必填', exitCode: 1 }
  const args = ['chat', '-q', message, '--cli', '-Q', '--yolo']
  let m = model || DEFAULT_MODEL
  let p = provider || DEFAULT_PROVIDER
  // deepseek provider 模型名归一化 (deepseek/deepseek-v4-flash → deepseek-v4-flash)
  if (p === 'deepseek' && m.includes('/')) m = m.split('/').pop() || m
  args.push('-m', m)
  args.push('--provider', p)
  if (sessionId) args.push('--resume', sessionId)
  const r = await runHermes(args)
  if (!r.ok) return { error: r.stderr.slice(0, 300) || `exit=${r.exitCode}`, exitCode: r.exitCode }
  // 提取 sessionId (Hermes -Q 输出的 session 信息)
  const sessionMatch = r.stdout.match(/session[:_\s]+([a-zA-Z0-9-]{8,})/i)
  let reply = r.stdout.split('\n').filter(l => !/^(session|Session|\[session)/.test(l.trim())).join('\n').trim() || r.stdout
  return { reply, sessionId: sessionMatch?.[1], exitCode: r.exitCode }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {})

  // 简单鉴权 (可选)
  if (TOKEN) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${TOKEN}`) return json(res, 401, { error: 'unauthorized' })
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const v = await runHermes(['--version'], 10000)
      return json(res, 200, { ok: v.ok, version: v.ok ? (v.stdout.split('\n')[0] || undefined) : undefined, error: v.ok ? undefined : v.stderr.slice(0, 200) })
    }

    if (req.method === 'POST' && url.pathname === '/chat') {
      let body = {}
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { error: 'invalid JSON' }) }
      const result = await handleChat(body)
      return json(res, result.error ? 502 : 200, result)
    }

    if (req.method === 'POST' && url.pathname === '/task') {
      let body = {}
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { error: 'invalid JSON' }) }
      const { task, schedule } = body || {}
      if (!task?.trim()) return json(res, 400, { error: 'task 为必填' })
      if (schedule) {
        const name = `aibrand-task-${Date.now()}`
        const r = await runHermes(['cron', 'create', schedule, task, '--name', name], 30000)
        if (!r.ok) return json(res, 502, { accepted: false, error: r.stderr.slice(0, 300) || `exit=${r.exitCode}` })
        return json(res, 200, { accepted: true, message: `✅ 已创建 Hermes 定时任务 (${schedule})`, cronName: name })
      }
      const result = await handleChat({ message: task })
      if (result.error) return json(res, 502, result)
      return json(res, 200, { accepted: true, message: result.reply })
    }

    if (req.method === 'GET' && url.pathname === '/memory') {
      return json(res, 200, { ok: true, data: hermesMemorySnapshot() })
    }

    if (req.method === 'POST' && url.pathname === '/memory') {
      let body = {}
      try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { error: 'invalid JSON' }) }
      const { note, tag } = body || {}
      if (!note?.trim()) return json(res, 400, { error: 'note 为必填' })
      const result = appendOpenClawMemory(note, tag || 'memory_sync')
      if (!result.ok) return json(res, 500, result)
      return json(res, 200, result)
    }

    return json(res, 404, { error: 'not found' })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : String(err) })
  }
})

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

server.listen(PORT, () => {
  console.log(`[hermes-host-bridge] listening on http://127.0.0.1:${PORT} (bin=${HERMES_BIN})`)
})
