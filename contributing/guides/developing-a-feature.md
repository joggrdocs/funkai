# Develop a Feature

Ship a feature end-to-end: branch, code, test, changeset, PR, and merge.

## Prerequisites

- Local environment set up (see [Getting Started](./getting-started.md))
- Familiarity with relevant [contributing standards](../README.md)

## Steps

### 1. Create a branch

Start from an up-to-date `main` branch:

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

Use Conventional Commits-style branch naming: `feat/`, `fix/`, `docs/`, `refactor/`, `chore/`, etc.

### 2. Make changes

Follow the coding standards:

- `const` only -- no `let`, no mutation
- No classes, loops, or `any`
- Prefer returning errors as values with `attempt()` and Result tuples
- Prefer pure functions, composition, and `es-toolkit` utilities
- Use `ts-pattern` for multi-branch conditionals

See the [TypeScript standards](../standards/typescript/coding-style.md) and [error handling standards](../standards/typescript/errors.md) for details.

### 3. Run checks frequently

Run the check suite as you work to catch issues early:

```bash
pnpm typecheck && pnpm build
```

Format code:

```bash
pnpm format
```

### 4. Write tests

Add or update tests for changed code:

```bash
pnpm test
```

Or for a specific package:

```bash
pnpm test --filter=@funkai/agents
```

### 5. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
git commit -m "feat(packages/agents): add parallel step execution"
```

Format: `type(scope): description` -- see [Commit Standards](../standards/git-commits.md) for types, scopes, and examples.

### 6. Add a changeset

If the change affects published packages (`@funkai/agents`, `@funkai/prompts`), create a changeset:

```bash
pnpm changeset
```

Follow the prompts to select the package, semver bump type (patch, minor, major), and write a summary. Commit the generated `.changeset/*.md` file with your other changes.

**When to add a changeset:**

- New features, bug fixes, or breaking changes to `@funkai/agents` or `@funkai/prompts`

**When to skip:**

- Docs-only changes, CI updates, internal tooling, contributing docs

Check pending changesets:

```bash
pnpm changeset status
```

### 7. Push and open a PR

```bash
git push -u origin feat/my-feature
```

Open a PR against `main`. Use the same `type(scope): description` format for the PR title and include these sections in the description:

```markdown
## Summary

Brief description of changes (2-3 sentences).

## Changes

- Bullet list of specific changes

## Testing

1. Step-by-step testing instructions
2. Expected behavior

## Related Issues

Closes #123
```

See [Pull Request Standards](../standards/git-pulls.md) for the full review and merge process.

### 8. Address review feedback

Respond to review comments within 24 hours. Make fixup commits and push:

```bash
git commit -m "fix(packages/agents): address review feedback"
git push
```

### 9. Merge

After approval and green CI, use **Squash and Merge**. The Changesets bot handles versioning and npm publishing on merge to main.

## Verification

Before requesting review, confirm:

1. `pnpm typecheck && pnpm build && pnpm test` all pass
2. PR title follows `type(scope): description` format
3. Changeset included if the change affects published packages

## Troubleshooting

### Changeset confusion

**Issue:** Unsure whether a changeset is needed or what state it is in.

**Fix:**

```bash
pnpm changeset status
```

This shows all pending changesets and which packages they affect.

### Merge conflicts

**Issue:** PR cannot be merged due to conflicts with `main`.

**Fix:**

```bash
git fetch origin
git rebase origin/main
# Resolve conflicts
git push --force-with-lease
```

## References

- [Getting Started](./getting-started.md)
- [Commit Standards](../standards/git-commits.md)
- [Pull Request Standards](../standards/git-pulls.md)
- [Coding Style](../standards/typescript/coding-style.md)
- [Errors](../standards/typescript/errors.md)
