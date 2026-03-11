#!/usr/bin/env bash
#
# Publish the initial 0.1.0 release of all @funkai packages to npm.
# Uses npm trusted publishing (OIDC provenance) when available,
# falls back to local npm auth.
#
# Run from repo root: ./scripts/initial-release.sh
#

set -euo pipefail

echo "Building all packages..."
pnpm build

echo ""
echo "Publishing @funkai/prompts@0.1.0..."
pnpm --filter @funkai/prompts publish --access public --no-git-checks

echo ""
echo "Publishing @funkai/agents@0.1.0..."
pnpm --filter @funkai/agents publish --access public --no-git-checks

echo ""
echo "Publishing @funkai/cli@0.1.0..."
pnpm --filter @funkai/cli publish --access public --no-git-checks

echo ""
echo "Done. All packages published."
echo "Subsequent releases will be handled by changesets via CI."
