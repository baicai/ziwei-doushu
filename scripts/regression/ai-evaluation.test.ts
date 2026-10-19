import assert from 'node:assert/strict';
import {buildExperimentExport, REVIEW_LABELS, type ExperimentRun} from '../../lib/ai/evaluation';

const runs:ExperimentRun[]=[
  {specificity:0,model:'model-a',answer:'总体观察',audit:null,review:'too_generic',note:'太宽泛'},
  {specificity:100,model:'model-a',answer:'情境、假设与反例',audit:{
    cited:[{id:'P1',fact:'命宫：紫微'}],invalidIds:['P99'],
    citationCount:2,scope:'reference-existence-only'
  },review:'contradicts',note:'我的具体经历与此相反'},
];
const x=buildExperimentExport('CASE-001',runs,'2026-10-19T12:00:00Z');
assert.equal(x.schema,'iziwei-ai-evaluation-v1');
assert.equal(x.sampleId,'CASE-001');
assert.equal(x.runs.length,2);
assert.equal(x.runs[0].humanReview,'too_generic');
assert.equal(x.runs[1].humanReview,'contradicts');
assert.deepEqual(x.runs[1].invalidReferenceIds,['P99']);
assert.equal(x.runs[1].referenceCount,1);
assert.equal(x.runs[0].referenceCount,null);
assert.equal(x.birthDataIncluded,false);
for(const prop of ['birthInfo','year','month','day','hour','longitude','timeZone','city','name','palaces'])
  assert(!(prop in x.runs[1]),'sensitive chart field must not be included: '+prop);
assert.equal(buildExperimentExport(' ',[], 'test').sampleId,null);
assert.equal(REVIEW_LABELS.matches,'具体且符合经历');
assert.equal(Object.keys(REVIEW_LABELS).length,4);
const many=buildExperimentExport('X'.repeat(90),[
  {...runs[0],note:'x'.repeat(600)}
],'x');
assert.equal(many.sampleId?.length,64);
assert.equal(many.runs[0].notes.length,500);
console.log('Opt-in experiment export and feedback regression passed');
