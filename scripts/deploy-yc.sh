#!/usr/bin/env bash
set -euo pipefail

# Required configuration
: "${YC_OAUTH_TOKEN:?YC_OAUTH_TOKEN is required}"
: "${YC_CLOUD_ID:?YC_CLOUD_ID is required}"
: "${YC_FOLDER_ID:?YC_FOLDER_ID is required}"

APP_NAME="${APP_NAME:-crypto-analyzer}"
REGISTRY_NAME="${REGISTRY_NAME:-crypto-analyzer-registry}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="${IMAGE_NAME:-$APP_NAME}"
MEMORY="${MEMORY:-512MB}"
CORES="${CORES:-1}"
CONCURRENCY="${CONCURRENCY:-8}"
TIMEOUT="${TIMEOUT:-60s}"
ENV_FILE="${ENV_FILE:-./deploy.env}"

echo "Configuring yc profile..."
yc config set token "$YC_OAUTH_TOKEN" >/dev/null
yc config set cloud-id "$YC_CLOUD_ID" >/dev/null
yc config set folder-id "$YC_FOLDER_ID" >/dev/null

echo "Configuring Docker to use Yandex Container Registry..."
yc container registry configure-docker >/dev/null

echo "Ensuring registry exists: $REGISTRY_NAME"
if ! REGISTRY_JSON="$(yc container registry get --name "$REGISTRY_NAME" --format json 2>/dev/null)"; then
  REGISTRY_JSON="$(yc container registry create --name "$REGISTRY_NAME" --format json)"
fi

REGISTRY_ID="$(python3 - <<'PY' <<<"$REGISTRY_JSON"
import sys, json
print(json.load(sys.stdin)["id"])
PY
)"

REPO="cr.yandex/${REGISTRY_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building Docker image: ${REPO}"
sudo docker build -t "${REPO}" .

echo "Pushing image to Container Registry..."
sudo docker push "${REPO}"

echo "Ensuring service account exists..."
SA_NAME="${SA_NAME:-${APP_NAME}-sa}"
if ! SA_JSON="$(yc iam service-account get --name "$SA_NAME" --format json 2>/dev/null)"; then
  SA_JSON="$(yc iam service-account create --name "$SA_NAME" --format json)"
fi

SA_ID="$(python3 - <<'PY' <<<"$SA_JSON"
import sys, json
print(json.load(sys.stdin)["id"])
PY
)"

echo "Granting required roles to service account..."
yc resource-manager folder add-access-binding \
  --id "$YC_FOLDER_ID" \
  --role container-registry.images.puller \
  --service-account-id "$SA_ID" >/dev/null 2>&1 || true

yc resource-manager folder add-access-binding \
  --id "$YC_FOLDER_ID" \
  --role serverless.containers.invoker \
  --service-account-id "$SA_ID" >/dev/null 2>&1 || true

echo "Ensuring serverless container exists: $APP_NAME"
if ! yc serverless container get --name "$APP_NAME" >/dev/null 2>&1; then
  yc serverless container create --name "$APP_NAME" --folder-id "$YC_FOLDER_ID" >/dev/null
fi

echo "Preparing environment variables..."
ENV_ARGS=("--environment" "PORT=${PORT:-8000}" "--environment" "NODE_ENV=production")
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    ENV_ARGS+=("--environment" "$line")
  done < "$ENV_FILE"
fi

echo "Deploying new revision..."
yc serverless container revisions deploy \
  --container-name "$APP_NAME" \
  --image "$REPO" \
  --cores "$CORES" \
  --memory "$MEMORY" \
  --concurrency "$CONCURRENCY" \
  --execution-timeout "$TIMEOUT" \
  --service-account-id "$SA_ID" \
  "${ENV_ARGS[@]}" >/dev/null

yc serverless container allow-unauthenticated-invoke --name "$APP_NAME" >/dev/null 2>&1 || true

echo "Fetching endpoint..."
yc serverless container get --name "$APP_NAME" --format json | python3 - <<'PY'
import sys, json
data=json.load(sys.stdin)
print("Container:", data.get("name", ""))
print("URL:", data.get("url") or data.get("http_invoke_url") or "")
PY

echo "Done."

