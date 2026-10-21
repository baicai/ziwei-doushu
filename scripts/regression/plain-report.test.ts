import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { buildLayTopicReading, buildPlainSections, buildPlainTextReport } from '../../lib/ziwei/plain-language-report';

const birth = { year:1982, month:8, day:2, hour:6, gender:'male' as const, name:'测试用户' };
const chart = generateChart(birth);
const sections = buildPlainSections(chart);
assert.equal(sections.length,6,'all six topics should be readable');
assert.equal(new Set(sections.map(s=>s.key)).size,6);
for(const section of sections){
  assert(section.lead.length>12,section.key+' needs a clear opening');
  assert(section.suggestion.length>12,section.key+' needs a practical reflection');
  assert(section.evidence.length>5,section.key+' needs chart provenance');
  assert(!section.lead.includes('离线规则解读'),'lay report must not use developer copy');
  assert(!section.lead.includes('本宫及三方四正'),'lay report must not dump terminology');
}
const report = buildPlainTextReport(chart,2026);
assert(report.includes('【你做事的样子】'));
assert(report.includes('【工作上】'));
assert(report.includes('【跟亲近的人相处】'));
assert(report.includes('并非 AI 分析'));
assert(!report.includes('**【'),'no raw Markdown headings in lay version');
assert(!report.includes('身宫地支索引'),'no internal calculation index in lay report');
for(const section of sections){
  assert(!/常与.*联系在一起|传统象征需要结合/.test(section.lead),
    'the lead must not be a generic symbolic dictionary: '+section.key);
  assert(!/宫干|三方四正|借星|四化飞星/.test(section.lead+section.observation),
    'lay conclusions must hide specialist language: '+section.key);
  assert(section.observation.length>18,'a real-life scene should be concrete: '+section.key);
  const reading=buildLayTopicReading(chart,section.key);
  assert(reading.includes(section.lead) && reading.includes(section.observation));
  assert(reading.includes('【你可以试试】'));
  assert(!reading.includes(section.evidence),'technical evidence should not dominate initial reading');
}
const unknown=generateChart({...birth,timePrecision:'unknown'});
assert(buildPlainTextReport(unknown,2026).includes('出生时辰不详'));
console.log('Plain-language six-topic report regression passed');
