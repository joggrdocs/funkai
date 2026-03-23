import { defineConfig } from "@zpress/kit";

export default defineConfig({
  title: "funkai",
  description: "Funk-tional AI SDK framework",
  tagline:
    "A composable AI microframework built on ai-sdk, curried with funk-tional programming flair.",
  theme: {
    name: "arcade",
  },
  packages: [
    {
      title: "@funkai/agents",
      description:
        "Composable agents, flow orchestration, tools, and Result-based error handling — all without classes",
      icon: "pixelarticons:robot",
      prefix: "/agents",
      tags: [],
    },
    {
      title: "@funkai/models",
      description:
        "Query 300+ models by capability, resolve providers by string ID, and track token costs in dollars",
      icon: "pixelarticons:coin",
      prefix: "/models",
      tags: [],
    },
    {
      title: "@funkai/prompts",
      description:
        "Type-safe prompt files with LiquidJS templates, YAML frontmatter, and Zod-validated inputs",
      icon: "pixelarticons:message-text",
      prefix: "/prompts",
      tags: [],
    },
    {
      title: "@funkai/cli",
      description: "Generate, lint, and scaffold prompt files from the terminal",
      icon: "pixelarticons:terminal",
      prefix: "/cli",
      tags: [],
    },
  ],
  sections: [
    // ── Root ──
    {
      title: "Introduction",
      link: "/introduction",
      icon: "pixelarticons:book-open",
      from: "docs/introduction.md",
      hidden: true,
    },
    {
      title: "Quick Start",
      link: "/quick-start",
      icon: "pixelarticons:speed-fast",
      from: "docs/quick-start.md",
      hidden: true,
    },
    {
      title: "Principles",
      link: "/principles",
      icon: "pixelarticons:label",
      from: "docs/principles.md",
      hidden: true,
    },
    {
      title: "Architecture",
      link: "/architecture",
      icon: "pixelarticons:layout-sidebar-right",
      from: "docs/architecture.md",
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
          link: "/agents",
          from: "packages/agents/docs/overview.md",
        },
        {
          title: "Core",
          prefix: "/agents/core",
          items: [
            {
              title: "Overview",
              link: "/agents/core/overview",
              from: "packages/agents/docs/core/overview.md",
            },
            {
              title: "Agent",
              link: "/agents/core/agent",
              from: "packages/agents/docs/core/agent.md",
            },
            {
              title: "Flow Agent",
              link: "/agents/core/flow-agent",
              from: "packages/agents/docs/core/flow-agent.md",
            },
            {
              title: "Step",
              link: "/agents/core/step",
              from: "packages/agents/docs/core/step.md",
            },
            {
              title: "Tools",
              link: "/agents/core/tools",
              from: "packages/agents/docs/core/tools.md",
            },
            {
              title: "Hooks",
              link: "/agents/core/hooks",
              from: "packages/agents/docs/core/hooks.md",
            },
            {
              title: "Context",
              link: "/agents/core/context",
              from: "packages/agents/docs/core/context.md",
            },
            {
              title: "Middleware",
              link: "/agents/core/middleware",
              from: "packages/agents/docs/core/middleware.md",
            },
            {
              title: "Tracing",
              link: "/agents/core/tracing",
              from: "packages/agents/docs/core/tracing.md",
            },
          ],
        },
        {
          title: "Advanced",
          prefix: "/agents/advanced",
          items: [
            {
              title: "Custom Steps",
              link: "/agents/advanced/custom-steps",
              from: "packages/agents/docs/advanced/custom-steps.md",
            },
            {
              title: "Streaming",
              link: "/agents/advanced/streaming",
              from: "packages/agents/docs/advanced/streaming.md",
            },
          ],
        },
        {
          title: "Guides",
          prefix: "/agents/guides",
          from: "packages/agents/docs/guides/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Reference",
          prefix: "/agents/reference",
          items: [
            {
              title: "Types",
              link: "/agents/reference/types",
              from: "packages/agents/docs/core/types.md",
            },
            {
              title: "Output Strategies",
              link: "/agents/reference/output-strategies",
              from: "packages/agents/docs/reference/output-strategies.md",
            },
            {
              title: "Token Usage",
              link: "/agents/reference/token-usage",
              from: "packages/agents/docs/provider/usage.md",
            },
          ],
        },
        {
          title: "Provider",
          prefix: "/agents/provider",
          items: [
            {
              title: "Overview",
              link: "/agents/provider/overview",
              from: "packages/agents/docs/provider/overview.md",
            },
            {
              title: "Models",
              link: "/agents/provider/models",
              from: "packages/agents/docs/provider/models.md",
            },
          ],
        },
        {
          title: "Troubleshooting",
          link: "/agents/troubleshooting",
          from: "packages/agents/docs/troubleshooting.md",
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
          link: "/models",
          from: "packages/models/docs/overview.md",
        },
        {
          title: "Catalog",
          prefix: "/models/catalog",
          items: [
            {
              title: "Overview",
              link: "/models/catalog/overview",
              from: "packages/models/docs/catalog/overview.md",
            },
            {
              title: "Filtering",
              link: "/models/catalog/filtering",
              from: "packages/models/docs/catalog/filtering.md",
            },
            {
              title: "Providers",
              link: "/models/catalog/providers",
              from: "packages/models/docs/catalog/providers.md",
            },
          ],
        },
        {
          title: "Provider",
          prefix: "/models/provider",
          items: [
            {
              title: "Overview",
              link: "/models/provider/overview",
              from: "packages/models/docs/provider/overview.md",
            },
            {
              title: "Configuration",
              link: "/models/provider/configuration",
              from: "packages/models/docs/provider/configuration.md",
            },
            {
              title: "OpenRouter",
              link: "/models/provider/openrouter",
              from: "packages/models/docs/provider/openrouter.md",
            },
          ],
        },
        {
          title: "Cost",
          link: "/models/cost",
          from: "packages/models/docs/cost/overview.md",
        },
        {
          title: "Guides",
          prefix: "/models/guides",
          from: "packages/models/docs/guides/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Troubleshooting",
          link: "/models/troubleshooting",
          from: "packages/models/docs/troubleshooting.md",
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
          link: "/prompts",
          from: "packages/prompts/docs/overview.md",
        },
        {
          title: "File Format",
          prefix: "/prompts/file-format",
          items: [
            {
              title: "Overview",
              link: "/prompts/file-format/overview",
              from: "packages/prompts/docs/file-format/overview.md",
            },
            {
              title: "Frontmatter",
              link: "/prompts/file-format/frontmatter",
              from: "packages/prompts/docs/file-format/frontmatter.md",
            },
            {
              title: "Partials",
              link: "/prompts/file-format/partials",
              from: "packages/prompts/docs/file-format/partials.md",
            },
          ],
        },
        {
          title: "Code Generation",
          link: "/prompts/codegen/overview",
          from: "packages/prompts/docs/codegen/overview.md",
        },
        {
          title: "Library",
          link: "/prompts/library/overview",
          from: "packages/prompts/docs/library/overview.md",
        },
        {
          title: "Guides",
          prefix: "/prompts/guides",
          from: "packages/prompts/docs/guides/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Troubleshooting",
          link: "/prompts/troubleshooting",
          from: "packages/prompts/docs/troubleshooting.md",
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
          link: "/cli",
          from: "packages/prompts/docs/cli/overview.md",
        },
        {
          title: "Commands",
          link: "/cli/commands",
          from: "packages/prompts/docs/cli/commands.md",
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
          link: "/examples/realworld-cli",
          from: "examples/realworld-cli/README.md",
        },
      ],
    },

    // ── Contributing ──
    {
      title: "Contributing",
      icon: "pixelarticons:git-merge",
      isolated: true,
      hidden: true,
      items: [
        {
          title: "Overview",
          link: "/contributing/overview",
          from: "contributing/README.md",
        },
        {
          title: "Concepts",
          prefix: "/contributing/concepts",
          from: "contributing/concepts/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Guides",
          prefix: "/contributing/guides",
          from: "contributing/guides/*.md",
          titleFrom: "heading",
          sort: "alpha",
        },
        {
          title: "Standards",
          items: [
            {
              title: "TypeScript",
              prefix: "/contributing/standards/typescript",
              from: "contributing/standards/typescript/*.md",
              titleFrom: "heading",
              sort: "alpha",
            },
            {
              title: "Documentation",
              prefix: "/contributing/standards/documentation",
              from: "contributing/standards/documentation/*.md",
              titleFrom: "heading",
              sort: "alpha",
            },
            {
              title: "Git",
              prefix: "/contributing/standards/git",
              from: "contributing/standards/git-*.md",
              titleFrom: "heading",
              sort: "alpha",
            },
          ],
        },
      ],
    },
  ],
});
