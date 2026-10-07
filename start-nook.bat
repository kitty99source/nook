@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node is not on the PATH. Install Node 24, then try again.
  pause
  exit /b 1
)
node scripts\start.mjs
if errorlevel 1 pause
