# Library API

The library surface provides the runtime engine and registry used by generated code and consuming packages.

## Exports

| Export                 | Type                                | Description                                                                |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `engine`               | `Liquid`                            | Shared LiquidJS instance (no filesystem, strict filters)                   |
| `createEngine`         | `(partialsDir, options?) => Liquid` | Factory for filesystem-backed engines (used by CLI for partial resolution) |
| `clean`                | `(content: string) => string`       | Strips frontmatter, returns render-ready template                          |
| `createPromptRegistry` | `(modules) => PromptRegistry`       | Creates typed registry from prompt module map                              |

## Types

| Type                  | Description                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PromptModule`        | Interface: `name`, `group`, `schema` (ZodType), `render(vars)`, `validate(vars)`                                          |
| `PromptRegistry`      | Interface: `get(name)`, `has(name)`, `names()`                                                                            |
| `CreateEngineOptions` | Options for `createEngine`: `root`, `partials`, `extname`, `cache`, `strictFilters`, `strictVariables`, `ownPropertyOnly` |
| `Liquid`              | Re-exported LiquidJS engine type                                                                                          |

## Engine

The shared `engine` instance is configured with `ownPropertyOnly: true` and `strictFilters: true` for security. No filesystem access -- templates are rendered from strings via `parseAndRenderSync`.

`createEngine` accepts a `partialsDir` and optional overrides. It enables filesystem-backed partial resolution (`.prompt` extension, caching enabled) for use during codegen flattening.

## Registry

`createPromptRegistry` accepts a record of `PromptModule` objects keyed by name. It returns a `PromptRegistry` with three methods:

| Method      | Returns        | Behavior                                                        |
| ----------- | -------------- | --------------------------------------------------------------- |
| `get(name)` | `PromptModule` | Returns the module. Throws `Unknown prompt: "name"` if missing. |
| `has(name)` | `boolean`      | Existence check.                                                |
| `names()`   | `string[]`     | All registered prompt names.                                    |

## Consumer Pattern

The generated `index.ts` calls `createPromptRegistry` with all prompt modules and exports a typed `prompts()` accessor. Consumers import via the `~prompts` tsconfig alias:

```ts
import { prompts } from '~prompts'

const text = prompts('coverage-assessor').render({ scope: 'full' })
```

The return type of `prompts(name)` is narrowed to the specific module, giving full type safety on `render` and `validate` arguments.

## References

- [Code Generation](../codegen/overview.md)
- [Overview](../overview.md)
