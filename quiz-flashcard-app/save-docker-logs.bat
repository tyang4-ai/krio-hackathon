@echo off
REM Docker Logs Auto-Save Script
REM This script saves Docker container logs to timestamped files in the "random stuff" folder

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Create the random stuff folder if it doesn't exist
if not exist "%SCRIPT_DIR%random stuff" mkdir "%SCRIPT_DIR%random stuff"

REM Generate timestamp for filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

REM Log file path
set LOG_FILE=%SCRIPT_DIR%random stuff\docker-logs_%TIMESTAMP%.txt

echo Saving Docker logs to: %LOG_FILE%
echo.

REM Save logs from all containers
echo ==================== DOCKER LOGS %TIMESTAMP% ==================== > "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Get logs from each container
echo --- scholarly-backend logs --- >> "%LOG_FILE%"
docker logs scholarly-backend >> "%LOG_FILE%" 2>&1
echo. >> "%LOG_FILE%"

echo --- scholarly-frontend logs --- >> "%LOG_FILE%"
docker logs scholarly-frontend >> "%LOG_FILE%" 2>&1
echo. >> "%LOG_FILE%"

echo --- scholarly-postgres logs --- >> "%LOG_FILE%"
docker logs scholarly-postgres >> "%LOG_FILE%" 2>&1
echo. >> "%LOG_FILE%"

echo ==================== END LOGS ==================== >> "%LOG_FILE%"

echo.
echo Logs saved successfully to:
echo %LOG_FILE%
echo.
pause
