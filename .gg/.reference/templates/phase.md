---
phase: {{phase_number}}
name: '{{phase_name}}'
step: scaffold
status: done
<!-- Include depends_on ONLY when this phase depends on other phases; omit if none -->
depends_on:
  - {{depends_on_phase_number}}
---

# Phase {{phase_number}}: {{phase_name}}

{{#if linear}}
**Linear:** [{{linear_id}}]({{linear_url}})
{{/if}}

## Objective

{{objective}}

## Tasks

<tasks>

<task id="{{phase_number}}.1">

## {{task_title}}

**status:** <status>todo</status>

**check:** <check status="pending">`{{check_command}}`</check>

{{task_description}}

### Files

<files>
  - `{{file_target}}`
</files>

### Acceptance

<acceptance>

- [ ] <criterion id="{{phase_number}}.{{task_number}}.1" status="pending">{{acceptance_criterion}}</criterion>

</acceptance>

</task>

</tasks>

## Dependencies

| From        | To                     | Reason                |
| ----------- | ---------------------- | --------------------- |
| {{task_id}} | {{depends_on_task_id}} | {{dependency_reason}} |

## Notes

{{notes}}
