@echo off
cd /d C:\Users\XIAOMI\AiToEarn\project\aitoearn-web\payment-server
set MONGODB_URI=mongodb://admin:password@localhost:27017/?authSource=admin^&directConnection=true
set DB_NAME=aitoearn
title AiBrand Payment Server
node server.js
