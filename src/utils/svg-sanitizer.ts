/**
 * SVG Sanitizer
 * Strips dangerous elements and attributes from SVG content to prevent XSS
 */

// Elements that can execute scripts or cause security issues
const DANGEROUS_ELEMENTS = [
  'script',
  'foreignobject',
  'iframe',
  'embed',
  'object',
  'applet',
  'meta',
  'link',
  'import',
  'base',
];

// Attributes that can execute JavaScript
const DANGEROUS_ATTRIBUTES = [
  // Event handlers
  'onabort', 'onactivate', 'onafterprint', 'onafterupdate', 'onbeforeactivate',
  'onbeforecopy', 'onbeforecut', 'onbeforedeactivate', 'onbeforeeditfocus',
  'onbeforepaste', 'onbeforeprint', 'onbeforeunload', 'onbeforeupdate',
  'onbegin', 'onblur', 'onbounce', 'oncellchange', 'onchange', 'onclick',
  'oncontextmenu', 'oncontrolselect', 'oncopy', 'oncut', 'ondataavailable',
  'ondatasetchanged', 'ondatasetcomplete', 'ondblclick', 'ondeactivate',
  'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover',
  'ondragstart', 'ondrop', 'onend', 'onerror', 'onerrorupdate', 'onfilterchange',
  'onfinish', 'onfocus', 'onfocusin', 'onfocusout', 'onhashchange', 'onhelp',
  'oninput', 'onkeydown', 'onkeypress', 'onkeyup', 'onlayoutcomplete', 'onload',
  'onlosecapture', 'onmessage', 'onmousedown', 'onmouseenter', 'onmouseleave',
  'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel',
  'onmove', 'onmoveend', 'onmovestart', 'onoffline', 'ononline', 'onpage',
  'onpaste', 'onpause', 'onplay', 'onplaying', 'onpopstate', 'onprogress',
  'onpropertychange', 'onreadystatechange', 'onredo', 'onrepeat', 'onreset',
  'onresize', 'onresizeend', 'onresizestart', 'onrowenter', 'onrowexit',
  'onrowsdelete', 'onrowsinserted', 'onscroll', 'onsearch', 'onseek',
  'onselect', 'onselectionchange', 'onselectstart', 'onstart', 'onstop',
  'onstorage', 'onsubmit', 'onsyncrestored', 'ontimeerror', 'ontoggle',
  'ontouchend', 'ontouchmove', 'ontouchstart', 'onundo', 'onunload',
  'onurlflip', 'onvolumechange', 'onwaiting', 'onwheel',
];

// Attributes that can contain URLs (check for javascript: protocol)
const URL_ATTRIBUTES = [
  'href',
  'xlink:href',
  'src',
  'data',
  'action',
  'formaction',
];

/**
 * Check if a string contains a JavaScript URL
 */
function hasJavaScriptUrl(value: string): boolean {
  const normalized = value.toLowerCase().replace(/[\s\n\r\t]/g, '');
  return normalized.startsWith('javascript:') ||
         normalized.startsWith('data:text/html') ||
         normalized.startsWith('vbscript:');
}

/**
 * Sanitize SVG content by removing dangerous elements and attributes
 * @param svgContent - Raw SVG content as string
 * @returns Sanitized SVG content
 */
export function sanitizeSvg(svgContent: string): string {
  let sanitized = svgContent;

  // Remove dangerous elements (with content)
  for (const element of DANGEROUS_ELEMENTS) {
    // Remove opening and closing tags with content between
    const elementRegex = new RegExp(
      `<${element}[^>]*>([\\s\\S]*?)<\\/${element}>`,
      'gi'
    );
    sanitized = sanitized.replace(elementRegex, '');

    // Remove self-closing tags
    const selfClosingRegex = new RegExp(`<${element}[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // Remove dangerous attributes (event handlers)
  for (const attr of DANGEROUS_ATTRIBUTES) {
    // Match attribute with double quotes, single quotes, or no quotes
    const attrRegex = new RegExp(
      `\\s*${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*)`,
      'gi'
    );
    sanitized = sanitized.replace(attrRegex, '');
  }

  // Remove javascript: URLs from URL attributes
  for (const attr of URL_ATTRIBUTES) {
    const urlAttrRegex = new RegExp(
      `(${attr.replace(':', '\\:')}\\s*=\\s*)("[^"]*"|'[^']*')`,
      'gi'
    );
    sanitized = sanitized.replace(urlAttrRegex, (match, prefix, value) => {
      const unquoted = value.slice(1, -1);
      if (hasJavaScriptUrl(unquoted)) {
        return ''; // Remove the entire attribute
      }
      return match;
    });
  }

  // Remove XML processing instructions that could be dangerous
  sanitized = sanitized.replace(/<\?xml-stylesheet[^>]*\?>/gi, '');

  // Remove CDATA sections containing script-like content
  sanitized = sanitized.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, (match) => {
    if (/javascript|vbscript|expression/i.test(match)) {
      return '';
    }
    return match;
  });

  return sanitized;
}

/**
 * Check if content appears to be SVG
 */
export function isSvgContent(buffer: Buffer): boolean {
  const start = buffer.toString('utf8', 0, Math.min(512, buffer.length));
  return start.includes('<svg') || (start.includes('<?xml') && start.includes('<svg'));
}
