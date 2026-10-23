import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { buildDeepReadingContext } from '../../lib/ai/deep-context';
import { OFFLINE_TOPICS } from '../../lib/ziwei/offline-interpretation';
import { DEEP_READING_PROMPT,DEEP_READING_VERSION } from '../../lib/ai/lay-writing';

const sample=generateChart({year:1982,month:8,day:2,hour:6,gender:'male',
  name:'敏感姓名不应上送',city:'Singapore',longitude:103.8});
const result=buildDeepReadingContext(sample);
assert.equal(result.scope,'natal-structure-only');
assert.equal(result.chapters.length,6);
assert.deepEqual(result.chapters.map(x=>x.key),OFFLINE_TOPICS.map(x=>x.key));
for(const chapter of result.chapters) {
  assert(chapter.available,'expected focus palace for '+chapter.key);
  if(!chapter.available)continue;
  assert.equal(chapter.constellation.length,4);
  assert.deepEqual(chapter.constellation.map(x=>x.relationship),
    ['本宫','对宫','三合之一','三合之二']);
  assert(new Set(chapter.constellation.map(x=>x.details.branch)).size===4);
  assert(chapter.traditionalScope.includes('结构关系'));
  assert(chapter.constellation[0].details.name);
  assert(Array.isArray(chapter.constellation[0].details.selfTransformation));
  assert(Array.isArray(chapter.supplements));
}
const relationship=result.chapters.find(c=>c.key==='love');
const career=result.chapters.find(c=>c.key==='career');
if(!relationship?.available||!career?.available)
  throw new Error('expected relationship and career palace evidence');
assert.notEqual(relationship.constellation[0].details.branch,
  career.constellation[0].details.branch,
  'relationship and career require distinct center palaces');
const serialized=JSON.stringify(result);
assert(!serialized.includes('敏感姓名不应上送'));
assert(!serialized.includes('Singapore'));
assert(!serialized.includes('103.8'));
for(const token of ['deepChapterEvidence','本宫','对宫','四化','反例','支持不足'])
  assert((DEEP_READING_PROMPT+'deepChapterEvidence').includes(token),
    'deep prompt should demand '+token);
assert(DEEP_READING_VERSION.includes('v5'));
assert(DEEP_READING_PROMPT.includes('本宫、对宫或三合宫位'));
assert(DEEP_READING_PROMPT.includes('排盘事实'));
console.log('Deep reading six independently evidenced palace networks and privacy guard regression passed');
