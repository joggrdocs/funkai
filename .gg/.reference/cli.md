# gg CLI Reference

All commands output JSON to stdout. Errors output `{ "error": "message" }` to stderr.

## State

### `gg state load`

Read the full state.json.

**Args:** none

**Output:**

```json
{ "active_project": "my-project" }
```

| Field            | Type             | Description                                          |
| ---------------- | ---------------- | ---------------------------------------------------- |
| `active_project` | `string \| null` | Currently active project slug, or `null` if none set |

---

### `gg state get <field>`

Get a single field from state.json.

**Args:**

| Arg     | Type     | Required | Description                         |
| ------- | -------- | -------- | ----------------------------------- |
| `field` | `string` | Yes      | Field name (e.g., `active_project`) |

**Output:**

```json
{ "value": "my-project" }
```

| Field   | Type      | Description                      |
| ------- | --------- | -------------------------------- |
| `value` | `unknown` | The value of the requested field |

---

### `gg state set <field> <value>`

Write a single field to state.json. The strings `null`, `true`, and `false` are parsed as their JSON equivalents.

**Args:**

| Arg     | Type     | Required | Description                                           |
| ------- | -------- | -------- | ----------------------------------------------------- |
| `field` | `string` | Yes      | Field name                                            |
| `value` | `string` | Yes      | Value to set (`null`, `true`, `false` parsed as JSON) |

**Output:**

```json
{ "ok": true }
```

---

## Project

### `gg project list`

List all projects. Alias: `gg project ls`.

**Args:** none

**Output:**

```json
{ "projects": ["eng-1234", "auth-refactor"] }
```

| Field      | Type       | Description                      |
| ---------- | ---------- | -------------------------------- |
| `projects` | `string[]` | Array of project directory names |

---

### `gg project resolve`

Resolve the active project using state, directory count, or ambiguity detection.

**Args:** none

**Output:**

```json
{ "project": "eng-1234", "source": "state" }
```

| Field        | Type                                           | Description                                                             |
| ------------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `project`    | `string \| null`                               | Resolved project slug, or `null` if none/ambiguous                      |
| `source`     | `"state" \| "single" \| "ambiguous" \| "none"` | How the project was resolved                                            |
| `candidates` | `string[]`                                     | _(only when `source` is `"ambiguous"`)_ List of candidate project slugs |

**Source values:**

- `state` -- `active_project` is set in state.json
- `single` -- only one project directory exists
- `ambiguous` -- multiple projects exist with no active selection
- `none` -- no project directories found

---

### `gg project get <slug> <file> [field]`

Get frontmatter from a project-level file (e.g., `plan.md`, `discussion.md`). If `field` is provided, returns only that field; otherwise returns all frontmatter data.

**Args:**

| Arg     | Type     | Required | Description                                  |
| ------- | -------- | -------- | -------------------------------------------- |
| `slug`  | `string` | Yes      | Project slug                                 |
| `file`  | `string` | Yes      | File name (e.g., `plan.md`, `discussion.md`) |
| `field` | `string` | No       | Specific frontmatter field to read           |

**Output (with field):**

```json
{ "value": "2025-01-15" }
```

**Output (without field):**

```json
{ "data": { "created": "2025-01-15", "updated_by": "gg:plan" } }
```

---

### `gg project set <slug> <file> <field> <value>`

Set a frontmatter field on a project-level file.

**Args:**

| Arg     | Type     | Required | Description                                  |
| ------- | -------- | -------- | -------------------------------------------- |
| `slug`  | `string` | Yes      | Project slug                                 |
| `file`  | `string` | Yes      | File name (e.g., `plan.md`, `discussion.md`) |
| `field` | `string` | Yes      | Frontmatter field name                       |
| `value` | `string` | Yes      | Value to set                                 |

**Output:**

```json
{ "ok": true }
```

---

### `gg project archive <slug> [--no-remove]`

Archive a project to `.gg/.archive/` as a zip file and clear `active_project` if it matches.

**Args:**

| Arg           | Type      | Required | Description                                                           |
| ------------- | --------- | -------- | --------------------------------------------------------------------- |
| `slug`        | `string`  | Yes      | Project slug to archive                                               |
| `--no-remove` | `boolean` | No       | Keep the source project directory after archiving (default: removed)  |

**Output:**

```json
{
  "ok": true,
  "slug": "eng-1234",
  "archive_path": "/path/to/.gg/.archive/eng-1234-2025-01-15T12-00-00.zip",
  "removed": false
}
```

| Field          | Type      | Description                              |
| -------------- | --------- | ---------------------------------------- |
| `ok`           | `boolean` | Whether the archive succeeded            |
| `slug`         | `string`  | Archived project slug                    |
| `archive_path` | `string`  | Absolute path to the created zip file    |
| `removed`      | `boolean` | Whether the source directory was deleted |

---

## Phase

### `gg phase find <project> <number>`

Find a phase file by project slug and phase number. Returns the relative path to the matching phase markdown file.

**Args:**

| Arg       | Type     | Required | Description  |
| --------- | -------- | -------- | ------------ |
| `project` | `string` | Yes      | Project slug |
| `number`  | `number` | Yes      | Phase number |

**Output:**

```json
{ "path": ".gg/projects/eng-1234/phases/02-auth-migration/phase.md" }
```

| Field  | Type             | Description                                             |
| ------ | ---------------- | ------------------------------------------------------- |
| `path` | `string \| null` | Relative path to the phase file, or `null` if not found |

---

### `gg phase status <project> <number>`

Get the status and metadata for a specific phase from its frontmatter.

**Args:**

| Arg       | Type     | Required | Description  |
| --------- | -------- | -------- | ------------ |
| `project` | `string` | Yes      | Project slug |
| `number`  | `number` | Yes      | Phase number |

**Output:**

```json
{
  "phase": 2,
  "name": "auth-migration",
  "step": "execute",
  "status": "running",
  "path": ".gg/projects/eng-1234/phases/02-auth-migration/phase.md"
}
```

| Field    | Type     | Description                                                                          |
| -------- | -------- | ------------------------------------------------------------------------------------ |
| `phase`  | `number` | Phase number                                                                         |
| `name`   | `string` | Phase name from frontmatter                                                          |
| `step`   | `string` | Phase step: `scaffold`, `discuss`, `research`, `plan`, `execute`, or `verify`        |
| `status` | `string` | Phase status: `pending`, `running`, `done`, `error`, or `skip`                       |
| `path`   | `string` | Relative path to the phase file                                                      |

---

### `gg phase get <project> <number> [field]`

Get phase frontmatter data or a specific field. If `field` is provided, returns only that field; otherwise returns all frontmatter data.

**Args:**

| Arg       | Type     | Required | Description                |
| --------- | -------- | -------- | -------------------------- |
| `project` | `string` | Yes      | Project slug               |
| `number`  | `number` | Yes      | Phase number               |
| `field`   | `string` | No       | Specific frontmatter field |

**Output (with field):**

```json
{ "value": "running" }
```

**Output (without field):**

```json
{ "data": { "phase": 2, "name": "auth-migration", "step": "execute", "status": "running" } }
```

---

### `gg phase state <project> <number> --step <step> --status <status>`

Set phase step and status atomically. Writes both fields in a single frontmatter update.

**Arguments:**

| Argument    | Type     | Required | Description                                                                   |
| ----------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `project`   | `string` | Yes      | Project slug                                                                  |
| `number`    | `number` | Yes      | Phase number                                                                  |
| `--step`    | `string` | Yes      | Phase step: `scaffold`, `discuss`, `research`, `plan`, `execute`, or `verify` |
| `--status`  | `string` | Yes      | Phase status: `pending`, `running`, `done`, `error`, or `skip`                |

**Examples:**

```bash
# Enter a new step
gg phase state my-project 2 --step execute --status running

# Complete the current step
gg phase state my-project 2 --step execute --status done

# Mark a step as errored
gg phase state my-project 2 --step execute --status error
```

**Output:**

```json
{ "ok": true }
```

---

### `gg phase list <project> [--eligible-for <step>]`

List all phases in a project with their current state, task counts, and eligibility information.

**Args:**

| Arg              | Type     | Required | Description                                                                          |
| ---------------- | -------- | -------- | ------------------------------------------------------------------------------------ |
| `project`        | `string` | Yes      | Project slug                                                                         |
| `--eligible-for` | `string` | No       | Filter to phases eligible for a specific step: `discuss`, `research`, `plan`, `execute`, `verify` |

**Output (without `--eligible-for`):**

```json
{
  "ok": true,
  "phases": [
    {
      "phase": 1,
      "name": "auth-migration",
      "step": "execute",
      "status": "running",
      "file": "phases/01-auth-migration/phase.md",
      "tasks_total": 5,
      "tasks_done": 2,
      "tasks_todo": 3,
      "eligible_for": ["verify"],
      "blocked_by": []
    }
  ]
}
```

| Field          | Type       | Description                                                                   |
| -------------- | ---------- | ----------------------------------------------------------------------------- |
| `ok`           | `boolean`  | Whether the command succeeded                                                 |
| `phases`       | `object[]` | Array of phase entries                                                        |
| `phase`        | `number`   | Phase number                                                                  |
| `name`         | `string`   | Phase name                                                                    |
| `step`         | `string`   | Current step: `scaffold`, `discuss`, `research`, `plan`, `execute`, `verify`  |
| `status`       | `string`   | Current status: `pending`, `running`, `done`, `error`, `skip`                 |
| `file`         | `string`   | Relative path to the phase file                                               |
| `tasks_total`  | `number`   | Total number of tasks (checkboxes) in the phase                               |
| `tasks_done`   | `number`   | Number of completed tasks                                                     |
| `tasks_todo`   | `number`   | Number of remaining tasks                                                     |
| `eligible_for` | `string[]` | Steps the phase is currently eligible to enter                                |
| `blocked_by`   | `number[]` | Phase numbers this phase depends on                                           |

**Output (with `--eligible-for`):**

```json
{
  "ok": true,
  "phases": [
    {
      "phase": 2,
      "name": "data-layer",
      "step": "plan",
      "status": "done",
      "file": "phases/02-data-layer/phase.md",
      "tasks_total": 3,
      "tasks_done": 0,
      "tasks_todo": 3,
      "eligible": true,
      "blocked_by": [],
      "reason": null
    }
  ]
}
```

| Field        | Type       | Description                                                                   |
| ------------ | ---------- | ----------------------------------------------------------------------------- |
| `ok`         | `boolean`  | Whether the command succeeded                                                 |
| `phases`     | `object[]` | Array of eligible phase entries (non-eligible phases are filtered out)         |
| `phase`      | `number`   | Phase number                                                                  |
| `name`       | `string`   | Phase name                                                                    |
| `step`       | `string`   | Current step: `scaffold`, `discuss`, `research`, `plan`, `execute`, `verify`  |
| `status`     | `string`   | Current status: `pending`, `running`, `done`, `error`, `skip`                 |
| `file`       | `string`   | Relative path to the phase file                                               |
| `tasks_total`| `number`   | Total number of tasks (checkboxes) in the phase                               |
| `tasks_done` | `number`   | Number of completed tasks                                                     |
| `tasks_todo` | `number`   | Number of remaining tasks                                                     |
| `eligible`   | `boolean`  | Whether the phase is eligible for the requested step (always `true` in output)|
| `blocked_by` | `number[]` | Phase numbers blocking this phase (empty when eligible)                       |
| `reason`     | `string \| null` | Explanation of ineligibility, or `null` when eligible                   |

---

## Validate

### `gg validate <project> [phase]`

Validate structural integrity of `plan.md` and phase files. Checks frontmatter fields, task ID consistency between plan and phase files, and status/checkbox mismatches.

**Args:**

| Arg       | Type     | Required | Description                                             |
| --------- | -------- | -------- | ------------------------------------------------------- |
| `project` | `string` | Yes      | Project slug                                            |
| `phase`   | `number` | No       | Phase number; if omitted, validates all phases + plan.md |

**Output:**

```json
{
  "ok": true,
  "validated": ["plan.md", "phases/01-auth-migration/phase.md"],
  "errors": [],
  "warnings": []
}
```

**Output (with errors and warnings):**

```json
{
  "ok": false,
  "validated": ["plan.md", "phases/01-auth-migration/phase.md"],
  "errors": [
    {
      "file": "phases/01-auth-migration/phase.md",
      "type": "missing_frontmatter",
      "message": "Missing required frontmatter field: \"step\""
    }
  ],
  "warnings": [
    {
      "file": "plan.md",
      "type": "status_mismatch",
      "message": "Task id=\"1.1\" is checked [x] in plan.md but status is \"todo\" in phase file"
    }
  ]
}
```

| Field      | Type       | Description                                       |
| ---------- | ---------- | ------------------------------------------------- |
| `ok`       | `boolean`  | `true` if no errors were found                    |
| `validated`| `string[]` | List of files that were validated                 |
| `errors`   | `object[]` | Array of validation errors                        |
| `warnings` | `object[]` | Array of validation warnings                      |

**Error/Warning fields:**

| Field     | Type     | Description                                                                                                                                      |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `file`    | `string` | File where the issue was found                                                                                                                   |
| `type`    | `string` | Error type: `missing_file`, `missing_phase`, `missing_frontmatter`, `invalid_value`, `duplicate_id`, `task_id_mismatch`, or `status_mismatch`    |
| `message` | `string` | Human-readable description of the issue                                                                                                          |

---

## Task

### `gg task list <project> <phase> [--status <status>]`

List tasks in a phase file with their status and check information.

**Args:**

| Arg        | Type     | Required | Description                                    |
| ---------- | -------- | -------- | ---------------------------------------------- |
| `project`  | `string` | Yes      | Project slug                                   |
| `phase`    | `number` | Yes      | Phase number                                   |
| `--status` | `string` | No       | Filter by task status: `todo`, `done`, `skip`  |

**Output:**

```json
{
  "ok": true,
  "phase": 2,
  "tasks": [
    {
      "id": "2.1",
      "title": "Create database schema",
      "status": "done",
      "check_status": "done"
    },
    {
      "id": "2.2",
      "title": "Write migration scripts",
      "status": "todo",
      "check_status": null
    }
  ]
}
```

| Field          | Type                            | Description                                       |
| -------------- | ------------------------------- | ------------------------------------------------- |
| `ok`           | `boolean`                       | Whether the command succeeded                     |
| `phase`        | `number`                        | Phase number                                      |
| `tasks`        | `object[]`                      | Array of task entries                             |
| `id`           | `string`                        | Dot-separated task identifier (e.g., `"2.1"`)    |
| `title`        | `string`                        | Task title                                        |
| `status`       | `"todo" \| "done" \| "skip"`   | Task status                                       |
| `check_status` | `"pending" \| "done" \| null`  | Check command status, or `null` if no check block |

---

### `gg task get <project> <phase> <id>`

Get full details for a single task including files, acceptance criteria, and check command.

**Args:**

| Arg       | Type     | Required | Description                          |
| --------- | -------- | -------- | ------------------------------------ |
| `project` | `string` | Yes      | Project slug                         |
| `phase`   | `number` | Yes      | Phase number                         |
| `id`      | `string` | Yes      | Task ID (e.g., `"1.2"`)             |

**Output:**

```json
{
  "ok": true,
  "id": "1.2",
  "title": "Implement auth middleware",
  "status": "todo",
  "check": { "command": "pnpm test -- --grep auth", "status": "pending" },
  "files": ["src/middleware/auth.ts", "src/middleware/auth.test.ts"],
  "acceptance": [
    { "id": "1.2.1", "status": "pending", "text": "Auth middleware validates JWT tokens" },
    { "id": "1.2.2", "status": "done", "text": "Returns 401 for expired tokens" }
  ]
}
```

| Field        | Type              | Description                                                  |
| ------------ | ----------------- | ------------------------------------------------------------ |
| `ok`         | `boolean`         | Whether the command succeeded                                |
| `id`         | `string`          | Dot-separated task identifier                                |
| `title`      | `string`          | Task title                                                   |
| `status`     | `"todo" \| "done" \| "skip"` | Task status                                     |
| `check`      | `object \| null`  | Check command and its status, or `null` if no check block    |
| `files`      | `string[]`        | File paths associated with the task                          |
| `acceptance` | `object[]`        | Acceptance criteria entries                                  |

**Check fields:**

| Field     | Type                       | Description              |
| --------- | -------------------------- | ------------------------ |
| `command` | `string`                   | Shell command to run     |
| `status`  | `"pending" \| "done"`      | Check execution status   |

**Acceptance fields:**

| Field    | Type                  | Description                         |
| -------- | --------------------- | ----------------------------------- |
| `id`     | `string`              | Criterion identifier (e.g., `"1.2.1"`) |
| `status` | `"pending" \| "done"` | Whether the criterion is satisfied  |
| `text`   | `string`              | Criterion description               |

---

### `gg task set <project> <phase> <id> --status <status>`

Update a task's status in the phase file and sync the corresponding checkbox in `plan.md`.

**Args:**

| Arg        | Type     | Required | Description                                   |
| ---------- | -------- | -------- | --------------------------------------------- |
| `project`  | `string` | Yes      | Project slug                                  |
| `phase`    | `number` | Yes      | Phase number                                  |
| `id`       | `string` | Yes      | Task ID (e.g., `"1.2"`)                      |
| `--status` | `string` | Yes      | New status: `todo`, `done`, `skip`            |

**Output:**

```json
{ "ok": true, "id": "1.2", "status": "done" }
```

| Field    | Type                          | Description                  |
| -------- | ----------------------------- | ---------------------------- |
| `ok`     | `boolean`                     | Whether the update succeeded |
| `id`     | `string`                      | Task ID that was updated     |
| `status` | `"todo" \| "done" \| "skip"` | The new task status          |

---

## Agents

### `gg agents resolve <agent>`

Resolve an agent's runtime configuration by merging the built-in registry with user settings overrides.

**Args:**

| Arg     | Type     | Required | Description                                            |
| ------- | -------- | -------- | ------------------------------------------------------ |
| `agent` | `string` | Yes      | Agent name (e.g., `executor`, `researcher`, `planner`) |

**Output:**

```json
{
  "agent": "executor",
  "mode": "teams",
  "model": "opus",
  "tools": ["Bash", "Read", "Write", "Edit"],
  "file": "executor.md"
}
```

| Field   | Type                                      | Description                              |
| ------- | ----------------------------------------- | ---------------------------------------- |
| `agent` | `string`                                  | Agent name                               |
| `mode`  | `"teams" \| "background" \| "foreground"` | Spawn mode                               |
| `model` | `string`                                  | Model to use (e.g., `opus`, `inherit`)   |
| `tools` | `string[]`                                | Tools available to the agent             |
| `file`  | `string`                                  | Relative path to the agent markdown file |

---

### `gg agents list`

List all registered agents with their resolved configurations.

**Args:** none

**Output:**

```json
{
  "agents": [
    {
      "agent": "executor",
      "mode": "teams",
      "model": "opus",
      "tools": ["Bash", "Read", "Write", "Edit"],
      "file": "executor.md"
    }
  ]
}
```

| Field    | Type              | Description                                                                       |
| -------- | ----------------- | --------------------------------------------------------------------------------- |
| `agents` | `ResolvedAgent[]` | Array of resolved agent configurations (same shape as `gg agents resolve` output) |

---

## Config

### `gg config get [key]`

Get a config value by dot-separated key, or all settings if no key is provided.

**Args:**

| Arg   | Type     | Required | Description                                                                          |
| ----- | -------- | -------- | ------------------------------------------------------------------------------------ |
| `key` | `string` | No       | Config key using dot notation (e.g., `checkpoint.auto_push`, `agents.executor.mode`) |

**Output (with key):**

```json
{ "value": true }
```

**Output (without key -- all settings):**

```json
{
  "agents": {
    "executor": { "mode": "background" },
    "researcher": { "mode": "teams" }
  },
  "checkpoint": { "auto_push": true }
}
```

---

### `gg config set <key> <value>`

Set a config value. The value is parsed as JSON if possible; otherwise stored as a string.

**Args:**

| Arg     | Type     | Required | Description                                                |
| ------- | -------- | -------- | ---------------------------------------------------------- |
| `key`   | `string` | Yes      | Config key using dot notation                              |
| `value` | `string` | Yes      | Value to set (JSON-parsed if valid, else stored as string) |

**Output:**

```json
{ "ok": true }
```

---

## Checkpoint

### `gg checkpoint save <message> <files..>`

Save workflow progress -- stage files, commit, and optionally push.

**Args:**

| Arg       | Type       | Required | Description                                                                                   |
| --------- | ---------- | -------- | --------------------------------------------------------------------------------------------- |
| `message` | `string`   | Yes      | Commit message                                                                                |
| `files`   | `string[]` | Yes      | Files to stage (at least one required)                                                        |
| `--push`  | `boolean`  | No       | Push after committing (default: from `checkpoint.auto_push` setting; use `--no-push` to skip) |

**Output:**

```json
{
  "ok": true,
  "commit": "abc1234",
  "pushed": true,
  "squashed": false
}
```

| Field      | Type      | Description                                 |
| ---------- | --------- | ------------------------------------------- |
| `ok`       | `boolean` | Whether the checkpoint succeeded            |
| `commit`   | `string`  | Short commit hash                           |
| `pushed`   | `boolean` | Whether the commit was pushed to the remote |
| `squashed` | `boolean` | Always `false` for `save`                   |

---

### `gg checkpoint squash <message> [--base]`

Squash all branch commits into a single checkpoint commit.

**Args:**

| Arg       | Type     | Required | Description                                     |
| --------- | -------- | -------- | ----------------------------------------------- |
| `message` | `string` | Yes      | Squash commit message                           |
| `--base`  | `string` | No       | Base branch to squash against (default: `main`) |

**Output:**

```json
{
  "ok": true,
  "commit": "def5678",
  "pushed": true,
  "squashed": true
}
```

---

### `gg checkpoint log [--base]`

List commits since the last squash (or branch point from base).

**Args:**

| Arg      | Type     | Required | Description                                         |
| -------- | -------- | -------- | --------------------------------------------------- |
| `--base` | `string` | No       | Base branch for fallback boundary (default: `main`) |

**Output:**

```json
{
  "since": "squash",
  "base_commit": "abc1234",
  "commits": [{ "hash": "def5678", "message": "feat: add auth", "date": "2025-01-15T12:00:00Z" }]
}
```

| Field         | Type                   | Description                                                     |
| ------------- | ---------------------- | --------------------------------------------------------------- |
| `since`       | `"squash" \| "branch"` | Whether the log starts from a squash commit or the branch point |
| `base_commit` | `string`               | The boundary commit hash                                        |
| `commits`     | `CheckpointLogEntry[]` | Array of commits since the boundary                             |

---

## Info

### `gg info`

Print project and environment info.

**Args:** none

**Output:**

```json
{
  "repo_root": "/Users/dev/my-repo",
  "gg_dir": ".gg",
  "active_project": "eng-1234"
}
```

| Field            | Type             | Description                                                          |
| ---------------- | ---------------- | -------------------------------------------------------------------- |
| `repo_root`      | `string \| null` | Absolute path to the git repository root, or `null` if not in a repo |
| `gg_dir`         | `string`         | Relative path to the `.gg` directory                                 |
| `active_project` | `string \| null` | Currently active project slug                                        |

---

## Init

### `gg init [--hook]`

Initialize the `.gg` directory structure, copy reference files, ensure `.gitignore` entries, create default settings, sync README, enable agent teams if needed, and slim state.json.

**Args:**

| Arg      | Type      | Required | Description                                                       |
| -------- | --------- | -------- | ----------------------------------------------------------------- |
| `--hook` | `boolean` | No       | Run as hook mode (reads stdin before executing; default: `false`) |

**Output:**

```json
{
  "ok": true,
  "actions": ["ensured directories", "copied reference files", "updated .gitignore"]
}
```

| Field     | Type       | Description                                                                                                                                                                                                          |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`      | `boolean`  | Whether initialization succeeded                                                                                                                                                                                     |
| `actions` | `string[]` | List of actions performed (e.g., `"ensured directories"`, `"copied reference files"`, `"updated .gitignore"`, `"created default settings.json"`, `"synced README"`, `"enabled agent teams"`, `"slimmed state.json"`) |

---

## Migrate

### `gg migrate check [--hook]`

Check if migration is needed (detects uppercase project files like `PLAN.md` that need renaming).

**Args:**

| Arg      | Type      | Required | Description                                                                                                               |
| -------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--hook` | `boolean` | No       | Run as hook mode (reads stdin; blocks non-migrate `/gg:` commands with exit code 2 if migration needed; default: `false`) |

**Output:**

```json
{ "needed": false }
```

| Field    | Type      | Description                   |
| -------- | --------- | ----------------------------- |
| `needed` | `boolean` | Whether migration is required |

**Hook behavior:** When `--hook` is set and migration is needed, the command reads stdin for the user prompt. If the prompt is `/gg:migrate`, it exits with code 0 (allowing it through). If the prompt is any other `/gg:` command, it exits with code 2 and writes an error to stderr. Non-`/gg:` prompts pass through with code 0.

## Stack

### `gg stack init`

Initialize stack.json for a project.

**Args:**

| Arg         | Type      | Required | Description              |
| ----------- | --------- | -------- | ------------------------ |
| `--project` | `string`  | Yes      | Project slug             |
| `--stacked` | `boolean` | No       | Enable stacked branches (default: true). Use `--no-stacked` to disable. |
| `--type`    | `string`  | No       | Branch type prefix: `feat` or `fix` (default: `feat`)  |

**Output:**

```json
{
  "version": 3,
  "stacked": true,
  "type": "feat",
  "base_branch": "main",
  "project_branch": "feat/eng-1234",
  "phases": [],
  "prs": []
}
```

---

### `gg stack status --project <slug>`

Show stack status with verified branch state. Branch and base fields are derived from convention.

**Args:**

| Arg         | Type     | Required | Description  |
| ----------- | -------- | -------- | ------------ |
| `--project` | `string` | Yes      | Project slug |

**Output:**

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
      "pr_id": "pr-1",
      "branch": "feat/eng-1234-phase-1",
      "base": "feat/eng-1234",
      "branch_exists": true
    }
  ],
  "prs": [...]
}
```

---

### `gg stack add <phase>`

Register a phase in stack.json without creating the git branch. Branch name and base are derived from convention.

**Args:**

| Arg         | Type     | Required | Description                              |
| ----------- | -------- | -------- | ---------------------------------------- |
| `phase`     | `number` | Yes      | Phase number (positional)                |
| `--project` | `string` | Yes      | Project slug                             |

**Output:**

```json
{ "phase": 1, "pr_id": null }
```

---

### `gg stack branch <phase>`

Create a phase branch (JIT). Derives the branch name from convention, creates the git branch, pushes with upstream tracking, and returns to original branch.

**Args:**

| Arg         | Type     | Required | Description  |
| ----------- | -------- | -------- | ------------ |
| `phase`     | `number` | Yes      | Phase number |
| `--project` | `string` | Yes      | Project slug |

**Output:**

The output includes derived `branch` and `base` fields for convenience:

```json
{ "phase": 1, "branch": "feat/slug-phase-1", "base": "feat/slug", "created": true, "pr_id": null }
```

---

### `gg stack checkout <phase>`

Switch to a phase branch.

**Args:**

| Arg         | Type     | Required | Description  |
| ----------- | -------- | -------- | ------------ |
| `phase`     | `number` | Yes      | Phase number |
| `--project` | `string` | Yes      | Project slug |

---

### `gg stack pr`

Register a PR for one or more phases in the stack.

**Args:**

| Arg            | Type       | Required | Description                      |
| -------------- | ---------- | -------- | -------------------------------- |
| `--project`    | `string`   | Yes      | Project slug                     |
| `--phases`     | `number[]` | Yes      | Phase numbers this PR covers     |
| `--pr-number`  | `number`   | Yes      | GitHub PR number                 |
| `--pr-url`     | `string`   | Yes      | GitHub PR URL                    |

**Output:**

```json
{
  "id": "pr-1",
  "pr_number": 42,
  "pr_url": "https://github.com/org/repo/pull/42",
  "pr_state": "open",
  "phases": [1],
  "base_branch": "feat/slug",
  "head_branch": "feat/slug-phase-1"
}
```

---

### `gg stack rebase <phase>`

Rebase a phase and cascade to all downstream phases.

**Args:**

| Arg         | Type     | Required | Description          |
| ----------- | -------- | -------- | -------------------- |
| `phase`     | `number` | Yes      | Phase number         |
| `--project` | `string` | Yes      | Project slug         |

**Output:**

```json
{
  "phases": [
    { "phase": 2, "branch": "feat/slug-phase-2", "status": "rebased" },
    { "phase": 3, "branch": "feat/slug-phase-3", "status": "conflict" }
  ]
}
```

---

### `gg stack resolve <phase>`

Resolve branch and PR info for a phase. The `branch`, `base`, and `created` fields are derived from convention and git state — they are not stored in `stack.json`.

**Args:**

| Arg         | Type     | Required | Description  |
| ----------- | -------- | -------- | ------------ |
| `phase`     | `number` | Yes      | Phase number |
| `--project` | `string` | Yes      | Project slug |

**Output:**

```json
{
  "phase": 1,
  "branch": "feat/slug-phase-1",
  "base": "feat/slug",
  "created": true,
  "pr": {
    "id": "pr-1",
    "pr_number": 42,
    "pr_url": "https://github.com/org/repo/pull/42",
    "pr_state": "open"
  }
}
```

---

## Linear

### `gg linear issue get --project <slug> --id <id>`

Fetch a Linear issue and write to `.gg/projects/{slug}/linear/issues/{identifier}.json`.

**Args:**

| Arg         | Type     | Required | Description           |
| ----------- | -------- | -------- | --------------------- |
| `--project` | `string` | Yes      | Project slug          |
| `--id`      | `string` | Yes      | Issue identifier      |

---

### `gg linear project get --project <slug> --id <id>`

Fetch a Linear project and write to `.gg/projects/{slug}/linear/projects/{id}.json`.

**Args:**

| Arg         | Type     | Required | Description      |
| ----------- | -------- | -------- | ---------------- |
| `--project` | `string` | Yes      | Project slug     |
| `--id`      | `string` | Yes      | Linear project ID |

---

### `gg linear whoami`

Show the authenticated Linear user.

---

## GitHub

### `gg github pull create`

Create a GitHub PR and write to `.gg/projects/{slug}/github/pulls/{number}.json`.

**Args:**

| Arg               | Type       | Required | Description                                                              |
| ----------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| `--project`       | `string`   | Yes      | Project slug                                                             |
| `--title`         | `string`   | Yes      | PR title (plain description; type/scope/phase are formatted by the CLI)  |
| `--head`          | `string`   | Yes      | Head branch                                                              |
| `--type`          | `string`   | No       | Conventional commit type (e.g., `feat`, `fix`, `chore`)                  |
| `--scope`         | `string`   | No       | Conventional commit scope (e.g., `auth`, `api`)                          |
| `--phase`         | `number`   | No       | Phase number (appended to title as phase badge)                          |
| `--body`          | `string`   | No       | PR body                                                                  |
| `--generate-body` | `boolean`  | No       | Auto-generate PR body with stack map and phase badges                    |
| `--base`          | `string`   | No       | Base branch                                                              |
| `--draft`         | `boolean`  | No       | Create as draft                                                          |
| `--labels`        | `string[]` | No       | Labels to add                                                            |

---

### `gg github pull edit <number>`

Edit an existing GitHub pull request.

**Args:**

| Arg        | Type       | Required | Description                           |
| ---------- | ---------- | -------- | ------------------------------------- |
| `number`   | `number`   | Yes      | PR number (positional)                |
| `--title`  | `string`   | No       | New PR title                          |
| `--body`   | `string`   | No       | New PR body                           |
| `--base`   | `string`   | No       | New base branch                       |
| `--labels` | `string[]` | No       | Labels to set                         |

**Output:**

```json
{
  "ok": true,
  "pr_number": 42,
  "pr_url": "https://github.com/org/repo/pull/42"
}
```

---

### `gg github pull view <number>`

View a GitHub pull request.

**Args:**

| Arg      | Type     | Required | Description |
| -------- | -------- | -------- | ----------- |
| `number` | `number` | Yes      | PR number   |
