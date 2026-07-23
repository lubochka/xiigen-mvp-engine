#!/usr/bin/env bash
# XIIGen — AWS ECS Deployment Script
# Usage: ./infra/scripts/deploy.sh [server|client|all]
# Required env: AWS_ACCOUNT_ID, AWS_REGION, ECR_REGISTRY, ECS_CLUSTER, IMAGE_TAG

set -euo pipefail

TARGET="${1:-all}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo "=== XIIGen Deploy ==="
echo "Target:    $TARGET"
echo "Image tag: $IMAGE_TAG"
echo "Cluster:   ${ECS_CLUSTER}"
echo "Region:    ${AWS_REGION}"

# Login to ECR
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

deploy_service() {
  local SERVICE="$1"
  local IMAGE_NAME="xiigen-${SERVICE}"
  local FULL_IMAGE="${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

  echo ""
  echo "--- Building ${SERVICE} ---"
  docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" "./${SERVICE}"
  docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE}"

  echo "--- Pushing ${SERVICE} to ECR ---"
  docker push "${FULL_IMAGE}"

  echo "--- Registering task definition ---"
  local TASK_DEF
  TASK_DEF=$(sed \
    -e "s|\${AWS_ACCOUNT_ID}|${AWS_ACCOUNT_ID}|g" \
    -e "s|\${AWS_REGION}|${AWS_REGION}|g" \
    -e "s|\${IMAGE_TAG}|${IMAGE_TAG}|g" \
    "infra/ecs/${SERVICE}-task-definition.json")

  local TASK_ARN
  TASK_ARN=$(echo "$TASK_DEF" | aws ecs register-task-definition \
    --cli-input-json file:///dev/stdin \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)
  echo "Registered: $TASK_ARN"

  echo "--- Updating ECS service ---"
  aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${IMAGE_NAME}" \
    --task-definition "${TASK_ARN}" \
    --force-new-deployment \
    --output json | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('Service:', d['service']['serviceName'])
print('Status:', d['service']['status'])
print('Running tasks:', d['service']['runningCount'])
"

  echo "--- Waiting for stability ---"
  aws ecs wait services-stable \
    --cluster "${ECS_CLUSTER}" \
    --services "${IMAGE_NAME}"
  echo "✅ ${SERVICE} deployed successfully"
}

if [[ "$TARGET" == "server" || "$TARGET" == "all" ]]; then
  deploy_service "server"
fi

if [[ "$TARGET" == "client" || "$TARGET" == "all" ]]; then
  deploy_service "client"
fi

echo ""
echo "=== Deploy complete ==="
echo "Image tag: ${IMAGE_TAG}"
