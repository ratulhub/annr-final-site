# Auto-syncs any workspace file changes to GitHub (origin/main).
# Respects .gitignore automatically via `git status --porcelain`.

param(
  [int]$IntervalSeconds = 5,
  [int]$DebounceSeconds = 3
)

$ErrorActionPreference = "SilentlyContinue"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "[auto-sync] Watching workspace for changes to auto-upload to GitHub (every ${IntervalSeconds}s)..."

while ($true) {
  Start-Sleep -Seconds $IntervalSeconds
  $status = git status --porcelain
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($status -join ""))) {
    # Wait briefly for multi-file saves to finish
    Start-Sleep -Seconds $DebounceSeconds
    git add -A | Out-Null
    $changed = @(git diff --cached --name-only)
    if ($changed.Count -gt 0) {
      $summary = ($changed | Select-Object -First 3) -join ", "
      if ($changed.Count -gt 3) {
        $summary += " (+$($changed.Count - 3) more)"
      }
      $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
      $msg = "Auto-sync: $summary [$timestamp]"
      git commit -m $msg | Out-Null
      if ($LASTEXITCODE -eq 0) {
        git push origin HEAD | Out-Null
        if ($LASTEXITCODE -eq 0) {
          Write-Host "[auto-sync] Uploaded to GitHub: $msg"
        } else {
          Write-Host "[auto-sync] Commit created ($msg); retrying push on next cycle..."
        }
      }
    }
  } else {
    # Also push any local commits that haven't been pushed yet
    $unpushed = git log "@{u}..HEAD" --oneline 2>$null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($unpushed -join ""))) {
      git push origin HEAD | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-Host "[auto-sync] Pushed pending local commits to GitHub."
      }
    }
  }
}
