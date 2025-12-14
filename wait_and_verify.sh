#!/bin/bash

echo "⏳ Waiting for cron to process expired activation..."
echo "   Sleeping for 3 minutes..."
echo ""

for i in {1..6}; do
  echo "   ⏱️  $(( (6-i+1) * 30 )) seconds remaining..."
  sleep 30
done

echo ""
echo "✅ Wait complete! Running verification..."
echo ""

node test_cron_fix.mjs
