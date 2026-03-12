<!-- Auto-synced from plugin. Do not edit manually. -->

<div align="center">
  <img src="assets/banner.svg" alt="GG" width="90%" />
  <p><strong>A structured workflow system for managing development projects through a phased pipeline.</strong></p>
</div>

## Workflow Pipeline

```
/gg:new → /gg:discuss → /gg:research → /gg:plan → /gg:execute → /gg:verify
```

Each step advances the workflow. `.gg/state.json` tracks only the active project. Phase status is tracked in phase file YAML frontmatter.

## Skills

Skills are slash commands that drive the workflow. Each skill manages state transitions, user interaction, and agent orchestration.

| Skill         | File                                                   | Description                                                                                              |
| ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `gg:new`      | [`skills/new/SKILL.md`](skills/new/SKILL.md)           | Scaffold a project from a Linear issue/project or free-text description                                  |
| `gg:status`   | [`skills/status/SKILL.md`](skills/status/SKILL.md)     | Read-only tree view of project progress                                                                  |
| `gg:discuss`  | [`skills/discuss/SKILL.md`](skills/discuss/SKILL.md)   | Interview user to gather requirements (goals, constraints, preferences, edge cases, acceptance criteria) |
| `gg:research` | [`skills/research/SKILL.md`](skills/research/SKILL.md) | Spawn background agent to explore codebase and web for technical context                                 |
| `gg:plan`     | [`skills/plan/SKILL.md`](skills/plan/SKILL.md)         | Create phase plan with tasks, file targets, acceptance criteria, and dependencies                        |
| `gg:execute`  | [`skills/execute/SKILL.md`](skills/execute/SKILL.md)   | Group tasks into parallel waves and spawn executor agents                                                |
| `gg:verify`   | [`skills/verify/SKILL.md`](skills/verify/SKILL.md)     | Spawn verifier agent to check acceptance criteria with concrete evidence                                 |
| `gg:codebase` | [`skills/codebase/SKILL.md`](skills/codebase/SKILL.md) | Analyze repo and maintain `.gg/codebase/` docs (stack, architecture, conventions, testing, integrations) |
| `gg:help`     | [`skills/help/SKILL.md`](skills/help/SKILL.md)         | Display all available commands and usage                                                                 |
| `gg:archive`  | [`skills/archive/SKILL.md`](skills/archive/SKILL.md)   | Archive a completed project to `.gg/.archive/`                                                           |
| `gg:migrate`  | [`skills/migrate/SKILL.md`](skills/migrate/SKILL.md)   | Check and apply migration specs to project files                                                         |

## Agents

Agents are subagents spawned by skills to do the actual work.

| Agent                 | File                                                             | Interactive?    | Description                                                                                    |
| --------------------- | ---------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `researcher`          | [`agents/researcher.md`](agents/researcher.md)                   | No (background) | Codebase + web researcher — explores code, maps dependencies, finds existing patterns          |
| `planner`             | [`agents/planner.md`](agents/planner.md)                         | Yes             | Task decomposer — breaks phases into tasks with file targets and acceptance criteria           |
| `executor`            | [`agents/executor.md`](agents/executor.md)                       | No (background) | Task implementer — executes one task, validates with typecheck/lint/test                       |
| `verifier`            | [`agents/verifier.md`](agents/verifier.md)                       | No (background) | Acceptance verifier — checks every criterion with concrete evidence                            |
| `codebase-researcher` | [`agents/codebase-researcher.md`](agents/codebase-researcher.md) | No (background) | Codebase analyst — explores repo with Serena MCP tools, writes focused docs to `.gg/codebase/` |
| `migrator`            | [`agents/migrator.md`](agents/migrator.md)                       | No (background) | Applies migration specs to project files (Read, Write, Edit, Bash, Glob, Grep)                 |

## Docs

Internal documentation for agent authors.

| File                                                         | Purpose                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| [`docs/core/architecture.md`](docs/core/architecture.md)     | Overview, definitions, component interaction diagram                  |
| [`docs/core/state.md`](docs/core/state.md)                   | State tracking, workflow artifacts, session persistence               |
| [`docs/standards/interface.md`](docs/standards/interface.md) | How skills pass context to agents and how agents return results       |
| [`docs/standards/agent.md`](docs/standards/agent.md)         | Agent file structure, required/optional sections, example skeleton    |
| [`docs/standards/skill.md`](docs/standards/skill.md)         | Skill file structure, common patterns, example skeleton               |
| [`docs/guides/linear.md`](docs/guides/linear.md)             | Linear integration — ingestion, data flow, outcome vs. implementation |
| [`docs/core/principles.md`](docs/core/principles.md)         | Behavioral principles for building skills and agents                  |

## References

Internal reference docs used by skills and agents at runtime.

| File                                                             | Purpose                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------- |
| [`reference/checkpoint.md`](reference/checkpoint.md)             | Git checkpoint commands (stage, commit, push, draft PR)   |
| [`reference/cli.md`](reference/cli.md)                           | `gg` CLI reference for state and phase operations         |
| [`reference/ddd.md`](reference/ddd.md)                           | Document-driven development agent reference               |
| [`reference/stacked-branches.md`](reference/stacked-branches.md) | Stacked branches and per-phase PR management              |
| [`reference/templates.md`](reference/templates.md)               | Template syntax conventions and processing rules          |
| [`reference/unmcp.md`](reference/unmcp.md)                       | `unmcp` CLI reference for Linear/GitHub/Vercel operations |
| [`reference/workstate.md`](reference/workstate.md)               | `state.json` schema, phase/task status rollup rules       |

## Templates

Templates scaffolded by `gg:new` into `.gg/projects/{project-slug}/`.

| File                                                                       | Purpose                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`templates/input.md`](templates/input.md)                                 | Raw requirements and user intent                      |
| [`templates/discussion.md`](templates/discussion.md)                       | Timestamped interview log                             |
| [`templates/research.md`](templates/research.md)                           | Technical research findings                           |
| [`templates/overview.md`](templates/overview.md)                           | Project overview and phase breakdown                  |
| [`templates/plan.md`](templates/plan.md)                                   | Project-level plan with phase/task XML                |
| [`templates/phase.md`](templates/phase.md)                                 | Per-phase task plan with XML format                   |
| [`templates/codebase/stack.md`](templates/codebase/stack.md)               | Technology stack reference template                   |
| [`templates/codebase/architecture.md`](templates/codebase/architecture.md) | Architecture and structure reference template         |
| [`templates/codebase/conventions.md`](templates/codebase/conventions.md)   | Code conventions and style reference template         |
| [`templates/codebase/testing.md`](templates/codebase/testing.md)           | Testing patterns and framework reference template     |
| [`templates/codebase/integrations.md`](templates/codebase/integrations.md) | External integrations and services reference template |

## Key Design Patterns

- **State machine** — `state.json` tracks the active project; phase state lives in phase file YAML frontmatter
- **Idempotency** — every agent checks if work is already done before proceeding
- **Parallel execution** — execute skill groups tasks into waves by file-target overlap; non-conflicting tasks run in parallel
- **Checkpointing** — plan and execute steps commit and push after completing work
- **Re-run safety** — all skills prompt before re-running a completed step
- **Abridged mode** — planner detects skipped discuss/research steps and interviews the user directly

## Runtime Directory

When a project is active, the working directory looks like:

```
.gg/
├── state.json              # Workflow state
├── codebase/               # Shared codebase documentation
│   ├── stack.md
│   ├── architecture.md
│   ├── conventions.md
│   ├── testing.md
│   └── integrations.md
└── projects/               # All project directories
    └── {project-slug}/     # Per-project directory
        ├── input.md
        ├── discussion.md
        ├── research.md
        ├── overview.md
        ├── plan.md
        └── phases/
            └── <N>-<slug>/
                └── phase.md   # Per-phase task plans
```
