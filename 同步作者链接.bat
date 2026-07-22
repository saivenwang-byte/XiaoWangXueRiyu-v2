@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 同步作者链接 ?v=

python scripts\sync-cache-ver-hints.py
if errorlevel 1 pause & exit /b 1

for /f "tokens=4" %%v in ('findstr /C:"const PUBLIC_LINK_VER" "js\share-wechat.js"') do set "VER=%%v"
set "VER=%VER:"=%"
set "VER=%VER:;=%"
echo.
echo  固定公开链接 v=%VER%
echo  https://saivenwang-byte.github.io/XiaoWangXueRiyu-v2/index.html?v=%VER%
echo.
pause
