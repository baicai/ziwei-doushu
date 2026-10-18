import type { ZiweiChart, Palace, DaXian } from '../ziwei/types';
import { SI_HUA_TABLE, STEMS } from '../ziwei/constants';

export interface TimeEvidence {
  version: 'wealth-time-v0.1';
  year: number;
  activeDaXian: { startAge: number; endAge: number; palaceName: string; palaceBranch: number; stemName: string; siHua: { type: string; star: string; palace: string | null }[] } | null;
  daXianThreeFour: { relation: '本宫' | '对宫' | '三合'; palace: string; branch: number }[];
  annual: { year: number; stemName: string; siHua: { type: string; star: string; palace: string | null }[] };
  warnings: string[];
}
const types = ['禄', '权', '科', '忌'] as const;
function resolvedFour(chart: ZiweiChart, stem: number) {
  const table = SI_HUA_TABLE[stem];
  if (!table) return [];
  return types.map((type, i) => ({
    type, star: table[i],
    palace: chart.palaces.find(p => p.stars.some(s => s.name === table[i]))?.name ?? null,
  }));
}
function threeFour(chart: ZiweiChart, branch: number): TimeEvidence['daXianThreeFour'] {
  const relation: TimeEvidence['daXianThreeFour'][number]['relation'][] = ['本宫','对宫','三合','三合'];
  const targets = [branch, (branch + 6) % 12, (branch + 4) % 12, (branch + 8) % 12];
  return targets.map((id, i) => ({
    relation: relation[i], palace: chart.palaces.find(p => p.branch === id)?.name ?? '未知宫位', branch: id,
  }));
}
/** Structural context only: never convert time overlays into financial outcome predictions. */
export function buildWealthTimeEvidence(chart: ZiweiChart, year: number, daXianIndex = chart.currentDaXianIndex): TimeEvidence {
  const warnings: string[] = [];
  const validPalaces = Array.isArray(chart.palaces) && chart.palaces.length === 12 &&
    new Set(chart.palaces.map(p => p.branch)).size === 12;
  if (!validPalaces) warnings.push('十二宫结构不完整');
  const current: DaXian | undefined = chart.daXians?.[daXianIndex];
  if (!current) warnings.push('大限记录缺失');
  if (!Number.isInteger(year) || year < 1900 || year > 2200) warnings.push('流年年份无效');
  const palace: Palace | undefined = validPalaces && current ? chart.palaces.find(p => p.branch === current.palaceBranch) : undefined;
  if (current && !palace) warnings.push('大限宫位未匹配');
  const stem = palace?.stem;
  const dxSihua = stem === undefined ? [] : resolvedFour(chart, stem);
  const yearStem = Number.isInteger(year) ? ((year - 4) % 10 + 10) % 10 : -1;
  const annualSihua = yearStem >= 0 && year >= 1900 && year <= 2200 ? resolvedFour(chart, yearStem) : [];
  if (dxSihua.some(x => !x.palace)) warnings.push('大限四化落宫存在未解析星曜');
  if (annualSihua.some(x => !x.palace)) warnings.push('流年四化落宫存在未解析星曜');
  return {
    version: 'wealth-time-v0.1', year,
    activeDaXian: current && palace && stem !== undefined ? {
      startAge: current.startAge, endAge: current.endAge,
      palaceName: palace.name, palaceBranch: palace.branch,
      stemName: STEMS[stem], siHua: dxSihua,
    } : null,
    daXianThreeFour: current && palace && validPalaces ? threeFour(chart, current.palaceBranch) : [],
    annual: { year, stemName: STEMS[yearStem] ?? '未知', siHua: annualSihua },
    warnings,
  };
}
