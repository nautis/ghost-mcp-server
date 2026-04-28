import { describe, it, expect } from 'vitest';
import { escapeFilterValue, isValidSlug, validateSlug } from './filter.js';

describe('escapeFilterValue', () => {
  it('passes plain alphanumerics through unchanged', () => {
    expect(escapeFilterValue('hello-world')).toBe('hello-world');
    expect(escapeFilterValue('post123')).toBe('post123');
  });

  it("escapes single quotes to prevent breaking out of filter literals", () => {
    expect(escapeFilterValue("o'brien")).toBe("o\\'brien");
  });

  it('escapes injection attempts with quotes and operators', () => {
    const malicious = "x'+visibility:paid+y:'";
    const escaped = escapeFilterValue(malicious);
    expect(escaped).toBe("x\\'+visibility:paid+y:\\'");
    // Note: callers MUST wrap escaped values in single quotes;
    // operators like + and : are still present, but they're inside
    // the quoted literal so Ghost treats them as content, not syntax.
  });
});

describe('isValidSlug', () => {
  it('accepts standard slugs', () => {
    expect(isValidSlug('my-post')).toBe(true);
    expect(isValidSlug('post-123')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('1')).toBe(true);
  });

  it('rejects slugs with quotes', () => {
    expect(isValidSlug("o'brien")).toBe(false);
    expect(isValidSlug('x"y')).toBe(false);
  });

  it('rejects slugs with filter operators', () => {
    expect(isValidSlug("x'+visibility:paid+y:'")).toBe(false);
    expect(isValidSlug('foo+bar')).toBe(false);
    expect(isValidSlug('foo:bar')).toBe(false);
  });

  it('rejects slugs with whitespace or special chars', () => {
    expect(isValidSlug('foo bar')).toBe(false);
    expect(isValidSlug('foo/bar')).toBe(false);
    expect(isValidSlug('foo.bar')).toBe(false);
  });

  it('rejects uppercase', () => {
    expect(isValidSlug('Foo')).toBe(false);
  });

  it('rejects leading or trailing hyphens', () => {
    expect(isValidSlug('-foo')).toBe(false);
    expect(isValidSlug('foo-')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('rejects overly long slugs', () => {
    expect(isValidSlug('a'.repeat(201))).toBe(false);
    expect(isValidSlug('a'.repeat(200))).toBe(true);
  });
});

describe('validateSlug', () => {
  it('returns the slug if valid', () => {
    expect(validateSlug('my-post')).toBe('my-post');
  });

  it('throws on invalid slug', () => {
    expect(() => validateSlug("x'+visibility:paid+y:'")).toThrow(/Invalid slug/);
    expect(() => validateSlug('Foo Bar')).toThrow(/Invalid slug/);
  });
});
