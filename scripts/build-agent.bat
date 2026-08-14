@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo  NOS Agent - Single-File Windows Executable Build Script
echo ========================================================
echo.

cd /d "%~dp0..\apps\NOS.Agent"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to navigate to apps\NOS.Agent
    exit /b 1
)

echo [*] Publishing self-contained win-x64 executable...
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -p:IncludeNativeLibrariesForSelfExtract=true -p:DebugType=none -p:DebugSymbols=false -o ..\..\dist\agent

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] Single-file Agent EXE created at:
    echo  dist\agent\NOS.Agent.exe
    echo ========================================================
    exit /b 0
) else (
    echo.
    echo [ERROR] Build failed with code %ERRORLEVEL%.
    exit /b %ERRORLEVEL%
)
