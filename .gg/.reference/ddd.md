# Document-Driven Development — Agent Reference

Compact reference for agents that generate or validate DDD tasks. For human-readable guidance, see `docs/guides/doc-driven-dev.md`.

## Tier Definitions

| Tier | Name      | When                             | Output                                       |
| ---- | --------- | -------------------------------- | -------------------------------------------- |
| 1    | Multi-doc | 5+ files, new plugin/feature     | Architecture doc, API reference, usage guide |
| 2    | README    | New package, agent, skill        | `README.md` for the target component         |
| 3    | Stubs     | New functions in existing module | Function stubs with full JSDoc               |

## DDD Tier Values

The `ddd_tier` field in discussion.md frontmatter uses these values:

| Value    | Meaning                                          |
| -------- | ------------------------------------------------ |
| `skip`   | No DDD — no Phase 0 (default)                    |
| `full`   | Phase 0 with all tiers: 1 → 2 → 3               |
| `readme` | Phase 0 with Tier 2 only: README                 |
| `stubs`  | Phase 0 with Tier 3 only: JSDoc stubs            |

## Task Templates

> **Note:** In the templates below, `{P}` is the phase number. For Phase 0 tasks, `{P}` = `0` (e.g., task IDs `0.1`, `0.2`).

### Tier 1 — Multi-Doc Tasks

Generate one task per document. File targets are markdown files in a `docs/` subdirectory.

```xml
<task id="{P}.{N}">

## Write Architecture Doc for {component_name}

**status:** <status>todo</status>

**check:** <check status="pending">`Read {component_path}/docs/architecture.md and confirm it covers all components`</check>

Write architecture doc covering components, data flow, and design decisions for {component_name}.

### Files

<files>
  - `{component_path}/docs/architecture.md`
</files>

### Acceptance

<acceptance>

- [ ] <criterion id="{P}.{N}.1" status="pending">Components section lists all major parts</criterion>
- [ ] <criterion id="{P}.{N}.2" status="pending">Data flow section describes end-to-end paths</criterion>
- [ ] <criterion id="{P}.{N}.3" status="pending">Design decisions section explains key choices</criterion>

</acceptance>

</task>
```

Additional Tier 1 docs (generate as separate tasks):

- `commands.md` — slash commands with args, behavior, examples
- `api-reference.md` — method signatures, parameters, return types
- `usage-guide.md` — real code examples for common workflows

### Tier 2 — README Task

Single task producing a `README.md` for the target component.

```xml
<task id="{P}.{N}">

## Write README for {component_name}

**status:** <status>todo</status>

**check:** <check status="pending">`Read {component_path}/README.md and confirm all sections are present`</check>

Write README.md for {component_name} covering overview, installation, usage with examples, API reference, and error handling.

### Files

<files>
  - `{component_path}/README.md`
</files>

### Acceptance

<acceptance>

- [ ] <criterion id="{P}.{N}.1" status="pending">Overview section explains what it does and why</criterion>
- [ ] <criterion id="{P}.{N}.2" status="pending">Usage section includes at least 2 code examples</criterion>
- [ ] <criterion id="{P}.{N}.3" status="pending">API section documents all public functions/methods</criterion>

</acceptance>

</task>
```

### Tier 3 — JSDoc Stub Task

Single task producing function stubs with complete JSDoc in target source files.

```xml
<task id="{P}.{N}">

## Write JSDoc Stubs for {source_file}

**status:** <status>todo</status>

**check:** <check status="pending">`pnpm typecheck` (stubs must compile/type-check)</check>

Write function stubs with complete JSDoc (description, @param, @returns, @throws, @example) for all public functions in {source_file}. Bodies should throw 'Not implemented'.

### Files

<files>
  - `{source_file}`
</files>

### Acceptance

<acceptance>

- [ ] <criterion id="{P}.{N}.1" status="pending">All public functions have JSDoc with @param, @returns, @example</criterion>
- [ ] <criterion id="{P}.{N}.2" status="pending">Function signatures match the planned API</criterion>
- [ ] <criterion id="{P}.{N}.3" status="pending">Stubs type-check successfully</criterion>

</acceptance>

</task>
```

## Phase 0 Structure

When DDD is active (tier is not `skip`), all documentation/design tasks live in **Phase 0: Design** — a dedicated design-only phase. Phase 0 contains zero implementation code.

### Rules

1. **Phase 0 is design-only** — contains ONLY documentation tasks and JSDoc stub tasks. No implementation code.
2. **All implementation phases depend on Phase 0** — every implementation phase (1+) includes `depends_on: [0]` in its frontmatter.
3. **Tier order within Phase 0 is 1 → 2 → 3** when multiple tiers are used (`full`). Tier 2 depends on Tier 1. Tier 3 depends on Tier 2.
4. **Tasks within the same tier have no mutual dependencies** (can run in parallel).
5. **Phase 0 output drives implementation planning** — the design artifacts (architecture docs, READMEs, stubs) are committed. When planning implementation phases, the planner reads these artifacts as context.
6. **Phase 0 directory:** `00-design/phase.md` (sorts first in the filesystem).
7. **Task IDs:** `0.1`, `0.2`, `0.3`, etc. Criterion IDs: `0.1.1`, `0.1.2`, etc.

### Phase 0 Frontmatter

```yaml
---
phase: 0
name: 'Design'
step: scaffold
status: done
---
```

No `depends_on` — Phase 0 is the root of the dependency graph.

### Implementation Phase Frontmatter (when DDD is active)

```yaml
---
phase: 1
name: 'Some Feature'
step: scaffold
status: done
depends_on:
  - 0
---
```

## Tier-to-Task Mapping

| `ddd_tier` | Phase 0 Tasks                  | Implementation Phases         |
| ---------- | ------------------------------ | ----------------------------- |
| `skip`     | No Phase 0 created             | No `depends_on: [0]`         |
| `full`     | Tier 1 + Tier 2 + Tier 3      | All include `depends_on: [0]` |
| `readme`   | Tier 2 only                    | All include `depends_on: [0]` |
| `stubs`    | Tier 3 only                    | All include `depends_on: [0]` |

## Detection Logic (Planner)

The planner detects DDD opt-in by checking (in order):

1. `ddd-tier` context field passed by the plan skill
2. `ddd_tier` field in discussion.md frontmatter (set by discuss skill)
3. Explicit mentions in input.md or discussion.md: "doc-driven", "write docs first", "DDD"
4. Default: `skip`

## File Naming Conventions

| Tier | File Pattern                  | Example                                 |
| ---- | ----------------------------- | --------------------------------------- |
| 1    | `{component}/docs/{topic}.md` | `plugins/analyzer/docs/architecture.md` |
| 2    | `{component}/README.md`       | `plugins/analyzer/README.md`            |
| 3    | `{component}/src/{module}.ts` | `plugins/analyzer/src/index.ts`         |
