---
"@funkai/cli": minor
---

Support co-located partials via underscore naming convention

Files matching `_*.prompt` in `--includes` directories are now treated as co-located partials:
- Skipped during prompt discovery (no TypeScript module generated)
- Automatically added to the LiquidJS partial search path
- Resolvable via `{% render '_name' %}` from any prompt in the same tree

This enables co-locating partial fragments alongside full prompts without a separate `--partials` directory.
