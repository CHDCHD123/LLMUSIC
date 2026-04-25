$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendExe = Join-Path $projectRoot "venv\Scripts\python.exe"
$frontendCmd = "npm.cmd"

$backendArgs = @(
    "-m", "uvicorn",
    "backend.app.main:app",
    "--reload",
    "--host", "127.0.0.1",
    "--port", "8010"
)

$frontendArgs = @(
    "run", "dev", "--",
    "--host", "127.0.0.1",
    "--port", "5173"
)

$backend = $null
$frontend = $null

function Stop-ChildProcess {
    param([System.Diagnostics.Process]$Process)
    if ($null -ne $Process) {
        try {
            if (-not $Process.HasExited) {
                taskkill /PID $Process.Id /T /F | Out-Null
            }
        } catch {
        }
    }
}

try {
    Write-Host "[LLMUSIC] backend starting on http://127.0.0.1:8010"
    $backend = Start-Process -FilePath $backendExe `
        -ArgumentList $backendArgs `
        -WorkingDirectory $projectRoot `
        -NoNewWindow `
        -PassThru

    Start-Sleep -Seconds 3

    Write-Host "[LLMUSIC] frontend starting on http://127.0.0.1:5173"
    $frontend = Start-Process -FilePath $frontendCmd `
        -ArgumentList $frontendArgs `
        -WorkingDirectory (Join-Path $projectRoot "frontend") `
        -NoNewWindow `
        -PassThru

    Write-Host "[LLMUSIC] press Ctrl+C to stop both frontend and backend"

    while ($true) {
        Start-Sleep -Seconds 1
        if ($backend.HasExited) {
            throw "Backend process exited unexpectedly."
        }
        if ($frontend.HasExited) {
            throw "Frontend process exited unexpectedly."
        }
    }
}
finally {
    Write-Host "[LLMUSIC] stopping child processes..."
    Stop-ChildProcess -Process $frontend
    Stop-ChildProcess -Process $backend
}
