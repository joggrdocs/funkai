import { defineConfig } from "@zpress/kit";

export default defineConfig({
  title: "funkai",
  description: "Funk-tional AI SDK framework",
  tagline:
    "A composable AI microframework built on ai-sdk, curried with funk-tional programming flair.",
  theme: {
    name: "arcade",
  },
  workspaces: [
    {
      title: "Packages",
      icon: "pixelarticons:folder",
      items: [
        {
          title: "@funkai/agents",
          description:
            "Composable agents, flow orchestration, tools, and Result-based error handling — all without classes",
          icon: "pixelarticons:robot",
          path: "/agents",
          tags: [],
        },
        {
          title: "@funkai/models",
          description:
            "Query 300+ models by capability, resolve providers by string ID, and track token costs in dollars",
          icon: "pixelarticons:coin",
          path: "/models",
          tags: [],
        },
        {
          title: "@funkai/prompts",
          description:
            "Type-safe prompt files with LiquidJS templates, YAML frontmatter, and Zod-validated inputs",
          icon: "pixelarticons:message-text",
          path: "/prompts",
          tags: [],
        },
        {
          title: "@funkai/cli",
          description: "Generate, lint, and scaffold prompt files from the terminal",
          icon: "pixelarticons:terminal",
          path: "/cli",
          tags: [],
        },
      ],
    },
  ],
  sections: [
    // ── Root ──
    {
      title: "Introduction",
      path: "/introduction",
      icon: "pixelarticons:book-open",
      include: "docs/introduction.md",
      hidden: true,
    },
    {
      title: "Quick Start",
      path: "/quick-start",
      icon: "pixelarticons:speed-fast",
      include: "docs/quick-start.md",
      hidden: true,
    },
    {
      title: "Principles",
      path: "/principles",
      icon: "pixelarticons:label",
      include: "docs/principles.md",
      hidden: true,
    },
    {
      title: "Architecture",
      path: "/architecture",
      icon: "pixelarticons:layout-sidebar-right",
      include: "docs/architecture.md",
      hidden: true,
    },

    // ── Agents ──
    {
      title: "Agents",
      icon: "pixelarticons:robot",
      frontmatter: {
        description:
          "Composable agents, flow orchestration, tools, and Result-based error handling — all without classes",
      },
      items: [
        {
          title: "Overview",
          path: "/agents",
          include: "packages/agents/docs/overview.md",
        },
        {
          title: "Core",
          path: "/agents/core",
          items: [
            {
              title: "Overview",
              path: "/agents/core/overview",
              include: "packages/agents/docs/core/overview.md",
            },
            {
              title: "Agent",
              path: "/agents/core/agent",
              include: "packages/agents/docs/core/agent.md",
            },
            {
              title: "Flow Agent",
              path: "/agents/core/flow-agent",
              include: "packages/agents/docs/core/flow-agent.md",
            },
            {
              title: "Step",
              path: "/agents/core/step",
              include: "packages/agents/docs/core/step.md",
            },
            {
              title: "Tools",
              path: "/agents/core/tools",
              include: "packages/agents/docs/core/tools.md",
            },
            {
              title: "Hooks",
              path: "/agents/core/hooks",
              include: "packages/agents/docs/core/hooks.md",
            },
            {
              title: "Context",
              path: "/agents/core/context",
              include: "packages/agents/docs/core/context.md",
            },
            {
              title: "Middleware",
              path: "/agents/core/middleware",
              include: "packages/agents/docs/core/middleware.md",
            },
            {
              title: "Tracing",
              path: "/agents/core/tracing",
              include: "packages/agents/docs/core/tracing.md",
            },
          ],
        },
        {
          title: "Advanced",
          path: "/agents/advanced",
          items: [
            {
              title: "Custom Steps",
              path: "/agents/advanced/custom-steps",
              include: "packages/agents/docs/advanced/custom-steps.md",
            },
            {
              title: "Streaming",
              path: "/agents/advanced/streaming",
              include: "packages/agents/docs/advanced/streaming.md",
            },
          ],
        },
        {
          title: { from: "heading" },
          path: "/agents/guides",
          include: "packages/agents/docs/guides/*.md",
          sort: "alpha",
        },
        {
          title: "Reference",
          path: "/agents/reference",
          items: [
            {
              title: "Types",
              path: "/agents/reference/types",
              include: "packages/agents/docs/core/types.md",
            },
            {
              title: "Output Strategies",
              path: "/agents/reference/output-strategies",
              include: "packages/agents/docs/reference/output-strategies.md",
            },
            {
              title: "Token Usage",
              path: "/agents/reference/token-usage",
              include: "packages/agents/docs/provider/usage.md",
            },
          ],
        },
        {
          title: "Provider",
          path: "/agents/provider",
          items: [
            {
              title: "Overview",
              path: "/agents/provider/overview",
              include: "packages/agents/docs/provider/overview.md",
            },
            {
              title: "Models",
              path: "/agents/provider/models",
              include: "packages/agents/docs/provider/models.md",
            },
          ],
        },
        {
          title: "Troubleshooting",
          path: "/agents/troubleshooting",
          include: "packages/agents/docs/troubleshooting.md",
        },
      ],
    },

    // ── Models ──
    {
      title: "Models",
      icon: "pixelarticons:coin",
      frontmatter: {
        description:
          "Query 300+ models by capability, resolve providers by string ID, and track token costs in dollars",
      },
      items: [
        {
          title: "Overview",
          path: "/models",
          include: "packages/models/docs/overview.md",
        },
        {
          title: "Catalog",
          path: "/models/catalog",
          items: [
            {
              title: "Overview",
              path: "/models/catalog/overview",
              include: "packages/models/docs/catalog/overview.md",
            },
            {
              title: "Filtering",
              path: "/models/catalog/filtering",
              include: "packages/models/docs/catalog/filtering.md",
            },
            {
              title: "Providers",
              path: "/models/catalog/providers",
              include: "packages/models/docs/catalog/providers.md",
            },
          ],
        },
        {
          title: "Provider",
          path: "/models/provider",
          items: [
            {
              title: "Overview",
              path: "/models/provider/overview",
              include: "packages/models/docs/provider/overview.md",
            },
            {
              title: "Configuration",
              path: "/models/provider/configuration",
              include: "packages/models/docs/provider/configuration.md",
            },
            {
              title: "OpenRouter",
              path: "/models/provider/openrouter",
              include: "packages/models/docs/provider/openrouter.md",
            },
          ],
        },
        {
          title: "Cost",
          path: "/models/cost",
          include: "packages/models/docs/cost/overview.md",
        },
        {
          title: { from: "heading" },
          path: "/models/guides",
          include: "packages/models/docs/guides/*.md",
          sort: "alpha",
        },
        {
          title: "Troubleshooting",
          path: "/models/troubleshooting",
          include: "packages/models/docs/troubleshooting.md",
        },
      ],
    },

    // ── Prompts ──
    {
      title: "Prompts",
      icon: "pixelarticons:message-text",
      frontmatter: {
        description:
          "Type-safe prompt files with LiquidJS templates, YAML frontmatter, and Zod-validated inputs",
      },
      items: [
        {
          title: "Overview",
          path: "/prompts",
          include: "packages/prompts/docs/overview.md",
        },
        {
          title: "File Format",
          path: "/prompts/file-format",
          items: [
            {
              title: "Overview",
              path: "/prompts/file-format/overview",
              include: "packages/prompts/docs/file-format/overview.md",
            },
            {
              title: "Frontmatter",
              path: "/prompts/file-format/frontmatter",
              include: "packages/prompts/docs/file-format/frontmatter.md",
            },
            {
              title: "Partials",
              path: "/prompts/file-format/partials",
              include: "packages/prompts/docs/file-format/partials.md",
            },
          ],
        },
        {
          title: "Code Generation",
          path: "/prompts/codegen/overview",
          include: "packages/prompts/docs/codegen/overview.md",
        },
        {
          title: "Library",
          path: "/prompts/library/overview",
          include: "packages/prompts/docs/library/overview.md",
        },
        {
          title: { from: "heading" },
          path: "/prompts/guides",
          include: "packages/prompts/docs/guides/*.md",
          sort: "alpha",
        },
        {
          title: "Troubleshooting",
          path: "/prompts/troubleshooting",
          include: "packages/prompts/docs/troubleshooting.md",
        },
      ],
    },

    // ── CLI ──
    {
      title: "CLI",
      icon: "pixelarticons:terminal",
      frontmatter: {
        description: "Generate, lint, and scaffold prompt files from the terminal",
      },
      items: [
        {
          title: "Overview",
          path: "/cli",
          include: "packages/prompts/docs/cli/overview.md",
        },
        {
          title: "Commands",
          path: "/cli/commands",
          include: "packages/prompts/docs/cli/commands.md",
        },
      ],
    },

    // ── Examples ──
    {
      title: "Examples",
      icon: "pixelarticons:file-alt",
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
      icon: "pixelarticons:git-merge",
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
