/**
 * SSRF Protection - URL Validator
 * Blocks requests to private IP ranges, localhost, and cloud metadata endpoints
 */

// Private/reserved IP ranges (RFC1918, RFC5737, RFC6598, link-local, loopback)
const BLOCKED_IP_PATTERNS = [
  // IPv4 private ranges
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16

  // IPv4 loopback
  /^127\./,                         // 127.0.0.0/8

  // IPv4 link-local
  /^169\.254\./,                    // 169.254.0.0/16 (includes cloud metadata)

  // IPv4 CGNAT
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10

  // IPv4 documentation/test ranges
  /^192\.0\.2\./,                   // 192.0.2.0/24 (TEST-NET-1)
  /^198\.51\.100\./,                // 198.51.100.0/24 (TEST-NET-2)
  /^203\.0\.113\./,                 // 203.0.113.0/24 (TEST-NET-3)

  // IPv4 broadcast
  /^255\.255\.255\.255$/,

  // IPv6 patterns (when resolved)
  /^::1$/,                          // IPv6 loopback
  /^fe80:/i,                        // IPv6 link-local
  /^fc00:/i,                        // IPv6 unique local
  /^fd[0-9a-f]{2}:/i,               // IPv6 unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::]',
  '[::1]',

  // Cloud metadata endpoints
  'metadata.google.internal',
  'metadata.goog',
  'kubernetes.default.svc',

  // Common internal hostnames
  'internal',
  'intranet',
  'corp',
  'private',
];

// Blocked hostname patterns (cloud metadata, internal services)
const BLOCKED_HOSTNAME_PATTERNS = [
  /^metadata\./i,
  /\.internal$/i,
  /\.local$/i,
  /\.localhost$/i,
  /\.corp$/i,
  /\.lan$/i,
];

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Check if an IP address is in a blocked range
 */
function isBlockedIp(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some(pattern => pattern.test(ip));
}

/**
 * Check if a hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Check exact matches
  if (BLOCKED_HOSTNAMES.includes(lower)) {
    return true;
  }

  // Check patterns
  if (BLOCKED_HOSTNAME_PATTERNS.some(pattern => pattern.test(lower))) {
    return true;
  }

  return false;
}

/**
 * Resolve hostname to IP and check if blocked
 * Note: This is a sync check of the hostname format, not actual DNS resolution
 * For full protection, would need async DNS resolution
 */
function looksLikeIp(hostname: string): string | null {
  // IPv4 pattern
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1).map(Number);
    if (octets.every(o => o >= 0 && o <= 255)) {
      return hostname;
    }
  }

  // IPv6 in brackets
  const ipv6Match = hostname.match(/^\[([^\]]+)\]$/);
  if (ipv6Match) {
    return ipv6Match[1];
  }

  return null;
}

/**
 * Validate a URL for SSRF protection
 * @param url - The URL to validate
 * @returns Validation result with reason if blocked
 */
export function validateUrlForSsrf(url: string): UrlValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Only allow http and https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: `Protocol '${parsed.protocol}' not allowed. Use http or https.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check if hostname is blocked
  if (isBlockedHostname(hostname)) {
    return { valid: false, reason: `Hostname '${hostname}' is blocked (internal/metadata endpoint)` };
  }

  // Check if hostname looks like an IP address
  const ip = looksLikeIp(hostname);
  if (ip && isBlockedIp(ip)) {
    return { valid: false, reason: `IP address '${ip}' is in a blocked range (private/internal)` };
  }

  // Block requests to well-known metadata IP
  if (hostname === '169.254.169.254') {
    return { valid: false, reason: 'Cloud metadata endpoint blocked' };
  }

  // Check for URL-encoded bypasses in the original URL
  const decodedUrl = decodeURIComponent(url);
  if (decodedUrl !== url) {
    // Re-validate decoded URL
    try {
      const decodedParsed = new URL(decodedUrl);
      const decodedHostname = decodedParsed.hostname.toLowerCase();
      if (isBlockedHostname(decodedHostname)) {
        return { valid: false, reason: 'URL encoding bypass attempt detected' };
      }
      const decodedIp = looksLikeIp(decodedHostname);
      if (decodedIp && isBlockedIp(decodedIp)) {
        return { valid: false, reason: 'URL encoding bypass attempt detected' };
      }
    } catch {
      // Decoded URL is invalid, original validation stands
    }
  }

  return { valid: true };
}

/**
 * Validate URL and throw if blocked
 * @param url - The URL to validate
 * @throws Error if URL is blocked
 */
export function assertUrlSafe(url: string): void {
  const result = validateUrlForSsrf(url);
  if (!result.valid) {
    throw new Error(`SSRF protection: ${result.reason}`);
  }
}
