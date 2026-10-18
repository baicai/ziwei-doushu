import type { Palace, Star, ZiweiChart } from '../ziwei/types';

/** Only chart facts are verified; traditional interpretations are not empirical claims. */
export type WealthRuleId = 'W01' | 'W02' | 'W03' | 'W04';
export type Evidence = {
  id: string; palace: string; branch: number; star: string;
  classification: Star['type']; brightness?: string; natalSiHua?: string;
};
export type Finding = {
  ruleId: WealthRuleId; title: string; interpretation: string;
  evidenceIds: string[]; limitations: string[];
};
export type WealthReading = {
  version: 'wealth-rules-v0.1'; status: 'complete' | 'partial' | 'invalid';
  evidence: Evidence[]; findings: Finding[]; missing: string[]; errors: string[];
};

const names: Record<string, string> = {
  '财帛': '财帛宫', '官禄': '官禄宫', '命': '命宫', '田宅': '田宅宫', '福德': '福德宫',
};
function getPalace(chart: ZiweiChart, short: string): Palace | undefined {
  const name = names[short];
  return chart.palaces.find(p => p.name === name || p.name === short);
}
function evidenceFor(p: Palace): Evidence[] {
  return p.stars.map((s, i) => ({
    id: `N-${p.branch}-${i}-${s.name}`, palace: p.name, branch: p.branch,
    star: s.name, classification: s.type, brightness: s.brightnessRaw,
    natalSiHua: s.siHua,
  }));
}
export function buildWealthReading(chart: ZiweiChart): WealthReading {
  const output: WealthReading = {
    version: 'wealth-rules-v0.1', status: 'partial', evidence: [],
    findings: [], missing: [], errors: [],
  };
  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12 ||
      new Set(chart.palaces.map(p => p.branch)).size !== 12 ||
      chart.palaces.some(p => !Number.isInteger(p.branch) || p.branch < 0 ||
        p.branch > 11 || !Array.isArray(p.stars))) {
    output.errors.push('十二宫结构不完整或地支索引有误，不能开展综合解读');
    output.status = 'invalid';
    return output;
  }
  const indexed: Record<string, Evidence[]> = {};
  for (const key of Object.keys(names)) {
    const palace = getPalace(chart, key);
    if (!palace) { output.missing.push(names[key]); continue; }
    indexed[key] = evidenceFor(palace);
    output.evidence.push(...indexed[key]);
  }
  const matches = (key: string, stars: string[], transformation?: string) =>
    (indexed[key] ?? []).filter(e =>
      stars.includes(e.star) && (!transformation || e.natalSiHua === transformation));
  const emit = (ruleId: WealthRuleId, title: string, interpretation: string, used: Evidence[], limitations: string[]) => {
    if (!used.length) return;
    output.findings.push({ ruleId, title, interpretation, evidenceIds: used.map(e => e.id), limitations });
  };
  // W01: no inferred financial outcome; only make claims grounded in observed stars.
  const wuji = matches('财帛', ['武曲'], '忌');
  const qisha = matches('财帛', ['七杀']);
  if (wuji.length && qisha.length) emit('W01', '求财与资源管理',
    '武曲化忌与七杀同在财帛宫，传统象征中可讨论财务责任、经营决断与风险取舍。',
    [...wuji, ...qisha], ['不代表必然破财，也不能据此判断收入或资产水平']);
  else if (wuji.length) emit('W01', '财务责任主题',
    '财帛宫的武曲化忌，在传统象征中常用于讨论财务责任和资源管理。',
    wuji, ['单一星曜不足以判断财富结果']);
  else {
    const base = (indexed['财帛'] ?? []).filter(e => e.classification === 'major');
    if (base.length) emit('W01', '财帛宫基础结构',
      `财帛宫主星为${base.map(e => e.star + (e.natalSiHua ? '化' + e.natalSiHua : '')).join('、')}。从传统象征角度，可围绕资源获取、分配和使用方式进一步对照官禄、命宫。`,
      base, ['该规则仅记录盘面结构，不对财务结果作判断']);
    else {
      const refs = (indexed['财帛'] ?? []).slice(0, 3);
      if (refs.length) emit('W01', '财帛宫空宫或无主星',
        '财帛宫未记录主星，不能按某个主星套用财运结论；应继续核对对宫和三方四正。',
        refs, ['辅助星不能替代对宫主星进行判断']);
    }
  }
  const ziwei = matches('命', ['紫微'], '权');
  const pojun = matches('命', ['破军']);
  const lianzhen = matches('官禄', ['廉贞']);
  const tanlang = matches('官禄', ['贪狼']);
  const w02 = [...ziwei, ...pojun, ...lianzhen, ...tanlang];
  if (ziwei.length && pojun.length && (lianzhen.length || tanlang.length))
    emit('W02', '收入与事业之间的关系',
      '命宫主导和改变的传统象征，与官禄宫竞争、资源协调的主题并存；应区分创造机会与实际兑现成果。',
      w02, ['不构成职业或创业适合度测评']);
  else {
    const career = (indexed['官禄'] ?? []).filter(e => e.classification === 'major');
    const life = (indexed['命'] ?? []).filter(e => e.classification === 'major');
    if (career.length && life.length) emit('W02', '事业与求财的关联宫位',
      `官禄宫主星${career.map(e => e.star).join('、')}与命宫主星${life.map(e => e.star).join('、')}共同构成工作角色、个人行动与资源使用之间的传统观察背景。`,
      [...career, ...life], ['宫位关联不代表职业收入必然提高']);
  }
  const taiyin = matches('田宅', ['太阴']);
  const tianfu = matches('福德', ['天府']);
  if (taiyin.length) emit('W03', '资产积累',
    '田宅宫太阴的传统象征可引出稳定、家庭资产与长期积累的主题；它不同于财帛宫的收入主题。',
    [...taiyin, ...tianfu], ['不能预测房产数量、房价或晚年财富']);
  else {
    const home = (indexed['田宅'] ?? []).filter(e => e.classification === 'major');
    const wellbeing = (indexed['福德'] ?? []).filter(e => e.classification === 'major');
    if (home.length) emit('W03', '积累与生活基础',
      `田宅宫主星为${home.map(e => e.star).join('、')}；该宫与福德宫是资产积累和生活基础的补充观察角度，不属于财帛宫的三方四正。`,
      [...home, ...wellbeing], ['不能由命盘预测具体房产或资产价值']);
  }
  const risk = (indexed['官禄'] ?? []).filter(e => ['地空', '地劫', '天空'].includes(e.star));
  const lu = matches('官禄', ['禄存']);
  const constraint = [...risk, ...lu, ...wuji];
  if (risk.length && (lu.length || wuji.length))
    emit('W04', '资源与制约因素',
      '官禄宫出现空劫类星曜，与禄存或财帛武曲化忌共同形成资源投入和结果兑现的传统反思主题。',
      constraint, ['不能由此断言亏损、破产或投资风险概率']);
  else {
    const observed = [
      ...(indexed['财帛'] ?? []).filter(e => e.natalSiHua === '忌' || e.classification === 'sha'),
      ...(indexed['官禄'] ?? []).filter(e => e.natalSiHua === '忌' || e.classification === 'sha'),
    ];
    if (observed.length) emit('W04', '需综合考量的盘面因素',
      `财帛、官禄宫记录了${observed.map(e => e.star + (e.natalSiHua ? '化' + e.natalSiHua : '')).join('、')}等传统制约取象，应结合主星、辅星及四化共同理解，不能只看单颗星。`,
      observed, ['煞星、化忌不等于现实中必然出现财务损失']);
  }
  output.status = output.missing.length ? 'partial' : 'complete';
  return output;
}
export function validateWealthReading(chart: ZiweiChart, reading: WealthReading): string[] {
  const canonical = buildWealthReading(chart);
  const errors = [...canonical.errors];
  const ids = new Set(canonical.evidence.map(e => e.id));
  const keys = new Map(canonical.findings.map(f => [f.ruleId, f]));
  for (const finding of reading.findings) {
    const allowed = keys.get(finding.ruleId);
    if (!allowed) errors.push(`未满足规则条件：${finding.ruleId}`);
    if (!finding.evidenceIds.length) errors.push(`缺少依据：${finding.ruleId}`);
    for (const id of finding.evidenceIds)
      if (!ids.has(id) || !allowed?.evidenceIds.includes(id)) errors.push(`非法依据：${id}`);
  }
  return errors;
}
