@echo off
setlocal
cd /d "%~dp0"
title Wayang Digital - SMK Taruna Jaya Prawira Tuban

if exist "runtime\python.exe" (
    "%~dp0runtime\python.exe" "%~dp0server.py"
    goto :check_error
)

echo [INFO] Runtime portabel tidak ditemukan di folder runtime\
echo [INFO] Mencari instalasi Python sistem di komputer Anda...
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    python "%~dp0server.py"
    goto :check_error
)

echo.
echo =============================================================
echo  KESALAHAN: Python tidak ditemukan!
echo =============================================================
echo  Aplikasi membutuhkan Python untuk menjalankan server lokal.
echo  Pilihan solusi:
echo  1. Pastikan folder 'runtime\' disertakan (tersedia pada rilis ZIP).
echo  2. Atau instal Python (3.9+) dari https://www.python.org/
echo =============================================================
echo.
pause
exit /b 1

:check_error
if errorlevel 1 (
    echo.
    echo [ERROR] Aplikasi berhenti dengan kode kesalahan.
    pause
)
endlocal
