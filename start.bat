@echo off
setlocal enabledelayedexpansion
echo.
echo  ============================================
echo   Kurdolingo - Lokaler Start (Windows)
echo  ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] Node.js nicht gefunden.
    echo Bitte installieren: https://nodejs.org
    pause & exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [OK] Node.js %NODE_VERSION% gefunden

:: ── Backend ──────────────────────────────────────────────────────────────────
echo.
echo [1/4] Backend wird installiert...
cd /d "%~dp0backend"

if not exist node_modules (
    echo      Installiere npm-Pakete...
    echo      (better-sqlite3 Kompilierungsfehler werden ignoriert - sql.js wird als Fallback genutzt)
    call npm install --ignore-scripts 2>nul
    if !errorlevel! neq 0 (
        call npm install --ignore-scripts
        if !errorlevel! neq 0 (
            echo [FEHLER] npm install fehlgeschlagen.
            pause & exit /b 1
        )
    )
    :: better-sqlite3 separat versuchen - Fehler ist OK
    echo      Versuche better-sqlite3 zu kompilieren ^(optional^)...
    call npm rebuild better-sqlite3 2>nul
    if !errorlevel! neq 0 (
        echo      better-sqlite3 nicht verfuegbar - sql.js Fallback wird genutzt ^(normal bei Node 24^)
    ) else (
        echo      better-sqlite3 erfolgreich kompiliert
    )
) else (
    echo      node_modules vorhanden - ueberspringe Installation
)
echo [OK] Backend-Abhaengigkeiten bereit

if not exist .env (
    copy .env.example .env >nul 2>&1
    echo [OK] .env Datei erstellt
)

if not exist kurdolingo.db (
    echo.
    echo [2/4] Datenbank wird befuellt...
    node src/seed.js
    if !errorlevel! neq 0 (
        echo [FEHLER] Seed fehlgeschlagen.
        pause & exit /b 1
    )
    echo [OK] Datenbank bereit
) else (
    echo [OK] Datenbank bereits vorhanden
)

cd /d "%~dp0"

:: ── Frontend ─────────────────────────────────────────────────────────────────
echo.
echo [3/4] Frontend wird installiert...
cd /d "%~dp0frontend"

if not exist node_modules (
    call npm install
    if !errorlevel! neq 0 (
        echo [FEHLER] Frontend npm install fehlgeschlagen.
        pause & exit /b 1
    )
)
echo [OK] Frontend-Abhaengigkeiten bereit

cd /d "%~dp0"

:: ── Start ─────────────────────────────────────────────────────────────────────
echo.
echo  ============================================
echo  [4/4] Starte Server...
echo  ============================================
echo.
echo   Backend  -^>  http://localhost:4000
echo   Frontend -^>  http://localhost:3000
echo   Admin    -^>  http://localhost:3000/admin
echo.
echo   Admin:   admin@kurdolingo.de  /  admin123
echo   Demo:    demo@kurdolingo.de   /  demo123
echo  ============================================
echo.

start "Kurdolingo Backend"  cmd /k "cd /d "%~dp0backend"  && node src/index.js"
timeout /t 2 /nobreak >nul
start "Kurdolingo Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Druecken Sie eine Taste um dieses Fenster zu schliessen...
pause >nul
