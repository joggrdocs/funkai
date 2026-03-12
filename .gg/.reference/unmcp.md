# unmcp CLI Reference

`unmcp` is the unified CLI for Linear, GitHub, and Vercel operations. Always use `unmcp` instead of `gh`, `linear`, or `vercel` CLIs.

> **Note for GG skills:** Skills and agents should use `gg linear`, `gg github`, and `gg stack` commands instead of calling `unmcp` directly. The `gg` CLI wraps `unmcp-sdk` with enforced output paths to `.gg/projects/{slug}/`. Direct `unmcp` usage is only acceptable when the project slug is not yet known (e.g., initial Linear issue fetch during `/gg:new`).

## Global Options

| Flag                      | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| `--format json\|markdown` | Output format (default: `json`)                            |
| `-w, --write <path>`      | Write output to files (default: `.unmcp/linear/`)          |
| `--full`                  | Include full related data (e.g., all issues for a project) |

## Linear Commands

### Get Issue by ID

```bash
unmcp linear issue get --id <identifier>
```

`<identifier>` can be a Linear issue ID (e.g., `ENG-1234`) or a UUID.

### List Issues

```bash
unmcp linear issue list --team <team-key> --state <state> --assignee <id> --limit <n>
```

| Flag         | Description                     |
| ------------ | ------------------------------- |
| `--team`     | Filter by team key, name, or ID |
| `--state`    | Filter by state name            |
| `--assignee` | Filter by assignee ID           |
| `--limit`    | Number of results (default: 50) |

### Create Issue

```bash
unmcp linear issue create
```

### Update Issue

```bash
unmcp linear issue update <id>
```

### Comment on Issue

```bash
unmcp linear issue comment <id>
```

### Get Project

```bash
unmcp linear project get --id <project-id>
```

Use `--full` to include all issues in the project.

### List Projects

```bash
unmcp linear project list --team <team-key> --limit <n>
```

### Other Linear Commands

| Command               | Description                 |
| --------------------- | --------------------------- |
| `unmcp linear label`  | Issue label operations      |
| `unmcp linear status` | Workflow state operations   |
| `unmcp linear team`   | Team operations             |
| `unmcp linear whoami` | Current user info           |
| `unmcp linear check`  | Verify Linear configuration |

## GitHub Commands

### Pull Request Operations

#### Create PR

```bash
unmcp github pull create --title "<title>" --body "<body>" --draft --base main --head <branch> --label "<labels>"
```

| Flag      | Description                           |
| --------- | ------------------------------------- |
| `--title` | PR title (required)                   |
| `--body`  | PR body/description                   |
| `--base`  | Base branch (default: `main`)         |
| `--head`  | Head branch (default: current branch) |
| `--draft` | Create as draft                       |
| `--label` | Comma-separated labels                |

#### List PRs

```bash
unmcp github pull list --state open --author @me --label "<label>" --limit <n>
```

#### View PR

```bash
unmcp github pull view --pr-number <number>
```

#### Edit PR

```bash
unmcp github pull edit <pr-number> --title "<title>" --body "<body>" --add-label "<label>" --remove-label "<label>"
```

#### Other PR Commands

| Command                                  | Description                  |
| ---------------------------------------- | ---------------------------- |
| `unmcp github pull checkout <pr-number>` | Checkout a PR branch locally |
| `unmcp github pull checks [pr-number]`   | View CI check status         |
| `unmcp github pull diff [pr-number]`     | Get PR diff                  |
| `unmcp github pull comment`              | PR comment operations        |
| `unmcp github pull review`               | PR review operations         |

### Repository Operations

```bash
unmcp github repo view
```

### Other GitHub Commands

| Command               | Description                 |
| --------------------- | --------------------------- |
| `unmcp github run`    | Workflow run operations     |
| `unmcp github whoami` | Current user info           |
| `unmcp github check`  | Verify GitHub configuration |

## Output Format

All commands output JSON by default. Use `--format markdown` for human-readable output. Use `-w` to write results to files for later reference.

## Error Handling

If a command fails, check configuration first:

```bash
unmcp linear check
unmcp github check
```
