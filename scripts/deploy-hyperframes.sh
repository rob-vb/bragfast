#!/usr/bin/env bash
set -euo pipefail

# Load .env.local if present so npm-run callers don't have to export vars manually
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${AWS_REGION:?AWS_REGION must be set}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID must be set}"
: "${HYPERFRAMES_FUNCTION_NAME:?HYPERFRAMES_FUNCTION_NAME must be set}"
: "${HYPERFRAMES_ECR_REPO:?HYPERFRAMES_ECR_REPO must be set}"

REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${HYPERFRAMES_ECR_REPO}:latest"

echo "==> Logging in to ECR (${REGISTRY})"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Ensuring ECR repo exists"
aws ecr describe-repositories --region "$AWS_REGION" --repository-names "$HYPERFRAMES_ECR_REPO" >/dev/null 2>&1 \
  || aws ecr create-repository --region "$AWS_REGION" --repository-name "$HYPERFRAMES_ECR_REPO" >/dev/null

echo "==> Building image (linux/amd64)"
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -f infra/hyperframes-lambda/Dockerfile \
  -t "$IMAGE_URI" \
  --push \
  .

echo "==> Updating Lambda function code"
aws lambda update-function-code \
  --region "$AWS_REGION" \
  --function-name "$HYPERFRAMES_FUNCTION_NAME" \
  --image-uri "$IMAGE_URI" >/dev/null

echo "==> Waiting for update to complete"
aws lambda wait function-updated --region "$AWS_REGION" --function-name "$HYPERFRAMES_FUNCTION_NAME"

echo "==> Done. Image: $IMAGE_URI"
