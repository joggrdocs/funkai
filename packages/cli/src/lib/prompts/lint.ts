import type { SchemaVariable } from "./frontmatter.js";

/**
 * A single lint diagnostic.
 */
export interface LintDiagnostic {
  readonly level: "error" | "warn";
  readonly message: string;
}

/**
 * Result of linting a single prompt file.
 */
export interface LintResult {
  readonly name: string;
  readonly filePath: string;
  readonly diagnostics: readonly LintDiagnostic[];
}

/**
 * Parameters for linting a single prompt.
 */
export interface LintPromptParams {
  /** Prompt name (for error messages). */
  readonly name: string;
  /** Source file path (for error messages). */
  readonly filePath: string;
  /** Variables declared in frontmatter schema. */
  readonly schemaVars: readonly SchemaVariable[];
  /** Variables extracted from the template body. */
  readonly templateVars: readonly string[];
}

/**
 * Lint a prompt by comparing declared schema variables against
 * variables actually used in the template body.
 *
 * - **Error**: template uses a variable NOT declared in the schema (undefined var).
 * - **Warn**: schema declares a variable NOT used in the template (unused var).
 *
 * @param params - Lint prompt parameters.
 * @returns Lint result with diagnostics.
 */
export function lintPrompt({
  name,
  filePath,
  schemaVars,
  templateVars,
}: LintPromptParams): LintResult {
  const declared = new Set(schemaVars.map((v) => v.name));
  const used = new Set(templateVars);

  const undeclaredErrors: readonly LintDiagnostic[] = [...used]
    .filter((varName) => !declared.has(varName))
    .map((varName) => ({
      level: "error" as const,
      message:
        `Undefined variable "${varName}" in ${name}.prompt\n` +
        `  Variable "${varName}" is used in the template but not declared in frontmatter schema.\n` +
        "  Add it to the schema section in the frontmatter.",
    }));

  const unusedWarnings: readonly LintDiagnostic[] = [...declared]
    .filter((varName) => !used.has(varName))
    .map((varName) => ({
      level: "warn" as const,
      message:
        `Unused variable "${varName}" in ${name}.prompt\n` +
        `  Variable "${varName}" is declared in the schema but never used in the template.`,
    }));

  return { name, filePath, diagnostics: [...undeclaredErrors, ...unusedWarnings] };
}

/**
 * Check whether any lint results contain errors.
 */
export function hasLintErrors(results: readonly LintResult[]): boolean {
  return results.some((r) => r.diagnostics.some((d) => d.level === "error"));
}
