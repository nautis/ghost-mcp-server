/**
 * SSRF Protection — URL Validator
 *
 * Two-layer check:
 *   1. validateUrlForSsrf(url)        — sync, scheme + literal hostname/IP blocklist
 *   2. resolveAndValidate(url)        — async, also resolves DNS and checks every address
 *
 * Always call resolveAndValidate (or assertResolvedUrlSafe) before making a request.
 * The sync helper alone is vulnerable to DNS rebinding (attacker.com → 127.0.0.1).
 */

import { BlockList, isIPv4, isIPv6 } from 'node:net';
import dns from 'node:dns/promises';

const blockedV4 = new BlockList();
blockedV4.addSubnet('10.0.0.0', 8, 'ipv4');           // RFC1918
blockedV4.addSubnet('172.16.0.0', 12, 'ipv4');        // RFC1918
blockedV4.addSubnet('192.168.0.0', 16, 'ipv4');       // RFC1918
blockedV4.addSubnet('127.0.0.0', 8, 'ipv4');          // loopback
blockedV4.addSubnet('169.254.0.0', 16, 'ipv4');       // link-local + cloud metadata
blockedV4.addSubnet('100.64.0.0', 10, 'ipv4');        // CGNAT
blockedV4.addSubnet('0.0.0.0', 8, 'ipv4');            // "this network"
blockedV4.addSubnet('192.0.2.0', 24, 'ipv4');         // TEST-NET-1
blockedV4.addSubnet('198.51.100.0', 24, 'ipv4');      // TEST-NET-2
blockedV4.addSubnet('203.0.113.0', 24, 'ipv4');       // TEST-NET-3
blockedV4.addSubnet('224.0.0.0', 4, 'ipv4');          // multicast
blockedV4.addSubnet('240.0.0.0', 4, 'ipv4');          // reserved
blockedV4.addAddress('255.255.255.255', 'ipv4');      // broadcast

const blockedV6 = new BlockList();
blockedV6.addAddress('::1', 'ipv6');                  // loopback
blockedV6.addAddress('::', 'ipv6');                   // unspecified
blockedV6.addSubnet('fe80::', 10, 'ipv6');            // link-local
blockedV6.addSubnet('fc00::', 7, 'ipv6');             // unique-local
blockedV6.addSubnet('2001:db8::', 32, 'ipv6');        // documentation
blockedV6.addSubnet('ff00::', 8, 'ipv6');             // multicast

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.goog',
  'kubernetes.default.svc',
  'internal',
  'intranet',
  'corp',
  'private',
]);

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
  addresses?: Array<{ address: string; family: number }>;
}

function isBlockedHostnameLiteral(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  return BLOCKED_HOSTNAME_PATTERNS.some(p => p.test(lower));
}

/**
 * Check an IP literal. Handles IPv4-mapped IPv6 (`::ffff:127.0.0.1` in dotted-quad
 * or `::ffff:7f00:1` in compressed-hex) by extracting the underlying IPv4 and
 * re-checking via the IPv4 BlockList.
 */
function checkIpLiteral(ip: string): boolean {
  if (isIPv4(ip)) return blockedV4.check(ip, 'ipv4');
  if (!isIPv6(ip)) return false;

  // Dotted-quad form: ::ffff:127.0.0.1
  const dotted = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (dotted && blockedV4.check(dotted[1], 'ipv4')) return true;

  // Compressed hex form: ::ffff:7f00:1
  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    const v4 = [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join('.');
    if (blockedV4.check(v4, 'ipv4')) return true;
  }

  return blockedV6.check(ip, 'ipv6');
}

/** Strip surrounding brackets from an IPv6 hostname (Node's URL parser keeps them). */
function unbracket(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

/**
 * Sync validation: scheme + literal hostname/IP blocklist.
 * Does NOT resolve DNS — use resolveAndValidate for that.
 */
export function validateUrlForSsrf(url: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: `Protocol '${parsed.protocol}' not allowed. Use http or https.` };
  }

  const hostname = unbracket(parsed.hostname);
  if (!hostname) {
    return { valid: false, reason: 'Empty hostname' };
  }

  if (isBlockedHostnameLiteral(hostname)) {
    return { valid: false, reason: `Hostname '${hostname}' is blocked (internal/metadata endpoint)` };
  }

  if ((isIPv4(hostname) || isIPv6(hostname)) && checkIpLiteral(hostname)) {
    return { valid: false, reason: `IP '${hostname}' is in a blocked range (private/internal)` };
  }

  return { valid: true };
}

/**
 * Full validation: sync checks + DNS resolution. Every returned address is checked
 * against the blocklist; if any is private, the URL is rejected. Closes the DNS
 * rebinding hole that validateUrlForSsrf alone leaves open.
 *
 * Residual TOCTOU: between this check and the actual fetch, DNS could change.
 * For pinned-IP fetching, pass the returned `addresses` to your HTTP client.
 */
export async function resolveAndValidate(url: string): Promise<UrlValidationResult> {
  const sync = validateUrlForSsrf(url);
  if (!sync.valid) return sync;

  const parsed = new URL(url);
  const hostname = unbracket(parsed.hostname);

  // Literal IP — sync check already validated, no DNS needed.
  if (isIPv4(hostname) || isIPv6(hostname)) {
    return { valid: true, addresses: [{ address: hostname, family: isIPv4(hostname) ? 4 : 6 }] };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(hostname, { all: true, family: 0 });
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    return { valid: false, reason: `DNS resolution failed for '${hostname}': ${err.code || err.message}` };
  }

  if (addresses.length === 0) {
    return { valid: false, reason: `No addresses returned for '${hostname}'` };
  }

  for (const { address } of addresses) {
    if (checkIpLiteral(address)) {
      return {
        valid: false,
        reason: `Hostname '${hostname}' resolves to blocked address ${address}`,
      };
    }
  }

  return { valid: true, addresses };
}

/** Sync assertion — throws if the URL fails the literal check. */
export function assertUrlSafe(url: string): void {
  const result = validateUrlForSsrf(url);
  if (!result.valid) {
    throw new Error(`SSRF protection: ${result.reason}`);
  }
}

/** Async assertion — throws if DNS resolves to a blocked address. */
export async function assertResolvedUrlSafe(url: string): Promise<Array<{ address: string; family: number }>> {
  const result = await resolveAndValidate(url);
  if (!result.valid) {
    throw new Error(`SSRF protection: ${result.reason}`);
  }
  return result.addresses!;
}
