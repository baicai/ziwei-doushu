import type { ZiweiChart } from './types';
import { SI_HUA_TABLE, STEMS } from './constants';
export type SelectedTimeView = 'mingpan' | 'daxian' | 'liunian';
export interface TimeReading {
  title: string; details: string[]; limitations: string[];
}
/** Explains only the selected time overlay; does not claim to calculate annual palaces or events. */
export function selectedTimeReading(chart: ZiweiChart, view: SelectedTimeView, year: number): TimeReading | null {
  if (view === 'mingpan') return null;
  const limitations = ['仅展示所选时间层的四化与本命落宫，不等同于完整流年十二宫或事件预测。'];
  const dx = chart.daXians?.[chart.currentDaXianIndex];
  const dp = dx && chart.palaces.find(p => p.branch === dx.palaceBranch);
  const stem = view === 'daxian' ? dp?.stem : Number.isInteger(year) && year >= 1900 && year <= 2200 ? ((year - 4) % 10 + 10) % 10 : undefined;
  const title = view === 'daxian'
    ? (dx ? `大限 ${dx.startAge}–${dx.endAge} 岁 · ${dp?.name ?? '宫位待核实'}` : '大限资料不足')
    : `${year} 年流年 · 四化叠加`;
  if (stem === undefined || !SI_HUA_TABLE[stem]) return { title, details: ['时间层资料不足，暂不能解释。'], limitations };
  const four = SI_HUA_TABLE[stem].map((star, i) => {
    const type = ['禄','权','科','忌'][i];
    const palace = chart.palaces.find(p => p.stars.some(s => s.name === star));
    return `${star}化${type} → 本命${palace?.name ?? '落宫待核实'}`;
  });
  if (view === 'daxian') limitations.push('大限年龄按排盘引擎既有年龄口径，不代表人生或职业期限。');
  else limitations.push('所选年份以公历年天干计算；年界、流年宫位和小限等未在此报告展开。');
  return { title, details: [`时间层天干：${STEMS[stem]}`, ...four], limitations };
}
