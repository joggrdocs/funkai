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
      text: "@funkai/agents",
      description: "Lightweight workflow and agent orchestration framework",
      icon: "pixelarticons:robot",
      docsPrefix: "/agents",
      tags: [],
    },
    {
      text: "@funkai/prompts",
      description: "Prompt SDK with LiquidJS templating and Zod validation",
      icon: "pixelarticons:message-text",
      docsPrefix: "/prompts",
      tags: [],
    },
    {
      text: "@funkai/cli",
      description: "CLI for the funkai prompt SDK",
      icon: "pixelarticons:terminal",
      docsPrefix: "/cli",
      tags: [],
    },
  ],
  sections: [
    // ── Getting Started ──
    {
      text: "Getting Started",
      description: "Get up and running with the funkai framework",
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
      text: "Agents",
      description: "Lightweight workflow and agent orchestration framework",
      icon: "pixelarticons:robot",
      content: "Lightweight workflow and agent orchestration framework",
      items: [
        {
          text: "Overview",
          link: "/agents/",
          from: "packages/agents/docs/overview.md",
        },
        {
          text: "Core",
          prefix: "/agents/core",
          items: [
            {
              text: "Overview",
              link: "/agents/core/overview",
              from: "packages/agents/docs/core/overview.md",
            },
            {
              text: "Agent",
              link: "/agents/core/agent",
              from: "packages/agents/docs/core/agent.md",
            },
            {
              text: "Workflow",
              link: "/agents/core/workflow",
              from: "packages/agents/docs/core/workflow.md",
            },
            {
              text: "Step",
              link: "/agents/core/step",
              from: "packages/agents/docs/core/step.md",
            },
            {
              text: "Tools",
              link: "/agents/core/tools",
              from: "packages/agents/docs/core/tools.md",
            },
            {
              text: "Hooks",
              link: "/agents/core/hooks",
              from: "packages/agents/docs/core/hooks.md",
            },
          ],
        },
        {
          text: "Guides",
          prefix: "/agents/guides",
          from: "packages/agents/docs/guides/*.md",
          textFrom: "heading",
          sort: "alpha",
        },
        {
          text: "Provider",
          prefix: "/agents/provider",
          items: [
            {
              text: "Overview",
              link: "/agents/provider/overview",
              from: "packages/agents/docs/provider/overview.md",
            },
            {
              text: "Models",
              link: "/agents/provider/models",
              from: "packages/agents/docs/provider/models.md",
            },
            {
              text: "Usage",
              link: "/agents/provider/usage",
              from: "packages/agents/docs/provider/usage.md",
            },
          ],
        },
        {
          text: "Troubleshooting",
          link: "/agents/troubleshooting",
          from: "packages/agents/docs/troubleshooting.md",
        },
      ],
    },

    // ── Prompts ──
    {
      text: "Prompts",
      description: "Prompt SDK with LiquidJS templating and Zod validation",
      icon: "pixelarticons:message-text",
      frontmatter: {
        description: "Prompt SDK with LiquidJS templating and Zod validation",
      },
      items: [
        {
          text: "Overview",
          link: "/prompts/",
          from: "packages/prompts/docs/overview.md",
        },
        {
          text: "File Format",
          prefix: "/prompts/file-format",
          items: [
            {
              text: "Overview",
              link: "/prompts/file-format/overview",
              from: "packages/prompts/docs/file-format/overview.md",
            },
            {
              text: "Frontmatter",
              link: "/prompts/file-format/frontmatter",
              from: "packages/prompts/docs/file-format/frontmatter.md",
            },
            {
              text: "Partials",
              link: "/prompts/file-format/partials",
              from: "packages/prompts/docs/file-format/partials.md",
            },
          ],
        },
        {
          text: "CLI",
          prefix: "/prompts/cli",
          items: [
            {
              text: "Overview",
              link: "/prompts/cli/overview",
              from: "packages/prompts/docs/cli/overview.md",
            },
            {
              text: "Commands",
              link: "/prompts/cli/commands",
              from: "packages/prompts/docs/cli/commands.md",
            },
          ],
        },
        {
          text: "Code Generation",
          link: "/prompts/codegen/overview",
          from: "packages/prompts/docs/codegen/overview.md",
        },
        {
          text: "Library",
          link: "/prompts/library/overview",
          from: "packages/prompts/docs/library/overview.md",
        },
        {
          text: "Guides",
          prefix: "/prompts/guides",
          from: "packages/prompts/docs/guides/*.md",
          textFrom: "heading",
          sort: "alpha",
        },
        {
          text: "Troubleshooting",
          link: "/prompts/troubleshooting",
          from: "packages/prompts/docs/troubleshooting.md",
        },
      ],
    },

    // ── CLI ──
    {
      text: "CLI",
      description: "CLI for the funkai prompt SDK",
      icon: "pixelarticons:terminal",
      link: "/cli/",
      from: "packages/cli/README.md",
    },

    // ── Contributing ──
    {
      text: "Contributing",
      description: "Contributing standards, guides, and architectural concepts",
      icon: "pixelarticons:git-merge",
      isolated: true,
      items: [
        {
          text: "Overview",
          link: "/contributing/overview",
          from: "contributing/README.md",
        },
        {
          text: "Concepts",
          prefix: "/contributing/concepts",
          from: "contributing/concepts/*.md",
          textFrom: "heading",
          sort: "alpha",
        },
        {
          text: "Guides",
          prefix: "/contributing/guides",
          from: "contributing/guides/*.md",
          textFrom: "heading",
          sort: "alpha",
        },
        {
          text: "Standards",
          items: [
            {
              text: "TypeScript",
              prefix: "/contributing/standards/typescript",
              from: "contributing/standards/typescript/*.md",
              textFrom: "heading",
              sort: "alpha",
            },
            {
              text: "Documentation",
              prefix: "/contributing/standards/documentation",
              from: "contributing/standards/documentation/*.md",
              textFrom: "heading",
              sort: "alpha",
            },
            {
              text: "Git",
              prefix: "/contributing/standards/git",
              from: "contributing/standards/git-*.md",
              textFrom: "heading",
              sort: "alpha",
            },
          ],
        },
      ],
    },
  ],
});
