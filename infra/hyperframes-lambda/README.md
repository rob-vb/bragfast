# Hyperframes render Lambda

AWS Lambda container that renders a Hyperframes composition (passed as inline HTML) to MP4 and uploads it via a presigned R2 PUT URL.

## Event shape

```json
{
  "html": "<!doctype html>...",
  "variables": { "headline": "Shipped" },
  "format": "square",
  "duration": 8,
  "presignedPutUrl": "https://r2.signed/releases/<id>/square.mp4"
}
```

## Local build

```sh
docker buildx build --platform linux/arm64 -t hyperframes-lambda:dev infra/hyperframes-lambda
```

## Local invoke (Lambda RIE)

```sh
docker run --rm -p 9000:8080 hyperframes-lambda:dev
# in another shell:
curl -s -X POST http://localhost:9000/2015-03-31/functions/function/invocations \
  -d @event.json
```

## Deploy

Required env (set locally before running the deploy script):

- `AWS_REGION` (e.g. `us-east-1`)
- `AWS_ACCOUNT_ID`
- `HYPERFRAMES_FUNCTION_NAME` (e.g. `bragfast-hyperframes-render`)
- `HYPERFRAMES_ECR_REPO` (e.g. `bragfast/hyperframes-render`)

```sh
npm run hyperframes:deploy
```

The script builds the arm64 image, pushes to ECR, and updates the Lambda function code. First-time deploy must create the function manually via the AWS console or CLI:

```sh
aws lambda create-function \
  --function-name "$HYPERFRAMES_FUNCTION_NAME" \
  --package-type Image \
  --code "ImageUri=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HYPERFRAMES_ECR_REPO:latest" \
  --architectures arm64 \
  --memory-size 3008 \
  --timeout 300 \
  --role "arn:aws:iam::$AWS_ACCOUNT_ID:role/bragfast-hyperframes-render"
```

## IAM

The Lambda role only needs CloudWatch Logs write permissions. R2 upload happens via the presigned URL (no AWS credentials required at the Lambda).

## Notes

- `PUPPETEER_CACHE_DIR=/opt/puppeteer` keeps Chrome installed during the build accessible at runtime.
- Handler sets `HOME=/tmp` so Hyperframes can write scratch files (Lambda's only writable filesystem).
- Chromium + ffmpeg shared-lib coverage in the Dockerfile is best-effort. If you see "shared library not found" errors after deploy, run `ldd $(which chromium)` in the container and `dnf install` the missing packages.
