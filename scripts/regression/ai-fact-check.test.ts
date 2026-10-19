import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { checkAiChartFacts } from '../../lib/ziwei/ai-fact-check';

const chart=generateChart({year:1982,month:8,day:2,hour:6,gender:'male'});
const starPalace=chart.palaces.find(p=>p.stars.some(s=>s.name==='紫微'&&s.type==='major'))!;
const other=chart.palaces.find(p=>p.branch!==starPalace.branch)!;
assert(starPalace&&other,'must have two palaces');
const matched=checkAiChartFacts(starPalace.name+'有紫微。紫微位于'+starPalace.name+'。',chart);
assert.equal(matched.contradictionCount,0);
assert(matched.matchingCount>=1,'direct placement must be recognized');
const withSuffix=checkAiChartFacts(starPalace.name.replace(/宫$/,'')+'宫有紫微。紫微位于'+starPalace.name.replace(/宫$/,'')+'宫。',chart);
assert(withSuffix.matchingCount>=1,'both suffixed and unsuffixed palace spellings must resolve');
assert.equal(withSuffix.contradictionCount,0);
const error=checkAiChartFacts(other.name+'有紫微。紫微位于'+other.name+'。',chart);
assert(error.contradictionCount>=1,'mislocated star must be detected');
assert(error.checked.some(x=>x.expected.includes(starPalace.name)&&x.verdict==='contradicts-chart')===false,
  'expected context must describe the target palace rather than making up a star location');
const empty=chart.palaces.find(p=>!p.stars.some(s=>s.type==='major'));
const occupied=chart.palaces.find(p=>p.stars.some(s=>s.type==='major'))!;
if(empty){
  const ok=checkAiChartFacts(empty.name+'是空宫。',chart);
  assert.equal(ok.matchingCount,1);
  assert.equal(ok.contradictionCount,0);
  const bad=checkAiChartFacts(occupied.name+'是空宫。',chart);
  assert.equal(bad.contradictionCount,1);
}
const sihuaStar=chart.palaces.flatMap(p=>p.stars.filter(s=>!!s.siHua).map(s=>({name:s.name,siHua:s.siHua!})))[0];
assert(sihuaStar,'expect at least one natal sihua');
const goodHua=checkAiChartFacts(sihuaStar.name+'化'+sihuaStar.siHua+'。',chart);
assert.equal(goodHua.contradictionCount,0);
assert(goodHua.matchingCount>=1);
const incorrect=(['禄','权','科','忌'] as const).find(x=>x!==sihuaStar.siHua)!;
const badHua=checkAiChartFacts(sihuaStar.name+'化'+incorrect+'。',chart);
assert.equal(badHua.contradictionCount,1,'false birth-year hua should be detected');
assert(badHua.checked[0].expected.includes('生年化'+sihuaStar.siHua));
assert.equal(checkAiChartFacts('在流年中，紫微化禄。',chart).checked.length,0,
  'do not treat explicit year-layer as natal');
assert.equal(checkAiChartFacts('借对宫紫微，夫妻宫可能会变化。',chart).checked.length,0,
  'borrowing should not be mistaken for a direct placement');
assert.equal(checkAiChartFacts('整体会更负责，人生充满机会。',chart).checked.length,0,
  'subjective life conclusions cannot be checked as chart facts');
assert.equal(checkAiChartFacts('',chart).scope,'partial-natal-facts-only');
console.log('Partial natal fact checks detect wrong palace, empty palace and birth-year sihua');
