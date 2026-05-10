# Hyperframes render Lambda

AWS Lambda container that renders a Hyperframes composition to MP4 and uploads it via a presigned R2 PUT URL. The handler accepts either inline HTML or a baked-in `templateId` plus `format`.

## Event shape

```json
{
  "templateId": "milestone",
  "variables": { "headline": "Shipped" },
  "format": "square",
  "duration": 8,
  "presignedPutUrl": "https://r2.signed/releases/<id>/square.mp4"
}
```

## Local build

```sh
docker buildx build --platform linux/amd64 -f infra/hyperframes-lambda/Dockerfile -t hyperframes-lambda:dev .
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

The script builds the x86_64 image, pushes to ECR, and updates the Lambda function code. First-time setup can use `npm run hyperframes:bootstrap`, or create the function manually via the AWS console or CLI:

```sh
aws lambda create-function \
  --function-name "$HYPERFRAMES_FUNCTION_NAME" \
  --package-type Image \
  --code "ImageUri=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$HYPERFRAMES_ECR_REPO:latest" \
  --architectures x86_64 \
  --memory-size 3008 \
  --timeout 300 \
  --role "arn:aws:iam::$AWS_ACCOUNT_ID:role/bragfast-hyperframes-render"
```

## IAM

The Lambda role only needs CloudWatch Logs write permissions. R2 upload happens via the presigned URL (no AWS credentials required at the Lambda).

## Notes

- Chrome-for-Testing is only available for Linux x86_64, so this image and Lambda must stay on x86_64.
- Handler sets `HOME=/tmp` so Hyperframes can write scratch files (Lambda's only writable filesystem).
- Chromium + ffmpeg shared-lib coverage in the Dockerfile is best-effort. If you see "shared library not found" errors after deploy, run `ldd $(which chromium)` in the container and `dnf install` the missing packages.
