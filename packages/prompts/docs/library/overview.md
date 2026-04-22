# Library API

The library surface provides the runtime engine and registry used by generated code and consuming packages.

## Exports

| Export                 | Type                                | Entry Point | Description                                                                |
| ---------------------- | ----------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `liquidEngine`         | `Liquid`                            | `@funkai/prompts/runtime` | Internal shared LiquidJS instance (not re-exported from main entry point) |
| `createEngine`         | `(partialsDir, options?) => Liquid` | CLI         | Factory for filesystem-backed engines (used by CLI for partial resolution) |
| `clean`                | `(content: string) => string`       | CLI         | Strips frontmatter, returns render-ready template                          |
| `createPromptRegistry` | `(modules) => PromptRegistry`       | Main        | Creates typed registry from prompt module map                              |
| `createPrompt`         | `(config) => PromptModule`          | Main        | Creates a prompt module from a config object                               |
| `createPromptGroup`    | `(name) => ...`                     | Main        | Creates a prompt group helper                                              |

## Types

| Type                  | Description                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PromptModule`        | Interface: `name`, `group`, `schema` (ZodType), `render(vars)`, `validate(vars)`                                          |
| `PromptNamespace`     | A nested namespace node — values are `PromptModule` leaves or further nested namespaces                                   |
| `PromptRegistry`      | Deep-readonly mapped type over a `PromptNamespace` tree                                                                   |
| `CreateEngineOptions` | Options for `createEngine`: `root`, `partials`, `extname`, `cache`, `strictVariables`. Safety defaults (`strictFilters`, `strictVariables`, `ownPropertyOnly`) are always enforced and cannot be overridden. |
| `Liquid`              | Re-exported LiquidJS engine type                                                                                          |

## Engine

The shared `engine` instance is configured with `ownPropertyOnly: true`, `strictFilters: true`, and `strictVariables: true` for security. No filesystem access -- templates are rendered from strings via `parseAndRenderSync`.

`createEngine` accepts a `partialsDir` and optional overrides. It enables filesystem-backed partial resolution (`.prompt` extension, caching enabled) for use during codegen flattening. The safety defaults `strictFilters`, `strictVariables`, and `ownPropertyOnly` are always enforced and cannot be overridden via `CreateEngineOptions`.

## Registry

`createPromptRegistry` accepts a (possibly nested) record of `PromptModule` objects and namespace nodes. It returns a deep-frozen `PromptRegistry` with direct property access:

```ts
const prompts = createPromptRegistry({
  agents: { coverageAssessor },
  greeting,
});
prompts.agents.coverageAssessor.render({ scope: "full" });
prompts.greeting.render();
```

Nesting is driven by the `group` field in frontmatter. Each `/`-separated segment becomes a nesting level, with all names converted to camelCase. The registry is frozen at creation time to prevent mutation.

## Consumer Pattern

The generated `index.ts` calls `createPromptRegistry` with all prompt modules organized by group and exports a `prompts` const object. Consumers import via the `~prompts` tsconfig alias:

```ts
import { prompts } from "~prompts";

// Flat (no group)
const text = prompts.greeting.render();

// Nested (group: agents)
const text = prompts.agents.coverageAssessor.render({ scope: "full" });
```

Types are inferred from the object structure, giving full type safety on `render` and `validate` arguments at every nesting level.

## References

- [Code Generation](../codegen/overview.md)
- [Overview](../overview.md)
