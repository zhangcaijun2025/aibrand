$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile('D:\king2046\scripts\sync-claude.ps1', [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -eq 0) {
    Write-Host "SYNTAX_OK: sync-claude.ps1"
} else {
    Write-Host "SYNTAX_ERRORS: $($errors.Count)"
    $errors | ForEach-Object {
        Write-Host "  Line $($_.Extent.StartLineNumber): $($_.Message)"
    }
}
