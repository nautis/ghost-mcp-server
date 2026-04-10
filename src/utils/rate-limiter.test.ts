import { describe, it, expect } from 'vitest';
import { RateLimiter, DEFAULT_LIMITS } from './rate-limiter.js';

describe('RateLimiter', () => {
  it('allows requests within burst limit', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    const result = limiter.consume('get_posts');
    expect(result.allowed).toBe(true);
  });

  it('exhausts tokens after burst limit', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    // read category has 60 burst
    for (let i = 0; i < 60; i++) {
      const result = limiter.consume('get_posts');
      expect(result.allowed).toBe(true);
    }
    const exhausted = limiter.consume('get_posts');
    expect(exhausted.allowed).toBe(false);
    expect(exhausted.retryAfterMs).toBeGreaterThan(0);
  });

  it('categorizes write operations correctly', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    const result = limiter.consume('create_post');
    expect(result.allowed).toBe(true);
    expect(result.category).toBe('write');
  });

  it('categorizes delete operations correctly', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    const result = limiter.consume('delete_post');
    expect(result.allowed).toBe(true);
    expect(result.category).toBe('delete');
  });

  it('categorizes upload operations correctly', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    const result = limiter.consume('upload_image');
    expect(result.allowed).toBe(true);
    expect(result.category).toBe('upload');
  });

  it('defaults unknown tools to read category', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    const result = limiter.consume('unknown_tool');
    expect(result.allowed).toBe(true);
    expect(result.category).toBe('read');
  });

  it('bypasses when disabled', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, false);
    // Should always allow, even beyond burst
    for (let i = 0; i < 100; i++) {
      const result = limiter.consume('get_posts');
      expect(result.allowed).toBe(true);
    }
  });

  it('reset() restores all buckets', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    // Exhaust read bucket
    for (let i = 0; i < 60; i++) {
      limiter.consume('get_posts');
    }
    expect(limiter.consume('get_posts').allowed).toBe(false);

    limiter.reset();
    expect(limiter.consume('get_posts').allowed).toBe(true);
  });

  it('getStatus() reports correct maxTokens', () => {
    const limiter = new RateLimiter(DEFAULT_LIMITS, true);
    const status = limiter.getStatus();
    expect(status.read.maxTokens).toBe(60);
    expect(status.write.maxTokens).toBe(20);
    expect(status.upload.maxTokens).toBe(10);
    expect(status.delete.maxTokens).toBe(10);
  });
});
