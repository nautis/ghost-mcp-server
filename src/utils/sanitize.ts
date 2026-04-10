import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'br', 'hr',
  'b', 'i', 'strong', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption',
  'iframe', 'video', 'audio', 'source',
];

const ALLOWED_ATTR = [
  'href', 'name', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height',
  'frameborder', 'allowfullscreen',
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
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
};
