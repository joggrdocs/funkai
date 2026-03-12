# Workstate Reference

The `.gg/` directory is the runtime workstate for all GG projects. It lives at the repo root and holds per-project data, shared codebase documentation, and session-local state.

## Directory Layout

```
.gg/
  .gitignore               # Ignores state.json
  state.json               # Active project only (gitignored, session-local)
  .reference/              # Copies of plugin reference files (gitignored)
  codebase/                # Shared codebase documentation (all projects)
    stack.md
    architecture.md
    conventions.md
    testing.md
    integrations.md
  projects/                # All project directories
    {project-slug}/        # One directory per project
      plan.md              # Phase/task plan with checkbox+XML
      stack.json           # Branch stack config (stacked or single-branch)
      discussion.md        # Project-level discussion log
      research.md          # Project-level research (living document)
      overview.md          # Project overview
      input.md             # Raw user input from gg:new
      phases/              # Phase directories
        00-design/         # Phase 0: Design-only (when DDD is active)
          phase.md
        01-slug/           # One directory per phase
          phase.md         # Phase tasks, acceptance, verify
          discussion.md    # Phase-scoped Q&A
          research.md      # Phase-specific findings
          verification.md  # Verification evidence
          notes.md         # Freeform scratchpad
        02-slug/
          ...
```

## Root `state.json`

Session-local file tracking which project a developer is working on. **Gitignored** — never committed.

```json
{
  "active_project": "gg-state-templates"
}
```

| Field            | Type     | Description                                                          |
| ---------------- | -------- | -------------------------------------------------------------------- |
| `active_project` | `string` | Slug of the active project. Maps to `.gg/projects/{active_project}/` |

**One field only.** All phase/workflow state lives in phase file frontmatter, not here.

### Resolution Rules

- On any `gg:*` skill invocation, if `state.json` is missing or has no `active_project`, scan `.gg/projects/` and prompt the user to select a project via `AskUserQuestion`.
- `gg:new` creates `state.json` with `active_project` set to the new project slug.
- If `state.json` has extra fields from an older format, `gg init` strips them on session start.

## Phase Frontmatter

Each phase file (`phases/NN-slug/phase.md`) carries YAML frontmatter that describes the phase's identity and status. **Committed and shared** — source of truth for phase state.

```yaml
---
phase: 2
name: 'Migration System'
step: execute
status: running
depends_on:
  - 1
---
```

| Field        | Type       | Mutable | Description                                           |
| ------------ | ---------- | ------- | ----------------------------------------------------- |
| `phase`      | `number`   | No      | Phase number (0 for design phase), matches directory prefix |
| `name`       | `string`   | No      | Human-readable phase name (2-4 words)                 |
| `step`       | `enum`     | Yes     | Where in the lifecycle: `scaffold`, `discuss`, `research`, `plan`, `execute`, `verify` |
| `status`     | `enum`     | Yes     | What's happening at that step: `pending`, `running`, `done`, `error`, `skip` |
| `depends_on` | `number[]` | No      | Phase numbers that must complete first. Omit if none. |

**Phase 0 (Design):** When DDD is active, Phase 0 is a design-only phase containing documentation and stub tasks. Its directory is `00-design/`. Phase 0 has no `depends_on` (it is the dependency root). All implementation phases include `depends_on: [0]` when DDD is active.

### Phase Step + Status Lifecycle

Phase state uses two fields: `step` (where in the lifecycle) and `status` (what's happening at that step).

**Step progression:**

```text
scaffold → discuss → research → plan → execute → verify
```

**Status values at each step:**

| Status    | Meaning                                      |
| --------- | -------------------------------------------- |
| `pending` | Step has not started yet                      |
| `running` | Step is actively in progress                  |
| `done`    | Step completed successfully                   |
| `error`   | Step failed, needs intervention               |
| `skip`    | Step was intentionally skipped                |

**Transition table — which skills set which step+status:**

| Transition                          | Set By                    |
| ----------------------------------- | ------------------------- |
| `step: scaffold`, `status: done`    | `gg:plan` (project-level) |
| `step: discuss`, `status: running`  | `gg:discuss <phase>` starts |
| `step: discuss`, `status: done`     | `gg:discuss <phase>` completes |
| `step: research`, `status: running` | `gg:research <phase>` starts |
| `step: research`, `status: done`    | `gg:research <phase>` completes |
| `step: plan`, `status: running`     | `gg:plan <phase>` starts |
| `step: plan`, `status: done`        | `gg:plan <phase>` completes |
| `step: execute`, `status: running`  | `gg:execute <phase>` starts |
| `step: execute`, `status: done`     | `gg:execute <phase>` completes |
| `step: verify`, `status: running`   | `gg:verify <phase>` starts |
| `step: verify`, `status: done`      | `gg:verify <phase>` passes |

### How Skills Read/Write Phase State

Skills always receive the project slug and phase number explicitly (via arguments or context block). There is no phase-discovery scan.

1. **Read frontmatter:** Parse YAML between `---` delimiters in `phases/<NN>-<slug>/phase.md` using the Read tool.
2. **Update step and status:** Use `gg phase state <project> <number> --step <step> --status <status>` (single atomic CLI command). Both `--step` and `--status` are always required.
3. **Check dependencies:** Before allowing a phase to move to `step: execute`, verify all `depends_on` phases have `step: verify` and `status: done`.

### Task-Level State

Task-level state (which tasks are `todo`/`done`/`skip`) lives in `plan.md` and phase file XML attributes. XML `status` attributes are the source of truth for task status. Task-level statuses are separate from phase-level `step`+`status`.

## Branch Stack (`stack.json`)

Each project optionally has a `stack.json` that controls branch strategy. See `.gg/.reference/stacked-branches.md` for full schema.

- `stacked: false` — single-branch mode (all phases on one branch, one PR)
- `stacked: true` — stacked mode (each phase gets its own branch and draft PR)
- If `stack.json` is missing, treat as single-branch mode (backward compatible)

## Codebase Documentation

The `.gg/codebase/` directory is shared across all projects. Contains 5 focused documentation files that all agents reference.

- Populated by running `/gg:codebase`
- Persists across all projects once populated
- Updates require human approval
- Supports focus areas: `tech`, `arch`, `quality`
