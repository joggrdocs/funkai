import type { SchemaVariable } from "./frontmatter.js";

/**
 * A single lint diagnostic.
 */
export interface LintDiagnostic {
  level: "error" | "warn";
  message: string;
}

/**
 * Result of linting a single prompt file.
 */
export interface LintResult {
  name: string;
  filePath: string;
  diagnostics: LintDiagnostic[];
}

/**
 * Lint a prompt by comparing declared schema variables against
 * variables actually used in the template body.
 *
 * - **Error**: template uses a variable NOT declared in the schema (undefined var).
 * - **Warn**: schema declares a variable NOT used in the template (unused var).
 *
 * @param name - Prompt name (for error messages).
 * @param filePath - Source file path (for error messages).
 * @param schemaVars - Variables declared in frontmatter schema.
 * @param templateVars - Variables extracted from the template body.
 * @returns Lint result with diagnostics.
 */
export function lintPrompt(
  name: string,
  filePath: string,
  schemaVars: SchemaVariable[],
  templateVars: string[],
): LintResult {
  const diagnostics: LintDiagnostic[] = [];
  const declared = new Set(schemaVars.map((v) => v.name));
  const used = new Set(templateVars);

  for (const varName of used) {
    if (!declared.has(varName)) {
      diagnostics.push({
        level: "error",
        message:
          `Undefined variable "${varName}" in ${name}.prompt\n` +
          `  Variable "${varName}" is used in the template but not declared in frontmatter schema.\n` +
          "  Add it to the schema section in the frontmatter.",
      });
    }
  }

  for (const varName of declared) {
    if (!used.has(varName)) {
      diagnostics.push({
        level: "warn",
        message:
          `Unused variable "${varName}" in ${name}.prompt\n` +
          `  Variable "${varName}" is declared in the schema but never used in the template.`,
      });
    }
  }

  return { name, filePath, diagnostics };
}

/**
 * Check whether any lint results contain errors.
 */
export function hasLintErrors(results: LintResult[]): boolean {
  return results.some((r) => r.diagnostics.some((d) => d.level === "error"));
}
