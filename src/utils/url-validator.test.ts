import { describe, it, expect } from 'vitest';
import { validateUrlForSsrf } from './url-validator.js';

describe('validateUrlForSsrf', () => {
  it('allows public HTTPS URLs', () => {
    const result = validateUrlForSsrf('https://example.com/image.png');
    expect(result.valid).toBe(true);
  });

  it('allows public HTTP URLs', () => {
    const result = validateUrlForSsrf('http://example.com/image.png');
    expect(result.valid).toBe(true);
  });

  it('blocks file:// protocol', () => {
    const result = validateUrlForSsrf('file:///etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not allowed');
  });

  it('blocks ftp:// protocol', () => {
    const result = validateUrlForSsrf('ftp://example.com/file');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not allowed');
  });

  it('blocks private IP 10.x.x.x', () => {
    const result = validateUrlForSsrf('http://10.0.0.1/admin');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked range');
  });

  it('blocks private IP 172.16.x.x', () => {
    const result = validateUrlForSsrf('http://172.16.0.1/admin');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked range');
  });

  it('blocks private IP 192.168.x.x', () => {
    const result = validateUrlForSsrf('http://192.168.1.1/admin');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked range');
  });

  it('blocks loopback 127.0.0.1', () => {
    const result = validateUrlForSsrf('http://127.0.0.1/admin');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked range');
  });

  it('blocks localhost', () => {
    const result = validateUrlForSsrf('http://localhost/admin');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('blocks cloud metadata IP 169.254.169.254', () => {
    const result = validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
    expect(result.valid).toBe(false);
  });

  it('blocks metadata.google.internal', () => {
    const result = validateUrlForSsrf('http://metadata.google.internal/computeMetadata/v1/');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('blocks .internal domains', () => {
    const result = validateUrlForSsrf('http://service.internal/api');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('blocks .local domains', () => {
    const result = validateUrlForSsrf('http://printer.local/status');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('blocked');
  });

  it('blocks URL-encoded localhost bypass', () => {
    const result = validateUrlForSsrf('http://%6c%6f%63%61%6c%68%6f%73%74/admin');
    expect(result.valid).toBe(false);
  });

  it('rejects invalid URL format', () => {
    const result = validateUrlForSsrf('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid URL');
  });
});
