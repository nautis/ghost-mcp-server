import sanitizeHtml from 'sanitize-html';

// HTML sanitization config matching upstream Ghost MCP Server v1.12.0
const htmlSanitizeConfig = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'div', 'span', 'br', 'hr',
        'b', 'i', 'strong', 'em', 'u', 's', 'strike',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'figure', 'figcaption',
        'iframe', 'video', 'audio', 'source',
    ],
    allowedAttributes: {
        'a': ['href', 'name', 'target', 'rel', 'title'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
        'video': ['src', 'width', 'height', 'controls', 'autoplay', 'loop', 'muted'],
        'audio': ['src', 'controls', 'autoplay', 'loop', 'muted'],
        'source': ['src', 'type'],
        'td': ['colspan', 'rowspan'],
        'th': ['colspan', 'rowspan'],
        '*': ['class', 'id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
    },
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - Raw HTML content
 * @returns {string} Sanitized HTML
 */
export const sanitizeHtmlContent = (html) => {
    if (!html || typeof html !== 'string') {
        return html;
    }
    return sanitizeHtml(html, htmlSanitizeConfig);
};
