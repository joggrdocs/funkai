---
"@funkai/config": minor
"@funkai/cli": minor
---

feat(cli): add funkai.config.ts support and interactive setup

- New `@funkai/config` package with `defineConfig()`, Zod schema, and `FunkaiConfig` type
- `funkai setup` is now interactive: select domains (prompts/agents), create `funkai.config.ts`, run domain-specific setup
- `funkai prompts generate` and `funkai prompts lint` now fall back to config when `--out`/`--roots` are omitted
- `funkai prompts create` defaults to first root from config when `--out` is omitted
- Config is loaded from the git root via kidd-cli's c12 integration
