import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { chartEvidence, evidenceAudit } from '../../lib/ziwei/chart-evidence';

const chart = generateChart({year:1982,month:8,day:2,hour:6,gender:'male'});
const refs=chartEvidence(chart);
assert.equal(new Set(refs.map(x=>x.id)).size,refs.length,'evidence ids must be unique');
assert.equal(refs.filter(x=>/^P\d+$/.test(x.id)).length,12,'one reference per real palace');
assert(refs.some(x=>x.id.includes(':S')),'major stars should have detailed references');
for(const palace of chart.palaces) {
  const ref=refs.find(item=>item.id==='P'+palace.branch);
  assert(ref,'every palace needs an ID');
  assert.equal(ref.palaceName,palace.name);
  assert.equal(ref.borrowed,!palace.stars.some(s=>s.type==='major'));
  if(ref.borrowed) assert(ref.fact.includes('空宫参考对宫'),'borrowed stars must be distinguished');
  for(const star of palace.stars.filter(x=>x.type==='major')) {
    const starRef=refs.find(x=>x.palaceBranch===palace.branch&&x.starName===star.name);
    assert(starRef,'every major star needs a direct evidence ID');
    assert(starRef.fact.includes(star.name));
  }
}
const first=refs[0];
const good=evidenceAudit('传统观察。[依据:'+first.id+']',refs);
assert.equal(good.cited.length,1);
assert.equal(good.invalidIds.length,0);
assert.equal(good.citationCount,1);
assert.equal(good.scope,'reference-existence-only');
const mixed=evidenceAudit('文字[依据:'+first.id+',P99]和[依据:FAKE]',refs);
assert.deepEqual(mixed.cited.map(x=>x.id),[first.id]);
assert.deepEqual(mixed.invalidIds,['P99','FAKE']);
assert.equal(mixed.citationCount,2);
const none=evidenceAudit('没有任何引用，但这并不意味着这段话已被验证',refs);
assert.equal(none.hasCitations,false);
assert.equal(none.cited.length,0);
assert.equal(none.scope,'reference-existence-only');
assert.deepEqual(
  chartEvidence(chart).map(x=>[x.id,x.fact]),
  refs.map(x=>[x.id,x.fact]),
  'repeat generation should be deterministic'
);
console.log('AI evidence ID catalog and reference-existence regression passed');
