# Step 1: Outbox Stress Test
Write-Host "Stopping backend..."
docker stop nos-backend-1

Write-Host "Starting agent in background..."
$agentProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --project apps/NOS.Agent" -PassThru -NoNewWindow

Write-Host "Waiting 3 minutes..."
Start-Sleep -Seconds 180

Write-Host "Starting backend..."
docker start nos-backend-1

Write-Host "Waiting 2 minutes for queues to drain..."
Start-Sleep -Seconds 120

Write-Host "Stopping agent..."
Stop-Process -Id $agentProcess.Id -Force

Write-Host "Checking OutboxMessages count..."
$outboxCount = sqlite3.exe C:\ProgramData\NOS\Agent\outbox.db "SELECT COUNT(*) FROM OutboxMessages;"
Write-Host "OutboxMessages count: $outboxCount"

Write-Host "Checking DeadLetterMessages count..."
$dlqCount = sqlite3.exe C:\ProgramData\NOS\Agent\outbox.db "SELECT COUNT(*) FROM DeadLetterMessages;"
Write-Host "DeadLetterMessages count: $dlqCount"

Write-Host "Step 4: Windows Event Log Verification"
Get-WinEvent -FilterHashtable @{LogName='Application'; ID=1000,1001,1002,1003} | Select-Object -First 20
