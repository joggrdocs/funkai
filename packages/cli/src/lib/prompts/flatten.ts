import { Liquid } from "liquidjs";

// oxlint-disable-next-line security/detect-unsafe-regex -- template parsing, not adversarial input
const RENDER_TAG_RE = /\{%-?\s*render\s+'([^']+)'(?:\s*,\s*(.*?))?\s*-?%\}/g;
const LITERAL_PARAM_RE = /(\w+)\s*:\s*'([^']*)'/g;

interface RenderTag {
  fullMatch: string;
  partialName: string;
  params: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/** @private */
function parseParamsOrEmpty(raw: string, partialName: string): Record<string, string> {
  if (raw.length > 0) {
    return parseParams(raw, partialName);
  }
  return {};
}

/**
 * Parse literal string parameters from a render tag's param string.
 *
 * Only supports literal string values (e.g. `role: 'Bot'`).
 * Throws if a parameter value is a variable reference.
 *
 * @private
 */
function parseParams(raw: string, partialName: string): Record<string, string> {
  const literalMatches = [...raw.matchAll(LITERAL_PARAM_RE)];
  const allParamNames = [...raw.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);

  return Object.fromEntries(
    allParamNames.map((name) => {
      const literal = literalMatches.find((m) => m[1] === name);
      if (!literal) {
        throw new Error(
          `Cannot flatten {% render '${partialName}' %}: parameter "${name}" uses a variable reference. ` +
            "Only literal string values are supported at codegen time.",
        );
      }
      return [name, literal[2]];
    }),
  );
}

/**
 * Find all `{% render %}` tags in a template string.
 *
 * @private
 */
function parseRenderTags(template: string): RenderTag[] {
  return [...template.matchAll(RENDER_TAG_RE)].map((m) => {
    const rawParams: string = (m[2] ?? "").trim();
    const params = parseParamsOrEmpty(rawParams, m[1]);

    return { fullMatch: m[0], partialName: m[1], params };
  });
}

/**
 * Parameters for flattening partial render tags.
 */
export interface FlattenPartialsParams {
  /** Template string (frontmatter already stripped). */
  readonly template: string;
  /** Directories to search for partial `.prompt` files. */
  readonly partialsDirs: readonly string[];
}

/**
 * Flatten `{% render %}` partial tags in a template at codegen time.
 *
 * Finds all `{% render 'name', key: 'value' %}` tags, reads the
 * corresponding partial file, renders it with the literal parameters,
 * and replaces the tag with the rendered output.
 *
 * All other Liquid expressions (`{{ var }}`, `{% if %}`, `{% for %}`)
 * are preserved for runtime rendering.
 *
 * @param params - Template content and partial directories.
 * @returns Flattened template with all render tags resolved.
 */
export function flattenPartials({ template, partialsDirs }: FlattenPartialsParams): string {
  const tags = parseRenderTags(template);
  if (tags.length === 0) {
    return template;
  }

  const engine = new Liquid({
    root: [...partialsDirs],
    partials: [...partialsDirs],
    extname: ".prompt",
  });

  const result = tags.reduce((acc, tag) => {
    const rendered = engine.parseAndRenderSync(
      `{% render '${tag.partialName}' ${Object.entries(tag.params)
        .map(([k, v]) => `${k}: '${v}'`)
        .join(", ")} %}`,
    );

    return acc.replace(tag.fullMatch, rendered);
  }, template);

  return result;
}
