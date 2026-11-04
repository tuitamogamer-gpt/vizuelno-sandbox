// A per-instance limiter. Vercel's platform firewall can add deployment-wide limits.
const attempts = new Map<string, { count: number; reset: number }>();
export function allowAttempt(key: string, limit = 8, now = Date.now()) {
  for (const [id, value] of attempts) if (value.reset <= now) attempts.delete(id);
  const entry = attempts.get(key);
  if (!entry) {
    if (attempts.size > 10000) return false;
    attempts.set(key, { count: 1, reset: now + 15 * 60 * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
