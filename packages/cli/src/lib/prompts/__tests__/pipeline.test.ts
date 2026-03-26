import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ParsedPrompt } from "@/lib/prompts/codegen.js";
import { hasLintErrors } from "@/lib/prompts/lint.js";
import { runGeneratePipeline, runLintPipeline } from "@/lib/prompts/pipeline.js";

const TMP_DIR = resolve(import.meta.dirname, "__tmp_pipeline_test__");
const TMP_DIR_REL = relative(process.cwd(), TMP_DIR).replaceAll("\\", "/");
const OUT_DIR = join(TMP_DIR, "__out__");

function writePrompt(relPath: string, content: string): void {
  const fullPath = join(TMP_DIR, relPath);
  mkdirSync(resolve(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function findPrompt(prompts: readonly ParsedPrompt[], name: string): ParsedPrompt | undefined {
  return prompts.find((p) => p.name === name);
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Co-located partials — generate pipeline
// ---------------------------------------------------------------------------

describe("co-located partials — generate pipeline", () => {
  it("excludes _*.prompt from generated prompts", () => {
    writePrompt("_shared.prompt", "Shared guidelines content");
    writePrompt("agents/researcher/prompt.prompt", "---\nname: researcher\n---\nResearch stuff.");
    writePrompt("agents/writer/prompt.prompt", "---\nname: writer\n---\nWrite stuff.");

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.discovered).toBe(2);
    expect(result.prompts).toHaveLength(2);
    expect(result.prompts.map((p) => p.name).toSorted()).toEqual(["researcher", "writer"]);
  });

  it("excludes nested _*.prompt from generated prompts", () => {
    writePrompt("agents/_core.prompt", "Core partial");
    writePrompt("agents/sub/_helpers.prompt", "Helper partial");
    writePrompt("agents/main/prompt.prompt", "---\nname: main\n---\nMain content.");

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.discovered).toBe(1);
    const [prompt] = result.prompts;
    expect(prompt?.name).toBe("main");
  });

  it("inlines a base-level co-located partial via {% render %}", () => {
    writePrompt("_guidelines.prompt", "Be concise and factual.");
    writePrompt(
      "researcher.prompt",
      "---\nname: researcher\nschema:\n  domain: string\n---\nYou research {{ domain }}.\n\n{% render '_guidelines' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [researcher] = result.prompts;
    expect(researcher?.template).toContain("You research {{ domain }}.");
    expect(researcher?.template).toContain("Be concise and factual.");
    expect(researcher?.template).not.toContain("{% render");
  });

  it("inlines a nested co-located partial via path-relative render tag", () => {
    writePrompt("agents/writer/_tone-rules.prompt", "Use active voice.");
    writePrompt(
      "agents/writer/prompt.prompt",
      "---\nname: writer\n---\nWrite well.\n\n{% render 'agents/writer/_tone-rules' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [writer] = result.prompts;
    expect(writer?.template).toContain("Write well.");
    expect(writer?.template).toContain("Use active voice.");
    expect(writer?.template).not.toContain("{% render");
  });

  it("inlines SDK built-in partials alongside co-located partials", () => {
    writePrompt("_guidelines.prompt", "Follow the rules.");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\n---\n{% render 'identity', role: 'Bot', desc: 'helper' %}\n\n{% render '_guidelines' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [agent] = result.prompts;
    expect(agent?.template).toContain("<identity>");
    expect(agent?.template).toContain("You are Bot, helper.");
    expect(agent?.template).toContain("Follow the rules.");
    expect(agent?.template).not.toContain("{% render");
  });

  it("resolves same-named _*.prompt files in different subdirectories via path", () => {
    writePrompt("instructions/_core.prompt", "Instruction core content.");
    writePrompt("skills/_core.prompt", "Skills core content.");
    writePrompt(
      "instructions/claude.prompt",
      "---\nname: instructions-claude\n---\n{% render 'instructions/_core' %}",
    );
    writePrompt(
      "skills/claude.prompt",
      "---\nname: skills-claude\n---\n{% render 'skills/_core' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(2);

    const instrPrompt = findPrompt(result.prompts, "instructions-claude");
    const skillsPrompt = findPrompt(result.prompts, "skills-claude");

    expect(instrPrompt?.template).toContain("Instruction core content.");
    expect(instrPrompt?.template).not.toContain("Skills core content.");

    expect(skillsPrompt?.template).toContain("Skills core content.");
    expect(skillsPrompt?.template).not.toContain("Instruction core content.");
  });

  it("preserves template variables after partial inlining", () => {
    writePrompt("_header.prompt", "# System Prompt");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\nschema:\n  name: string\n---\n{% render '_header' %}\n\nHello {{ name }}.",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    const [agent] = result.prompts;
    expect(agent?.template).toContain("# System Prompt");
    expect(agent?.template).toContain("{{ name }}");
    expect(agent?.schema).toHaveLength(1);
    expect(agent?.schema[0]?.name).toBe("name");
  });

  it("preserves Liquid control flow after partial inlining", () => {
    writePrompt("_footer.prompt", "End of prompt.");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\nschema:\n  context:\n    type: string\n    required: false\n---\n{% if context %}{{ context }}{% endif %}\n\n{% render '_footer' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    const [agent] = result.prompts;
    expect(agent?.template).toContain("{% if context %}");
    expect(agent?.template).toContain("{% endif %}");
    expect(agent?.template).toContain("End of prompt.");
  });

  it("works with frontmatter group alongside co-located partials", () => {
    writePrompt("_shared.prompt", "Shared content.");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\ngroup: core\n---\nAgent prompt.\n\n{% render '_shared' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [prompt] = result.prompts;
    expect(prompt?.group).toBe("core");
    expect(prompt?.template).toContain("Shared content.");
  });

  it("works with config-defined groups alongside co-located partials", () => {
    writePrompt("agents/_shared.prompt", "Shared agent content.");
    writePrompt(
      "agents/bot.prompt",
      "---\nname: bot\n---\nBot prompt.\n\n{% render 'agents/_shared' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
      groups: [
        {
          name: "agents",
          includes: [`${TMP_DIR_REL}/agents/**`],
        },
      ],
    });

    expect(result.prompts).toHaveLength(1);
    const [prompt] = result.prompts;
    expect(prompt?.group).toBe("agents");
    expect(prompt?.template).toContain("Shared agent content.");
  });

  it("throws when a co-located partial references a nonexistent partial", () => {
    writePrompt("agent.prompt", "---\nname: agent\n---\n{% render '_does-not-exist' %}");

    expect(() =>
      runGeneratePipeline({
        includes: [`${TMP_DIR_REL}/**`],
        out: OUT_DIR,
      }),
    ).toThrow("Failed to render partial");
  });
});

// ---------------------------------------------------------------------------
// Co-located partials — lint pipeline
// ---------------------------------------------------------------------------

describe("co-located partials — lint pipeline", () => {
  it("lints prompts that use co-located partials without errors", () => {
    writePrompt("_guidelines.prompt", "Be helpful.");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\nschema:\n  name: string\n---\nHello {{ name }}.\n\n{% render '_guidelines' %}",
    );

    const result = runLintPipeline({
      includes: [`${TMP_DIR_REL}/**`],
    });

    expect(result.discovered).toBe(1);
    expect(hasLintErrors(result.results)).toBe(false);
  });

  it("excludes _*.prompt from lint discovery", () => {
    writePrompt("_partial.prompt", "Partial with no frontmatter");
    writePrompt("agent.prompt", "---\nname: agent\n---\nContent.");

    const result = runLintPipeline({
      includes: [`${TMP_DIR_REL}/**`],
    });

    expect(result.discovered).toBe(1);
  });

  it("reports lint error for undefined variable even with partials", () => {
    writePrompt("_header.prompt", "Header content.");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\n---\n{% render '_header' %}\n\n{{ undeclared_var }}",
    );

    const result = runLintPipeline({
      includes: [`${TMP_DIR_REL}/**`],
    });

    expect(hasLintErrors(result.results)).toBe(true);
    const [first] = result.results;
    const diag = first?.diagnostics[0];
    expect(diag?.level).toBe("error");
    expect(diag?.message).toContain("undeclared_var");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("co-located partials — edge cases", () => {
  it("handles prompt tree with only _*.prompt files (zero full prompts)", () => {
    writePrompt("_a.prompt", "Partial A");
    writePrompt("_b.prompt", "Partial B");

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.discovered).toBe(0);
    expect(result.prompts).toHaveLength(0);
  });

  it("handles multiple underscore-prefixed partials in the same directory", () => {
    writePrompt("_header.prompt", "HEADER");
    writePrompt("_footer.prompt", "FOOTER");
    writePrompt(
      "agent.prompt",
      "---\nname: agent\n---\n{% render '_header' %}\n\nBody.\n\n{% render '_footer' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [prompt] = result.prompts;
    expect(prompt?.template).toContain("HEADER");
    expect(prompt?.template).toContain("FOOTER");
    expect(prompt?.template).toContain("Body.");
  });

  it("handles deeply nested partial path", () => {
    writePrompt("a/b/c/_deep.prompt", "Deep partial content.");
    writePrompt("agent.prompt", "---\nname: agent\n---\n{% render 'a/b/c/_deep' %}");

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [prompt] = result.prompts;
    expect(prompt?.template).toContain("Deep partial content.");
  });

  it("a prompt rendering an SDK partial and two co-located partials", () => {
    writePrompt("_rules.prompt", "Rule set A.");
    writePrompt("sub/_extra.prompt", "Extra context.");
    writePrompt(
      "agent.prompt",
      [
        "---",
        "name: agent",
        "---",
        "{% render 'identity', role: 'Agent', desc: 'worker' %}",
        "",
        "{% render '_rules' %}",
        "",
        "{% render 'sub/_extra' %}",
      ].join("\n"),
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(1);
    const [agent] = result.prompts;
    expect(agent?.template).toContain("<identity>");
    expect(agent?.template).toContain("You are Agent, worker.");
    expect(agent?.template).toContain("Rule set A.");
    expect(agent?.template).toContain("Extra context.");
    expect(agent?.template).not.toContain("{% render");
  });

  it("co-located partial with non-underscore prompt in same dir both work", () => {
    writePrompt("agents/_shared.prompt", "Shared.");
    writePrompt(
      "agents/alpha.prompt",
      "---\nname: alpha\n---\nAlpha.\n\n{% render 'agents/_shared' %}",
    );
    writePrompt(
      "agents/beta.prompt",
      "---\nname: beta\n---\nBeta.\n\n{% render 'agents/_shared' %}",
    );

    const result = runGeneratePipeline({
      includes: [`${TMP_DIR_REL}/**`],
      out: OUT_DIR,
    });

    expect(result.prompts).toHaveLength(2);

    const alpha = findPrompt(result.prompts, "alpha");
    const beta = findPrompt(result.prompts, "beta");

    expect(alpha?.template).toContain("Alpha.");
    expect(alpha?.template).toContain("Shared.");

    expect(beta?.template).toContain("Beta.");
    expect(beta?.template).toContain("Shared.");
  });
});
