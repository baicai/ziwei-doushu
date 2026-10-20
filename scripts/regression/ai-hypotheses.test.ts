import assert from 'node:assert/strict';
import { parseReviewableHypotheses, HYPOTHESIS_FORMAT_INSTRUCTIONS } from '../../lib/ai/hypotheses';

assert(HYPOTHESIS_FORMAT_INSTRUCTIONS.includes('反例'));
assert(HYPOTHESIS_FORMAT_INSTRUCTIONS.includes('过去6—12个月'));
const answer=[
  '【整体特点】传统取象仅供参考。',
  '【待核验假设1】',
  '情境：面临冲突；行为：先提出方案。[依据:P6]',
  '反例：如果过去一年总是先等人决策，这一解释不成立。',
  '【待核验假设2】',
  '情境：团队变动；行为：倾向调整职责。[依据:P6:S0]',
  '不适用：若一贯优先维持现状则不符合。',
  '【待核验假设3】',
  '情境：方案失效；行为：可能提出新流程。[依据:P5,P6]',
  '相反表现：如长期选择维持流程，则应否定。',
  '【可以怎么做】记录一次实际决策。',
].join('\n');
const parsed=parseReviewableHypotheses(answer);
assert.equal(parsed.complete,true);
assert.equal(parsed.warning,null);
assert.equal(parsed.hypotheses.length,3);
assert.deepEqual(parsed.hypotheses.map(h=>h.id),['H1','H2','H3']);
assert(parsed.hypotheses.every(h=>h.hasCounterexample && h.hasChartReference));
assert(!parsed.hypotheses[2].text.includes('可以怎么做'),'advice should not be included in hypothesis body');
assert.equal(parseReviewableHypotheses('没有列表').complete,false);
assert.equal(parseReviewableHypotheses('【假设1】空白内容').hypotheses.length,1);
const duplicate=answer+'\n【待核验假设3】重复的假设';
assert.equal(parseReviewableHypotheses(duplicate).complete,false);
const missing=answer.replace('反例：如果过去一年总是先等人决策，这一解释不成立。','这里没有提出适用边界。');
assert.equal(parseReviewableHypotheses(missing).complete,false);
const missingRef=answer.replace('[依据:P6:S0]','');
assert.equal(parseReviewableHypotheses(missingRef).complete,false);
const noFabrication=answer.replace('【待核验假设3】','【待核验假设3】');
assert.deepEqual(parseReviewableHypotheses(noFabrication).hypotheses.map(h=>h.id),['H1','H2','H3']);
console.log('High-specificity three-hypothesis format and validation regression passed');
