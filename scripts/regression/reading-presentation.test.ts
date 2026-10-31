import assert from 'node:assert/strict';
import {splitReadingForFeedback} from '../../lib/ai/reading-presentation';
import {generateChart} from '../../lib/ziwei/algorithm';
import {buildPlainSections} from '../../lib/ziwei/plain-language-report';
import {readingTextId} from '../../lib/ai/reading-feedback';
const a=splitReadingForFeedback('你更喜欢事情有个明确的安排，最受不了大家都说“随便”。比如一群人商量去哪儿，迟迟定不下来，你会定下地点。\n遇到其他情况也可以核对。');
assert.equal(a.lead,'你更喜欢事情有个明确的安排，最受不了大家都说“随便”。');
assert(a.details.startsWith('比如一群人商量去哪儿'));
assert(a.details.includes('遇到其他情况'));
const b=splitReadingForFeedback('第一句话！第二句话。');
assert.equal(b.lead,'第一句话！');
assert.equal(b.details,'第二句话。');
const c=splitReadingForFeedback('没有标点的短文');
assert.equal(c.lead,'没有标点的短文');
assert.equal(c.details,'');
const chart=generateChart({year:1982,month:8,day:2,hour:0,gender:'male'});
for(const section of buildPlainSections(chart)){
 assert(section.lead);
 assert(section.observation);
 assert(section.suggestion);
 assert(section.evidence);
 assert(section.evidenceNote);
 const before=readingTextId('offline',section.key,[section.lead,section.observation,section.suggestion].join('\n'));
 const after=readingTextId('offline',section.key,[section.lead,section.observation,section.suggestion].join('\n'));
 assert.equal(before,after);
}
console.log('Progressive reading: lead/detail extraction, evidence note and feedback keys passed');
