import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const forbidden: Array<[RegExp, string]> = [
  [/倪海厦正宗|倪师正宗/g, 'unverified lineage/endorsement'],
  [/限时回馈|5 月 1 日 — 5 月 8 日/g, 'expired promotional copy'],
  [/Claude AI/g, 'outdated provider marketing copy'],
  [/开源版不含 AI 解读接口/g, 'obsolete AI interface error copy'],
];
const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return walk(path);
  return path.endsWith('.tsx') ? [path] : [];
});
for (const path of [...walk('app'), ...walk('components')]) {
  const source = readFileSync(path, 'utf8');
  for (const [expression, reason] of forbidden) {
    assert(!expression.test(source), path + ' contains ' + reason);
    expression.lastIndex = 0;
  }
}
assert(!existsSync('components/AnnouncementModal.tsx'), 'expired announcement component must not be restored');
const layout = readFileSync('app/layout.tsx', 'utf8');
assert(layout.includes('紫微研究 · 紫微斗数命盘'), 'sharing title must match branding');
const site = readFileSync('lib/site.ts', 'utf8');
assert(site.includes('VERCEL_PROJECT_PRODUCTION_URL'), 'production share URL must have a safe fallback');
console.log('Public-facing copy and share metadata regression checks passed');
