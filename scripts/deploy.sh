#!/usr/bin/env bash
# deploy.sh — Build & push Docker images to ECR, then force ECS service update
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT="${PROJECT:-financialos}"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

BACKEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}/backend"
FRONTEND_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT}/frontend"
ECS_CLUSTER="${PROJECT}-cluster"
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Financial OS — Deploy"
echo "  Account : ${AWS_ACCOUNT_ID}"
echo "  Region  : ${AWS_REGION}"
echo "  SHA     : ${GIT_SHA}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── ECR login ─────────────────────────────────────────────────────────────────
echo "→ Logging into ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin \
    "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "${SCRIPT_DIR}")"

# ── Build & push backend ──────────────────────────────────────────────────────
echo "→ Building backend image..."
docker build \
  --platform linux/amd64 \
  -t "${BACKEND_REPO}:${GIT_SHA}" \
  -t "${BACKEND_REPO}:latest" \
  "${ROOT_DIR}/backend"

echo "→ Pushing backend image..."
docker push "${BACKEND_REPO}:${GIT_SHA}"
docker push "${BACKEND_REPO}:latest"

# ── Build & push frontend ─────────────────────────────────────────────────────
echo "→ Building frontend image..."
docker build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL="/api" \
  -t "${FRONTEND_REPO}:${GIT_SHA}" \
  -t "${FRONTEND_REPO}:latest" \
  "${ROOT_DIR}/frontend"

echo "→ Pushing frontend image..."
docker push "${FRONTEND_REPO}:${GIT_SHA}"
docker push "${FRONTEND_REPO}:latest"

# ── Force ECS service update ──────────────────────────────────────────────────
echo "→ Deploying to ECS..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${PROJECT}-backend" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  --output table

aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${PROJECT}-frontend" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  --output table

echo ""
echo "✓ Deployment triggered!"
echo "  Monitor: https://${AWS_REGION}.console.aws.amazon.com/ecs/v2/clusters/${ECS_CLUSTER}/services"
echo ""
echo "  Watch rollout:"
echo "  aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${PROJECT}-backend ${PROJECT}-frontend"
