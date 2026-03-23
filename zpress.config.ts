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
      link: "/agents",
    },
    {
      title: "One API, Zero Workflows",
      description:
        "agent() for single-turn, flowAgent() for multi-step — same programming model, same hooks, same tools. No workflow DSL to learn, no orchestrator to configure. Just functions that compose.",
      icon: "mdi:puzzle-outline",
      link: "/agents/create-flow-agent",
    },
    {
      title: "Type-Safe Prompts",
      description:
        "Write .prompt files with YAML frontmatter and LiquidJS templates. Build-time codegen produces fully typed TypeScript modules with Zod validation.",
      icon: "mdi:file-code-outline",
      link: "/prompts",
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
        {
          title: "Principles",
          path: "/principles",
          include: "docs/principles.md",
        },
        {
          title: "Architecture",
          path: "/architecture",
          include: "docs/architecture.md",
        },
      ],
    },

    // ── Agents (14 pages) ──
    {
      title: "Agents",
      icon: "mdi:robot-outline",
      items: [
        {
          title: "Overview",
          path: "/agents",
          include: "packages/agents/docs/overview.md",
        },
        {
          title: "Create an Agent",
          path: "/agents/create-agent",
          include: "packages/agents/docs/create-agent.md",
        },
        {
          title: "Create a Flow Agent",
          path: "/agents/create-flow-agent",
          include: "packages/agents/docs/create-flow-agent.md",
        },
        {
          title: "Step Builder ($)",
          path: "/agents/step-builder",
          include: "packages/agents/docs/step-builder.md",
        },
        {
          title: "Tools",
          path: "/agents/tools",
          include: "packages/agents/docs/tools.md",
        },
        {
          title: "Hooks",
          path: "/agents/hooks",
          include: "packages/agents/docs/hooks.md",
        },
        {
          title: "Streaming",
          path: "/agents/streaming",
          include: "packages/agents/docs/streaming.md",
        },
        {
          title: "Middleware",
          path: "/agents/middleware",
          include: "packages/agents/docs/middleware.md",
        },
        {
          title: "Output Strategies",
          path: "/agents/output-strategies",
          include: "packages/agents/docs/output-strategies.md",
        },
        {
          title: "Custom Flow Engine",
          path: "/agents/custom-flow-engine",
          include: "packages/agents/docs/custom-flow-engine.md",
        },
        {
          title: "Testing",
          path: "/agents/testing",
          include: "packages/agents/docs/test-agents.md",
        },
        {
          title: "Cost Tracking",
          path: "/agents/cost-tracking",
          include: "packages/agents/docs/cost-tracking.md",
        },
        {
          title: "Error Recovery",
          path: "/agents/error-recovery",
          include: "packages/agents/docs/error-recovery.md",
        },
        {
          title: "Multi-Agent Orchestration",
          path: "/agents/multi-agent-orchestration",
          include: "packages/agents/docs/multi-agent-orchestration.md",
        },
        {
          title: "Troubleshooting",
          path: "/agents/troubleshooting",
          include: "packages/agents/docs/troubleshooting.md",
        },
      ],
    },

    // ── Models (5 pages) ──
    {
      title: "Models",
      icon: "mdi:currency-usd",
      items: [
        {
          title: "Overview",
          path: "/models",
          include: "packages/models/docs/overview.md",
        },
        {
          title: "Model Catalog",
          path: "/models/catalog",
          include: "packages/models/docs/catalog.md",
        },
        {
          title: "Provider Resolution",
          path: "/models/provider-resolution",
          include: "packages/models/docs/provider-resolution.md",
        },
        {
          title: "Cost Tracking",
          path: "/models/cost-tracking",
          include: "packages/models/docs/cost-tracking.md",
        },
        {
          title: "Troubleshooting",
          path: "/models/troubleshooting",
          include: "packages/models/docs/troubleshooting.md",
        },
      ],
    },

    // ── Prompts (5 pages) ──
    {
      title: "Prompts",
      icon: "mdi:message-text-outline",
      items: [
        {
          title: "Overview",
          path: "/prompts",
          include: "packages/prompts/docs/overview.md",
        },
        {
          title: "File Format",
          path: "/prompts/file-format",
          include: "packages/prompts/docs/file-format.md",
        },
        {
          title: "Code Generation & Library",
          path: "/prompts/codegen",
          include: "packages/prompts/docs/codegen.md",
        },
        {
          title: "Project Setup",
          path: "/prompts/setup",
          include: "packages/prompts/docs/setup.md",
        },
        {
          title: "Troubleshooting",
          path: "/prompts/troubleshooting",
          include: "packages/prompts/docs/troubleshooting.md",
        },
        {
          title: "CLI Commands",
          path: "/prompts/cli",
          include: "packages/prompts/docs/cli.md",
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
