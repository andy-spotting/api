#!/usr/bin/env sh
set -e

echo $SERVICE_ACCOUNT | base64 -d > key.json
npm run $@
