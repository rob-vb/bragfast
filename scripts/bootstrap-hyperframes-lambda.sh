#!/usr/bin/env bash
# One-shot first-time setup for the hyperframes Lambda.
# Creates the IAM execution role (if missing) and the Lambda function (if missing).
# Subsequent deploys should use scripts/deploy-hyperframes.sh.
set -euo pipefail

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

ROLE_NAME="${HYPERFRAMES_FUNCTION_NAME}-role"
IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${HYPERFRAMES_ECR_REPO}:latest"

echo "==> Ensuring IAM execution role: $ROLE_NAME"
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "    role already exists"
else
  TRUST_POLICY='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" >/dev/null
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "    created role and attached AWSLambdaBasicExecutionRole"
  echo "    waiting 10s for IAM propagation..."
  sleep 10
fi

ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

echo "==> Ensuring Lambda function: $HYPERFRAMES_FUNCTION_NAME"
if aws lambda get-function --region "$AWS_REGION" --function-name "$HYPERFRAMES_FUNCTION_NAME" >/dev/null 2>&1; then
  echo "    function already exists — use 'npm run hyperframes:deploy' to update"
  exit 0
fi

aws lambda create-function \
  --region "$AWS_REGION" \
  --function-name "$HYPERFRAMES_FUNCTION_NAME" \
  --package-type Image \
  --code "ImageUri=${IMAGE_URI}" \
  --role "$ROLE_ARN" \
  --architectures x86_64 \
  --memory-size 3008 \
  --timeout 300 \
  --ephemeral-storage Size=2048 >/dev/null

echo "==> Waiting for function to become Active"
aws lambda wait function-active --region "$AWS_REGION" --function-name "$HYPERFRAMES_FUNCTION_NAME"
echo "==> Done. Function: $HYPERFRAMES_FUNCTION_NAME"
echo "    Image: $IMAGE_URI"
echo "    Role: $ROLE_ARN"
