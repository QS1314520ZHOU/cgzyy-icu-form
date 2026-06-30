#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-icu-stats-oel8-builder:latest}"
DOCKERFILE="${DOCKERFILE:-Dockerfile.oel8}"
OUTPUT_DIR="${OUTPUT_DIR:-dist-oel8}"
NODE_VERSION="${NODE_VERSION:-18.20.4}"
PLATFORM="${PLATFORM:-linux/amd64}"
CONTEXT_DIR="${CONTEXT_DIR:-.}"

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: 未找到 docker" >&2
  exit 1
fi

export DOCKER_BUILDKIT=1

rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

docker build \
  --platform "${PLATFORM}" \
  --file "${DOCKERFILE}" \
  --target artifact \
  --build-arg "NODE_VERSION=${NODE_VERSION}" \
  --output "type=local,dest=${OUTPUT_DIR}" \
  --progress=plain \
  "${CONTEXT_DIR}"

BIN_PATH="${OUTPUT_DIR}/icu-stats-oel8-x64"
[[ -f "${BIN_PATH}" ]] || { echo "ERROR: 未找到 ${BIN_PATH}"; exit 2; }
chmod +x "${BIN_PATH}"

ls -lh "${OUTPUT_DIR}"
file "${BIN_PATH}" || true
( cd "${OUTPUT_DIR}" && sha256sum icu-stats-oel8-x64 > icu-stats-oel8-x64.sha256 )

PKG_NAME="icu-stats-oel8-x64-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "${OUTPUT_DIR}/${PKG_NAME}" -C "${OUTPUT_DIR}" \
  icu-stats-oel8-x64 .env.example README-binary.md

echo "完成: ${OUTPUT_DIR}/${PKG_NAME}"
