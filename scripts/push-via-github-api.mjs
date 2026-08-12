/**
 * Push local commits to GitHub via REST Git Data API.
 * 用途：github.com 443 被网络限制时，经 api.github.com（可达）推送。
 * 用法：$env:PUSH_TOKEN = (gh auth token); node scripts/push-via-github-api.mjs
 * 注意：不回显 token；逐提交重建 blob/tree/commit 并更新 master ref。
 */
import { execSync } from 'node:child_process'

const token = process.env.PUSH_TOKEN
if (!token) {
  console.error('PUSH_TOKEN env required (gh auth token)')
  process.exit(1)
}

const repo = 'zhangcaijun2025/aibrand-studio'
const base = 'https://api.github.com'
const headers = {
  Authorization: `token ${token}`,
  'Content-Type': 'application/json',
  'User-Agent': 'aibrand-git-data-push',
}
const cwd = 'D:\\king2046\\project\\aibrand-studio'

function run(cmd, raw = false) {
  return execSync(cmd, { cwd, encoding: raw ? undefined : 'utf8' })
}

async function api(path, method = 'GET', body) {
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.status === 204 ? null : res.json()
}

async function main() {
  let parentSha = null
  let prevTreeSha = null
  try {
    const ref = await api(`/repos/${repo}/git/ref/heads/master`)
    parentSha = ref.object.sha
    const parentCommit = await api(`/repos/${repo}/git/commits/${parentSha}`)
    prevTreeSha = parentCommit.tree.sha
  } catch {
    // 远端无 master 分支（首次推送）
  }

  const commits = String(run('git rev-list --reverse origin/master..HEAD'))
    .trim()
    .split('\n')
    .filter(Boolean)
  console.log(`commits to push: ${commits.length}, parent: ${parentSha ? parentSha.slice(0, 8) : 'none'}`)

  for (const commit of commits) {
    const message = String(run(`git log -1 --format=%B ${commit}`)).trimEnd()
    const nameStatus = String(run(`git show --name-status --format= ${commit}`))
      .trim()
      .split('\n')
      .filter(Boolean)

    const treeItems = []
    for (const line of nameStatus) {
      const parts = line.split('\t')
      const status = parts[0]
      const path = parts[parts.length - 1]
      if (!path || status.startsWith('R')) continue
      if (status.startsWith('D')) {
        treeItems.push({ path, mode: '100644', type: 'blob', sha: null })
        continue
      }
      const meta = String(run(`git ls-tree ${commit} "${path}"`)).trim()
      const mode = meta.split(' ')[0] || '100644'
      const blobSha = String(run(`git rev-parse ${commit}:"${path}"`)).trim()
      const buf = run(`git cat-file blob ${blobSha}`, true)
      const b64 = Buffer.from(buf).toString('base64')
      const blob = await api(`/repos/${repo}/git/blobs`, 'POST', {
        content: b64,
        encoding: 'base64',
      })
      treeItems.push({ path, mode, type: 'blob', sha: blob.sha })
    }

    const tree = await api(`/repos/${repo}/git/trees`, 'POST', {
      base_tree: prevTreeSha,
      tree: treeItems,
    })
    const newCommit = await api(`/repos/${repo}/git/commits`, 'POST', {
      message,
      tree: tree.sha,
      parents: parentSha ? [parentSha] : [],
    })
    parentSha = newCommit.sha
    prevTreeSha = tree.sha
    console.log(`pushed commit ${commit.slice(0, 8)} -> ${newCommit.sha.slice(0, 8)} (${treeItems.length} changes)`)
  }

  if (parentSha) {
    try {
      await api(`/repos/${repo}/git/refs/heads/master`, 'POST', { sha: parentSha, force: false })
    } catch {
      await api(`/repos/${repo}/git/refs/heads/master`, 'PATCH', { sha: parentSha, force: true })
    }
    console.log(`master updated -> ${parentSha.slice(0, 8)}`)
  }
}

main().catch((e) => {
  console.error('FAIL:', e.message)
  process.exit(1)
})
