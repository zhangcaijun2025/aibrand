// 最小 ACP JSON-RPC over stdio 客户端 — P4-C 验证: OpenClaw 视角连 Hermes ACP server
// 用法: node acp-min-client.mjs <hermes-exe> "<prompt>"
import { spawn } from 'node:child_process'

const hermesExe = process.argv[2] || 'C:\\Users\\XIAOMI\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\hermes.exe'
const prompt = process.argv[3] || '用一句话回复: ACP 链路测试通过'

const child = spawn(hermesExe, ['acp'], {
  windowsHide: true,
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
})

let buf = ''
const pending = new Map()
let nextId = 1

function send(method, params) {
  const id = nextId++
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)) } }, 120000)
  })
}

child.stdout.on('data', (c) => {
  buf += c.toString()
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim()
    buf = buf.slice(idx + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) p.reject(new Error(JSON.stringify(msg.error)))
        else p.resolve(msg.result)
      } else {
        console.log('[event]', JSON.stringify(msg).slice(0, 300))
      }
    } catch { /* 非 JSON 行 (如 Hermes 日志到 stdout 的残留) */ }
  }
})
child.stderr.on('data', (c) => process.stderr.write('[server-stderr] ' + c.toString().split('\n').slice(0, 3).join('\n[server-stderr] ') + '\n'))
child.on('exit', (code) => { console.log('[acp server exited]', code); process.exit(0) })

async function main() {
  try {
    const init = await send('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'openclaw-p4c-min', version: '1.0' },
      capabilities: {},
    })
    console.log('== initialize OK ==')
    console.log(JSON.stringify(init).slice(0, 800))

    const sess = await send('session/new', {
      cwd: process.cwd(),
      mcpServers: [],
      session_info: { name: 'p4c-acp-test', description: 'P4-C ACP 互为主从验证' },
    })
    const sessionId = sess.sessionId || (sess.session && sess.session.id)
    console.log('== newSession OK == sessionId=' + sessionId)
    console.log(JSON.stringify(sess).slice(0, 500))

    const result = await send('session/prompt', { session_id: sessionId, prompt: [{ type: 'text', text: prompt }] })
    console.log('== prompt OK ==')
    const text = typeof result === 'string' ? result : JSON.stringify(result)
    console.log(text.slice(0, 1200))

    try { await send('session/close', { session_id: sessionId }) } catch {}
    console.log('== DONE ==')
    process.exit(0)
  } catch (e) {
    console.error('== FAIL ==', e.message)
    process.exit(1)
  }
}
main()
