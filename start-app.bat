@echo off
setlocal

cd /d "%~dp0"
set "ROOT=%cd%"
set "FRONTEND_DIR=%ROOT%\frontend"
set "FRONTEND_PORT=3001"

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] frontend\package.json not found.
  exit /b 1
)

set "PY_LAUNCH=python app.py"
if exist "%ROOT%\.venv\Scripts\python.exe" (
  set "PY_LAUNCH=""%ROOT%\.venv\Scripts\python.exe"" app.py"
) else (
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3.11 -V >nul 2>nul
    if not errorlevel 1 (
      set "PY_LAUNCH=py -3.11 app.py"
    ) else (
      echo [WARN] Python 3.11 not found. Falling back to default Python.
      set "PY_LAUNCH=py -3 app.py"
    )
  ) else (
    where python >nul 2>nul
    if errorlevel 1 (
      echo [ERROR] Python not found in PATH.
      exit /b 1
    )
    set "PY_LAUNCH=python app.py"
  )
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd not found in PATH.
  exit /b 1
)

echo Starting backend in a new terminal...
start "AnswerScope Backend" cmd /k "cd /d ""%ROOT%"" && %PY_LAUNCH%"

echo Starting frontend in a new terminal...
start "AnswerScope Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm.cmd run dev -- -p %FRONTEND_PORT%"

echo.
echo Frontend: http://localhost:%FRONTEND_PORT%
echo Backend API: http://localhost:5000
echo.
echo You can close this launcher window.

endlocal
