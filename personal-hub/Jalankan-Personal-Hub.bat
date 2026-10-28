@echo off
title Personal Hub Server (Keuangan, Tasks & Notes)
echo ========================================================
echo   Menjalankan Personal Hub dengan SQLite Lokal...
echo ========================================================
cd /d "%~dp0"
start http://localhost:3000
node server.mjs
pause
