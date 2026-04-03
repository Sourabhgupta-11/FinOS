#!/usr/bin/env bash
# migrate.sh — Run database migrations on production via ECS exec
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT:-financialos}"
ECS_CLUSTER="${PROJECT}-cluster"
SERVICE="${PROJECT}-backend"

echo "→ Finding running backend task..."
TASK_ARN=$(aws ecs list-tasks \
  --cluster "${ECS_CLUSTER}" \
  --service-name "${SERVICE}" \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text \
  --region "${AWS_REGION}")

if [ "${TASK_ARN}" = "None" ] || [ -z "${TASK_ARN}" ]; then
  echo "✗ No running backend task found"
  exit 1
fi

echo "  Task: ${TASK_ARN}"
echo "→ Running migrations..."

aws ecs execute-command \
  --cluster "${ECS_CLUSTER}" \
  --task "${TASK_ARN}" \
  --container backend \
  --interactive \
  --command "node src/db/migrate.js" \
  --region "${AWS_REGION}"

echo "✓ Migrations complete"
