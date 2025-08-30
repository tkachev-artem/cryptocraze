#!/usr/bin/env bash
set -euo pipefail

: "${YC_CLOUD_ID:?YC_CLOUD_ID is required}"
: "${YC_FOLDER_ID:?YC_FOLDER_ID is required}"

NAME="${NAME:-crypto-analyzer}"
ZONE="${ZONE:-ru-central1-a}"
CORES="${CORES:-2}"
MEMORY="${MEMORY:-4}"
DISK_SIZE="${DISK_SIZE:-20}"
SA_NAME="${SA_NAME:-crypto-analyzer-sa}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"
USER_DATA_FILE="${USER_DATA_FILE:-cloud-init.rendered.yaml}"
SECURITY_GROUP_ID="${SECURITY_GROUP_ID:-}"

echo "Resolving service account id..."
SA_ID=$(yc iam service-account get --name "$SA_NAME" --format json | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

echo "Creating VM $NAME in $ZONE..."
yc compute instance create \
  --name "$NAME" \
  --zone "$ZONE" \
  --cores "$CORES" --memory "$MEMORY" \
  --network-interface subnet-name=default-ru-central1-a,nat-ip-version=ipv4${SECURITY_GROUP_ID:+,security-group-ids=$SECURITY_GROUP_ID} \
  --create-boot-disk image-folder-id=standard-images,image-family=ubuntu-2204-lts,size="$DISK_SIZE" \
  --service-account-id "$SA_ID" \
  --metadata-from-file user-data="$USER_DATA_FILE" \
  ${SSH_KEY_PATH:+--ssh-key "$SSH_KEY_PATH"}

echo "VM creation requested. Use 'yc compute instance list' to check status."

