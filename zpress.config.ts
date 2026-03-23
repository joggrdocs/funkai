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
      title: "Agents",
      description:
        "Composable agents, flow orchestration, tools, and Result-based error handling — all without classes",
      icon: "mdi:robot-outline",
      link: "/agents",
    },
    {
      title: "Models",
      description:
        "Query 300+ models by capability, resolve providers by string ID, and track token costs in dollars",
      icon: "mdi:currency-usd",
      link: "/models",
    },
    {
      title: "Prompts",
      description:
        "Type-safe prompt files with LiquidJS templates, YAML frontmatter, and Zod-validated inputs",
      icon: "mdi:message-text-outline",
      link: "/prompts",
    },
    {
      title: "CLI",
      description: "Generate, lint, and scaffold prompt files from the terminal",
      icon: "mdi:console",
      link: "/cli",
    },
  ],
  workspaces: [
    {
      title: "Packages",
      description: "The funkai ecosystem",
      icon: "mdi:package-variant-closed",
      items: [
        {
          title: "@funkai/agents",
          description:
            "Composable agents, flow orchestration, tools, and Result-based error handling — all without classes",
          icon: "mdi:robot-outline",
          path: "/agents",
        },
        {
          title: "@funkai/models",
          description:
            "Query 300+ models by capability, resolve providers by string ID, and track token costs in dollars",
          icon: "mdi:currency-usd",
          path: "/models",
        },
        {
          title: "@funkai/prompts",
          description:
            "Type-safe prompt files with LiquidJS templates, YAML frontmatter, and Zod-validated inputs",
          icon: "mdi:message-text-outline",
          path: "/prompts",
        },
        {
          title: "@funkai/cli",
          description: "Generate, lint, and scaffold prompt files from the terminal",
          icon: "mdi:console",
          path: "/cli",
        },
      ],
    },
  ],
  sections: [
    // ── Root ──
    {
      title: "Introduction",
      path: "/introduction",
      icon: "mdi:book-open-variant",
      include: "docs/introduction.md",
      hidden: true,
    },
    {
      title: "Quick Start",
      path: "/quick-start",
      icon: "mdi:rocket-launch-outline",
      include: "docs/quick-start.md",
      hidden: true,
    },
    {
      title: "Principles",
      path: "/principles",
      icon: "mdi:compass-outline",
      include: "docs/principles.md",
      hidden: true,
    },
    {
      title: "Architecture",
      path: "/architecture",
      icon: "mdi:sitemap-outline",
      include: "docs/architecture.md",
      hidden: true,
    },

    // ── Packages (README only) ──
    {
      title: "Agents",
      path: "/agents",
      icon: "mdi:robot-outline",
      include: "packages/agents/README.md",
    },
    {
      title: "Models",
      path: "/models",
      icon: "mdi:currency-usd",
      include: "packages/models/README.md",
    },
    {
      title: "Prompts",
      path: "/prompts",
      icon: "mdi:message-text-outline",
      include: "packages/prompts/README.md",
    },
    {
      title: "CLI",
      path: "/cli",
      icon: "mdi:console",
      include: "packages/cli/README.md",
    },

    // ── Reference ──
    {
      title: "Reference",
      icon: "mdi:book-open-page-variant-outline",
      items: [
        {
          title: "Agents",
          path: "/reference/agents",
          items: [
            {
              title: "Overview",
              path: "/reference/agents",
              include: "packages/agents/docs/overview.md",
            },
            {
              title: "Core",
              path: "/reference/agents/core",
              items: [
                {
                  title: "Overview",
                  path: "/reference/agents/core/overview",
                  include: "packages/agents/docs/core/overview.md",
                },
                {
                  title: "Agent",
                  path: "/reference/agents/core/agent",
                  include: "packages/agents/docs/core/agent.md",
                },
                {
                  title: "Flow Agent",
                  path: "/reference/agents/core/flow-agent",
                  include: "packages/agents/docs/core/flow-agent.md",
                },
                {
                  title: "Step",
                  path: "/reference/agents/core/step",
                  include: "packages/agents/docs/core/step.md",
                },
                {
                  title: "Tools",
                  path: "/reference/agents/core/tools",
                  include: "packages/agents/docs/core/tools.md",
                },
                {
                  title: "Hooks",
                  path: "/reference/agents/core/hooks",
                  include: "packages/agents/docs/core/hooks.md",
                },
                {
                  title: "Context",
                  path: "/reference/agents/core/context",
                  include: "packages/agents/docs/core/context.md",
                },
                {
                  title: "Middleware",
                  path: "/reference/agents/core/middleware",
                  include: "packages/agents/docs/core/middleware.md",
                },
                {
                  title: "Tracing",
                  path: "/reference/agents/core/tracing",
                  include: "packages/agents/docs/core/tracing.md",
                },
                {
                  title: "Types",
                  path: "/reference/agents/core/types",
                  include: "packages/agents/docs/core/types.md",
                },
              ],
            },
            {
              title: "Advanced",
              path: "/reference/agents/advanced",
              items: [
                {
                  title: "Custom Steps",
                  path: "/reference/agents/advanced/custom-steps",
                  include: "packages/agents/docs/advanced/custom-steps.md",
                },
                {
                  title: "Streaming",
                  path: "/reference/agents/advanced/streaming",
                  include: "packages/agents/docs/advanced/streaming.md",
                },
              ],
            },
            {
              title: "Output Strategies",
              path: "/reference/agents/output-strategies",
              include: "packages/agents/docs/reference/output-strategies.md",
            },
            {
              title: "Provider",
              path: "/reference/agents/provider",
              items: [
                {
                  title: "Overview",
                  path: "/reference/agents/provider/overview",
                  include: "packages/agents/docs/provider/overview.md",
                },
                {
                  title: "Models",
                  path: "/reference/agents/provider/models",
                  include: "packages/agents/docs/provider/models.md",
                },
                {
                  title: "Token Usage",
                  path: "/reference/agents/provider/usage",
                  include: "packages/agents/docs/provider/usage.md",
                },
              ],
            },
            {
              title: "Troubleshooting",
              path: "/reference/agents/troubleshooting",
              include: "packages/agents/docs/troubleshooting.md",
            },
          ],
        },
        {
          title: "Models",
          path: "/reference/models",
          items: [
            {
              title: "Overview",
              path: "/reference/models",
              include: "packages/models/docs/overview.md",
            },
            {
              title: "Catalog",
              path: "/reference/models/catalog",
              items: [
                {
                  title: "Overview",
                  path: "/reference/models/catalog/overview",
                  include: "packages/models/docs/catalog/overview.md",
                },
                {
                  title: "Filtering",
                  path: "/reference/models/catalog/filtering",
                  include: "packages/models/docs/catalog/filtering.md",
                },
                {
                  title: "Providers",
                  path: "/reference/models/catalog/providers",
                  include: "packages/models/docs/catalog/providers.md",
                },
              ],
            },
            {
              title: "Provider",
              path: "/reference/models/provider",
              items: [
                {
                  title: "Overview",
                  path: "/reference/models/provider/overview",
                  include: "packages/models/docs/provider/overview.md",
                },
                {
                  title: "Configuration",
                  path: "/reference/models/provider/configuration",
                  include: "packages/models/docs/provider/configuration.md",
                },
                {
                  title: "OpenRouter",
                  path: "/reference/models/provider/openrouter",
                  include: "packages/models/docs/provider/openrouter.md",
                },
              ],
            },
            {
              title: "Cost",
              path: "/reference/models/cost",
              include: "packages/models/docs/cost/overview.md",
            },
            {
              title: "Troubleshooting",
              path: "/reference/models/troubleshooting",
              include: "packages/models/docs/troubleshooting.md",
            },
          ],
        },
        {
          title: "Prompts",
          path: "/reference/prompts",
          items: [
            {
              title: "Overview",
              path: "/reference/prompts",
              include: "packages/prompts/docs/overview.md",
            },
            {
              title: "File Format",
              path: "/reference/prompts/file-format",
              items: [
                {
                  title: "Overview",
                  path: "/reference/prompts/file-format/overview",
                  include: "packages/prompts/docs/file-format/overview.md",
                },
                {
                  title: "Frontmatter",
                  path: "/reference/prompts/file-format/frontmatter",
                  include: "packages/prompts/docs/file-format/frontmatter.md",
                },
                {
                  title: "Partials",
                  path: "/reference/prompts/file-format/partials",
                  include: "packages/prompts/docs/file-format/partials.md",
                },
              ],
            },
            {
              title: "Code Generation",
              path: "/reference/prompts/codegen",
              include: "packages/prompts/docs/codegen/overview.md",
            },
            {
              title: "Library",
              path: "/reference/prompts/library",
              include: "packages/prompts/docs/library/overview.md",
            },
            {
              title: "Troubleshooting",
              path: "/reference/prompts/troubleshooting",
              include: "packages/prompts/docs/troubleshooting.md",
            },
          ],
        },
        {
          title: "CLI",
          path: "/reference/cli",
          items: [
            {
              title: "Overview",
              path: "/reference/cli",
              include: "packages/prompts/docs/cli/overview.md",
            },
            {
              title: "Commands",
              path: "/reference/cli/commands",
              include: "packages/prompts/docs/cli/commands.md",
            },
          ],
        },
      ],
    },

    // ── Guides ──
    {
      title: "Guides",
      icon: "mdi:map-outline",
      items: [
        {
          title: "Agents",
          path: "/guides/agents",
          items: [
            {
              title: { from: "heading" },
              path: "/guides/agents",
              include: "packages/agents/docs/guides/*.md",
              sort: "alpha",
            },
          ],
        },
        {
          title: "Models",
          path: "/guides/models",
          items: [
            {
              title: { from: "heading" },
              path: "/guides/models",
              include: "packages/models/docs/guides/*.md",
              sort: "alpha",
            },
          ],
        },
        {
          title: "Prompts",
          path: "/guides/prompts",
          items: [
            {
              title: { from: "heading" },
              path: "/guides/prompts",
              include: "packages/prompts/docs/guides/*.md",
              sort: "alpha",
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
