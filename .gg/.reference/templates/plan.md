---
created: '{{date}}'
updated: '{{date}}'
updated_by: 'gg:plan'
---

# Plan — {{slug}}

{{summary}}

{{#if linear}}

## Linear

{{linear_items}}

{{/if}}

## Phases

<phases>

### Phase {{phase_number}} — {{phase_name}}

{{phase_description}}

<phase id="{{phase_number}}" step="scaffold" status="done" name="{{phase_name}}" file="{{phase_number}}-{{phase_slug}}/phase.md"{{#if linear}} linear="{{linear_id}}"{{/if}}>

- [ ] <task id="{{phase_number}}.1">{{task_description}}</task>
- [ ] <task id="{{phase_number}}.2">{{task_description}}</task>

</phase>

</phases>
