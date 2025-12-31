#!/bin/bash
# Load environment variables from .env if present
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

echo "🚀 Running Smart Cleanup..."
deno run --allow-all scripts/smart_cleanup.ts
