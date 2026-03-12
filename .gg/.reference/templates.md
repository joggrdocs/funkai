# Template Reference

How GG templates work. This doc covers syntax conventions and processing rules. The actual templates in `plugins/gg/reference/templates/` are the source of truth for what fields and sections exist — this doc explains how to read and process them.

## Token Syntax

Templates use **Handlebars-style pseudocode** for variable substitution. These are NOT rendered by a Handlebars engine — they are conventions that tell skills and agents what to replace with real content.

### Rules

| Rule                                 | Example                              |
| ------------------------------------ | ------------------------------------ |
| Tokens use double braces             | `{{token_name}}`                     |
| Token names are `snake_case`         | `{{phase_name}}`, `{{file_targets}}` |
| Tokens are replaced with plain text  | `{{slug}}` → `auth-refactor`         |
| Unreplaced tokens are left as-is     | Later steps fill them in             |
| List tokens expand to multiple items | `- {{goal}}` → `- Goal 1\n- Goal 2`  |
| Block tokens expand to full sections | `{{findings}}` → multi-line content  |

### Staged Replacement

Templates are filled in stages, not all at once. Each skill or agent owns a set of tokens and MUST only replace its own. Leave all other `{{...}}` tokens untouched for later stages.

The general flow:

1. **Scaffold** — Skill creates the file from a template, replacing identity/metadata tokens
2. **Enrich** — Later skills or agents replace content tokens with real data
3. **Update** — Ongoing writes update mutable fields (timestamps, status) while preserving structure

A token that isn't replaced yet stays in the file as `{{token_name}}` until the responsible stage runs.

## YAML Frontmatter

Templates may include YAML frontmatter (`---` delimiters) for metadata. Frontmatter fields are defined by each template — check the template file to see what fields it uses.

### Processing Rules

- Frontmatter is parsed as YAML between the opening and closing `---` lines
- Fields marked as immutable in a template (e.g., creation timestamps) MUST NOT be overwritten after the initial scaffold
- Mutable fields (e.g., timestamps, status) MUST be updated on every write
- If a file has no frontmatter, treat it as having no metadata (read returns null, write prepends frontmatter)
- Preserve all frontmatter fields you don't own — only update the fields your skill/agent is responsible for

### Example

```yaml
---
created: '2026-02-09'
updated: '2026-02-09'
updated_by: 'gg:new'
---
```

The template defines what fields exist. The processing code reads, validates, and updates them.

## XML Patterns

XML elements are embedded inside standard markdown to wrap structured data that skills and agents parse programmatically. They are NOT standalone XML documents.

### Processing Rules

- XML elements can be inline (single line) or block (multi-line with markdown content inside)
- Attributes are always `key="value"` format with double quotes
- Elements can be nested (e.g., tasks inside phases, status/files/acceptance inside tasks)
- The markdown inside XML blocks is valid markdown — XML is just the wrapper for machine-parseable metadata
- When updating an XML element, preserve all attributes and child elements you don't own
- Block `<task>` elements use child elements (`<status>`, `<files>`, `<acceptance>`) instead of attributes for `status` and `files`

### Inline Pattern

Single-line elements with text content. Used in plan.md inside `<phase>` elements:

```markdown
- [ ] <task id="1.1">Task description here</task>
- [x] <task id="1.2">Completed task</task>
```

### Block Pattern

Multi-line elements with structured markdown content. Used in PHASE.md files:

```xml
<task id="1.1">

## Implement the Login Endpoint

**status:** <status>todo</status>

**check:** <check status="pending">`pnpm test -- src/auth/login.test.ts`</check>

Implement the login endpoint with JWT authentication and proper error handling.

### Files

<files>
  - `src/auth/login.ts`
  - `src/auth/login.test.ts`
</files>

### Acceptance

<acceptance>

- [ ] <criterion id="1.1.1" status="pending">Returns 200 with valid JWT on correct credentials</criterion>
- [ ] <criterion id="1.1.2" status="pending">Returns 401 on invalid credentials</criterion>

</acceptance>

</task>
```

### Grouping Pattern

Wrapper elements group related items:

```xml
<phases>

<phase id="1" step="scaffold" status="done" name="Setup" file="01-setup/phase.md">

  - [ ] <task id="1.1">Task description</task>

</phase>

</phases>
```

## Checkbox Pattern

Inline tasks in plan.md use markdown checkboxes for human readability:

```markdown
- [ ] <task id="1.1">Not started</task>
- [x] <task id="1.2">Completed</task>
```

| Checkbox | Meaning  |
| -------- | -------- |
| `[ ]`    | Not done |
| `[x]`    | Done     |

When updating an inline task to done, change the checkbox from `[ ]` to `[x]`.

Block tasks in PHASE.md use a `<status>` child element instead of a checkbox:

```xml
<task id="1.1">

## Task Title

**status:** <status>done</status>
```

When updating a block task status, change the `<status>` child element value.

## Conditional Sections

Optional sections use Handlebars-style conditional blocks:

```markdown
{{#if variable_name}}

## Optional Section

Content that only appears when the condition is true.
{{/if}}
```

### Processing Rules

- `{{#if variable}}...{{/if}}` wraps optional sections
- This is pseudocode, not engine-rendered — the skill decides whether to include or strip
- **When stripping:** remove the entire block including `{{#if}}` and `{{/if}}` markers
- **When including:** remove only the `{{#if}}` and `{{/if}}` markers, keep the content between them

## HTML Comments

Templates may include HTML comments with instructions for agents:

```html
<!--
  Rules:
  - Agents READ this file before code exploration
  - Updates REQUIRE human approval via AskUserQuestion
-->
```

These are instructions, not content. Agents MUST read and follow them. Do not strip or modify these comments.

## Writing Guidelines

When processing templates, skills and agents MUST:

1. **Preserve structure** — Do not add, remove, or reorder sections unless the template calls for it
2. **Replace only your tokens** — Leave `{{tokens}}` for other stages untouched
3. **Respect frontmatter rules** — Update mutable fields, never overwrite immutable ones
4. **Sync checkboxes and status** — Inline tasks: checkbox reflects done/not-done. Block tasks: `<status>` child element holds the canonical status
5. **Preserve what you don't own** — Other agents' tokens, XML attributes, and frontmatter fields stay as-is
6. **No invented sections** — If content doesn't exist for a section, leave the token or write `_None identified._`
