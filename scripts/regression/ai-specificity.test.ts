import assert from 'node:assert/strict';
import {
  ACTIONABLE_GUIDANCE, DEFAULT_SPECIFICITY, parseSpecificity,
  specificityBand, specificityInstructions, specificityLabel,
} from '../../lib/ai/specificity';

assert.equal(DEFAULT_SPECIFICITY,0);
for (const invalid of [undefined,null,'100',NaN,Infinity,-1,101,3.5,{},[]]) {
  assert.equal(parseSpecificity(invalid),0,'invalid or missing input should use baseline');
}
for (const good of [0,10,20,40,60,80,100])
  assert.equal(parseSpecificity(good),good);
assert.equal(specificityBand(0),'baseline');
assert.equal(specificityBand(19),'baseline');
assert.equal(specificityBand(20),'focused');
assert.equal(specificityBand(39),'focused');
assert.equal(specificityBand(40),'observable');
assert.equal(specificityBand(59),'observable');
assert.equal(specificityBand(60),'contrasting');
assert.equal(specificityBand(79),'contrasting');
assert.equal(specificityBand(80),'falsifiable');
assert.equal(specificityBand(100),'falsifiable');
assert.equal(specificityInstructions(0),'','baseline must not change description instructions');
assert.equal(specificityInstructions(19),'','baseline band remains unchanged');
assert.equal(specificityLabel(0),'宽泛（默认）');
for (const value of [20,40,60,80,100]) {
  const prompt=specificityInstructions(value);
  assert(prompt.includes('描述明确度不代表预测准确率'),'guard must prevent confidence inflation');
  assert(prompt.includes('命盘资料不足以支持更具体的判断'),'guard must allow saying insufficient evidence');
  assert(prompt.includes('不可'),'guard must not fabricate user history');
}
assert(specificityInstructions(100).includes('反例/否定条件'));
assert(specificityInstructions(100).includes('过去6—12个月'));
assert(ACTIONABLE_GUIDANCE.includes('适用情境'));
assert(ACTIONABLE_GUIDANCE.includes('如何判断是否有帮助'));
console.log('AI specificity bands and actionable guidance regression passed');
