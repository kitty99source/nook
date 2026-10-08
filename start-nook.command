#!/bin/bash
cd "$(dirname "$0")" || exit 1
# A double-clicked Terminal window often misses nvm and Homebrew.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  if [ -d "$HOME/.nvm/versions/node" ]; then
    latest="$(ls -1 "$HOME/.nvm/versions/node" | tail -1)"
    export PATH="$HOME/.nvm/versions/node/$latest/bin:$PATH"
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node is not on the PATH. Install Node 24, then try again."
  exit 1
fi
exec node scripts/start.mjs
