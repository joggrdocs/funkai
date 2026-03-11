# Get Started Contributing

Set up your local environment to contribute to funkai.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24.0.0
- [pnpm](https://pnpm.io/) 9.x (`corepack enable` to activate)
- [Git](https://git-scm.com/)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (optional but recommended)

## Steps

### 1. Fork and clone

```bash
gh repo fork joggrdocs/funkai --clone
cd funkai
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Verify the build

Run the full check suite to confirm everything works:

```bash
pnpm typecheck && pnpm build
```

### 4. Run tests

```bash
pnpm test
```

### 5. Understand the project

Read the project docs in this order:

1. `AGENTS.md` -- tech stack, project structure, available commands
2. [`contributing/concepts/architecture.md`](../concepts/architecture.md) -- package ecosystem, design principles, data flow
3. [`contributing/concepts/tech-stack.md`](../concepts/tech-stack.md) -- tools, libraries, and design rationale
4. Relevant standards in `contributing/standards/` as needed
5. Package docs: [`@funkai/agents`](/agents/) and [`@funkai/prompts`](/prompts/)

### 6. Set up Claude Code (optional)

The repo includes built-in configuration for Claude Code:

| File                    | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `AGENTS.md`             | Persona, project structure, tech stack, commands |
| `CLAUDE.md`             | Symlink to `AGENTS.md`                           |
| `.claude/settings.json` | Claude Code settings and hooks                   |

## Verification

Confirm all checks pass:

```bash
pnpm typecheck && pnpm build
pnpm test
```

## Troubleshooting

### pnpm not found

**Issue:** Running `pnpm` returns "command not found."

**Fix:**

```bash
corepack enable
```

### Lockfile mismatch after switching branches

**Issue:** Build or install fails after checking out a different branch.

**Fix:**

```bash
pnpm install
```

## References

- [Architecture](../concepts/architecture.md)
