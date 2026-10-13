@echo off
:: Batch script to elevate and update NOS Agent
:: Auto-request administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator permissions...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo       NOS AGENT SERVICE REFRESH & UPDATE
echo ========================================================
echo.

echo [*] Stopping NOS-Agent service...
powershell -Command "Stop-Service -Name 'NOS-Agent' -Force -ErrorAction SilentlyContinue"
powershell -Command "Stop-Process -Name 'NOS-Agent' -Force -ErrorAction SilentlyContinue"
timeout /t 2 /nobreak >nul

echo [*] Updating NOS-Agent.exe with latest build...
copy /Y "%~dp0..\apps\backend\assets\NOS-Agent.exe" "C:\Program Files\NOSAgent\NOS-Agent.exe"
if %errorLevel% neq 0 (
    copy /Y "C:\Users\mukes\OneDrive\Desktop\NOS\apps\backend\assets\NOS-Agent.exe" "C:\Program Files\NOSAgent\NOS-Agent.exe"
)

echo [*] Purging stalled offline outbox queue...
powershell -Command "Remove-Item -Path 'C:\ProgramData\NOS\outbox.db*' -Force -ErrorAction SilentlyContinue"

echo [*] Starting updated NOS-Agent service...
powershell -Command "Start-Service -Name 'NOS-Agent'"

echo.
echo ========================================================
echo [SUCCESS] NOS Agent updated and restarted successfully!
echo ========================================================
timeout /t 5
