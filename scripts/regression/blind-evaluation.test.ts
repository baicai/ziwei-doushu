import assert from 'node:assert/strict';
import type { BirthInfo } from '../../lib/ziwei/types';
import {
  BLIND_COMPARISON_QUESTION, minimalBlindBirth, syntheticControlBirth,
  buildBlindComparison, assessBlindChoice, exportBlindResult,
} from '../../lib/ai/blind-evaluation';

const own:BirthInfo={
  year:1982,month:8,day:2,hour:6,gender:'male',timePrecision:'known',
  name:'真实姓名不可发送',city:'Singapore',province:'海外',longitude:103.85,
  timeZone:'Asia/Singapore',
  origInput:{year:1982,month:8,day:2,clockHour:13,clockMinute:32},
};
const masked=minimalBlindBirth(own);
assert.deepEqual(masked,{
  year:1982,month:8,day:2,hour:6,gender:'male',timePrecision:'known',
});
assert(!JSON.stringify(masked).includes('Singapore'));
assert(!JSON.stringify(masked).includes('真实姓名'));
assert(!JSON.stringify(masked).includes('longitude'));

const control=syntheticControlBirth(own);
assert.equal(control.gender,own.gender);
assert.notDeepEqual([control.year,control.month,control.day,control.hour],
  [own.year,own.month,own.day,own.hour]);
assert.equal(control.day,15);
assert.equal(control.hour,11);

for(const year of [1900,1901,2000,2098,2100])for(let month=1;month<=12;month++){
  for(const hour of [0,3,11]){
    const candidate=syntheticControlBirth({...own,year,month,hour});
    assert(candidate.year>=1900&&candidate.year<=2100);
    assert(candidate.month>=1&&candidate.month<=12);
    assert(candidate.day>=1&&candidate.day<=28);
    assert(candidate.hour>=0&&candidate.hour<=11);
    assert.notDeepEqual([candidate.year,candidate.month,candidate.day,candidate.hour],[year,month,2,hour]);
  }
}
assert.throws(()=>syntheticControlBirth({...own,year:2101}),RangeError);
assert.throws(()=>syntheticControlBirth({...own,hour:12}),RangeError);
assert(BLIND_COMPARISON_QUESTION.includes('不得猜测'));
assert(BLIND_COMPARISON_QUESTION.includes('合成样本'));

const ownAnswer={answer:'当前盘的 DeepSeek 通俗解读。',model:'deepseek-flash'};
const controlAnswer={answer:'合成对照盘的 DeepSeek 通俗解读。',model:'deepseek-flash'};
const time='2026-10-20T10:00:00.000Z';
const left=buildBlindComparison(ownAnswer,controlAnswer,true,80,time);
assert.equal(left.targetPosition,'A');
assert.deepEqual(left.panels.map(p=>p.label),['A','B']);
assert.equal(left.panels[0].answer,ownAnswer.answer);
assert.equal(left.panels[1].answer,controlAnswer.answer);
assert.equal(left.specificity,80);
const right=buildBlindComparison(ownAnswer,controlAnswer,false,100,time);
assert.equal(right.targetPosition,'B');
assert.equal(right.panels[1].answer,ownAnswer.answer);
assert.equal(right.panels[0].answer,controlAnswer.answer);
assert.throws(()=>buildBlindComparison({...ownAnswer,answer:' '},controlAnswer,true,0,time),RangeError);
for(const target of ['A','B'] as const){
  assert.equal(assessBlindChoice(target,target),'selected-target');
  assert.equal(assessBlindChoice(target==='A'?'B':'A',target),'selected-control');
  for(const choice of ['both','neither','unsure'] as const)
    assert.equal(assessBlindChoice(choice,target),choice);
}
const report=exportBlindResult(right,'A','CASE-007','2026-10-20T10:05:00Z');
assert.equal(report.outcome,'selected-control');
assert.equal(report.targetPosition,'B');
assert.equal(report.choice,'A');
assert.equal(report.birthDataIncluded,false);
assert.equal(report.controlType,'synthetic-generated-birth');
assert.equal(report.isScientificAccuracy,false);
assert.equal(report.caseId,'CASE-007');
assert.deepEqual(report.panels.map(p=>p.label),['A','B']);
for(const forbidden of ['birthInfo','year','month','day','hour','gender','name','city','longitude','timeZone','origInput'])
  assert(!(forbidden in report) && report.panels.every(p=>!(forbidden in p)),
    'export must not include birth profile key '+forbidden);
assert.equal(exportBlindResult(right,'unsure','  ',time).caseId,null);
assert.equal(exportBlindResult(right,'both','Y'.repeat(80),time).caseId?.length,64);
console.log('Two-request blind comparison setup, random order outcomes and privacy export regression passed');
