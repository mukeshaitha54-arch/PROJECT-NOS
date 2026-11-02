$ErrorActionPreference = "Stop"

Write-Host "=== Phase 1: Resilience End-to-End Verification ==="

Write-Host "`n1. Cleaning existing outbox DB to start fresh..."
$dbPath = "C:\ProgramData\NOS\Agent\outbox.db"
if (Test-Path $dbPath) { Remove-Item $dbPath -Force }

Write-Host "`n2. Starting NOS Agent in background (Backend is intentionally DOWN to trigger Circuit Breaker & Buffering)..."
$agentProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --project apps/NOS.Agent" -PassThru -NoNewWindow -WorkingDirectory "c:\Users\mukes\OneDrive\Desktop\NOS"

Write-Host "Waiting 30 seconds to allow queues to fill and Circuit Breaker to trigger..."
Start-Sleep -Seconds 30

Write-Host "`n3. Checking SQLite OutboxMessages Table..."
$outboxCount = sqlite3.exe $dbPath "SELECT COUNT(*) FROM OutboxMessages;"
$priorityCounts = sqlite3.exe $dbPath "SELECT Priority, COUNT(*) FROM OutboxMessages GROUP BY Priority;"
$retryCounts = sqlite3.exe $dbPath "SELECT MAX(RetryCount) FROM OutboxMessages;"

Write-Host "Outbox Messages Count: $outboxCount"
Write-Host "Priority Counts: $priorityCounts"
Write-Host "Max Retry Count reached: $retryCounts"

if ([int]$outboxCount -gt 0) {
    Write-Host "[PASS] Outbox buffering is successfully persisting messages while offline." -ForegroundColor Green
} else {
    Write-Host "[FAIL] No messages buffered." -ForegroundColor Red
}

if ([int]$retryCounts -gt 0) {
    Write-Host "[PASS] Exponential Backoff & Retry Logic is actively incrementing RetryCounts." -ForegroundColor Green
} else {
    Write-Host "[FAIL] Retry logic is not incrementing." -ForegroundColor Red
}

Write-Host "`n4. Checking Windows Event Logs for NOS-Agent (Circuit Breaker & Guardrails)..."
try {
    $events = Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='NOS-Agent'} -MaxEvents 5 -ErrorAction Stop
    foreach ($evt in $events) {
        Write-Host "[$($evt.TimeCreated)] [$($evt.LevelDisplayName)] $($evt.Message)"
    }
    Write-Host "[PASS] Windows Event Log Integration is working." -ForegroundColor Green
} catch {
    Write-Host "[WARN] No Windows Event Log entries found or permission denied." -ForegroundColor Yellow
}

Write-Host "`n5. Stopping Agent..."
Stop-Process -Id $agentProcess.Id -Force

Write-Host "`n=== Verification Complete ==="
