@echo off
title DART Analyzer

echo ===================================
echo   DART Analyzer Starting...
echo ===================================
echo.

if not exist "node_modules" npm install

echo [1/2] Starting FastAPI backend on port 8002...
start "DART API" cmd /k "python -m uvicorn api.main:app --host 0.0.0.0 --port 8002 --reload"

timeout /t 2 /nobreak > nul

echo [2/2] Starting Vite frontend on port 5173...
start "DART Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak > nul
echo Opening browser...
start http://localhost:5173

echo.
echo ===================================
echo   API:      http://localhost:8002
echo   Frontend: http://localhost:5173
echo ===================================
