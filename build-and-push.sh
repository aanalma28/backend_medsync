#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# MedSync backend - build & push to a PRIVATE Docker Hub repository.
#
# This script intentionally stores NO credentials. It assumes you have
# already run, once, in your local terminal:
#
#     docker login
#
# The credential is then kept by the Docker CLI itself (typically in
# ~/.docker/config.json or via a credential helper), not by this repository.
#
# Usage:
#   ./build-and-push.sh
#   IMAGE_TAG=v1.2.0 ./build-and-push.sh
#   DOCKERHUB_USER=acme IMAGE_NAME=medsync-backend ./build-and-push.sh
#
# Env vars (only DOCKERHUB_USER is required):
#   DOCKERHUB_USER  Docker Hub username / org       (required)
#   IMAGE_NAME      Repository name                 (default: medsync-backend)
#   IMAGE_TAG       Primary tag                     (default: git short SHA or UTC timestamp)
#   EXTRA_TAGS      Space-separated extra tags      (default: latest)
#   PLATFORMS       e.g. "linux/amd64,linux/arm64"  (default: native, docker build)
#   DOCKERFILE      Path to Dockerfile              (default: ./Dockerfile)
# ---------------------------------------------------------------------------
set -euo pipefail

# --- Configuration (NO secrets here) ---------------------------------------
DOCKERHUB_USER="${DOCKERHUB_USER:-}"
IMAGE_NAME="${IMAGE_NAME:-medsync-backend}"
DOCKERFILE="${DOCKERFILE:-./Dockerfile}"
PLATFORMS="${PLATFORMS:-}"
EXTRA_TAGS="${EXTRA_TAGS:-latest}"

if [[ -z "${DOCKERHUB_USER}" ]]; then
  echo "ERROR: DOCKERHUB_USER is not set." >&2
  echo "       Example: export DOCKERHUB_USER=your-dockerhub-username" >&2
  exit 1
fi

# --- Derive a version tag if one was not supplied --------------------------
if [[ -z "${IMAGE_TAG:-}" ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    IMAGE_TAG="$(git describe --tags --always --dirty 2>/dev/null || git rev-parse --short HEAD)"
  else
    IMAGE_TAG="$(date -u +%Y%m%d-%H%M%S)"
  fi
fi

IMAGE_BASE="${DOCKERHUB_USER}/${IMAGE_NAME}"
PRIMARY_REF="${IMAGE_BASE}:${IMAGE_TAG}"

echo "==> Image base   : ${IMAGE_BASE}"
echo "==> Primary tag  : ${IMAGE_TAG}"
echo "==> Extra tags   : ${EXTRA_TAGS:-<none>}"
echo "==> Dockerfile   : ${DOCKERFILE}"
echo

# --- Sanity check: is the Docker daemon reachable? -------------------------
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not reachable. Is Docker running?" >&2
  exit 1
fi

# --- Friendly reminder about docker login (best-effort, never leaks creds) -
if ! grep -q "${DOCKERHUB_USER}" "${HOME}/.docker/config.json" 2>/dev/null \
   && ! docker info 2>/dev/null | grep -qi "Username"; then
  echo "NOTE: Could not confirm an existing 'docker login' for '${DOCKERHUB_USER}'."
  echo "      If the push fails with 'unauthorized', run: docker login"
  echo
fi

# --- Build (and optionally multi-arch push via buildx) ---------------------
TAG_ARGS=(-t "${PRIMARY_REF}")
for t in ${EXTRA_TAGS}; do
  [[ -n "${t}" ]] && TAG_ARGS+=(-t "${IMAGE_BASE}:${t}")
done

if [[ -n "${PLATFORMS}" ]]; then
  echo "==> Multi-platform build via buildx for: ${PLATFORMS}"
  docker buildx build \
    --platform "${PLATFORMS}" \
    --file "${DOCKERFILE}" \
    "${TAG_ARGS[@]}" \
    --push \
    .
  echo
  echo "==> Pushed (buildx):"
  for t in "${IMAGE_TAG}" ${EXTRA_TAGS}; do
    [[ -n "${t}" ]] && echo "    ${IMAGE_BASE}:${t}"
  done
  exit 0
fi

echo "==> Building image..."
docker build --pull --file "${DOCKERFILE}" "${TAG_ARGS[@]}" .

echo "==> Pushing image to the private Docker Hub repo..."
docker push "${PRIMARY_REF}"
for t in ${EXTRA_TAGS}; do
  [[ -n "${t}" ]] && docker push "${IMAGE_BASE}:${t}"
done

echo
echo "==> Done. Pushed:"
for t in "${IMAGE_TAG}" ${EXTRA_TAGS}; do
  [[ -n "${t}" ]] && echo "    ${IMAGE_BASE}:${t}"
done
