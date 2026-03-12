# Stacked Branches Reference

Agent-facing reference for managing stacked branches and PRs per phase.

## Detecting Stacked Mode

Use the gg CLI to check stack status:

```bash
gg stack status --project {slug}
```

If the command returns an error (no stack.json) or `stacked` is `false`, use single-branch mode. If `stacked` is `true`, follow the stacked workflow below.

## Branch Naming

Pattern: `<type>/<slug>-phase-<N>`

Examples:

- `feat/eng-1234-phase-0` (design phase, when DDD is active)
- `feat/eng-1234-phase-1`
- `feat/eng-1234-phase-2`
- `fix/auth-refactor-phase-1`

## Base Resolution

For each phase, the base branch is determined by the dependency graph:

1. Read the phase file frontmatter `depends_on` field
2. If `depends_on` has entries: base = branch of `depends_on[0]` (look up in `stack.json`)
3. If `depends_on` is empty or absent: base = `project_branch` from `stack.json`

Example: if phase 3 has `depends_on: [2]` and phase 2's branch is `feat/eng-1234-phase-2`, then phase 3's base is `feat/eng-1234-phase-2`.

## `stack.json` Schema (v3)

Location: `.gg/projects/{slug}/stack.json`

```json
{
  "version": 3,
  "stacked": true,
  "type": "feat",
  "base_branch": "main",
  "project_branch": "feat/eng-1234",
  "phases": [
    {
      "phase": 1,
      "pr_id": "pr-1"
    },
    {
      "phase": 2,
      "pr_id": null
    }
  ],
  "prs": [
    {
      "id": "pr-1",
      "pr_number": 42,
      "pr_url": "https://github.com/org/repo/pull/42",
      "pr_state": "open",
      "phases": [1],
      "base_branch": "feat/eng-1234",
      "head_branch": "feat/eng-1234-phase-1"
    }
  ]
}
```

> **Note:** Phase 0 (design phase) is only present when DDD is active. When DDD is `skip`, phases start at 1 and the first phase forks from `project_branch`.

### Stack fields

| Field            | Type              | Description                                              |
| ---------------- | ----------------- | -------------------------------------------------------- |
| `version`        | `number`          | Schema version (`3`)                                     |
| `stacked`        | `boolean`         | Whether stacked branches are enabled                     |
| `type`           | `string`          | Branch type prefix (`feat`, `fix`)                       |
| `base_branch`    | `string`          | Repository base branch (e.g., `main`)                    |
| `project_branch` | `string`          | Project-level branch                                     |

### Phase fields

| Field     | Type              | Description                                              |
| --------- | ----------------- | -------------------------------------------------------- |
| `phase`   | `number`          | Phase number (matches phase frontmatter)                 |
| `pr_id`   | `string \| null`  | Reference to a PR entry (null until PR created)          |

> **Derived fields:** Branch names (`{type}/{slug}-phase-{N}`) and base branches are derived from convention and the dependency graph at resolve time. They are not stored in `stack.json`.

### PR fields

| Field         | Type       | Description                                      |
| ------------- | ---------- | ------------------------------------------------ |
| `id`          | `string`   | Stable internal ID (e.g., `pr-1`)                |
| `pr_number`   | `number`   | GitHub PR number                                 |
| `pr_url`      | `string`   | GitHub PR URL                                    |
| `pr_state`    | `string`   | Lifecycle state: `open`, `closed`, `merged`, `conflict` |
| `phases`      | `number[]` | Phase numbers this PR covers (multi-phase support) |
| `base_branch` | `string`   | Base branch the PR targets                       |
| `head_branch` | `string`   | Head branch the PR is from                       |

### Multi-phase PRs

Smaller phases can be combined into a single PR. For example, phases 2 and 3 can share one PR:

```json
{
  "id": "pr-2",
  "pr_number": 44,
  "phases": [2, 3],
  "base_branch": "feat/eng-1234-phase-1",
  "head_branch": "feat/eng-1234-phase-3"
}
```

Both phase entries will have `pr_id: "pr-2"`.

## gg stack Commands

All stack operations go through the `gg stack` CLI:

| Command                                   | Description                                    |
| ----------------------------------------- | ---------------------------------------------- |
| `gg stack init --project {slug} --type {type}` | Initialize stack.json for a project       |
| `gg stack status --project {slug}`        | Show stack status with verified branch state   |
| `gg stack add {N} --project {slug}`       | Register a phase (no git branch)               |
| `gg stack branch {N} --project {slug}`    | Create a phase branch (JIT)                    |
| `gg stack checkout {N} --project {slug}`  | Switch to a phase branch                       |
| `gg stack pr --project {slug} --phases {N} --pr-number {n} --pr-url {url}` | Register a PR |
| `gg stack rebase {N} --project {slug}`    | Cascade rebase downstream phases               |
| `gg stack resolve {N} --project {slug}`   | Resolve branch/PR info for a phase             |
| `gg github pull create --project {slug}`  | Create a PR for a phase                        |
| `gg github pull edit {number}`            | Edit an existing PR                            |

## JIT Branch Creation

Branches are **not** created upfront during `/gg:plan`. Instead:

1. `/gg:plan` (project-level) → registers phases in stack.json via `gg stack add` (phase number only; branch/base are derived)
2. `/gg:execute <N>` → creates branch JIT via `gg stack branch` (derives branch name, creates git branch, pushes)

This avoids creating branches for phases that may be re-planned or dropped.

## Creating a Phase PR

Used by `gg:execute` when starting a phase:

```bash
# 1. Create branch (JIT, no-op if exists)
gg stack branch {N} --project {slug}

# 2. Switch to phase branch
gg stack checkout {N} --project {slug}

# 3. Create draft PR via gg github (read .gg/codebase/development.md for type/scope)
gg github pull create --project {slug} \
  --title "{phase-name}" \
  --type {type} \
  --scope {scope} \
  --phase {N} \
  --head {phase-branch} \
  --base {base-branch} \
  --draft \
  --generate-body

# 4. Register PR in stack (use pr_number and pr_url from response)
gg stack pr --project {slug} --phases {N} --pr-number {number} --pr-url {url}
```

## Checkpoint (Stacked Mode)

When `stack.json` has `stacked: true`, checkpoint behavior changes:

1. **Ensure correct branch**: before staging, verify you're on the correct phase branch

   ```bash
   gg stack checkout {N} --project {slug}
   ```

2. **Stage and commit**: same as normal (see `checkpoint.md`)
3. **Push to phase branch**: `git push origin <phase-branch>` (NOT the project branch)

## Cascade Rebase

When a phase's base changes (e.g., after a merge), rebase the phase and all downstream:

```bash
gg stack rebase {N} --project {slug}
```

This automatically:
- Rebases phase N onto its base branch
- Walks the dependency graph and rebases all downstream phases in order
- Aborts and marks PR as `conflict` if a rebase fails
- Returns to the original branch when done

## PR State Tracking

PR states track the lifecycle:

| State      | Description                                  |
| ---------- | -------------------------------------------- |
| `open`     | PR is open and active                        |
| `closed`   | PR was closed without merging                |
| `merged`   | PR has been merged                           |
| `conflict` | PR has merge conflicts needing resolution    |

The `conflict` state is set automatically during `gg stack rebase` when a rebase fails. This helps skills detect when a session was interrupted mid-rebase and recovery is needed.

## PR Body Format

When using `--generate-body` with `gg github pull create`, the CLI auto-generates a PR body that includes:

1. **Stack map** — a gitGraph (Mermaid) diagram showing the relationship between phase branches and the merge order
2. **Phase badges** — status badges for each phase in the stack (e.g., `draft`, `open`, `merged`) with links to their respective PRs

The generated body provides reviewers with context about where this phase fits in the overall stack. The body is regenerated and updated on subsequent `gg github pull edit` calls to keep the stack map current as phases are merged.

## Root PR

The root PR targets the repository's base branch (e.g., `main`) from the project branch. It uses a **merge-last** strategy:

1. Phase PRs are merged sequentially into their base branches (following the dependency graph)
2. After all phase PRs are merged, the root PR is merged last — bringing all changes into the base branch

The root PR body contains the full stack map and is kept up-to-date as phase PRs are merged.

## Adopting Stacking on Existing Projects

For projects that started without stacking:

1. Initialize: `gg stack init --project {slug} --stacked --type feat`
2. Register phases: `gg stack add {N} --project {slug}` per phase
3. Create branches as needed: `gg stack branch {N} --project {slug}`
