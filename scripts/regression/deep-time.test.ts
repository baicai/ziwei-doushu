import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { getDaXianIndexForYear } from '../../lib/ziwei/yunxian-context';
import { buildDeepTimeContext } from '../../lib/ai/deep-time';
import { DEEP_READING_PROMPT } from '../../lib/ai/lay-writing';
const samples=[
 {year:1990,month:5,day:17,hour:6,gender:'male' as const,name:'不可上送姓名'},
 {year:1992,month:11,day:9,hour:1,gender:'female' as const},
 {year:2004,month:2,day:4,hour:2,gender:'female' as const},
];
for(const sample of samples){
 const chart=generateChart(sample);
 for(const selectedYear of [2024,2026,2030,2050]){
   const time=buildDeepTimeContext(chart,selectedYear);
   assert.equal(time.selectedYear,selectedYear);
   assert.equal(time.virtualAge,selectedYear-chart.lunarInfo.lunarYear+1);
   assert.equal(time.yearTransformations.length,4);
   assert.deepEqual(time.yearTransformations.map(t=>t.change),['禄','权','科','忌']);
   for(const item of time.yearTransformations){
     const actual=chart.palaces.find(p=>p.stars.some(s=>s.name===item.star));
     assert.equal(item.natalPalace,actual?.name??null);
   }
   const index=getDaXianIndexForYear(chart,selectedYear);
   const selected=time.stages.find(s=>s.position==='selected');
   assert.equal(Boolean(selected),index>=0);
   if(selected){
     assert.equal(selected.startAge,chart.daXians[index].startAge);
     assert.equal(selected.endAge,chart.daXians[index].endAge);
     assert.equal(selected.palace,chart.palaces.find(p=>p.branch===chart.daXians[index].palaceBranch)?.name);
     assert.equal(selected.transformations.length,4);
     assert.equal(selected.network.length,3);
     for(const tr of selected.transformations){
       assert.equal(tr.natalPalace,chart.palaces.find(p=>p.stars.some(s=>s.name===tr.star))?.name??null);
     }
     assert(selected.startYear<=selectedYear && selectedYear<=selected.endYear);
   }
   const serialized=JSON.stringify(time);
   assert(!serialized.includes('不可上送姓名'));
   assert(!serialized.includes('1990-05-17'));
 }
}
const unknown=generateChart({...samples[0],timePrecision:'unknown'});
assert.equal(buildDeepTimeContext(unknown,2026).timePrecision,'unknown');
assert(buildDeepTimeContext(unknown,2026).limitations.some(s=>s.includes('候选试排')));
assert.throws(()=>buildDeepTimeContext(unknown,2026.5));
assert.throws(()=>buildDeepTimeContext(unknown,2201));
assert(DEEP_READING_PROMPT.includes('所选年份'));
console.log('Deep time context: decade boundaries, annual four transforms, year selection, privacy and unknown-hour passed');
