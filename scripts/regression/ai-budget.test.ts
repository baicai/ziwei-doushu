import assert from 'node:assert/strict';
import { budgetKeys, reserveAiBudget } from '../../lib/ai/budget';

async function runBudgetChecks() {
const now = new Date('2026-10-19T00:01:00.000Z');
const keys = budgetKeys(now);
assert.equal(keys.daily, 'iziwei:ai:requests:day:2026-10-19');
assert.equal(keys.monthly, 'iziwei:ai:requests:month:2026-10');

const env: Record<string,string|undefined> = {
  AI_BUDGET_MODE: 'enforce',
  AI_DAILY_MAX_CALLS: '12',
  AI_MONTHLY_MAX_CALLS: '120',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io/',
  UPSTASH_REDIS_REST_TOKEN: 'test-redacted-token',
};
let captured: unknown;
const stub = (code: number[], status = 200): typeof fetch =>
  (async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.method, 'POST');
    const authorization = (init?.headers as Record<string,string>).Authorization;
    assert.equal(authorization, 'Bearer test-redacted-token');
    captured = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({result: code}), {status,headers:{'Content-Type':'application/json'}});
  }) as typeof fetch;

const permitted = await reserveAiBudget(env, now, stub([2, 1, 1]));
assert.deepEqual(permitted, {allowed:true,mode:'enforced',dailyUsed:1,monthlyUsed:1});
const cmd = captured as Array<unknown>;
assert.equal(cmd[0], 'EVAL');
assert.equal(cmd[2], 2);
assert.equal(cmd[3], keys.daily);
assert.equal(cmd[4], keys.monthly);
assert.equal(cmd[5], 12);
assert.equal(cmd[6], 120);
assert.match(String(cmd[1]), /redis.call\('INCR', KEYS\[1\]\)/);
assert.match(String(cmd[1]), /redis.call\('INCR', KEYS\[2\]\)/);
assert.match(String(cmd[1]), /if daily >= dailyMax/);
assert.match(String(cmd[1]), /if monthly >= monthlyMax/);

assert.deepEqual(await reserveAiBudget(env,now,stub([0,12,18])),
  {allowed:false,reason:'daily_limit'});
assert.deepEqual(await reserveAiBudget(env,now,stub([1,3,120])),
  {allowed:false,reason:'monthly_limit'});
assert.deepEqual(await reserveAiBudget(env,now,stub([9,3,3])),
  {allowed:false,reason:'unavailable'});
assert.deepEqual(await reserveAiBudget(env,now,stub([2,4,4],503)),
  {allowed:false,reason:'unavailable'});
assert.deepEqual(await reserveAiBudget({...env,UPSTASH_REDIS_REST_TOKEN:undefined},now),
  {allowed:false,reason:'unavailable'});
assert.deepEqual(await reserveAiBudget({...env,UPSTASH_REDIS_REST_URL:'http://insecure.test'},now),
  {allowed:false,reason:'unavailable'});
assert.deepEqual(await reserveAiBudget({AI_BUDGET_MODE:'enforce'},now),
  {allowed:false,reason:'unavailable'});
assert.deepEqual(await reserveAiBudget({},now),
  {allowed:true,mode:'not-enabled'});

console.log('Atomic AI global request budget unit checks passed (no live Redis claim)');

}
runBudgetChecks().catch(error => { console.error(error); process.exitCode = 1; });
