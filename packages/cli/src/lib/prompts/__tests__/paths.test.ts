import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discoverPrompts, resolveIncludeBaseDirs } from "@/lib/prompts/paths.js";

const TMP_DIR = resolve(import.meta.dirname, "__tmp_paths_test__");
const TMP_DIR_REL = relative(process.cwd(), TMP_DIR).replaceAll("\\", "/");

function writePrompt(relPath: string, content: string): void {
  const fullPath = join(TMP_DIR, relPath);
  mkdirSync(resolve(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("co-located partials", () => {
  describe(discoverPrompts, () => {
    it("skips underscore-prefixed .prompt files", () => {
      writePrompt("_core.prompt", "This is a partial with no frontmatter");
      writePrompt(
        "main.prompt",
        "---\nname: main\n---\n{% render '_core' %}",
      );

      const discovered = discoverPrompts({ includes: [`${TMP_DIR_REL}/**`] });

      expect(discovered).toHaveLength(1);
      expect(discovered[0]?.name).toBe("main");
    });

    it("skips underscore-prefixed files in subdirectories", () => {
      writePrompt("instructions/_core.prompt", "Partial content");
      writePrompt(
        "instructions/claude.prompt",
        "---\nname: claude\n---\nContent",
      );
      writePrompt(
        "instructions/cursor.prompt",
        "---\nname: cursor\n---\nContent",
      );

      const discovered = discoverPrompts({ includes: [`${TMP_DIR_REL}/**`] });

      expect(discovered).toHaveLength(2);
      expect(discovered.map((d) => d.name).toSorted()).toEqual([
        "claude",
        "cursor",
      ]);
    });
  });

  describe(resolveIncludeBaseDirs, () => {
    it("extracts base directories from include patterns", () => {
      const dirs = resolveIncludeBaseDirs({
        includes: [`${TMP_DIR_REL}/**`],
      });

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(TMP_DIR);
    });

    it("deduplicates base directories from multiple patterns", () => {
      const dirs = resolveIncludeBaseDirs({
        includes: [`${TMP_DIR_REL}/**/*.prompt`, `${TMP_DIR_REL}/**`],
      });

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(TMP_DIR);
    });

    it("returns multiple base dirs for different pattern roots", () => {
      const otherDir = resolve(import.meta.dirname, "__tmp_paths_other__");
      const otherRel = relative(process.cwd(), otherDir).replaceAll("\\", "/");

      const dirs = resolveIncludeBaseDirs({
        includes: [`${TMP_DIR_REL}/**`, `${otherRel}/**`],
      });

      expect(dirs).toHaveLength(2);
      expect(dirs).toContain(TMP_DIR);
      expect(dirs).toContain(otherDir);
    });
  });
});
