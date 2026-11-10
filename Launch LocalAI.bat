@echo off
title Starting LocalAI...
set "ELECTRON_RUN_AS_NODE="
start "" "%~dp0release\win-unpacked\LocalAI.exe"
