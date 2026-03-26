import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discoverPartialDirs, discoverPrompts } from "@/lib/prompts/paths.js";

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

  describe(discoverPartialDirs, () => {
    it("returns directories containing underscore-prefixed .prompt files", () => {
      writePrompt("instructions/_core.prompt", "Partial content");
      writePrompt(
        "instructions/claude.prompt",
        "---\nname: claude\n---\nContent",
      );

      const dirs = discoverPartialDirs({ includes: [`${TMP_DIR_REL}/**`] });

      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toBe(join(TMP_DIR, "instructions"));
    });

    it("returns multiple directories when partials are co-located in different dirs", () => {
      writePrompt("instructions/_core.prompt", "Partial");
      writePrompt("skills/_core.prompt", "Partial");

      const dirs = discoverPartialDirs({ includes: [`${TMP_DIR_REL}/**`] });

      expect(dirs).toHaveLength(2);
      expect(dirs).toContain(join(TMP_DIR, "instructions"));
      expect(dirs).toContain(join(TMP_DIR, "skills"));
    });

    it("returns empty array when no underscore-prefixed files exist", () => {
      writePrompt(
        "main.prompt",
        "---\nname: main\n---\nContent",
      );

      const dirs = discoverPartialDirs({ includes: [`${TMP_DIR_REL}/**`] });

      expect(dirs).toHaveLength(0);
    });

    it("deduplicates directories", () => {
      writePrompt("instructions/_core.prompt", "Partial 1");
      writePrompt("instructions/_utils.prompt", "Partial 2");

      const dirs = discoverPartialDirs({ includes: [`${TMP_DIR_REL}/**`] });

      expect(dirs).toHaveLength(1);
    });
  });
});
