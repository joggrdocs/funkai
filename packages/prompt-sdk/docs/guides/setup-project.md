# Setup Prompt Development

## Prerequisites

- Node 22
- pnpm workspace

## Steps

1. Install:

```bash
pnpm add @pkg/prompts-sdk --workspace
```

2. Run interactive setup:

```bash
prompts setup
```

Or configure manually (steps 3-6).

3. Add VSCode file association in `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.prompt": "markdown"
  }
}
```

4. Add `.prompts/client/` to `.gitignore`.

5. Add `~prompts` path alias to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "~prompts": ["./.prompts/client/index.ts"]
    }
  }
}
```

6. Add generate script to `package.json`:

```json
{
  "scripts": {
    "prompts:generate": "prompts generate --out .prompts/client --roots prompts src/agents"
  }
}
```

## Verification

Run `prompts generate` and verify `.prompts/client/` directory is created with an `index.ts`.

## Troubleshooting

### VSCode not highlighting `.prompt` files

**Fix:** Check `.vscode/settings.json` file association is set correctly.

### TypeScript can't resolve `~prompts`

**Fix:** Verify `tsconfig.json` paths alias points to `./.prompts/client/index.ts`.

## References

- [CLI Commands](../cli/commands.md)
- [Overview](../overview.md)
