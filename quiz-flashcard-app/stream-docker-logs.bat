@echo off
REM Docker Logs Stream Script
REM This script continuously streams Docker logs to the console and saves them to a file

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Create the random stuff folder if it doesn't exist
if not exist "%SCRIPT_DIR%random stuff" mkdir "%SCRIPT_DIR%random stuff"

REM Generate timestamp for filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

REM Log file path
set LOG_FILE=%SCRIPT_DIR%random stuff\docker-stream_%TIMESTAMP%.txt

echo ================================================
echo Docker Logs Streaming
echo ================================================
echo Logs will be saved to: %LOG_FILE%
echo Press Ctrl+C to stop streaming
echo ================================================
echo.

REM Stream logs from docker-compose (follows in real-time)
REM Tee command equivalent - output to both console and file
cd /d "%SCRIPT_DIR%"
docker-compose logs -f 2>&1 | powershell -Command "& { $input | Tee-Object -FilePath '%LOG_FILE%' }"
