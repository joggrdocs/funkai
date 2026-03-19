---
"@funkai/agents": minor
---

Add `agents` field to flow agent config for evolvable agent dependencies

Flow agents can now declare named agent dependencies in their config via `agents: { core, writer }`. These are passed to the handler as `agents` in the params object, enabling `evolve()` to shallow-merge agent overrides — solving the closure capture problem where `evolve()` couldn't rewire agents referenced inside a flow handler.

```typescript
const pipeline = flowAgent({
  name: 'pipeline',
  input: schema,
  agents: { core: coreAgent },
}, async ({ input, $, agents }) => {
  await $.agent({ agent: agents.core, input })
})

// Now works — handler receives evolvedCore instead of the static import
evolve(pipeline, { agents: { core: evolvedCore } })
```
