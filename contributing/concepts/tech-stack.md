# Tech Stack

Complete reference of tools and libraries used in the funkai AI SDK framework.

## Core Dependencies

### TypeScript & Build

| Tool                                         | Purpose                | Version | Documentation                                                                                |
| -------------------------------------------- | ---------------------- | ------- | -------------------------------------------------------------------------------------------- |
| [TypeScript](https://www.typescriptlang.org) | Type system            | ^5.9    | [Handbook](https://www.typescriptlang.org/docs/)                                             |
| [tsdown](https://tsdown.dev)                 | Bundler                | ^0.x    | [llms.txt](https://tsdown.dev/llms.txt) \| [llms-full.txt](https://tsdown.dev/llms-full.txt) |
| [pnpm](https://pnpm.io)                      | Package manager        | ^9.x    | [Docs](https://pnpm.io/motivation)                                                           |
| [Turbo](https://turbo.build)                 | Monorepo orchestration | ^2.x    | [Docs](https://turbo.build/repo/docs)                                                        |

### AI & Model Layer

| Tool                                                                         | Purpose            | Critical Rules                                                       | Documentation                                           |
| ---------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| [Vercel AI SDK](https://sdk.vercel.ai)                                       | AI model interface | **Foundation layer** -- all model calls go through the `ai` package. | [Docs](https://sdk.vercel.ai/docs)                      |
| [OpenRouter](https://openrouter.ai)                                          | Model routing      | Default provider for multi-model access.                             | [Docs](https://openrouter.ai/docs)                      |
| [@openrouter/ai-sdk-provider](https://github.com/openrouter/ai-sdk-provider) | SDK integration    | Bridges OpenRouter to Vercel AI SDK provider interface.              | [GitHub](https://github.com/openrouter/ai-sdk-provider) |

### Functional Programming

| Tool                                                  | Purpose              | Critical Rules                                                                                        | Documentation                                     |
| ----------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [ts-pattern](https://github.com/gvergnaud/ts-pattern) | Pattern matching     | **Required** for all conditionals with 2+ branches. No `switch` statements allowed.                   | [GitHub](https://github.com/gvergnaud/ts-pattern) |
| [es-toolkit](https://es-toolkit.sh)                   | Functional utilities | **Check before implementing custom helpers.** Use `pipe`, `map`, `filter`, `attempt` from es-toolkit. | [GitHub](https://github.com/toss/es-toolkit)      |

### Validation & Types

| Tool                                                   | Purpose           | Critical Rules                                                        | Documentation                                       |
| ------------------------------------------------------ | ----------------- | --------------------------------------------------------------------- | --------------------------------------------------- |
| [Zod](https://zod.dev)                                 | Schema validation | **Required** at all boundaries (config, user input, external data).   | [Docs](https://zod.dev)                             |
| [type-fest](https://github.com/sindresorhus/type-fest) | Type utilities    | Use for advanced type patterns (`ReadonlyDeep`, `PartialDeep`, etc.). | [GitHub](https://github.com/sindresorhus/type-fest) |

### Templating

| Tool                             | Purpose         | Usage                                                    | Documentation                |
| -------------------------------- | --------------- | -------------------------------------------------------- | ---------------------------- |
| [LiquidJS](https://liquidjs.com) | Template engine | Used in `@funkai/prompts` for prompt template rendering. | [Docs](https://liquidjs.com) |

### Testing

| Tool                         | Purpose           | Configuration                                                            | Documentation                                  |
| ---------------------------- | ----------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| [Vitest](https://vitest.dev) | Testing framework | Unit tests colocated as `*.test.ts`, coverage via `@vitest/coverage-v8`. | [GitHub](https://github.com/vitest-dev/vitest) |

### Formatting

| Tool                          | Purpose    | Configuration                | Documentation                       |
| ----------------------------- | ---------- | ---------------------------- | ----------------------------------- |
| [OXC](https://oxc.rs) (oxfmt) | Formatting | Run `pnpm format` from root. | [llms.txt](https://oxc.rs/llms.txt) |

### Versioning & Publishing

| Tool                                                   | Purpose                | Usage                                                                                               | Documentation                                      |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Changesets](https://github.com/changesets/changesets) | Versioning & changelog | Run `pnpm changeset` to create changesets. GitHub Actions handles version bumps and npm publishing. | [GitHub](https://github.com/changesets/changesets) |

## AI & Code Review

| Tool                             | Purpose             | Configuration                                         | Documentation                          |
| -------------------------------- | ------------------- | ----------------------------------------------------- | -------------------------------------- |
| [Claude Code](https://claude.ai) | AI coding assistant | `AGENTS.md` (source of truth), `CLAUDE.md` (symlink). | [Anthropic](https://www.anthropic.com) |

## Design Rationale

### Why Vercel AI SDK?

The Vercel AI SDK (`ai` package) provides a unified interface for interacting with LLMs:

- Provider-agnostic model calls (OpenAI, Anthropic, Google, etc.)
- Built-in tool calling with typed parameters via Zod
- Streaming support for real-time responses
- TypeScript-first design with full type inference

### Why OpenRouter?

OpenRouter provides multi-model routing through a single API:

- Access to 100+ models from different providers
- Automatic fallback and load balancing
- Unified billing and rate limiting
- No vendor lock-in

### Why ts-pattern?

TypeScript's `switch` statements don't provide exhaustive type narrowing. `ts-pattern` gives us:

- Exhaustive matching enforced at compile time
- Type narrowing based on discriminated unions
- Expression-based (returns values, not statements)
- Cleaner syntax for complex conditionals

### Why es-toolkit?

Lodash is imperative and mutable. Ramda is powerful but has a steep learning curve. es-toolkit provides:

- Tree-shakeable ESM modules (smaller bundles)
- TypeScript-first design (better inference)
- Functional patterns without the Ramda complexity
- Modern ESNext features (uses native methods when available)
- `attempt()` for wrapping unsafe operations into Result tuples

### Why Zod?

Runtime validation is critical for config files, prompt schemas, and API boundaries. Zod provides:

- Static type inference from schemas (no duplication)
- Composable validators (`.refine()`, `.transform()`)
- Readable error messages
- Integration with Vercel AI SDK tool parameters

### Why Vitest?

Jest is slow and requires heavy configuration. Vitest provides:

- Native ESM support (no transpilation needed)
- Blazing fast with Vite's transformation pipeline
- Compatible with Jest's API (easy migration)
- First-class TypeScript support
- Watch mode that actually works

### Why LiquidJS?

LiquidJS provides a safe, sandboxed template engine for prompt authoring:

- No arbitrary code execution in templates
- Familiar syntax (based on Shopify Liquid)
- Partials and includes for template composition
- Custom filters and tags

## Version Requirements

| Requirement | Minimum Version | Reason                                                |
| ----------- | --------------- | ----------------------------------------------------- |
| Node.js     | 24.x            | Latest LTS, native ESM, modern JavaScript features    |
| pnpm        | 9.x             | Workspace protocol, catalog protocol, better lockfile |
| TypeScript  | 5.9.x           | Latest type features, improved inference              |

## Excluded Technologies

These technologies are **not used** in this codebase:

| Technology | Reason for Exclusion                                            |
| ---------- | --------------------------------------------------------------- |
| Classes    | Violates functional programming persona. Use factory functions. |
| Lodash     | Imperative, mutable. Use es-toolkit.                            |
| Ramda      | Overly complex for this use case. Use es-toolkit.               |
| ESLint     | Use oxfmt for formatting.                                       |
| Prettier   | Use oxfmt (faster, Rust-based).                                 |
| Jest       | Too slow, poor ESM support. Use Vitest.                         |
| Babel      | Not needed with modern TypeScript + tsdown.                     |
| Webpack    | Use tsdown (faster, simpler).                                   |

## References

- [Architecture](./architecture.md) for how these tools fit together
- [TypeScript Coding Style](../standards/typescript/coding-style.md) for usage patterns
- [TypeScript Utilities](../standards/typescript/utilities.md) for es-toolkit patterns
