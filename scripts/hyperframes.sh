#!/usr/bin/env bash
# Wrapper for the HyperFrames CLI.
#
# This machine has no system-wide FFmpeg, so `npx hyperframes ...` fails its
# environment check unless the project-local portable build is on PATH.
# Prefer this wrapper over calling `npx hyperframes` directly.
#
# Usage: bash scripts/hyperframes.sh <hyperframes args...>
#   bash scripts/hyperframes.sh doctor
#   bash scripts/hyperframes.sh check
#   bash scripts/hyperframes.sh render
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ffmpeg_bin="$project_root/.tools/ffmpeg/bin"

if [[ -d "$ffmpeg_bin" ]]; then
  export PATH="$ffmpeg_bin:$PATH"
fi

exec npx --yes hyperframes "$@"
