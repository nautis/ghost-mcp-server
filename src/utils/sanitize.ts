import DOMPurify from 'isomorphic-dompurify';

// Note: iframe deliberately excluded. Use Ghost's native lexical embed cards
// (HTML cards, video cards, twitter cards, etc.) for safe third-party embeds.
// Allowing raw <iframe> from LLM-generated HTML expands attack surface for
// clickjacking, srcdoc-XSS, and arbitrary third-party page embedding.
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'br', 'hr',
  'b', 'i', 'strong', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'video', 'audio', 'source',
];

const ALLOWED_ATTR = [
  'href', 'name', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height',
  'controls', 'autoplay', 'loop', 'muted',
  'type', 'colspan', 'rowspan',
  'class', 'id',
];

export const sanitizeHtmlContent = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return html;
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Drop `data:` from the URI allowlist — it's a known XSS vector for tags
    // that accept URLs (e.g. data:text/html, data:image/svg+xml). Keep http(s)
    // and mailto. The trailing alternation is DOMPurify's default safe pattern
    // for relative paths.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
};
