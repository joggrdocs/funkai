# Models Troubleshooting

Common issues and fixes for `@funkai/models`.

## Cannot resolve model: model ID is empty

The model ID passed to the resolver is an empty string or whitespace.

**Fix:** Ensure the model ID is a non-empty string:

```ts
const lm = resolve("openai/gpt-4.1");
```

## Cannot resolve model: no provider prefix and no fallback configured

A model ID without a `/` (e.g. `"gpt-4.1"`) was passed to a resolver with no fallback.

**Fix:** Either use the full `"provider/model"` format or configure a fallback:

```ts
const resolve = createModelResolver({
  fallback: openrouter,
});
```

## Cannot resolve model: no provider mapped for "x" and no fallback configured

The model ID prefix does not match any key in the `providers` map and no `fallback` is configured.

**Fix:** Add the provider to the `providers` map or add a fallback:

```ts
const resolve = createModelResolver({
  providers: {
    openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  },
  fallback: openrouter,
});
```

## OPENROUTER_API_KEY environment variable is required

`openrouter` or `createOpenRouter()` was called without an API key, and `OPENROUTER_API_KEY` is not set in the environment.

**Fix:** Set the environment variable:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Or pass the key explicitly:

```ts
const provider = createOpenRouter({ apiKey: "sk-or-..." });
```

## model() returns null

The model ID is not in the generated catalog. This can happen with new or custom models.

**Fix:** Check the model ID is correct. Regenerate the catalog to include newly released models:

```bash
pnpm --filter=@funkai/models generate:models
```

## models() returns empty array

No models match the filter predicate.

**Fix:** Check available values before filtering:

```ts
const providers = [...new Set(models().map((m) => m.provider))];
console.log(providers);
```

## Module not found: @funkai/models/provider

The subpath import does not match an available export.

**Fix:** Check the `exports` field in `package.json`. Valid subpath imports use the provider slug (e.g. `@funkai/models/openai`, not `@funkai/models/provider/openai`).

## Type error: ModelId is not assignable

`ModelId` uses `LiteralUnion` which accepts both known catalog IDs and arbitrary strings. If you see type errors, ensure you are importing `ModelId` from `@funkai/models`:

```ts
import type { ModelId } from "@funkai/models";

const id: ModelId = "openai/gpt-4.1";
```

## References

- [Model Catalog](catalog/overview.md)
- [Provider Resolution](provider/overview.md)
- [Cost Calculation](cost/overview.md)
- [Setup Resolver Guide](guides/setup-resolver.md)
