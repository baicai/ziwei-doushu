import assert from 'node:assert/strict';
import { summarizePairedBlindTrials } from '../../lib/ai/blind-cohorts';
import { buildBlindComparison, exportBlindResult } from '../../lib/ai/blind-evaluation';
import { parseBlindExport, type ImportedBlindTrial } from '../../lib/ai/blind-summary';

let minute=0;
function entry(id:string|null,model:string,specificity:number,choice:'A'|'B'|'both'|'neither'|'unsure',target:'A'|'B'='A'):ImportedBlindTrial {
  const now=new Date(Date.UTC(2026,9,21,1,minute++)).toISOString();
  const trial=buildBlindComparison({answer:'a',model},{answer:'b',model},target==='A',specificity,now);
  return parseBlindExport(exportBlindResult(trial,choice,id??'',new Date(Date.parse(now)+1000).toISOString()));
}
const records=[
  entry('CASE-1','deepseek-flash',0,'B'), // selected control
  entry('CASE-1','deepseek-flash',50,'A'),
  entry('CASE-1','deepseek-flash',100,'A'), // toward target
  entry('CASE-2','deepseek-flash',0,'A'), // selected target
  entry('CASE-2','deepseek-flash',50,'both'),
  entry('CASE-2','deepseek-flash',100,'B'), // toward control
  entry('CASE-3','deepseek-flash',0,'unsure'),
  entry('CASE-3','deepseek-flash',50,'B'),
  entry('CASE-3','deepseek-flash',100,'A'), // incomparable
  entry('CASE-4','deepseek-flash',0,'A'),
  entry('CASE-4','deepseek-flash',50,'A'),
  entry('CASE-4','deepseek-flash',100,'A'), // unchanged
  entry('CASE-5','deepseek-flash',0,'B'), // incomplete
  entry(null,'deepseek-flash',0,'A'),
  entry('CASE-1','deepseek-flash',0,'A'), // repeated same cell: take earliest (B)
  entry('CASE-1','deepseek-v4-pro',100,'B'), // different model must not pair
];
const x=summarizePairedBlindTrials(records);
assert.equal(x.cohorts,6); // 5 deepseek-flash + 1 deepseek-v4-pro
assert.equal(x.completeTriplets,4);
assert.equal(x.incompleteCohorts,2);
assert.equal(x.noCaseIdRounds,1);
assert.equal(x.repeatedCells,1);
assert.equal(x.changedTowardTarget,1);
assert.equal(x.changedTowardControl,1);
assert.equal(x.unchangedDecisive,1);
assert.equal(x.nonDecisivePairs,1);
assert.equal(x.pairedDecisive,3);
assert.deepEqual(x.perSpecificity.map(y=>y.specificity),[0,50,100]);
assert.deepEqual(x.perSpecificity.map(y=>[y.selectedTarget,y.selectedControl,y.ambiguous]),[
  [2,1,1],[2,1,1],[3,1,0],
]);
assert(x.notes.some(n=>n.includes('相同参与者')||n.includes('同一命盘')));
assert(x.notes.some(n=>n.includes('最早')));
assert(x.notes.some(n=>n.includes('未进入配对分析')));
assert.equal(summarizePairedBlindTrials([]).completeTriplets,0);
assert.equal(summarizePairedBlindTrials([]).nonDecisivePairs,0);
console.log('Paired 0/50/100 blind cohort regression passed');
