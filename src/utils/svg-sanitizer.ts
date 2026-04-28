/**
 * SVG Sanitizer — DOMPurify wrapper with SVG profile.
 *
 * Replaces the previous regex-based sanitizer. Regex SVG sanitization is
 * famously bypassable (CDATA, namespace prefixes, encoded entities, <use>
 * with external href). DOMPurify parses the SVG into a DOM and removes
 * dangerous nodes/attributes structurally.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize SVG content by parsing and stripping dangerous elements/attributes.
 * @param svgContent - Raw SVG content as string
 * @returns Sanitized SVG content (still a valid SVG, with scripts/handlers removed)
 */
export function sanitizeSvg(svgContent: string): string {
  return DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true },
    // Belt and suspenders — explicitly forbid the highest-risk SVG-specific tags
    // and attributes even if a profile change ever loosens the defaults.
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'embed', 'object', 'applet'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'href', 'xlink:href'],
  });
}

/** Check if buffer content appears to be SVG. */
export function isSvgContent(buffer: Buffer): boolean {
  const start = buffer.toString('utf8', 0, Math.min(512, buffer.length));
  return start.includes('<svg') || (start.includes('<?xml') && start.includes('<svg'));
}
