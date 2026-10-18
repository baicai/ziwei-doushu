import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { buildPlainSections, buildPlainTextReport } from '../../lib/ziwei/plain-language-report';

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
assert(report.includes('【整体特点】'));
assert(report.includes('【事业与工作】'));
assert(report.includes('【感情与相处】'));
assert(report.includes('不是 AI 分析'));
assert(!report.includes('**【'),'no raw Markdown headings in lay version');
assert(!report.includes('身宫地支索引'),'no internal calculation index in lay report');
const unknown=generateChart({...birth,timePrecision:'unknown'});
assert(buildPlainTextReport(unknown,2026).includes('出生时辰不详'));
console.log('Plain-language six-topic report regression passed');
