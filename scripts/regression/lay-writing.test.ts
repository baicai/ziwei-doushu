import assert from 'node:assert/strict';
import {generateChart} from '../../lib/ziwei/algorithm';
import {buildPlainSections,buildLayTopicReading} from '../../lib/ziwei/plain-language-report';
import {LAY_WRITING_PROMPT,LAY_WRITING_VERSION,DIRECT_USER_QUESTION} from '../../lib/ai/lay-writing';
import type {ZiweiChart} from '../../lib/ziwei/types';

const base=generateChart({year:1982,month:8,day:2,hour:6,gender:'male'});
const stars=['紫微','天机','太阳','武曲','天同','廉贞','天府','太阴','贪狼','巨门','天相','天梁','七杀','破军'];
const different=new Set<string>();
for(const starName of stars) {
  // Fictional single-star fixture isolates the COPY mapping, not the chart algorithm.
  const chart:ZiweiChart={...base,palaces:base.palaces.map(p=>({
    ...p,stars:[{name:starName,type:'major' as const}],
    isEmpty:false,borrowedStars:[],borrowedFromName:undefined,
  }))};
  const cards=buildPlainSections(chart);
  assert.equal(cards.length,6);
  assert(cards.every(c=>c.lead.length>10&&c.observation.length>20),
    'short generic or empty copy: '+starName);
  assert(cards.every(c=>c.evidence.includes(starName)),
    'provenance must reflect source star: '+starName);
  const topicLead=cards.map(c=>c.lead).join('|');
  assert(!/统筹安排、承担责任|传统象征需要结合/.test(topicLead));
  different.add(topicLead);
  for(const c of cards) {
    const preview=buildLayTopicReading(chart,c.key);
    assert(preview.includes(c.lead) && preview.includes(c.observation));
    assert(!preview.includes(c.evidence));
  }
}
assert.equal(different.size,14,'all 14 main stars must lead to a distinct lay voice');
assert(LAY_WRITING_VERSION.includes('v4'));
for(const phrase of ['最简单','生活','具体','反例','编造','花钱','直接','不需要猜','同事拖着不交东西','过去一年','不同的生活情景']) {
  const combined=LAY_WRITING_PROMPT+'\n'+DIRECT_USER_QUESTION;
  assert(combined.includes(phrase),'AI plain-copy contract should cover '+phrase);
}
assert(!LAY_WRITING_PROMPT.includes('传统上可理解为”的谨慎语气'));
assert(DIRECT_USER_QUESTION.includes('不能编造'));
console.log('Fourteen star signatures and six lay topic cards vary with concrete everyday behavior');
