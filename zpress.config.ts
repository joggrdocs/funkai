import { defineConfig } from "@zpress/kit";

export default defineConfig({
  title: "funkai",
  description: "Funk-tional AI SDK framework",
  tagline:
    "A composable AI microframework built on ai-sdk, curried with funk-tional programming flair.",
  theme: {
    switcher: true,
  },
  packages: [
    {
      title: "@funkai/agents",
      description: "Lightweight workflow and agent orchestration framework",
      icon: "pixelarticons:robot",
      prefix: "/agents",
      tags: [],
      discovery: {},
    },
    {
      title: "@funkai/prompts",
      description: "Prompt SDK with LiquidJS templating and Zod validation",
      icon: "pixelarticons:message-text",
      prefix: "/prompts",
      tags: [],
      discovery: {},
    },
    {
      title: "@funkai/cli",
      description: "CLI for the funkai prompt SDK",
      icon: "pixelarticons:terminal",
      prefix: "/cli",
      tags: [],
      discovery: {},
    },
  ],
  sections: [
    // ── Getting Started ──
    {
      title: "Getting Started",
      link: "/getting-started",
      icon: "pixelarticons:speed-fast",
      content: [
        "# Getting Started",
        "",
        "funkai is a lightweight, functional TypeScript framework for AI agent orchestration.",
        "",
        "## Packages",
        "",
        "| Package | Description |",
        "| --- | --- |",
        "| [`@funkai/agents`](/agents/) | Lightweight workflow and agent orchestration framework |",
        "| [`@funkai/prompts`](/prompts/) | Prompt SDK with LiquidJS templating and Zod validation |",
        "| [`@funkai/cli`](/cli/) | CLI for the funkai prompt SDK |",
        "",
        "## Quick Start",
        "",
        "```bash",
        "pnpm add @funkai/agents",
        "```",
        "",
        "Then check out the [Agents overview](/agents/) or the [Create an Agent guide](/agents/guides/create-agent).",
      ].join("\n"),
    },

    // ── Agents ──
    {
      title: "Agents",
      icon: "pixelarticons:robot",
      content: "Lightweight workflow and agent orchestration framework",
      items: [
        {
          title: "Overview",
          link: "/agents/",
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
              title: "Workflow",
              link: "/agents/core/workflow",
              from: "packages/agents/docs/core/workflow.md",
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
            {
              title: "Usage",
              link: "/agents/provider/usage",
              from: "packages/agents/docs/provider/usage.md",
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

    // ── Prompts ──
    {
      title: "Prompts",
      icon: "pixelarticons:message-text",
      frontmatter: {
        description: "Prompt SDK with LiquidJS templating and Zod validation",
      },
      items: [
        {
          title: "Overview",
          link: "/prompts/",
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
          title: "CLI",
          prefix: "/prompts/cli",
          items: [
            {
              title: "Overview",
              link: "/prompts/cli/overview",
              from: "packages/prompts/docs/cli/overview.md",
            },
            {
              title: "Commands",
              link: "/prompts/cli/commands",
              from: "packages/prompts/docs/cli/commands.md",
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
      link: "/cli/",
      from: "packages/cli/README.md",
    },

    // ── Contributing ──
    {
      title: "Contributing",
      icon: "pixelarticons:git-merge",
      isolated: true,
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
