const store = new Map<string, { count: number; resetAt: number }>();

// Limpieza de entradas vencidas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of store.entries()) {
    if (now > rec.resetAt) store.delete(key);
  }
}, 5 * 60_000);

export function checkRateLimit(
  identifier: string,
  maxAttempts = 5,
  windowMs    = 60_000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const rec = store.get(identifier);

  if (!rec || now > rec.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (rec.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  rec.count++;
  return { allowed: true, remaining: maxAttempts - rec.count };
}
