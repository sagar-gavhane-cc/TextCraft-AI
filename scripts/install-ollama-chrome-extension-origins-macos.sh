#!/usr/bin/env bash
# Installs a LaunchAgent so OLLAMA_ORIGINS is set at every login (survives reboot).
# Required for Chrome extensions calling http://localhost:11434 (otherwise 403).
# After install: quit Ollama completely, then open the Ollama app again (or reboot).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.textrephraser.ollama-origins.plist"
SRC="${SCRIPT_DIR}/${PLIST_NAME}"
DEST="${HOME}/Library/LaunchAgents/${PLIST_NAME}"
UID_NUM="$(id -u)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer is for macOS only."
  exit 1
fi

if [[ ! -f "$SRC" ]]; then
  echo "Missing ${SRC}"
  exit 1
fi

mkdir -p "${HOME}/Library/LaunchAgents"
cp -f "$SRC" "$DEST"
chmod 644 "$DEST"

# Remove old registration if present (ignore errors)
launchctl bootout "gui/${UID_NUM}/com.textrephraser.ollama-origins" 2>/dev/null || true
launchctl unload "$DEST" 2>/dev/null || true

launchctl bootstrap "gui/${UID_NUM}" "$DEST"
launchctl enable "gui/${UID_NUM}/com.textrephraser.ollama-origins"
launchctl kickstart -k "gui/${UID_NUM}/com.textrephraser.ollama-origins" 2>/dev/null || true
sleep 0.3

echo "Installed: $DEST"
echo "OLLAMA_ORIGINS=$(launchctl getenv OLLAMA_ORIGINS || true)"
echo "Quit Ollama (menu bar) and reopen it once so it picks up OLLAMA_ORIGINS."
echo "To remove: launchctl bootout gui/${UID_NUM}/com.textrephraser.ollama-origins && rm \"$DEST\""
