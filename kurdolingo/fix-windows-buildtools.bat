@echo off
REM ─────────────────────────────────────────────────────────────
REM  Kurdolingo — Windows Build-Tools Fix für better-sqlite3
REM  Ausführen als Administrator!
REM ─────────────────────────────────────────────────────────────
echo.
echo [Kurdolingo] Installiere Windows Build-Tools...
echo.

REM Visual C++ Build Tools installieren (nötig für native Node-Addons)
npm install --global windows-build-tools --vs2019

REM Alternativ: nur das nötigste
npm install --global node-gyp

echo.
echo [Kurdolingo] Build-Tools installiert.
echo Starte jetzt start.bat neu.
echo.
pause
