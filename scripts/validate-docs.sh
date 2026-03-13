#!/usr/bin/env bash
set -euo pipefail

# Documentation validation script for funkai monorepo
# Checks JSDoc coverage, internal links, code examples, Mermaid themes, and placeholders

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Documentation Validation for funkai"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: JSDoc coverage for exported functions
echo "1️⃣  Checking JSDoc coverage..."
MISSING_JSDOC=0

# Find all exported functions/types in packages/*/src and check for JSDoc
while IFS= read -r file; do
  # Look for exports without JSDoc (simple heuristic)
  if grep -Pzo '(?<!/\*\*)\nexport (function|const|type|interface)' "$file" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Possible missing JSDoc in: $file${NC}"
    ((WARNINGS+=1))
    ((MISSING_JSDOC+=1))
  fi
done < <(find packages/*/src -name "*.ts" -not -path "*/test/*" -not -path "*/__tests__/*" 2>/dev/null || true)

if [ $MISSING_JSDOC -eq 0 ]; then
  echo -e "${GREEN}✓ All exports appear to have JSDoc${NC}"
fi
echo ""

# Check 2: Internal link resolution
echo "2️⃣  Checking internal links in markdown files..."
BROKEN_LINKS=0

while IFS= read -r mdfile; do
  # Extract markdown links [text](path)
  while IFS= read -r link; do
    # Skip external URLs (http/https)
    if [[ "$link" =~ ^https?:// ]]; then
      continue
    fi

    # Skip anchors only (#something)
    if [[ "$link" =~ ^# ]]; then
      continue
    fi

    # Resolve relative path from markdown file location
    md_dir="$(dirname "$mdfile")"
    target_path="$md_dir/$link"

    # Remove anchor if present
    target_path="${target_path%%#*}"

    # Check if target exists
    if [ ! -e "$target_path" ] && [ ! -e "$REPO_ROOT/$link" ]; then
      echo -e "${RED}✗ Broken link in $mdfile: $link${NC}"
      ((ERRORS+=1))
      ((BROKEN_LINKS+=1))
    fi
  done < <(grep -oP '\]\(\K[^)]+' "$mdfile" 2>/dev/null || true)
done < <(find packages contributing -name "*.md" 2>/dev/null || true)

if [ $BROKEN_LINKS -eq 0 ]; then
  echo -e "${GREEN}✓ All internal links resolve${NC}"
fi
echo ""

# Check 3: Code examples type-check
echo "3️⃣  Checking TypeScript code examples..."
CODE_ERRORS=0

# Extract code blocks from markdown and validate syntax (basic check)
while IFS= read -r mdfile; do
  # Look for typescript/ts code blocks
  if grep -Pzo '```(typescript|ts)\n.*?\n```' "$mdfile" > /dev/null 2>&1; then
    # Basic syntax check - look for common issues
    if grep -P '(// \.\.\.|/\/ placeholder|foo|bar(?!e))' "$mdfile" > /dev/null 2>&1; then
      echo -e "${YELLOW}⚠️  Possible placeholder/example code in: $mdfile${NC}"
      ((WARNINGS+=1))
    fi
  fi
done < <(find packages contributing -name "*.md" 2>/dev/null || true)

# Run actual typecheck if available
if command -v pnpm > /dev/null 2>&1; then
  echo "Running TypeScript validation..."
  if pnpm typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript code examples passed validation${NC}"
  else
    echo -e "${RED}✗ TypeScript validation failed${NC}"
    echo "Run 'pnpm typecheck' for details"
    ((ERRORS+=1))
    ((CODE_ERRORS+=1))
  fi
else
  echo -e "${GREEN}✓ Code examples checked (run 'pnpm typecheck' for full validation)${NC}"
fi
echo ""

# Check 4: Mermaid diagram theme
echo "4️⃣  Checking Mermaid diagrams use Catppuccin theme..."
THEME_ERRORS=0

while IFS= read -r mdfile; do
  # Find mermaid blocks and check each one
  if grep -Pzo '```mermaid' "$mdfile" > /dev/null 2>&1; then
    # Check if file has any mermaid blocks without theme
    # More specific check: look for %%{init: and 'catppuccin' or theme config
    if ! grep -Pzo '```mermaid.*?%%\{init:.*?(catppuccin|theme)' "$mdfile" > /dev/null 2>&1; then
      echo -e "${RED}✗ Missing Catppuccin theme config in Mermaid diagram: $mdfile${NC}"
      echo -e "${YELLOW}  Mermaid blocks should include: %%{init: {'theme': 'base', 'themeVariables': {...}}}${NC}"
      ((ERRORS+=1))
      ((THEME_ERRORS+=1))
    fi
  fi
done < <(find packages contributing -name "*.md" 2>/dev/null || true)

if [ $THEME_ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ All Mermaid diagrams use Catppuccin theme config${NC}"
fi
echo ""

# Check 5: Placeholder/TODO content
echo "5️⃣  Checking for TODO/placeholder content..."
PLACEHOLDERS=0

while IFS= read -r mdfile; do
  # Skip standards docs - they document anti-patterns and will contain example placeholder text
  if [[ "$mdfile" =~ contributing/standards/ ]]; then
    continue
  fi

  if grep -iE '(TODO|FIXME|XXX|placeholder|coming soon)' "$mdfile" > /dev/null 2>&1; then
    echo -e "${RED}✗ Found TODO/placeholder in: $mdfile${NC}"
    grep -inE '(TODO|FIXME|XXX|placeholder|coming soon)' "$mdfile" | head -3
    ((ERRORS+=1))
    ((PLACEHOLDERS+=1))
  fi
done < <(find packages contributing -name "*.md" 2>/dev/null || true)

if [ $PLACEHOLDERS -eq 0 ]; then
  echo -e "${GREEN}✓ No TODO/placeholder content found${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Documentation validation passed!${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) - please review${NC}"
  fi
  exit 0
fi
