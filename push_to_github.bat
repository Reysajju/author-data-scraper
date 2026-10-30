@echo off
title Push Author Data Scraper to GitHub
cd /d "%~dp0"

if exist "D:\git\cmd\git.exe" set "PATH=D:\git\cmd;%PATH%"

echo ======================================================================
echo    PUSH AUTHOR DATA SCRAPER TO GITHUB (FREE 24/7 ACTIONS RUNNER)
echo ======================================================================
echo.
echo Target Repository: https://github.com/Reysajju/author-data-scraper.git
echo.
set "USER_INPUT="
set /p USER_INPUT="Press ENTER to push to https://github.com/Reysajju/author-data-scraper.git (or paste custom URL): "

if "%USER_INPUT%"=="" set "USER_INPUT=https://github.com/Reysajju/author-data-scraper.git"

echo.
echo Connecting to: %USER_INPUT%
echo.

git init
git config --global user.name "Reysajju"
git config --global user.email "sajjadr742@gmail.com"
git add .
git commit -m "Initial commit: Author Data Scraper with 24/7 GitHub Actions"
git remote remove origin 2>nul
git remote add origin %USER_INPUT%
git branch -M main

echo Uploading code to GitHub...
git push -u origin main --force

if %ERRORLEVEL% equ 0 (
    echo.
    echo ======================================================================
    echo    SUCCESS! YOUR REPOSITORY IS LIVE ON GITHUB!
    echo ======================================================================
    echo  1. Open your repository on GitHub.
    echo  2. Go to 'Settings' -^> 'Actions' -^> 'General' -^> 'Workflow permissions'
    echo     and select 'Read and write permissions', then click Save.
    echo  3. Click on the 'Actions' tab.
    echo  4. Click 'Run workflow' to start the 24/7 cloud scraper!
    echo ======================================================================
) else (
    echo.
    echo ======================================================================
    echo  Notice: If prompted, complete the GitHub sign-in in browser and re-run.
    echo ======================================================================
)

pause
