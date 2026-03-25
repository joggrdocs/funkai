import { defineConfig } from "@zpress/kit";

export default defineConfig({
  title: "funkai",
  description: "Funk-tional AI SDK framework",
  tagline:
    "A composable AI microframework built on ai-sdk, curried with funk-tional programming flair.",
  theme: {
    name: "arcade",
  },
  actions: [
    {
      theme: "brand",
      text: "Quick Start",
      link: "/quick-start",
    },
    {
      theme: "alt",
      text: "Introduction",
      link: "/introduction",
    },
  ],
  features: [
    {
      title: "Functions All the Way Down",
      description:
        "agent(), tool(), flowAgent() are plain functions returning composable objects. No classes, no decorators, no inheritance — just functions you can read top to bottom.",
      icon: "mdi:lambda",
      link: "/concepts/agents",
    },
    {
      title: "One API, Zero Workflows",
      description:
        "agent() for single-turn, flowAgent() for multi-step — same programming model, same hooks, same tools. No workflow DSL to learn, no orchestrator to configure. Just functions that compose.",
      icon: "mdi:puzzle-outline",
      link: "/concepts/flow-agents",
    },
    {
      title: "Type-Safe Prompts",
      description:
        "Write .prompt files with YAML frontmatter and LiquidJS templates. Build-time codegen produces fully typed TypeScript modules with Zod validation.",
      icon: "mdi:file-code-outline",
      link: "/concepts/prompts",
    },
  ],
  packages: [
    {
      title: "@funkai/agents",
      description: "Agent orchestration SDK",
      icon: "mdi:robot-outline",
      path: "/packages/agents",
    },
    {
      title: "@funkai/models",
      description: "Model catalog and cost calculation",
      icon: "mdi:currency-usd",
      path: "/packages/models",
    },
    {
      title: "@funkai/prompts",
      description: "Prompt templating library",
      icon: "mdi:message-text-outline",
      path: "/packages/prompts",
    },
    {
      title: "@funkai/cli",
      description: "Prompt CLI tooling",
      icon: "mdi:console",
      path: "/packages/cli",
    },
  ],
  sections: [
    // ── Getting Started ──
    {
      title: "Getting Started",
      icon: "mdi:rocket-launch-outline",
      items: [
        {
          title: "Introduction",
          path: "/introduction",
          include: "docs/introduction.md",
        },
        {
          title: "Quick Start",
          path: "/quick-start",
          include: "docs/quick-start.md",
        },
      ],
    },

    // ── Concepts ──
    {
      title: "Concepts",
      icon: "mdi:lightbulb-outline",
      items: [
        {
          title: "Agents",
          path: "/concepts/agents",
          include: "docs/concepts/agents.md",
        },
        {
          title: "Flow Agents",
          path: "/concepts/flow-agents",
          include: "docs/concepts/flow-agents.md",
        },
        {
          title: "Tools",
          path: "/concepts/tools",
          include: "docs/concepts/tools.md",
        },
        {
          title: "Prompts",
          path: "/concepts/prompts",
          include: "docs/concepts/prompts.md",
        },
        {
          title: "Models",
          path: "/concepts/models",
          include: "docs/concepts/models.md",
        },
      ],
    },

    // ── Guides ──
    {
      title: "Guides",
      icon: "mdi:book-open-page-variant-outline",
      items: [
        {
          title: "Streaming",
          path: "/guides/streaming",
          include: "packages/agents/docs/streaming.md",
        },
        {
          title: "Testing",
          path: "/guides/testing",
          include: "packages/agents/docs/test-agents.md",
        },
        {
          title: "Error Recovery",
          path: "/guides/error-recovery",
          include: "packages/agents/docs/error-recovery.md",
        },
        {
          title: "Multi-Agent Orchestration",
          path: "/guides/multi-agent",
          include: "packages/agents/docs/multi-agent-orchestration.md",
        },
        {
          title: "Cost Tracking",
          path: "/guides/cost-tracking",
          include: "packages/agents/docs/cost-tracking.md",
        },
      ],
    },

    // ── Reference ──
    {
      title: "Reference",
      icon: "mdi:code-braces",
      items: [
        {
          title: "@funkai/agents",
          items: [
            {
              title: "agent()",
              path: "/reference/agents/agent",
              include: "docs/reference/agent.md",
            },
            {
              title: "flowAgent()",
              path: "/reference/agents/flow-agent",
              include: "docs/reference/flow-agent.md",
            },
            {
              title: "tool()",
              path: "/reference/agents/tool",
              include: "docs/reference/tool.md",
            },
          ],
        },
        {
          title: "@funkai/models",
          items: [
            {
              title: "model()",
              path: "/reference/models/model",
              include: "docs/reference/model.md",
            },
            {
              title: "models()",
              path: "/reference/models/models",
              include: "docs/reference/models.md",
            },
            {
              title: "createProviderRegistry()",
              path: "/reference/models/provider-registry",
              include: "docs/reference/provider-registry.md",
            },
            {
              title: "calculateCost()",
              path: "/reference/models/calculate-cost",
              include: "docs/reference/calculate-cost.md",
            },
          ],
        },
        {
          title: "@funkai/prompts",
          items: [
            {
              title: "createPrompt()",
              path: "/reference/prompts/create-prompt",
              include: "docs/reference/create-prompt.md",
            },
            {
              title: "createPromptGroup()",
              path: "/reference/prompts/create-prompt-group",
              include: "docs/reference/create-prompt-group.md",
            },
            {
              title: "createPromptRegistry()",
              path: "/reference/prompts/create-prompt-registry",
              include: "docs/reference/create-prompt-registry.md",
            },
            {
              title: "CLI",
              path: "/reference/prompts/cli",
              include: "docs/reference/prompts-cli.md",
            },
          ],
        },
      ],
    },

    // ── Packages (standalone — READMEs with nested Changelogs) ──
    {
      title: "Packages",
      icon: "mdi:package-variant-closed",
      standalone: true,
      items: [
        {
          title: "@funkai/agents",
          path: "/packages/agents",
          include: "packages/agents/README.md",
          items: [
            {
              title: "Changelog",
              path: "/packages/agents/changelog",
              include: "packages/agents/CHANGELOG.md",
            },
          ],
        },
        {
          title: "@funkai/models",
          path: "/packages/models",
          include: "packages/models/README.md",
          items: [
            {
              title: "Changelog",
              path: "/packages/models/changelog",
              include: "packages/models/CHANGELOG.md",
            },
          ],
        },
        {
          title: "@funkai/prompts",
          path: "/packages/prompts",
          include: "packages/prompts/README.md",
          items: [
            {
              title: "Changelog",
              path: "/packages/prompts/changelog",
              include: "packages/prompts/CHANGELOG.md",
            },
          ],
        },
        {
          title: "@funkai/cli",
          path: "/packages/cli",
          include: "packages/cli/README.md",
          items: [
            {
              title: "Changelog",
              path: "/packages/cli/changelog",
              include: "packages/cli/CHANGELOG.md",
            },
          ],
        },
      ],
    },

    // ── Examples ──
    {
      title: "Examples",
      icon: "mdi:file-document-outline",
      items: [
        {
          title: "Basic Agent",
          path: "/examples/basic-agent",
          include: "examples/basic-agent/README.md",
        },
        {
          title: "Flow Agent",
          path: "/examples/flow-agent",
          include: "examples/flow-agent/README.md",
        },
        {
          title: "Flow Agent Steps",
          path: "/examples/flow-agent-steps",
          include: "examples/flow-agent-steps/README.md",
        },
        {
          title: "Streaming",
          path: "/examples/streaming",
          include: "examples/streaming/README.md",
        },
        {
          title: "Prompts Basic",
          path: "/examples/prompts-basic",
          include: "examples/prompts-basic/README.md",
        },
        {
          title: "Prompts with Sub-Agents",
          path: "/examples/prompts-subagents",
          include: "examples/prompts-subagents/README.md",
        },
        {
          title: "Real-World CLI",
          path: "/examples/realworld-cli",
          include: "examples/realworld-cli/README.md",
        },
      ],
    },

    // ── Contributing ──
    {
      title: "Contributing",
      icon: "mdi:source-merge",
      standalone: true,
      hidden: true,
      items: [
        {
          title: "Overview",
          path: "/contributing/overview",
          include: "contributing/README.md",
        },
        {
          title: { from: "heading" },
          path: "/contributing/concepts",
          include: "contributing/concepts/*.md",
          sort: "alpha",
        },
        {
          title: { from: "heading" },
          path: "/contributing/guides",
          include: "contributing/guides/*.md",
          sort: "alpha",
        },
        {
          title: "Standards",
          items: [
            {
              title: { from: "heading" },
              path: "/contributing/standards/typescript",
              include: "contributing/standards/typescript/*.md",
              sort: "alpha",
            },
            {
              title: { from: "heading" },
              path: "/contributing/standards/documentation",
              include: "contributing/standards/documentation/*.md",
              sort: "alpha",
            },
            {
              title: { from: "heading" },
              path: "/contributing/standards/git",
              include: "contributing/standards/git-*.md",
              sort: "alpha",
            },
          ],
        },
      ],
    },
  ],
});
