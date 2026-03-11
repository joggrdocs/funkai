#!/usr/bin/env bash
#
# Reset all @funkai/* package versions to 0.1.0 for initial release.
# Run from repo root: ./scripts/reset-versions.sh
#

set -euo pipefail

VERSION="0.1.0"

PACKAGES=(
  "packages/agents/package.json"
  "packages/prompts/package.json"
  "packages/cli/package.json"
)

for pkg in "${PACKAGES[@]}"; do
  if [ ! -f "$pkg" ]; then
    echo "ERROR: $pkg not found"
    exit 1
  fi

  name=$(node -e "console.log(require('./$pkg').name)")
  old=$(node -e "console.log(require('./$pkg').version)")

  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
    pkg.version = '$VERSION';
    fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
  "

  echo "$name: $old -> $VERSION"
done

echo ""
echo "Done. Run 'pnpm install' to update the lockfile."
