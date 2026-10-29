@echo off
echo ===================================================
echo [OmniTerm] Building Windows Distribution (Tauri v2)
echo ===================================================
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    exit /b %errorlevel%
)
call npx @tauri-apps/cli build
if %errorlevel% neq 0 (
    echo [ERROR] Tauri Windows build failed!
    exit /b %errorlevel%
)
echo [SUCCESS] Windows artifacts built successfully in src-tauri/target/release/bundle/
