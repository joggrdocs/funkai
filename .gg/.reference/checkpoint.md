# Checkpoint Reference

A **gg checkpoint** is a git-based save point in the gg workflow. It stages, commits, and pushes your work so progress is preserved across sessions, crashes, and tool restarts.

> **Not the same as Claude Code's checkpointing.** Claude Code has its own in-memory file-state snapshots for `/rewind`. A gg checkpoint is a **permanent git commit** — it works in any AI coding tool (Claude Code, Cursor, Windsurf, Open Code) and survives beyond the session.

## How It Works

During a phase, skills call `gg checkpoint save` after each meaningful step (research, planning, execution waves). These are incremental save points on the phase branch.

When a phase is complete, `gg checkpoint squash` collapses all those commits into a single atomic commit. The squash commit is tagged with a `gg:squash` trailer so future `gg checkpoint log` calls know where the last squash boundary is.

```
phase branch (during work):
  c1 → c2 → c3 → c4 → c5    ← incremental checkpoints

phase branch (after squash):
  c1                          ← single atomic commit (gg:squash)

main (after merge):
  ...existing... → phase-1 → phase-2 → phase-3
                   (squashed)  (squashed)  (squashed)
```

## Commands

### `gg checkpoint save` — save progress

```bash
gg checkpoint save "<message>" <files...>
```

Stages the listed files, commits with the message, and pushes. Auto-push is on by default; use `--no-push` to skip.

```bash
# After research
gg checkpoint save "feat: research phase 2 for ENG-1234" .gg/projects/ENG-1234/research.md

# After execution wave
gg checkpoint save "feat(apps/api): add user profile endpoints" src/routes/user.ts src/models/user.ts

# Save without pushing
gg checkpoint save "wip: partial implementation" src/lib/auth.ts --no-push
```

Output:

```json
{ "ok": true, "commit": "abc1234", "pushed": true, "squashed": false }
```

### `gg checkpoint squash` — finalize phase

```bash
gg checkpoint squash "<message>"
```

Soft-resets to the merge base with main, commits everything as a single commit with a `gg:squash` trailer, and force-pushes (with lease). All changes since branching are included.

```bash
# Squash all phase work into one commit
gg checkpoint squash "feat: phase 2 — api-endpoints"

# Squash against a different base branch (e.g., stacked branches)
gg checkpoint squash "feat: phase 3 — auth system" --base feat/ENG-1234/phase-2
```

Output:

```json
{ "ok": true, "commit": "def5678", "pushed": true, "squashed": true }
```

The resulting commit message:

```
feat: phase 2 — api-endpoints

gg:squash
```

### `gg checkpoint log` — view commits since last squash

```bash
gg checkpoint log
```

Returns all commits since the last squash checkpoint. If no squash has happened, falls back to commits since the merge-base with main.

```bash
# Default — find boundary automatically
gg checkpoint log

# Specify base branch for fallback
gg checkpoint log --base develop
```

Output:

```json
{
  "since": "squash",
  "base_commit": "abc1234",
  "commits": [
    { "hash": "def5678", "message": "feat: add auth middleware", "date": "2026-02-11T10:00:00Z" },
    { "hash": "ghi9012", "message": "feat: add user routes", "date": "2026-02-11T11:00:00Z" }
  ]
}
```

The `since` field tells you whether the boundary was a previous squash (`"squash"`) or the branch point (`"branch"`). Use this to generate a holistic squash message from the individual commits.

## When to Checkpoint

| Event               | Who           | Command                |
| ------------------- | ------------- | ---------------------- |
| Discussion complete | `gg:discuss`  | `gg checkpoint save`   |
| Research complete   | `gg:research` | `gg checkpoint save`   |
| Plan finalized      | `gg:plan`     | `gg checkpoint save`   |
| Task wave complete  | `gg:execute`  | `gg checkpoint save`   |
| Verification passed | `gg:verify`   | `gg checkpoint save`   |
| Phase complete      | Orchestrator  | `gg checkpoint squash` |

Individual executor agents do **not** checkpoint. The orchestrating skill handles all git operations after each wave.

## Squash Workflow

When finalizing a phase, the agent should:

1. Run `gg checkpoint log` to get all commits since the last squash
2. Synthesize a holistic commit message from the log entries + phase context
3. Run `gg checkpoint squash "<holistic message>"` to collapse into one commit

This keeps the branch history clean — one commit per phase on main.

## Commit Message Format

Follow conventional commits (`docs/standards/git-commits.md`):

```
type(scope): description
```

### Examples

```bash
# Incremental checkpoints
gg checkpoint save "feat(.gg): scaffold project plan for ENG-1234" .gg/projects/ENG-1234/
gg checkpoint save "feat(apps/api): add user profile endpoints" src/routes/user.ts

# Phase squash
gg checkpoint squash "feat: phase 2 — api-endpoints"
```

## Dirty Working Tree (Resumption)

Used by `gg:execute` on entry to detect uncommitted changes from interrupted sessions:

```bash
git status --porcelain
```

If output is non-empty, the working tree is dirty. Prompt the user to checkpoint, discard, or abort.

## Draft PRs

When a project slug is available, use `gg` commands:

```bash
# Create (writes to .gg/projects/{slug}/github/pulls/)
gg github pull create --project {slug} --title "<title>" --head <branch> --draft

# View
gg github pull view <number>
```

For operations not yet wrapped by `gg`, use `unmcp` directly:

```bash
# List PRs
unmcp github pull list --author @me --state open

# Edit PR
unmcp github pull edit <pr-number> --title "<new title>" --body "<new body>"
unmcp github pull edit <pr-number> --add-label "ready-for-review"
```

**Note:** `unmcp github pull edit` does not have a `--draft` flag to toggle draft status. To mark a PR as ready for review, use label conventions or inform the user to manually mark it ready on GitHub.

## Branch Naming

Use the project slug as the branch name prefix:

```
<type>/<slug>
```

Examples:

- `feat/ENG-1234`
- `fix/auth-refactor`
- `chore/cleanup-migrations`

## Stacked Branches

When `stack.json` has `stacked: true`, checkpoint behavior changes:

### Ensure Correct Branch

Before staging, verify you're on the correct phase branch:

```bash
CURRENT=$(git branch --show-current)
EXPECTED="<phase-branch from stack.json>"
if [ "$CURRENT" != "$EXPECTED" ]; then
  git checkout "$EXPECTED"
fi
```

### Push Target

Push to the **phase branch**, not the project branch:

```bash
git push origin <phase-branch>
```

### Squash in Stacked Mode

When squashing in stacked mode, use `--base` to squash against the parent branch (which may be another phase branch, not main):

```bash
gg checkpoint squash "feat: phase 3 — auth" --base feat/ENG-1234/phase-2
```

### PR Creation

Draft PRs are created during `/gg:execute`, not during checkpoint. Checkpoints only push — they do not create or update PRs.

### stack.json

After any checkpoint that modifies `stack.json` (e.g., recording a new PR number), include `stack.json` in the staged files.

> For full stacked branch reference, see `stacked-branches.md`.
