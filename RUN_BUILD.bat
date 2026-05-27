@echo off
cd /d %~dp0
echo Running MediSense Frontend Builder...
node build-frontend.js
pause
