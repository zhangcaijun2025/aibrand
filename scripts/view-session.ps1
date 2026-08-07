# 查看 session 文件前几条消息
$path = 'D:\king2046\.openclaw\agents\main\sessions\5a5d155f-9495-4a1b-ae9c-bda4c53c77c7.jsonl'
$lines = Get-Content $path -First 8
$out = @()
foreach ($line in $lines) {
  try {
    $j = $line | ConvertFrom-Json
    $role = $j.message.role
    $c = $j.message.content
    $tool = $j.message.toolName
    if ($c) {
      $txt = ''
      if ($c -is [array]) {
        $parts = $c | Where-Object { $_.type -eq 'text' } | ForEach-Object { $_.text }
        $txt = $parts -join ' '
      } else { $txt = $c.ToString() }
      if ($txt) {
        $s = "[$role]"
        if ($tool) { $s += "[$tool]" }
        $s += ' ' + $txt.Substring(0, [Math]::Min(200, $txt.Length))
        $out += $s
      }
    }
  } catch {}
}
$out | Out-String -Width 220
