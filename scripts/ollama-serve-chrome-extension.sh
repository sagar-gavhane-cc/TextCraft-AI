#!/usr/bin/env bash
# Ollama rejects browser/extension requests (403) unless the Origin is allowlisted.
# For a permanent fix on macOS (survives reboot), run:
#   ./scripts/install-ollama-chrome-extension-origins-macos.sh
# Run this script after quitting the Ollama menu bar app if port 11434 is already in use.
set -euo pipefail
export OLLAMA_ORIGINS="${OLLAMA_ORIGINS:-chrome-extension://*}"
echo "OLLAMA_ORIGINS=$OLLAMA_ORIGINS"
exec ollama serve
