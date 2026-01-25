/**
 * Rate Limiter
 * Token bucket implementation for API call rate limiting
 */

interface BucketConfig {
  maxTokens: number;      // Maximum tokens in bucket
  refillRate: number;     // Tokens added per second
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

// Default rate limits per tool category
const DEFAULT_LIMITS: Record<string, BucketConfig> = {
  // Read operations - more lenient
  read: { maxTokens: 60, refillRate: 10 },      // 60 burst, 10/sec sustained

  // Write operations - more restrictive
  write: { maxTokens: 20, refillRate: 2 },       // 20 burst, 2/sec sustained

  // Upload operations - most restrictive
  upload: { maxTokens: 10, refillRate: 0.5 },    // 10 burst, 1 per 2 seconds

  // Delete operations - restrictive
  delete: { maxTokens: 10, refillRate: 1 },      // 10 burst, 1/sec sustained
};

// Tool category mapping
const TOOL_CATEGORIES: Record<string, string> = {
  // Read operations
  get_posts: 'read',
  get_post: 'read',
  search_posts: 'read',
  get_post_by_slug: 'read',
  get_pages: 'read',
  get_page: 'read',
  search_pages: 'read',
  get_page_by_slug: 'read',
  get_tags: 'read',
  get_authors: 'read',
  get_members: 'read',
  get_member: 'read',
  search_members: 'read',

  // Write operations
  create_post: 'write',
  update_post: 'write',
  create_page: 'write',
  update_page: 'write',
  create_member: 'write',
  update_member: 'write',

  // Delete operations
  delete_post: 'delete',
  delete_page: 'delete',
  delete_member: 'delete',

  // Upload operations
  upload_image: 'upload',
  upload_image_from_url: 'upload',
};

class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();
  private limits: Record<string, BucketConfig>;
  private enabled: boolean;

  constructor(limits: Record<string, BucketConfig> = DEFAULT_LIMITS, enabled: boolean = true) {
    this.limits = limits;
    this.enabled = enabled;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(bucket: Bucket, config: BucketConfig): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * config.refillRate;

    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Get or create bucket for a category
   */
  private getBucket(category: string): Bucket {
    if (!this.buckets.has(category)) {
      const config = this.limits[category] || this.limits.read;
      this.buckets.set(category, {
        tokens: config.maxTokens,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(category)!;
  }

  /**
   * Check if a tool call is allowed and consume a token if so
   * @param toolName - Name of the tool being called
   * @returns Object with allowed status and optional wait time
   */
  consume(toolName: string): { allowed: boolean; retryAfterMs?: number; category?: string } {
    if (!this.enabled) {
      return { allowed: true };
    }

    const category = TOOL_CATEGORIES[toolName] || 'read';
    const config = this.limits[category] || this.limits.read;
    const bucket = this.getBucket(category);

    // Refill based on elapsed time
    this.refill(bucket, config);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, category };
    }

    // Calculate wait time until next token
    const tokensNeeded = 1 - bucket.tokens;
    const retryAfterMs = Math.ceil((tokensNeeded / config.refillRate) * 1000);

    return {
      allowed: false,
      retryAfterMs,
      category,
    };
  }

  /**
   * Get current status of all buckets (for debugging/monitoring)
   */
  getStatus(): Record<string, { tokens: number; maxTokens: number }> {
    const status: Record<string, { tokens: number; maxTokens: number }> = {};

    for (const [category, config] of Object.entries(this.limits)) {
      const bucket = this.buckets.get(category);
      if (bucket) {
        this.refill(bucket, config);
        status[category] = {
          tokens: Math.floor(bucket.tokens),
          maxTokens: config.maxTokens,
        };
      } else {
        status[category] = {
          tokens: config.maxTokens,
          maxTokens: config.maxTokens,
        };
      }
    }

    return status;
  }

  /**
   * Reset all buckets to full
   */
  reset(): void {
    this.buckets.clear();
  }

  /**
   * Enable or disable rate limiting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton instance
const rateLimiter = new RateLimiter(
  DEFAULT_LIMITS,
  process.env.GHOST_RATE_LIMIT_DISABLED !== 'true'
);

export { rateLimiter, RateLimiter, DEFAULT_LIMITS, TOOL_CATEGORIES };
export type { BucketConfig };
