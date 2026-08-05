// 通用 ACP JSON-RPC over stdio 客户端 — P4-C 方向2: Hermes 视角连 OpenClaw ACP bridge
// 用法: node acp-gen-client.mjs <server-exe> [server-arg...] -- "<prompt>"
import { spawn } from 'node:child_process'

const args = process.argv.slice(2)
const promptIdx = args.indexOf('--')
const serverArgs = promptIdx >= 0 ? args.slice(0, promptIdx) : args
const prompt = promptIdx >= 0 ? args.slice(promptIdx + 1).join(' ') : '用一句话回复: 你好'

const exe = serverArgs[0]
const rest = serverArgs.slice(1)

const child = spawn(exe, rest, { windowsHide: true, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } })

let buf = ''
const pending = new Map()
let nextId = 1
let stderrTail = []

function send(method, params) {
  const id = nextId++
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`timeout: ${method}`)) } }, 90000)
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
        console.log('[event]', JSON.stringify(msg).slice(0, 400))
      }
    } catch { /* 非 JSON */ }
  }
})
child.stderr.on('data', (c) => {
  const s = c.toString()
  stderrTail.push(s)
  if (stderrTail.length > 20) stderrTail.shift()
})
child.on('exit', (code) => { console.log('[server exited]', code); process.exit(0) })
child.on('error', (e) => { console.error('[spawn error]', e.message); process.exit(1) })

async function main() {
  try {
    const init = await send('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'hermes-p4c-gen', version: '1.0' },
      capabilities: {},
    })
    console.log('== initialize OK ==')
    console.log(JSON.stringify(init).slice(0, 700))

    const sess = await send('session/new', {
      cwd: process.cwd(),
      mcpServers: [],
      session_info: { name: 'p4c-oc-test', description: 'P4-C 方向2 验证' },
    })
    const sessionId = sess.sessionId || (sess.session && sess.session.id)
    console.log('== session/new OK == sessionId=' + sessionId)
    console.log(JSON.stringify(sess).slice(0, 400))

    // 尝试两种参数名: 先 camelCase (OpenClaw bridge), 失败再 snake_case (Hermes server)
    let result
    try {
      result = await send('session/prompt', {
        sessionId,
        prompt: [{ type: 'text', text: prompt }],
      })
    } catch {
      result = await send('session/prompt', {
        session_id: sessionId,
        prompt: [{ type: 'text', text: prompt }],
      })
    }
    console.log('== session/prompt OK ==')
    console.log((typeof result === 'string' ? result : JSON.stringify(result)).slice(0, 1000))

    try { await send('session/close', { session_id: sessionId }) } catch {}
    console.log('== DONE ==')
    process.exit(0)
  } catch (e) {
    console.error('== FAIL ==', e.message)
    console.error('stderr tail:', stderrTail.join('').slice(-800))
    process.exit(1)
  }
}
main()
