@echo off
:: ─────────────────────────────────────────────────────────────────
::  FIX: Falls better-sqlite3 nicht kompiliert werden kann
::  Dieses Skript wechselt zu "sql.js" (reines JavaScript, kein C++)
:: ─────────────────────────────────────────────────────────────────
setlocal
echo.
echo  =============================================
echo   Kurdolingo - Fallback: sql.js statt better-sqlite3
echo  =============================================
echo.

cd /d "%~dp0backend"

:: Entferne alte installation
echo [1/3] Entferne alte node_modules...
rmdir /s /q node_modules 2>nul

:: Installiere ohne better-sqlite3
echo [2/3] Installiere Abhaengigkeiten ohne native module...
call npm install --ignore-scripts
if %errorlevel% neq 0 (
    echo [FEHLER] Installation fehlgeschlagen.
    pause & exit /b 1
)

:: Installiere sql.js als Ersatz
echo [3/3] Installiere sql.js (reines JavaScript SQLite)...
call npm install sql.js
if %errorlevel% neq 0 (
    echo [FEHLER] sql.js Installation fehlgeschlagen.
    pause & exit /b 1
)

echo.
echo [OK] Fertig! Jetzt start.bat ausfuehren.
echo.
pause
