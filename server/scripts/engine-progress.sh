#!/bin/bash
# Get engine progress report
# Usage: ./server/scripts/engine-progress.sh [flowId]
FLOW_ID=${1:-""}
if [ -n "$FLOW_ID" ]; then
  curl -s "http://localhost:3000/api/engine/progress?flowId=${FLOW_ID}" | jq '.'
else
  curl -s "http://localhost:3000/api/engine/progress" | jq '.'
fi
