# createPromptRegistry()

Create a typed, deep-frozen prompt registry from a map of prompt modules. The registry provides direct property access to render prompts with validated variables. Typically called by generated code, but can be used directly for runtime-only setups.

## Function Signature

```typescript
function createPromptRegistry<T extends PromptNamespace>(modules: T): PromptRegistry<T>;
```

| Parameter | Type                        | Description                                                        |
| --------- | --------------------------- | ------------------------------------------------------------------ |
| `modules` | `T extends PromptNamespace` | Record of camelCase prompt names (or nested namespaces) to modules |

**Returns:** `PromptRegistry<T>` — deep-readonly, direct property access.

```typescript
const prompts = createPromptRegistry({
  agents: { coverageAssessor },
  greeting,
});

prompts.agents.coverageAssessor.render({ scope: "full" });
prompts.greeting.render();
```

## PromptNamespace

```typescript
interface PromptNamespace {
  readonly [key: string]: PromptModule | PromptNamespace;
}
```

Recursive tree structure — values are either `PromptModule` leaves or nested `PromptNamespace` nodes.

## PromptRegistry

```typescript
type PromptRegistry<T extends PromptNamespace> = {
  readonly [K in keyof T]: T[K] extends PromptModule
    ? T[K]
    : T[K] extends PromptNamespace
      ? PromptRegistry<T[K]>
      : T[K];
};
```

Deep-readonly version of a prompt tree. Prevents reassignment at any nesting level. Nesting is driven by the `group` field in `.prompt` frontmatter.

## See Also

- [Prompts concept](/concepts/prompts) — overview of the `.prompt` file format and codegen workflow
- [`createPrompt()` reference](/reference/prompts/create-prompt) — create individual prompt modules
- [`createPromptGroup()` reference](/reference/prompts/create-prompt-group) — group related prompts
- [Prompts CLI reference](/reference/prompts/cli) — codegen, lint, create, setup commands
