# Contributing to funkai

Thanks for your interest in contributing to funkai! This document covers the basics you need to get started.

For a more detailed walkthrough, see the [Getting Started Guide](contributing/guides/getting-started.md).

## Prerequisites

- [Node.js](https://nodejs.org/) >= 24.0.0
- [pnpm](https://pnpm.io/) 9.x (`corepack enable` to activate)

## Getting Started

1. Fork and clone the repo
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Make sure everything builds and passes checks:

   ```bash
   pnpm typecheck && pnpm test && pnpm build
   ```

## Development Workflow

### Available Commands

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `pnpm build`         | Build all packages (via Turborepo)  |
| `pnpm typecheck`     | Type check all packages             |
| `pnpm test`          | Run all tests (vitest)              |
| `pnpm lint`          | Lint all packages                   |
| `pnpm format`        | Format with OXFmt                   |
| `pnpm format:check`  | Check formatting                    |
| `pnpm changeset`     | Create changeset for versioning     |

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b my-change
   ```
2. Make your changes
3. Run the full check suite before committing:
   ```bash
   pnpm typecheck && pnpm test && pnpm build
   ```
4. Commit your changes (see [Commit Messages](#commit-messages))

For a complete walkthrough, see the [Developing a Feature](contributing/guides/developing-a-feature.md) guide.

## Testing

Tests use [Vitest](https://vitest.dev). Unit tests are colocated as `src/**/*.test.ts` within each package. Run all tests from the repo root:

```bash
pnpm test
```

Or run tests for a specific package:

```bash
pnpm test --filter=@funkai/agents
```

See the [Testing Standard](contributing/standards/typescript/testing.md) for test structure, mocking, and coverage expectations.

## Pull Requests

- Open PRs against the `main` branch
- Keep PRs focused -- one logical change per PR
- Include a clear description of **what** changed and **why**
- Make sure CI passes (typecheck, test, build)

See the [Pull Request Standard](contributing/standards/git-pulls.md) for title format, description template, and review process.

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs. If your change affects a published package, add a changeset:

```bash
pnpm changeset
```

Follow the prompts to select the package and semver bump type. The generated changeset file should be committed with your PR.

Not every PR needs a changeset -- skip it for docs-only changes, CI tweaks, or other non-published updates.

## Commit Messages

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): description`. See the [Commit Standards](contributing/standards/git-commits.md) for types, scopes, and examples.

Write clear, concise descriptions in the imperative mood ("add feature" not "added feature"). A short subject line is usually sufficient; add a body if the **why** isn't obvious from the diff.

## Project Structure

```
packages/
├── agents/          # @funkai/agents -- Workflow and agent orchestration framework
└── prompts/         # @funkai/prompts -- Prompt SDK with LiquidJS templating and Zod validation
```

For architectural context, see the [Architecture Concept](contributing/concepts/architecture.md) and [Tech Stack](contributing/concepts/tech-stack.md) docs.

## Code Style

- TypeScript, strict mode
- Formatting handled by [OXFmt](https://oxc.rs/) -- run `pnpm format` to auto-fix
- Prefer pure functions and immutable data
- Avoid classes, `let`, and imperative mutation where possible

See the [TypeScript standards](contributing/README.md#typescript) for detailed rules on naming, functions, design patterns, error handling, and more.

## Detailed Docs

For in-depth standards, architecture concepts, and step-by-step guides, see the [`contributing/`](contributing/README.md) directory. Key resources:

- **Standards** -- [TypeScript](contributing/README.md#typescript), [Git](contributing/README.md#git), [Documentation](contributing/README.md#documentation)
- **Concepts** -- [Architecture](contributing/concepts/architecture.md), [Tech Stack](contributing/concepts/tech-stack.md)
- **Guides** -- [Getting Started](contributing/guides/getting-started.md), [Developing a Feature](contributing/guides/developing-a-feature.md)

## Reporting Issues

Use [GitHub Issues](https://github.com/joggrdocs/funkai/issues) to report bugs or suggest features. When filing a bug, include:

- Steps to reproduce
- Expected vs actual behavior
- Node.js and pnpm versions
- Relevant error output

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
