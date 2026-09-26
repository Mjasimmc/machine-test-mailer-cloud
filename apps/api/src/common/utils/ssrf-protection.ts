import { BadRequestException } from '@nestjs/common';
import * as dns from 'dns';
import { promisify } from 'util';

const resolve4Async = promisify(dns.resolve4);
const resolve6Async = promisify(dns.resolve6);

export async function validateSafeUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Only HTTP and HTTPS protocols are permitted');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious localhost / internal hostnames
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new BadRequestException('Target hostname resolves to a restricted internal address');
  }

  // Check if hostname is raw IP
  if (isPrivateIp(hostname)) {
    throw new BadRequestException('Target IP belongs to a reserved private or link-local network');
  }

  // DNS resolution to protect against DNS rebinding and internal network scanning
  try {
    const ipv4Addresses = await resolve4Async(hostname).catch(() => []);
    for (const ip of ipv4Addresses) {
      if (isPrivateIp(ip)) {
        throw new BadRequestException(`Target domain resolves to restricted private IP (${ip})`);
      }
    }

    const ipv6Addresses = await resolve6Async(hostname).catch(() => []);
    for (const ip of ipv6Addresses) {
      if (isPrivateIpv6(ip)) {
        throw new BadRequestException(`Target domain resolves to restricted IPv6 address (${ip})`);
      }
    }
  } catch (err: any) {
    if (err instanceof BadRequestException) throw err;
    // If domain resolution fails completely, block or allow? Block for safety
    throw new BadRequestException(`Could not resolve webhook hostname: ${hostname}`);
  }

  return parsed.toString();
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return false;
  }

  // 0.0.0.0/8
  if (parts[0] === 0) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 127.0.0.0/8
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // Carrier-grade NAT 100.64.0.0/10
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (parts[0] >= 224) return true;

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback
  if (lower === '::1') return true;
  // Link-local fe80::/10
  if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // Unique local fc00::/7
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  return false;
}
