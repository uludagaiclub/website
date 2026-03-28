/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, consider using Redis.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Optional: Custom key generator function
   * Default: uses IP address from request
   */
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining requests and reset time
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Increment count
  entry.count++;
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Check various headers for IP address
  const headers = request.headers;
  
  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  
  // Standard forwarded header
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP if multiple are present
    return forwarded.split(',')[0].trim();
  }
  
  // Real IP header
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  
  // Fallback
  return 'unknown';
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict: 10 requests per minute
   * Use for: Sensitive operations (file uploads, submissions)
   */
  STRICT: {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  },
  
  /**
   * Moderate: 30 requests per minute
   * Use for: Regular API calls (downloads, queries)
   */
  MODERATE: {
    maxRequests: 30,
    windowMs: 60 * 1000 // 1 minute
  },
  
  /**
   * Lenient: 60 requests per minute
   * Use for: High-frequency operations (auto-save, polling)
   */
  LENIENT: {
    maxRequests: 60,
    windowMs: 60 * 1000 // 1 minute
  },
  
  /**
   * Auth: 5 attempts per 15 minutes
   * Use for: Authentication endpoints
   */
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }
} as const;

