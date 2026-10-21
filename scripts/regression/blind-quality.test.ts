import assert from 'node:assert/strict';
import { checkBlindAnswerLeakage } from '../../lib/ai/blind-quality';
import type {BlindBirthSample} from '../../lib/ai/blind-evaluation';

const own:BlindBirthSample={year:1982,month:8,day:2,hour:6,gender:'male',timePrecision:'known'};
const control:BlindBirthSample={year:1995,month:12,day:15,hour:11,gender:'male',timePrecision:'known'};
const allowed=checkBlindAnswerLeakage([
  '传统星曜可能象征在团队变化时主动推动决策，但反例是选择保留现状。',
  '资源管理上可能更谨慎，缺乏真实个人经历无法确定。',
],[own,control]);
assert.equal(allowed.usable,true);
assert.deepEqual(allowed.flags,[]);
for(const leaked of [
  '你出生于1982年8月2日，所以容易领导团队。',
  '1995-12-15的命盘代表更多的探索。',
  '该解读是合成命盘，请关注差异。',
  '这是来自真实盘的分析。',
  '生于 1982 年，喜欢变革。',
  '出生日期 8月2日，表示有领导倾向。',
]) {
  const result=checkBlindAnswerLeakage([leaked],[own,control]);
  assert.equal(result.usable,false,'should flag obvious birth clue: '+leaked);
  assert(result.flags.length>0);
}
const falsePositive=checkBlindAnswerLeakage([
  '在2026年可以做一次预算复盘；这是行动建议，不是发生过的真实事件。',
],[own,control]);
assert.equal(falsePositive.usable,true,'unrelated current year need not automatically fail');
const both=checkBlindAnswerLeakage([
  '命盘属于合成命盘。',
  '生日是1995年12月15日。',
],[own,control]);
assert.equal(both.usable,false);
assert(both.flags.length>=2);
console.log('Blind answer disclosure guard regression passed');
