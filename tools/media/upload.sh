#!/usr/bin/env bash
# Uploads what `npm run build -- out` wrote to one nonprod environment's media container, as the signed-in az user
# (CI: the environment's deploy identity). Variants are immutable (a changed photo gets a new key), so browsers cache
# them for a year; content files for 5 minutes. Blobs removed from the repo stay in the container.
set -euo pipefail

env="${1:?Usage: upload.sh dev|test}"
account=storttbnonprodcentralus
container="media-$env"

az storage blob upload-batch --auth-mode login --account-name "$account" --destination "$container" \
  --source out/media --overwrite --only-show-errors \
  --content-type image/webp --content-cache-control 'public, max-age=31536000, immutable'

az storage blob upload-batch --auth-mode login --account-name "$account" --destination "$container" \
  --source out/content --destination-path content --overwrite --only-show-errors \
  --content-type application/json --content-cache-control 'public, max-age=300'

echo "Uploaded to https://$account.blob.core.windows.net/$container"
