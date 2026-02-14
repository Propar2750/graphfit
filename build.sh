#!/usr/bin/env bash
# build.sh — Render build script: installs deps + builds frontend into backend/static/
set -o errexit

echo "==> Installing Python dependencies..."
cd backend
pip install -r requirements.txt

echo "==> Installing frontend dependencies..."
cd ../frontend
npm install

echo "==> Building frontend..."
npm run build

echo "==> Copying build output to backend/static/..."
rm -rf ../backend/static
cp -r dist ../backend/static

echo "==> Build complete!"
