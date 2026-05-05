@REM Terminal 1 (AI):

@REM cd /d C:\dev\RepoTalk\ai_service
@REM venv311\Scripts\python.exe -m uvicorn app.main:app --port 8000
@REM Terminal 2 (Gateway):

@REM cd /d C:\dev\RepoTalk\gateway
@REM npm run dev
@REM Terminal 3 (Frontend):

@REM cd /d C:\dev\RepoTalk\frontend
@REM npm run dev
@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

cd /d "%ROOT%"

echo ============================================================
echo RepoTalk Startup Script
echo Root: %ROOT%
echo ============================================================

if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"

if not exist "%ROOT%\ai_service" (
  echo [ERROR] Missing folder: %ROOT%\ai_service
  exit /b 1
)
if not exist "%ROOT%\gateway" (
  echo [ERROR] Missing folder: %ROOT%\gateway
  exit /b 1
)
if not exist "%ROOT%\frontend" (
  echo [ERROR] Missing folder: %ROOT%\frontend
  exit /b 1
)

if exist "%ROOT%\docker-compose.yml" (
  where docker >nul 2>&1
  if not errorlevel 1 (
    docker info >nul 2>&1
    if not errorlevel 1 (
      echo [INFO] Docker daemon detected. Starting stack with docker compose...
      docker compose up -d --build
      if errorlevel 1 (
        echo [WARN] Docker compose start failed. Falling back to manual startup.
      ) else (
        call :wait_http "http://localhost:3000" 180 "Frontend"
        call :wait_http "http://localhost:4000/health" 180 "Gateway"
        call :wait_http "http://127.0.0.1:8000/health" 180 "AI Service"
        call :print_summary
        exit /b 0
      )
    ) else (
      echo [INFO] Docker installed but daemon not running. Using manual startup.
    )
  )
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or not on PATH.
  exit /b 1
)

where py >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python launcher 'py' is not installed or not on PATH.
  exit /b 1
)

set "AI_PY="
if exist "%ROOT%\ai_service\venv311\Scripts\python.exe" (
  set "AI_PY=%ROOT%\ai_service\venv311\Scripts\python.exe"
) else if exist "%ROOT%\ai_service\venv\Scripts\python.exe" (
  set "AI_PY=%ROOT%\ai_service\venv\Scripts\python.exe"
) else (
  echo [INFO] Creating Python 3.11 venv at ai_service\venv311 ...
  py -3.11 -m venv "%ROOT%\ai_service\venv311"
  if errorlevel 1 (
    echo [ERROR] Failed to create ai_service\venv311.
    exit /b 1
  )
  set "AI_PY=%ROOT%\ai_service\venv311\Scripts\python.exe"
)

"%AI_PY%" -c "import uvicorn" >nul 2>&1
if errorlevel 1 (
  echo [INFO] Installing AI service requirements...
  "%AI_PY%" -m pip install -r "%ROOT%\ai_service\requirements.txt"
  if errorlevel 1 (
    echo [ERROR] Failed to install AI service dependencies.
    exit /b 1
  )
)

if not exist "%ROOT%\gateway\node_modules" (
  echo [INFO] Installing gateway dependencies...
  pushd "%ROOT%\gateway"
  npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Failed to install gateway dependencies.
    exit /b 1
  )
  popd
)

if not exist "%ROOT%\frontend\node_modules" (
  echo [INFO] Installing frontend dependencies...
  pushd "%ROOT%\frontend"
  npm install
  if errorlevel 1 (
    popd
    echo [ERROR] Failed to install frontend dependencies.
    exit /b 1
  )
  popd
)

call :is_port_listening 8000 AI_RUNNING
if "%AI_RUNNING%"=="1" (
  echo [INFO] AI service already running on port 8000. Skipping start.
) else (
  echo [INFO] Starting AI service on port 8000...
  start "RepoTalk AI Service" /min cmd /c "cd /d "%ROOT%\ai_service" && "%AI_PY%" -m uvicorn app.main:app --port 8000 >> "%ROOT%\logs\ai_service.log" 2>&1"
)

call :is_port_listening 4000 GW_RUNNING
if "%GW_RUNNING%"=="1" (
  echo [INFO] Gateway already running on port 4000. Skipping start.
) else (
  echo [INFO] Starting gateway on port 4000...
  start "RepoTalk Gateway" /min cmd /c "cd /d "%ROOT%\gateway" && npm run dev >> "%ROOT%\logs\gateway.log" 2>&1"
)

call :is_port_listening 3000 FE_RUNNING
if "%FE_RUNNING%"=="1" (
  echo [INFO] Frontend already running on port 3000. Skipping start.
) else (
  echo [INFO] Starting frontend on port 3000...
  start "RepoTalk Frontend" /min cmd /c "cd /d "%ROOT%\frontend" && npm run dev >> "%ROOT%\logs\frontend.log" 2>&1"
)

call :wait_http "http://127.0.0.1:8000/health" 180 "AI Service"
call :wait_http "http://localhost:4000/health" 180 "Gateway"
call :wait_http "http://localhost:3000" 180 "Frontend"

call :print_summary
exit /b 0

:is_port_listening
set "PORT=%~1"
set "RESULT_VAR=%~2"
set "VALUE=0"
for /f %%I in ('powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort %PORT% -ErrorAction SilentlyContinue) { '1' } else { '0' }"') do set "VALUE=%%I"
set "%RESULT_VAR%=%VALUE%"
exit /b 0

:wait_http
set "URL=%~1"
set "TIMEOUT_SECONDS=%~2"
set "LABEL=%~3"

echo [INFO] Waiting for %LABEL%: %URL%
set /a ELAPSED=0

:wait_loop
if %ELAPSED% GEQ %TIMEOUT_SECONDS% (
  echo [WARN] %LABEL% did not become healthy within %TIMEOUT_SECONDS%s.
  exit /b 1
)

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 3; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
  echo [OK] %LABEL% is reachable.
  exit /b 0
)

timeout /t 2 /nobreak >nul
set /a ELAPSED+=2
goto :wait_loop

:print_summary
echo.
echo ============================================================
echo RepoTalk is up.
echo Frontend : http://localhost:3000
echo Gateway  : http://localhost:4000/health
echo AI       : http://127.0.0.1:8000/health
echo Logs     : %ROOT%\logs
echo ============================================================
echo.
exit /b 0
