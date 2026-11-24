@echo off
setlocal
pushd "%~dp0" || exit /b 1

:check
if not exist ".venv\Scripts\pythonw.exe" goto setup
".venv\Scripts\python.exe" -c "import flask, cv2, numpy, volcenginesdkarkruntime, webview" >nul 2>&1
if errorlevel 1 goto setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CD%\tools\build_source_launcher.ps1"
if errorlevel 1 goto failed
start "" "%CD%\Sentinel.exe" %*
popd
exit /b 0

:setup
echo Sentinel Desktop needs a local Python environment for its first launch.
choice /c YN /n /m "Set up .venv and install desktop dependencies now? [Y/N] "
if errorlevel 2 (
    popd
    exit /b 0
)
if not exist ".venv\Scripts\pythonw.exe" (
    py -3.12 -m venv .venv
    if errorlevel 1 python -m venv .venv
    if errorlevel 1 goto failed
)
".venv\Scripts\python.exe" -m pip install -r requirements-desktop.txt
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -c "import flask, cv2, numpy, volcenginesdkarkruntime, webview"
if errorlevel 1 goto failed
goto check

:failed
echo Setup or launcher creation failed. Install Python 3.12 for Windows and check the messages above.
echo See the Windows desktop guide in the README.
pause
popd
exit /b 1
