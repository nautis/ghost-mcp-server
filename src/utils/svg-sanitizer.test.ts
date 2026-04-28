import { describe, it, expect } from 'vitest';
import { sanitizeSvg, isSvgContent } from './svg-sanitizer.js';

describe('sanitizeSvg', () => {
  it('removes script elements', () => {
    const input = '<svg><script>alert("xss")</script><circle r="10"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('<script');
    expect(result).toContain('<circle');
  });

  it('removes foreignObject elements', () => {
    const input = '<svg><foreignObject><body>hack</body></foreignObject></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('foreignObject');
  });

  it('removes iframe elements', () => {
    const input = '<svg><iframe src="http://evil.com"></iframe></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('<iframe');
  });

  it('removes onclick attributes', () => {
    const input = '<svg><rect onclick="alert(1)" width="10" height="10"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('width="10"');
  });

  it('removes onerror attributes', () => {
    const input = '<svg><image onerror="alert(1)" href="x.png"/></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('onerror');
  });

  it('removes javascript: URLs from href', () => {
    const input = '<svg><a href="javascript:alert(1)">click</a></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('javascript:');
  });

  it('removes javascript: URLs from xlink:href', () => {
    const input = '<svg><a xlink:href="javascript:alert(1)">click</a></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('javascript:');
  });

  it('removes data:text/html URLs', () => {
    const input = '<svg><a href="data:text/html,<script>alert(1)</script>">click</a></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('data:text/html');
  });

  it('removes dangerous XML processing instructions', () => {
    const input = '<?xml-stylesheet type="text/xsl" href="evil.xsl"?><svg></svg>';
    const result = sanitizeSvg(input);
    expect(result).not.toContain('xml-stylesheet');
    expect(result).toContain('<svg>');
  });

  it('preserves safe SVG content', () => {
    const input = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
    const result = sanitizeSvg(input);
    // DOMPurify normalizes self-closing tags (<circle .../> -> <circle ...></circle>),
    // so we check semantic preservation rather than byte-identical output.
    expect(result).toContain('viewBox="0 0 100 100"');
    expect(result).toContain('<circle');
    expect(result).toContain('cx="50"');
    expect(result).toContain('cy="50"');
    expect(result).toContain('r="40"');
    expect(result).toContain('fill="red"');
    expect(result).toContain('</svg>');
  });
});

describe('isSvgContent', () => {
  it('detects SVG with <svg tag', () => {
    const buffer = Buffer.from('<svg viewBox="0 0 100 100"><circle/></svg>');
    expect(isSvgContent(buffer)).toBe(true);
  });

  it('detects SVG with XML declaration', () => {
    const buffer = Buffer.from('<?xml version="1.0"?><svg><rect/></svg>');
    expect(isSvgContent(buffer)).toBe(true);
  });

  it('rejects non-SVG content', () => {
    const buffer = Buffer.from('<html><body>not svg</body></html>');
    expect(isSvgContent(buffer)).toBe(false);
  });
});
