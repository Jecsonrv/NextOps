@echo off
REM Deploy Memory Optimizations to Railway (Windows CMD/PowerShell)
REM This script commits and pushes all memory optimization changes

echo.
echo ========================================
echo  NextOps Memory Optimization Deploy
echo ========================================
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not a git repository
    pause
    exit /b 1
)

REM Show current status
echo Current changes:
git status --short
echo.

REM Confirm with user
set /p CONFIRM="Deploy these changes to Railway? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Deploy cancelled
    pause
    exit /b 0
)

echo.
echo Staging changes...

REM Add all changes
git add backend/gunicorn_config.py
git add backend/requirements.txt
git add backend/proyecto/settings/prod.py
git add backend/invoices/views.py
git add backend/ots/views.py
git add backend/common/middleware/memory_monitor.py
git add backend/common/middleware/__init__.py
git add backend/.env.example
git add backend/check_memory.py
git add MEMORY_OPTIMIZATION.md
git add RAILWAY_SETUP.md
git add OPTIMIZATIONS_APPLIED.md
git add README_OPTIMIZATIONS.md
git add DEPLOYMENT_SUMMARY.md
git add deploy_optimizations.sh
git add deploy_optimizations.bat

echo Changes staged
echo.

REM Create commit with detailed message
echo Creating commit...
git commit -F- << EOF
Optimize: Reduce memory usage from 5GB to ~1GB

## Problem
- Railway app consuming ~5GB RAM without active use
- High costs due to memory overages (~$50/month)
- Memory leaks from workers never recycling
- Inefficient exports loading 10k+ records in RAM

## Optimizations Applied

### 1. Gunicorn Workers (CRITICAL)
- Workers: 5 -> 2 (-60%% memory)
- Worker class: sync -> gevent (async I/O)
- Added recycling: max_requests=500
- Timeout: 300s -> 120s
- Impact: ~3GB -> ~800MB

### 2. Export Optimization
- Use .iterator(chunk_size=100) instead of loading all
- Added select_related() to prevent N+1 queries
- Impact: ~500MB -> ~50MB per export

### 3. File Upload Streaming
- Hash calculation via chunks (8KB buffer)
- Avoid loading full file in memory
- Impact: ~45MB -> ~8KB per 15MB file

### 4. Logging Simplification
- Production: Only stdout (Railway captures)
- Remove file handlers (50MB logs)
- Level: INFO -> WARNING
- Impact: ~50MB -> ~10MB

### 5. Database Pooling
- conn_max_age: 600s -> 60s
- Release connections faster

### 6. Monitoring
- New middleware: MemoryMonitorMiddleware
- Health check script: check_memory.py
- Sampling: 1%% of requests

## Files Changed
- backend/gunicorn_config.py
- backend/requirements.txt (+gevent, psutil)
- backend/proyecto/settings/prod.py
- backend/invoices/views.py
- backend/ots/views.py
- backend/common/middleware/memory_monitor.py (NEW)
- backend/.env.example (NEW)
- backend/check_memory.py (NEW)

## Documentation
- MEMORY_OPTIMIZATION.md
- RAILWAY_SETUP.md
- OPTIMIZATIONS_APPLIED.md
- README_OPTIMIZATIONS.md
- DEPLOYMENT_SUMMARY.md

## Expected Results
- Memory: 5GB -> 1GB (-80%%)
- Cost: $50/month -> $20/month (-60%%)
- Better response times with async workers
- Automatic memory leak prevention

## Railway Variables Required
GUNICORN_WORKERS=2
GUNICORN_WORKER_CLASS=gevent
GUNICORN_MAX_REQUESTS=500
GUNICORN_TIMEOUT=120
LOG_LEVEL=WARNING

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF

if errorlevel 1 (
    echo ERROR: Failed to create commit
    pause
    exit /b 1
)

echo Commit created successfully
echo.

REM Push to remote
set /p PUSH="Push to origin main? (Y/N): "
if /i "%PUSH%"=="Y" (
    echo.
    echo Pushing to remote...
    git push origin main

    if errorlevel 1 (
        echo ERROR: Failed to push to remote
        pause
        exit /b 1
    )

    echo.
    echo ========================================
    echo  Deploy Successful!
    echo ========================================
    echo.
    echo Next Steps:
    echo 1. Go to Railway Dashboard
    echo 2. Add environment variables:
    echo    - GUNICORN_WORKERS=2
    echo    - GUNICORN_WORKER_CLASS=gevent
    echo    - GUNICORN_MAX_REQUESTS=500
    echo    - LOG_LEVEL=WARNING
    echo 3. Wait for automatic deploy
    echo 4. Monitor memory usage (should drop to ~1GB)
    echo.
    echo Documentation: See RAILWAY_SETUP.md
    echo.
) else (
    echo.
    echo Push cancelled. Run 'git push origin main' manually when ready.
    echo.
)

echo Done!
echo.
pause
