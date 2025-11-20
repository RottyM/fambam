@echo off
echo.
echo ================================================
echo   Testing Family OS PWA in Production Mode
echo ================================================
echo.
echo Step 1: Building production version...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   Build complete! Starting production server...
echo ================================================
echo.
echo Your PWA is now available at: http://localhost:3000
echo.
echo WHAT TO TEST:
echo   1. Open Chrome/Edge
echo   2. Look for install icon in address bar
echo   3. Click "Install Family OS"
echo   4. Test offline: DevTools ^> Network ^> Offline
echo   5. App should work offline!
echo.
echo Press Ctrl+C to stop the server when done testing
echo.
call npm start
