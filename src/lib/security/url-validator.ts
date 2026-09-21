import { URL } from 'url';
import dns from 'dns/promises';

// Private/reserved IPv4 ranges (CIDR notation)
const BLOCKED_IPV4_RANGES = [
  { start: '0.0.0.0', end: '0.255.255.255' },       // "This" network
  { start: '10.0.0.0', end: '10.255.255.255' },      // Private 10.x
  { start: '100.64.0.0', end: '100.127.255.255' },   // Shared address space
  { start: '127.0.0.0', end: '127.255.255.255' },    // Loopback
  { start: '169.254.0.0', end: '169.254.255.255' },  // Link-local
  { start: '172.16.0.0', end: '172.31.255.255' },     // Private 172.16-31.x
  { start: '192.0.0.0', end: '192.0.0.255' },         // IETF Protocol Assignments
  { start: '192.0.2.0', end: '192.0.2.255' },         // TEST-NET-1
  { start: '192.88.99.0', end: '192.88.99.255' },     // 6to4 Relay
  { start: '192.168.0.0', end: '192.168.255.255' },   // Private 192.168.x
  { start: '198.18.0.0', end: '198.19.255.255' },     // Benchmark testing
  { start: '198.51.100.0', end: '198.51.100.255' },   // TEST-NET-2
  { start: '203.0.113.0', end: '203.0.113.255' },     // TEST-NET-3
  { start: '224.0.0.0', end: '239.255.255.255' },     // Multicast
  { start: '240.0.0.0', end: '255.255.255.255' },     // Reserved
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  '0.0.0.0',
  '[::1]',
  '[::0]',
  '[0:0:0:0:0:0:0:1]',
  '[0:0:0:0:0:0:0:0]',
  'metadata.google.internal',      // GCP metadata
  '169.254.169.254',                // Cloud metadata endpoint
  'metadata.google.internal.',
];

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  return BLOCKED_IPV4_RANGES.some(({ start, end }) => {
    const startNum = ipToNumber(start);
    const endNum = ipToNumber(end);
    return ipNum >= startNum && ipNum <= endNum;
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Unspecified
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  // Link-local
  if (lower.startsWith('fe80:')) return true;
  // Unique local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // IPv4-mapped IPv6
  if (lower.startsWith('::ffff:')) {
    const v4Part = lower.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
  }
  return false;
}

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
  hostname?: string;
  protocol?: string;
}

/**
 * Validates a URL for safety against SSRF attacks and common issues.
 */
export function validateUrl(inputUrl: string): UrlValidationResult {
  // Length check
  if (inputUrl.length > 2048) {
    return { valid: false, error: 'URL is too long (max 2048 characters)' };
  }

  // Basic trim
  const trimmed = inputUrl.trim();

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Protocol check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return {
      valid: false,
      error: 'URL must use HTTP or HTTPS protocol',
    };
  }

  // Hostname check
  if (!parsed.hostname || parsed.hostname.length === 0) {
    return { valid: false, error: 'URL must have a valid hostname' };
  }

  // Domain check - must have a dot (no single-label domains)
  if (!parsed.hostname.includes('.') && !parsed.hostname.startsWith('[')) {
    return { valid: false, error: 'URL must have a valid domain name' };
  }

  // Blocked hostname check
  const lowerHostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) {
    return { valid: false, error: 'This URL is not allowed' };
  }

  // Check for IP literal
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(parsed.hostname)) {
    if (isPrivateIPv4(parsed.hostname)) {
      return { valid: false, error: 'URLs pointing to private or internal networks are not allowed' };
    }
  }

  // Check for IPv6 literal
  if (parsed.hostname.startsWith('[') && parsed.hostname.endsWith(']')) {
    const ipv6 = parsed.hostname.slice(1, -1);
    if (isPrivateIPv6(ipv6)) {
      return { valid: false, error: 'URLs pointing to private or internal networks are not allowed' };
    }
  }

  // Auth in URL check (potential credential leak)
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' };
  }

  // Port check - block common internal service ports
  const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
  const blockedPorts = [0, 22, 23, 25, 110, 135, 139, 445, 3306, 5432, 6379, 27017];
  if (blockedPorts.includes(port)) {
    return { valid: false, error: 'This port is not allowed' };
  }

  // Normalize URL
  const normalizedUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}${parsed.pathname}`;

  return {
    valid: true,
    normalizedUrl,
    hostname: parsed.hostname,
    protocol: parsed.protocol,
  };
}

/**
 * Performs DNS resolution and checks that the resolved IP is not private.
 * Should be called after validateUrl() passes.
 */
export async function validateUrlDns(hostname: string): Promise<UrlValidationResult> {
  try {
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);

    const allAddresses = [...addresses, ...addresses6];

    if (allAddresses.length === 0) {
      return { valid: false, error: 'Could not resolve hostname' };
    }

    // Check each resolved IP
    for (const ip of addresses) {
      if (isPrivateIPv4(ip)) {
        return {
          valid: false,
          error: 'This URL resolves to a private network address',
        };
      }
    }

    for (const ip of addresses6) {
      if (isPrivateIPv6(ip)) {
        return {
          valid: false,
          error: 'This URL resolves to a private network address',
        };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Could not resolve hostname' };
  }
}

/**
 * Full URL validation including DNS resolution check.
 */
export async function validateUrlFull(inputUrl: string): Promise<UrlValidationResult> {
  const basicResult = validateUrl(inputUrl);
  if (!basicResult.valid) return basicResult;

  const dnsResult = await validateUrlDns(basicResult.hostname!);
  if (!dnsResult.valid) return dnsResult;

  return basicResult;
}
