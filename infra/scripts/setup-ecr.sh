#!/usr/bin/env bash
# Run once to create ECR repos and CloudWatch log groups.
# Usage: AWS_ACCOUNT_ID=xxx AWS_REGION=us-east-1 ./infra/scripts/setup-ecr.sh

set -euo pipefail

for REPO in xiigen-server xiigen-client; do
  echo "Creating ECR repo: $REPO"
  aws ecr create-repository \
    --repository-name "$REPO" \
    --region "${AWS_REGION}" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null || echo "  (already exists)"
done

for LOG_GROUP in /ecs/xiigen-server /ecs/xiigen-client; do
  echo "Creating log group: $LOG_GROUP"
  aws logs create-log-group \
    --log-group-name "$LOG_GROUP" \
    --region "${AWS_REGION}" \
    2>/dev/null || echo "  (already exists)"
  aws logs put-retention-policy \
    --log-group-name "$LOG_GROUP" \
    --retention-in-days 30 \
    --region "${AWS_REGION}"
done

echo ""
echo "✅ ECR setup complete"
echo "ECR registry: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
