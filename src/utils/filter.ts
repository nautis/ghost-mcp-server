/**
 * Ghost Filter DSL Helpers
 *
 * Ghost's filter syntax (https://ghost.org/docs/admin-api/#filtering) uses `+`
 * as AND, `,` as OR, `:` as field separator, and single quotes around literal
 * values. Interpolating user input into a filter string without escaping lets
 * a caller (e.g. an LLM via prompt injection) break out of the intended scope:
 *
 *   filter: `slug:${userSlug}`
 *
 * with userSlug = `x'+visibility:paid+y:'` becomes a filter that ORs in
 * `visibility:paid` — exposing content the caller shouldn't see.
 */

/**
 * Escape a value for safe interpolation into a quoted Ghost filter literal:
 *   filter: `slug:'${escapeFilterValue(slug)}'`
 *
 * Escapes the single-quote terminator. Callers MUST wrap the result in single
 * quotes — leaving a value bare lets `+` and `,` through.
 */
export function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Validate a slug-shaped string: lowercase letters, digits, and hyphens only.
 * Slugs in Ghost are restricted to this character set, so anything else is
 * either an injection attempt or junk we shouldn't pass through.
 *
 * Returns true if safe; throw or short-circuit at the caller if false.
 */
export function isValidSlug(slug: string): boolean {
  // No leading/trailing hyphens, no consecutive operators, max 200 chars.
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length <= 200;
}

/**
 * Validate or throw — convenience wrapper for the standard slug check.
 */
export function validateSlug(slug: string): string {
  if (!isValidSlug(slug)) {
    throw new Error(`Invalid slug format: '${slug}'. Slugs must contain only lowercase letters, digits, and hyphens.`);
  }
  return slug;
}
