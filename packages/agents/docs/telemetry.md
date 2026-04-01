# Telemetry

funkai agents use the AI SDK's telemetry system to emit [OpenTelemetry](https://opentelemetry.io/) spans for every LLM call. Spans follow the [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) and include token counts, model info, timing, and custom metadata — all captured automatically.

funkai is **backend-agnostic**. You configure an OTel exporter once, enable telemetry on your agents, and spans flow to any compatible backend.

## Enabling Telemetry

Set `telemetry: { isEnabled: true }` on any agent to start emitting spans:

```ts
import { agent } from "@funkai/agents";
import { openai } from "@ai-sdk/openai";

const summarizer = agent({
  name: "summarizer",
  model: openai("gpt-4.1"),
  system: "You summarize text concisely.",
  telemetry: { isEnabled: true },
});
```

When telemetry is enabled, funkai auto-enriches each span with:

- **`functionId`** — defaults to `config.name` (e.g., `"summarizer"`)
- **`metadata["funkai.agentChain"]`** — serialized agent ancestry (e.g., `"pipeline > writer > summarizer"`)

You still need to register an OpenTelemetry `TracerProvider` with an exporter for spans to be sent anywhere. See [Provider Setup](#provider-setup) below.

## Telemetry Metadata

You can attach custom metadata to telemetry spans at both config and per-call levels. Metadata is sent as span attributes and can be used for filtering, grouping, and analysis in your observability backend.

### Config-Level Metadata

Set default metadata for all calls from an agent:

```ts
const myAgent = agent({
  name: "my-agent",
  model: openai("gpt-4.1"),
  telemetry: {
    isEnabled: true,
    functionId: "custom-name", // override auto-set name
    recordInputs: true, // default: true
    recordOutputs: true, // default: true
    metadata: {
      env: "production",
      team: "platform",
    },
  },
});
```

### Per-Call Metadata

Override or extend metadata for a single call:

```ts
await myAgent.generate({
  prompt: "Summarize this document.",
  telemetry: {
    metadata: { userId: "u-456" }, // merged with config metadata
  },
});
```

Per-call scalar fields (`functionId`, `recordInputs`, etc.) override config. Metadata is **shallow-merged** — config and per-call keys are preserved, except reserved system keys like `funkai.agentChain`, which are auto-injected and take precedence.

### Disabling Input/Output Recording

For sensitive data, disable recording without disabling tracing:

```ts
telemetry: {
  isEnabled: true,
  recordInputs: false,
  recordOutputs: false,
}
```

## Custom Tracer

You can provide a custom OTel `Tracer` instance to control which `TracerProvider` is used:

```ts
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-custom-tracer");

const myAgent = agent({
  name: "my-agent",
  model: openai("gpt-4.1"),
  telemetry: {
    isEnabled: true,
    tracer,
  },
});
```

This is useful when you have multiple `TracerProvider` instances and want to route agent spans to a specific one.

## Agent Chain Tracing

When agents delegate to sub-agents, the full chain is captured automatically:

```ts
const researcher = agent({ name: "researcher", model, telemetry: { isEnabled: true } });
const writer = agent({ name: "writer", model, telemetry: { isEnabled: true } });

const orchestrator = agent({
  name: "orchestrator",
  model,
  agents: { researcher, writer },
  telemetry: { isEnabled: true },
});
```

Each span includes `funkai.agentChain` in metadata:

| Agent        | `funkai.agentChain`           |
| ------------ | ----------------------------- |
| orchestrator | `"orchestrator"`              |
| researcher   | `"orchestrator > researcher"` |
| writer       | `"orchestrator > writer"`     |

Parent telemetry settings propagate to sub-agents automatically — you only need to set `telemetry` on the root agent.

## Flow Agent and Flow Engine

### Flow Agent

Telemetry set on a flow agent propagates to all `$.agent()` calls within the flow:

```ts
import { flowAgent } from "@funkai/agents";

const pipeline = flowAgent(
  {
    name: "doc-pipeline",
    input: DocInput,
    output: DocOutput,
    telemetry: { isEnabled: true }, // propagated to all $.agent() calls
  },
  async ({ input, $ }) => {
    await $.agent({ id: "summarize", agent: summarizer, input: input.text });
  },
);
```

### Flow Engine

Set telemetry defaults for all flows created by an engine:

```ts
import { createFlowEngine } from "@funkai/agents";

const engine = createFlowEngine({
  telemetry: { isEnabled: true }, // default for all flows from this engine
});
```

Engine-level telemetry is merged with flow-agent-level (flow wins for scalars, metadata shallow-merged).

## Collected Data

Every LLM call span includes these attributes automatically:

### Span Attributes

| Attribute                        | Description            |
| -------------------------------- | ---------------------- |
| `gen_ai.system`                  | Provider name          |
| `gen_ai.request.model`           | Requested model ID     |
| `gen_ai.response.model`          | Actual model used      |
| `gen_ai.usage.input_tokens`      | Prompt tokens used     |
| `gen_ai.usage.output_tokens`     | Completion tokens used |
| `gen_ai.request.temperature`     | Temperature setting    |
| `gen_ai.response.finish_reasons` | Why generation stopped |
| `ai.telemetry.functionId`        | Agent name (auto-set)  |
| `ai.telemetry.metadata.*`        | Your custom metadata   |

### funkai-Specific Metadata

| Key                 | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `funkai.agentChain` | Serialized agent ancestry (e.g., `"pipeline > writer"`) |

## Precedence

Telemetry settings merge across layers with later layers taking precedence:

```text
FlowEngine.telemetry          (lowest priority)
  -> FlowAgentConfig.telemetry
    -> AgentConfig.telemetry
      -> GenerateParams.telemetry  (highest priority -- per-call override)
```

For scalar fields (`isEnabled`, `functionId`, `recordInputs`, etc.), the later value replaces the earlier. For `metadata`, records are shallow-merged; reserved system keys (for example, `funkai.agentChain`) are then enforced by funkai.

## Provider Setup

funkai works with any OpenTelemetry-compatible backend. Configure your exporter once — spans from all agents flow automatically.

### Braintrust

Braintrust captures AI SDK spans via `BraintrustSpanProcessor`, automatically converting OTel spans into structured traces with full LLM-specific context.

```bash
npm install braintrust @opentelemetry/sdk-node
```

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BraintrustSpanProcessor } from "braintrust";

const sdk = new NodeSDK({
  spanProcessors: [
    new BraintrustSpanProcessor({
      parent: "project_name:my-project",
      filterAISpans: true,
    }),
  ],
});

sdk.start();

// Your agents run after this -- spans flow to Braintrust automatically.
// Call sdk.shutdown() on process exit to flush pending spans.
```

Set `BRAINTRUST_API_KEY` in your environment. Spans appear in the Braintrust project specified by `parent`.

`filterAISpans: true` sends only AI-related spans, reducing noise from other application telemetry.

### VoltAgent

VoltAgent provides an AI agent observability platform with real-time monitoring, session tracking, and a visual agent debugging UI.

```bash
npm install @voltagent/vercel-ai-exporter @opentelemetry/sdk-node
```

```ts
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  traceExporter: new VoltAgentExporter({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
    baseUrl: "https://api.voltagent.dev",
  }),
});

sdk.start();
```

Set `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY` in your environment. Traces appear in the VoltAgent dashboard with full agent chain visibility.

### Langfuse

Langfuse is an open-source LLM observability platform with tracing, metrics, evaluation, and prompt management.

```bash
npm install @langfuse/otel @opentelemetry/sdk-trace-node
```

```ts
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [new LangfuseSpanProcessor()],
});

tracerProvider.register();
```

Set `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_BASEURL` in your environment.

### Laminar

Laminar provides real-time tracing and evaluation for AI pipelines.

```bash
npm install @lmnr-ai/lmnr
```

```ts
import { Laminar } from "@lmnr-ai/lmnr";

Laminar.initialize({ projectApiKey: process.env.LMNR_PROJECT_API_KEY });
```

Laminar patches the global `TracerProvider` -- no additional OTel setup needed.

### PostHog

PostHog provides product analytics with AI trace integration.

```bash
npm install @posthog/ai @opentelemetry/sdk-node
```

```ts
import { PostHogTraceExporter } from "@posthog/ai";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({
  traceExporter: new PostHogTraceExporter({
    apiKey: process.env.POSTHOG_API_KEY,
    host: "https://us.i.posthog.com",
  }),
});

sdk.start();
```

### SigNoz / Jaeger / Generic OTLP

Any backend that accepts OTLP traces works with the standard exporter:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();
```

This works with SigNoz, Jaeger, Grafana Tempo, Datadog, Honeycomb, Axiom, and any OTLP-compatible backend.

## TelemetrySettings Reference

The `telemetry` field on `AgentConfig`, `FlowAgentConfigBase`, and `FlowEngineConfig` accepts a `TelemetrySettings` object:

| Field           | Type                                             | Description                                      |
| --------------- | ------------------------------------------------ | ------------------------------------------------ |
| `isEnabled`     | `boolean`                                        | Enable/disable telemetry (default: `false`)      |
| `recordInputs`  | `boolean`                                        | Record input values (default: `true`)            |
| `recordOutputs` | `boolean`                                        | Record output values (default: `true`)           |
| `functionId`    | `string`                                         | Identifier for the span (auto-set to agent name) |
| `metadata`      | `Record<string, AttributeValue>`                 | Custom key-value pairs                           |
| `tracer`        | `Tracer`                                         | Custom OTel tracer instance                      |
| `integrations`  | `TelemetryIntegration \| TelemetryIntegration[]` | Per-call lifecycle hooks                         |

`TelemetrySettings` is re-exported from `@funkai/agents` for convenience:

```ts
import type { TelemetrySettings } from "@funkai/agents";
```
