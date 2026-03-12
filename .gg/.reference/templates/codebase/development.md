<!--
  development.md — Development standards and workflow reference

  Rules:
  - Agents READ this file before creating commits, branches, or PRs
  - Agents MUST follow the standards documented here — they are enforced, not advisory
  - The executor MUST create commits conforming to the Commit Conventions section
  - The verifier MUST check deliverables against these standards
-->

# Development Standards

> Last updated: {{date}}

## Commit Conventions

**Format:**

{{commit_format}}

**Types:**

{{commit_types}}

**Scopes:**

{{commit_scopes}}

**Examples:**

{{commit_examples}}

## Branch Naming

{{branch_naming}}

## Pull Request Standards

**Title Format:**

{{pr_title_format}}

**Description Template:**

{{pr_description_template}}

**Labels:**

{{pr_labels}}

**Merge Strategy:**

{{merge_strategy}}

## CI/Validation

| Check          | Command            | Required |
| -------------- | ------------------ | -------- |
| {{check_name}} | {{check_command}}  | {{yes_no}} |

**Pre-commit Workflow:**

{{pre_commit_workflow}}

## Rules

<!--
  These rules are prescriptive and enforced by the executor and verifier agents.
  They are not suggestions — violations cause verification failures.
-->

{{development_rules}}
