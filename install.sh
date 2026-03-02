#!/bin/bash
set -e

echo "---------------------------------------"
echo "  Installing COREX AI Terminal Chat"
echo "---------------------------------------"

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18 or higher is required. Current: $(node -v)"
    exit 1
fi

echo "OK Node.js $(node -v) detected"
npm install -g corex-ai

echo ""
echo "---------------------------------------"
echo "  COREX installed successfully."
echo "  Type 'corex' to launch."
echo "---------------------------------------"
