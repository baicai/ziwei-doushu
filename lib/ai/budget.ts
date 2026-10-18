/**
 * Server-only atomic request budget for AI calls.
 *
 * Upstash Redis REST EVAL performs the daily/monthly checks and increments
 * in a single atomic script across all Vercel serverless instances.
 *
 * This counts upstream call attempts, not billed currency. It deliberately
 * does not refund a slot after timeouts, because the provider may have billed.
 */
export type BudgetResult =
  | { allowed: true; mode: 'enforced' | 'not-enabled'; dailyUsed?: number; monthlyUsed?: number }
  | { allowed: false; reason: 'daily_limit' | 'monthly_limit' | 'unavailable' };

const ATOMIC_RESERVE = `
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthly = tonumber(redis.call('GET', KEYS[2]) or '0')
local dailyMax = tonumber(ARGV[1])
local monthlyMax = tonumber(ARGV[2])
if daily >= dailyMax then return {0, daily, monthly} end
if monthly >= monthlyMax then return {1, daily, monthly} end
local dailyUsed = redis.call('INCR', KEYS[1])
if dailyUsed == 1 then redis.call('EXPIRE', KEYS[1], 172800) end
local monthlyUsed = redis.call('INCR', KEYS[2])
if monthlyUsed == 1 then redis.call('EXPIRE', KEYS[2], 3456000) end
return {2, dailyUsed, monthlyUsed}
`;

function limit(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 100000 ? number : fallback;
}

export function budgetKeys(now: Date) {
  const iso = now.toISOString();
  return {
    daily: 'iziwei:ai:requests:day:' + iso.slice(0, 10),
    monthly: 'iziwei:ai:requests:month:' + iso.slice(0, 7),
  };
}

export async function reserveAiBudget(
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<BudgetResult> {
  // Optional rollout: existing public demo remains WAF-protected until the
  // owner explicitly enables a shared, enforceable all-user budget.
  if (env.AI_BUDGET_MODE !== 'enforce')
    return { allowed: true, mode: 'not-enabled' };

  const url = env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '');
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !url.startsWith('https://'))
    return { allowed: false, reason: 'unavailable' };

  const keys = budgetKeys(now);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        'EVAL', ATOMIC_RESERVE, 2, keys.daily, keys.monthly,
        limit(env.AI_DAILY_MAX_CALLS, 20), limit(env.AI_MONTHLY_MAX_CALLS, 150),
      ]),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return { allowed: false, reason: 'unavailable' };
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('result' in body)) {
      return { allowed: false, reason: 'unavailable' };
    }
    const result = (body as {result: unknown}).result;
    if (!Array.isArray(result) || result.length !== 3 ||
      !result.every(n => typeof n === 'number' && Number.isFinite(n)))
      return { allowed: false, reason: 'unavailable' };
    if (result[0] === 0) return { allowed: false, reason: 'daily_limit' };
    if (result[0] === 1) return { allowed: false, reason: 'monthly_limit' };
    if (result[0] === 2) return { allowed: true, mode: 'enforced',
      dailyUsed: result[1], monthlyUsed: result[2] };
    return { allowed: false, reason: 'unavailable' };
  } catch {
    return { allowed: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
