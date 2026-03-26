---
"@funkai/cli": minor
---

Support co-located partials via underscore naming convention

Files matching `_*.prompt` in `--includes` directories are now treated as co-located partials:
- Skipped during prompt discovery (no TypeScript module generated)
- Include base directories are added to the LiquidJS partial search path
- Resolvable via path-relative render tags (e.g. `{% render 'instructions/_core' %}`)

This enables co-locating partial fragments alongside full prompts without a separate `--partials` directory. Same-named partials in different directories are disambiguated by path.
