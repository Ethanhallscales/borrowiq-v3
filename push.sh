#!/bin/bash
cd ~/Desktop/borrowiq-v3
rm -rf node_modules .next
git add .
git commit -m "${1:-update}"
git push origin main
npm install
