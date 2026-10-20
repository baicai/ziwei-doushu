import assert from 'node:assert/strict';
import {buildBlindComparison,exportBlindResult} from '../../lib/ai/blind-evaluation';
import {
  parseBlindExport,deduplicateBlindTrials,summarizeBlindTrials,exportBlindSummaryCsv,
} from '../../lib/ai/blind-summary';

function make(spec:number,first:boolean,choice:'A'|'B'|'both'|'neither'|'unsure',
  generatedAt:string,caseId:string,model='deepseek-flash'){
  const t=buildBlindComparison(
    {answer:'Current subject generated text with possible personal detail',model},
    {answer:'Synthetic control generated response',model},
    first,spec,generatedAt);
  return exportBlindResult(t,choice,caseId,
    new Date(Date.parse(generatedAt)+5000).toISOString());
}
const baseline=make(0,true,'A','2026-10-20T00:00:00.000Z','CASE-001');
const focused=make(50,false,'A','2026-10-20T00:01:00.000Z','CASE-002');
const decisive=make(100,false,'B','2026-10-20T00:02:00.000Z','CASE-001');
const both=make(100,true,'both','2026-10-20T00:03:00.000Z','');
const neither=make(100,false,'neither','2026-10-20T00:04:00.000Z','CASE-003');
const unsure=make(100,true,'unsure','2026-10-20T00:05:00.000Z','CASE-004');
const parsed=[baseline,focused,decisive,both,neither,unsure].map(parseBlindExport);
assert.equal(parsed.length,6);
assert.equal(parsed[0].outcome,'selected-target');
assert.equal(parsed[1].outcome,'selected-control');
assert.equal(parsed[2].outcome,'selected-target');
assert(!('panels' in parsed[0]),'import must discard all model answer text');
assert(!JSON.stringify(parsed[0]).includes('subject generated text'));
assert.equal(parsed[0].caseId,'CASE-001');
const {records,duplicates}=deduplicateBlindTrials([...parsed,parsed[0],parsed[2]]);
assert.equal(records.length,6);
assert.equal(duplicates,2);
const summary=summarizeBlindTrials(records);
assert.equal(summary.total,6);
assert.equal(summary.groups.length,3);
assert.deepEqual(summary.groups.map(g=>g.specificity),[0,50,100]);
assert.equal(summary.uniqueCaseIds,4);
assert.equal(summary.unlabelledCount,1);
assert.equal(summary.repeatedCaseCount,2);
const group100=summary.groups[2];
assert.equal(group100.count,4);
assert.equal(group100.target,1);
assert.equal(group100.control,0);
assert.equal(group100.both,1);
assert.equal(group100.neither,1);
assert.equal(group100.unsure,1);
assert.equal(group100.decisive,1);
assert.equal(group100.targetShareOfDecisive,1);
assert.equal(group100.targetShareOfAll,0.25);
assert.equal(group100.ambiguityShare,0.75);
assert.equal(group100.targetA,2);
assert.equal(group100.targetB,2);
assert.equal(summary.groups[0].targetShareOfDecisive,1);
assert.equal(summary.groups[1].targetShareOfDecisive,0);
assert(summary.warning.some(x=>x.includes('重复')));
assert(summary.warning.some(x=>x.includes('小于 20')));
assert(summary.warning.some(x=>x.includes('匿名样本编号')));
const csv=exportBlindSummaryCsv(summary);
assert(csv.includes('specificity,runs,selected_target'));
assert(csv.includes('100,4,1,0,1,1,1,1,1,0.25,0.75'));
assert(!csv.includes('subject generated text'),'CSV must not leak answers');
const mutate=(data:unknown,props:Record<string,unknown>)=>({...(data as object),...props});
for(const invalid of [
  {},[],null,{...baseline,schema:'wrong'},
  {...baseline,controlType:'human-record'},
  {...baseline,birthDataIncluded:true},
  {...baseline,isScientificAccuracy:true},
  {...baseline,specificity:101},
  {...baseline,specificity:-1},
  {...baseline,specificity:0.5},
  {...baseline,choice:'X'},
  {...baseline,targetPosition:'C'},
  {...baseline,outcome:'selected-control'},
  {...baseline,generatedAt:'not-a-date'},
  {...baseline,submittedAt:'2000-01-01T00:00:00.000Z'},
  {...baseline,panels:[baseline.panels[0]]},
  {...baseline,panels:[{...baseline.panels[0],label:'B'},baseline.panels[1]]},
  {...baseline,panels:[{...baseline.panels[0],model:'something-else'},baseline.panels[1]]},
]) assert.throws(()=>parseBlindExport(invalid),'reject malformed / tampered imports');
const mixed=[parsed[0],parseBlindExport(make(100,true,'B',
  '2026-10-20T01:00:00.000Z','CASE-005','deepseek-v4-pro'))];
assert(summarizeBlindTrials(mixed).warning.some(x=>x.includes('模型版本')));
const empty=summarizeBlindTrials([]);
assert.equal(empty.total,0);
assert.equal(empty.groups.length,0);
assert.equal(exportBlindSummaryCsv(empty).split('\r\n').length,1);
assert.throws(()=>deduplicateBlindTrials(Array.from({length:501},(_,i)=>({
  ...parsed[0],id:'ID-'+i
}))),/500/);
console.log('Blind A/B import validation, deduplication, stats and no-answer retention regression passed');
