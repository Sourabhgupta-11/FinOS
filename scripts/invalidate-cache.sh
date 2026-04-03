#!/usr/bin/env bash
# invalidate-cache.sh — Invalidate CloudFront cache after frontend deploy
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
DISTRIBUTION_ID="${CF_DISTRIBUTION_ID:-}"

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "→ Looking up CloudFront distribution..."
  DISTRIBUTION_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='financialos CDN'].Id" \
    --output text \
    --region "$AWS_REGION")
fi

if [ -z "$DISTRIBUTION_ID" ]; then
  echo "✗ Could not find CloudFront distribution. Set CF_DISTRIBUTION_ID env var."
  exit 1
fi

echo "→ Invalidating cache on distribution: $DISTRIBUTION_ID"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text)

echo "→ Waiting for invalidation to complete: $INVALIDATION_ID"
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" \
  --id "$INVALIDATION_ID"

echo "✓ Cache invalidated successfully"
