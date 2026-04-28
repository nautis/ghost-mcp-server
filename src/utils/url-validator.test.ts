import { describe, it, expect } from 'vitest';
import { validateUrlForSsrf, resolveAndValidate } from './url-validator.js';

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

  // Coverage for IPv6 forms previously bypassed by the regex-based validator.
  it('blocks IPv6 loopback ::1', () => {
    expect(validateUrlForSsrf('http://[::1]/').valid).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 (dotted-quad form)', () => {
    expect(validateUrlForSsrf('http://[::ffff:127.0.0.1]/').valid).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 (compressed-hex form)', () => {
    expect(validateUrlForSsrf('http://[::ffff:7f00:1]/').valid).toBe(false);
  });

  it('blocks IPv6 link-local fe80::/10', () => {
    expect(validateUrlForSsrf('http://[fe80::1]/').valid).toBe(false);
  });

  it('blocks IPv6 unique-local fc00::/7', () => {
    expect(validateUrlForSsrf('http://[fc00::1]/').valid).toBe(false);
    expect(validateUrlForSsrf('http://[fd12:3456::1]/').valid).toBe(false);
  });

  it('blocks IPv6 multicast ff00::/8', () => {
    expect(validateUrlForSsrf('http://[ff00::1]/').valid).toBe(false);
  });

  it('blocks IPv4 numeric integer form', () => {
    // Node's URL parser normalizes 2130706433 -> 127.0.0.1
    expect(validateUrlForSsrf('http://2130706433/').valid).toBe(false);
  });

  it('blocks IPv4 multicast', () => {
    expect(validateUrlForSsrf('http://224.0.0.1/').valid).toBe(false);
  });
});

describe('resolveAndValidate', () => {
  it('blocks DNS rebinding via hostname resolution', async () => {
    // localhost should resolve to 127.0.0.1; the sync layer also blocks it
    // by name, but this confirms the DNS resolution path engages.
    const r = await resolveAndValidate('http://localhost/');
    expect(r.valid).toBe(false);
  });

  it('rejects URLs whose hostname fails DNS resolution', async () => {
    const r = await resolveAndValidate('http://this-host-shouldnt-exist-zzz.example/');
    expect(r.valid).toBe(false);
    expect(r.reason?.toLowerCase()).toMatch(/dns|resolv|not found|enotfound|eai_again/i);
  });

  it('returns resolved addresses for valid public hosts', async () => {
    // Use an IP literal to avoid relying on external DNS in CI.
    const r = await resolveAndValidate('http://1.1.1.1/');
    expect(r.valid).toBe(true);
    expect(r.addresses).toBeDefined();
    expect(r.addresses!.length).toBeGreaterThan(0);
    expect(r.addresses![0].address).toBe('1.1.1.1');
  });
});
