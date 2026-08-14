# Sync AiBrand n8n workflow templates into the local n8n instance.
# Usage: powershell -File sync-n8n-workflows.ps1
# Logic: same-name exists -> update; missing -> create; then activate all.

$ErrorActionPreference = 'Stop'

$envContent = Get-Content 'D:\king2046\.env' -Raw
$n8nKeyMatch = [regex]::Match($envContent, "(?m)^N8N_API_KEY=(.*)$")
if (-not $n8nKeyMatch.Success) { throw 'N8N_API_KEY not found in D:\king2046\.env' }
$headers = @{ 'X-N8N-API-KEY' = $n8nKeyMatch.Groups[1].Value.Trim() }

$api = 'http://localhost:5678/api/v1/workflows'
$templateDir = 'D:\king2046\project\aibrand-studio\n8n\workflows'

$existing = @{}
(Invoke-RestMethod -Uri "$api`?limit=250" -Headers $headers -TimeoutSec 15).data |
  ForEach-Object { $existing[$_.name] = $_ }

$results = @()

foreach ($file in Get-ChildItem $templateDir -Filter '*.json') {
  $wf = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $payload = @{
    name        = $wf.name
    nodes       = $wf.nodes
    connections = $wf.connections
    settings    = $(if ($wf.settings) { $wf.settings } else { @{} })
  } | ConvertTo-Json -Depth 40
  $payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)

  if ($existing.ContainsKey($wf.name)) {
    $id = $existing[$wf.name].id
    if ($existing[$wf.name].active) {
      Invoke-RestMethod -Method POST -Uri "$api/$id/deactivate" -Headers $headers -TimeoutSec 15 | Out-Null
    }
    Invoke-RestMethod -Method PUT -Uri "$api/$id" -Headers $headers -Body $payloadBytes -ContentType 'application/json' -TimeoutSec 30 | Out-Null
    $results += "UPDATED  $($wf.name)  ($id)"
  } else {
    $created = Invoke-RestMethod -Method POST -Uri $api -Headers $headers -Body $payloadBytes -ContentType 'application/json' -TimeoutSec 30
    $existing[$wf.name] = $created
    $results += "CREATED  $($wf.name)  ($($created.id))"
  }
}

foreach ($file in Get-ChildItem $templateDir -Filter '*.json') {
  $wf = Get-Content $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $id = $existing[$wf.name].id
  try {
    Invoke-RestMethod -Method POST -Uri "$api/$id/activate" -Headers $headers -TimeoutSec 20 | Out-Null
    $results += "ACTIVATED  $($wf.name)"
  } catch {
    $results += "ACTIVATE_FAIL  $($wf.name): $($_.Exception.Message)"
  }
}

$results
