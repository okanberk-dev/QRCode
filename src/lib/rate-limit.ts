type RateLimitRule = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitRecord = {
  count: number;
  firstRequestTime: number;
};

// In-memory store (for simple rate limiting; in production multi-node environments, use Redis)
const ipStore = new Map<string, RateLimitRecord>();

export function rateLimit(ip: string, rule: RateLimitRule): boolean {
  const now = Date.now();
  const record = ipStore.get(ip);

  if (!record) {
    ipStore.set(ip, { count: 1, firstRequestTime: now });
    return true; // Allowed
  }

  // Check if window has expired
  if (now - record.firstRequestTime > rule.windowMs) {
    // Reset window
    ipStore.set(ip, { count: 1, firstRequestTime: now });
    return true; // Allowed
  }

  // Increment and check logic
  record.count += 1;
  ipStore.set(ip, record);

  if (record.count > rule.maxRequests) {
    return false; // Denied / Rate Limited
  }

  return true; // Allowed
}

// Cleanup function to prevent memory leaks in long running processes
setInterval(() => {
  const now = Date.now();
  // Using 15 minutes as default cleanup window
  const expirationWindow = 15 * 60 * 1000;
  
  for (const [ip, record] of Array.from(ipStore.entries())) {
    if (now - record.firstRequestTime > expirationWindow) {
      ipStore.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes
