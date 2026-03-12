---
created: '{{date}}'
updated: '{{date}}'
updated_by: 'gg:new'
source: '{{source}}'
---

# Input - {{slug}}

## Raw Input

> {{raw_input}}

## Summary

{{description}}

{{#if linear}}

## Linear

| Issue                                       | Title                  | Team            | Priority            | Labels            |
| ------------------------------------------- | ---------------------- | --------------- | ------------------- | ----------------- |
| [{{linear_issue_id}}]({{linear_issue_url}}) | {{linear_issue_title}} | {{linear_team}} | {{linear_priority}} | {{linear_labels}} |

{{/if}}

## Goals

- {{goal}}

## Constraints

- {{constraint}}

## Links

- {{link}}
