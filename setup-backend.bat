@echo off
setlocal

cd /d "%~dp0"
set "ROOT=%cd%"

where py >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python launcher `py` not found.
  echo Install Python 3.11 and ensure "py" is available in PATH.
  exit /b 1
)

py -3.11 -V >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python 3.11 not found.
  echo Install Python 3.11 from python.org, then re-run this script.
  exit /b 1
)

if not exist "%ROOT%\.venv\Scripts\python.exe" (
  echo Creating virtual environment with Python 3.11...
  py -3.11 -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    exit /b 1
  )
)

echo Installing backend dependencies...
"%ROOT%\.venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel
if errorlevel 1 (
  echo [ERROR] Failed to upgrade pip tooling.
  exit /b 1
)

"%ROOT%\.venv\Scripts\python.exe" -m pip install --prefer-binary -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Failed to install backend requirements.
  exit /b 1
)

echo Installing Playwright browser (chromium)...
"%ROOT%\.venv\Scripts\python.exe" -m playwright install chromium
if errorlevel 1 (
  echo [ERROR] Failed to install Playwright browser.
  exit /b 1
)

echo.
echo Backend setup complete.
echo Run backend with:
echo   .venv\Scripts\python.exe app.py
echo Or launch full app with:
echo   start-app.bat

endlocal
