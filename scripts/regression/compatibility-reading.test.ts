import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { buildCompatibilityReading } from '../../lib/ziwei/compatibility-reading';

const a = generateChart({ year: 1990, month: 5, day: 17, hour: 6, gender: 'male' });
const b = generateChart({ year: 1992, month: 9, day: 21, hour: 2, gender: 'female' });
const result = buildCompatibilityReading(a,b);
assert(result.includes('甲方：命宫') && result.includes('乙方：命宫'));
assert(result.includes('夫妻宫对照') && result.includes('财帛宫对照'));
assert(result.includes('未调用 AI 模型'));
assert(!result.includes('/api/heming'));
const focused=buildCompatibilityReading(a,b,'创业合作要注意什么？');
assert(focused.includes('官禄宫对照'));
assert(!focused.includes('夫妻宫对照'));
const reversed=buildCompatibilityReading(b,a);
assert.notEqual(result,reversed,'birth inputs must affect the report');
console.log('Compatibility chart comparison regression checks passed');
