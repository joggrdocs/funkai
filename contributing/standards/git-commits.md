# Commit Standards

## Overview

All commits follow [Conventional Commits](https://www.conventionalcommits.org/) for a clear, structured history that enables automated versioning and changelog generation via Changesets. Every commit message must include a type, an optional scope, and a concise description in the imperative mood.

## Rules

### Follow Conventional Commits Format

Every commit message uses the format `type(scope): description`. The type indicates the category of change, the scope identifies the affected area, and the description starts with a lowercase verb in present tense.

| Type       | Description      | Usage                     |
| ---------- | ---------------- | ------------------------- |
| `feat`     | New feature      | User-facing functionality |
| `fix`      | Bug fix          | Fixes broken behavior     |
| `docs`     | Documentation    | Only doc changes          |
| `refactor` | Code refactoring | No behavior change        |
| `test`     | Add/update tests | Test files only           |
| `chore`    | Maintenance      | Build, deps, config       |
| `perf`     | Performance      | Optimization              |
| `style`    | Code style       | Formatting, no logic      |
| `ci`       | CI/CD            | Workflow changes          |
| `deps`     | Dependencies     | Dependency updates        |
| `revert`   | Revert           | Undo previous commit      |

#### Correct

```bash
git commit -m "feat(packages/agents): add workflow step builder"
git commit -m "fix(packages/prompts): resolve template partial resolution"
git commit -m "docs: add contributing guidelines"
git commit -m "chore(deps): update zod to 4.3.6"
```

#### Incorrect

```bash
# Missing type
git commit -m "add step builder"

# Vague description
git commit -m "fix: fix bug"

# Past tense
git commit -m "feat(packages/agents): added workflow support"
```

### Use Correct Scopes

Scopes identify what part of the codebase changed. Use directory-style paths for packages and short labels for cross-cutting concerns.

| Scope              | Description                     |
| ------------------ | ------------------------------- |
| `packages/agents`  | The agents SDK package          |
| `packages/prompts` | The prompts SDK package         |
| `deps`             | Dependency updates              |
| `ci`               | CI/CD workflow changes          |
| `tooling`          | Workspace/monorepo config       |
| `workspace`        | Root workspace changes          |

#### Correct

```bash
git commit -m "feat(packages/agents): add parallel step execution"
git commit -m "chore(deps): update typescript to 5.9.3"
git commit -m "chore(ci): add release workflow"
git commit -m "chore(tooling): update turbo.json pipeline"
```

### Mark Breaking Changes

Breaking changes must include `!` after the scope and a `BREAKING CHANGE:` footer. Mark as breaking when removing or renaming public APIs or changing config schema.

#### Correct

```bash
git commit -m "feat(packages/agents)!: change agent config schema

BREAKING CHANGE: hooks field renamed from 'callbacks' to 'hooks'"
```

### Include Body and Footer When Needed

Use the body to explain why the change was made and what problem it solves. Use the footer for issue references, co-authors, and breaking change descriptions.

#### Correct

```bash
git commit -m "refactor(packages/agents): extract step builder into lib/

Step building logic was duplicated between agent and workflow modules.
This extracts it into a shared module for consistency.

Refs #42"
```

### Make Atomic Commits

Each commit should represent one logical change, build and pass checks independently, and be revertable without side effects.

#### Correct

```bash
git commit -m "feat(packages/agents): add tool result streaming"
git commit -m "test(packages/agents): add tool streaming tests"
git commit -m "docs: document tool streaming"
```

#### Incorrect

```bash
# Multiple unrelated changes in one commit
git commit -m "feat: add streaming and fix config bug and update docs"
```

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)

## References

- [Git Pull Requests](./git-pulls.md)
