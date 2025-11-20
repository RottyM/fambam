@echo off
echo Generating PWA Icons from SVG...
echo.

REM Check if ImageMagick is installed
where magick >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ImageMagick not found. Please install from: https://imagemagick.org/script/download.php
    echo Or use Option 1 or 2 from the instructions
    pause
    exit /b 1
)

cd public

echo Generating 192x192 icon...
magick icon.svg -resize 192x192 icon-192x192.png

echo Generating 512x512 icon...
magick icon.svg -resize 512x512 icon-512x512.png

echo Generating Apple Touch Icon (180x180)...
magick icon.svg -resize 180x180 apple-touch-icon.png

echo.
echo Done! Icons generated successfully in /public folder
echo.
pause
