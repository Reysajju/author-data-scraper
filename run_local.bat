@echo off
title Autonomous Author Data Scraper (Local Runner)
cd /d "%~dp0"
echo ======================================================================
echo    Starting Author Data Scraper (USA & Canada)
echo    Saving to: "output/Authors_USA_Canada_Master.xlsx"
echo ======================================================================
node start_author_scraper.js
pause
