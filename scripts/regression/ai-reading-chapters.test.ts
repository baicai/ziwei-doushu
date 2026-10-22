import assert from 'node:assert/strict';
import { OFFLINE_TOPICS } from '../../lib/ziwei/offline-interpretation';
import { parseSixTopicAnswer, sixTopicFormatComplete, PUBLIC_TOPIC_ORDER } from '../../lib/ai/reading-sections';
import { DEEP_READING_PROMPT, DEEP_READING_VERSION, LAY_WRITING_PROMPT, LAY_WRITING_VERSION } from '../../lib/ai/lay-writing';

const answer=[
  '【命格】遇到没人安排的事你可能自己动手。[依据:P2:S0]',
  '【感情】对方沉默时你可能会先问清楚。[依据:P3]',
  '【事业】同事延期时你可能重新分配工作。[依据:P4,P7]',
  '【财运】买东西之前喜欢货比三家。[依据:P5:S1]',
  '【健康】白天有事没做完不容易停下休息。[依据:P6]',
  '【性格】他人提出新方法时习惯先分析风险。[依据:P8]',
].join('\n');
const items=parseSixTopicAnswer(answer);
assert.equal(items.length,6);
assert.deepEqual(items.map(x=>x.key),OFFLINE_TOPICS.map(x=>x.key));
assert.deepEqual(items.map(x=>x.key),PUBLIC_TOPIC_ORDER);
assert.equal(items[0].text.includes('[依据:'),false,'citation metadata hidden in narrative');
assert.deepEqual(items.find(x=>x.key==='career')?.referenceIds,['P4','P7']);
assert.equal(sixTopicFormatComplete(answer),true);
const incomplete=answer.replace('【健康】','【健康和身体】');
assert.equal(sixTopicFormatComplete(incomplete),false);
assert.equal(parseSixTopicAnswer(incomplete).length,5);
const experimental=answer+'\n【待核验假设1】这一段是实验附录，不属于性格。';
const topics=parseSixTopicAnswer(experimental);
assert.equal(topics.length,6);
assert.equal(topics[5].text.includes('待核验假设'),false,
  'experimental appendix must not contaminate a user-facing chapter');
const repeated=answer+'\n【命格】新的一段';
assert.equal(parseSixTopicAnswer(repeated).length,6,'duplicate section must not create seventh item');
const variant=answer.replace('【命格】','## **【命格】**');
assert.equal(sixTopicFormatComplete(variant),true);
const deepMarkdown=answer.replace(/【(命格|感情|事业|财运|健康|性格)】/g,'## $1\n');
assert.equal(sixTopicFormatComplete(deepMarkdown),true,
  'actual DeepSeek deep mode uses Markdown ## headings, not bracket headings');
assert.deepEqual(parseSixTopicAnswer(deepMarkdown).map(x=>x.key),PUBLIC_TOPIC_ORDER);
assert.equal(parseSixTopicAnswer('我谈谈命格和感情。').length,0,
  'prose words must never count as chapter headings');

assert(LAY_WRITING_VERSION.includes('v4'));
assert(DEEP_READING_VERSION.includes('v2'));
for(const title of ['【命格】','【感情】','【事业】','【财运】','【健康】','【性格】']){
  assert(LAY_WRITING_PROMPT.includes(title),'missing basic topic '+title);
  assert(DEEP_READING_PROMPT.includes(title),'missing deep topic '+title);
}
for(const critical of ['不捏造','反例','小学生','依据']){
  const prompt=DEEP_READING_PROMPT+LAY_WRITING_PROMPT;
  assert(prompt.includes(critical),'missing deep quality contract '+critical);
}
console.log('Six-topic AI chapter parser and free deep analysis prompt regression passed');
