'use client';
import { useMemo, useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { generateChart } from '@/lib/ziwei/algorithm';
import { BRANCHES } from '@/lib/ziwei/constants';

export default function UnknownHourChoices({ chart, onSelect }: {
  chart: ZiweiChart;
  onSelect: (next: ZiweiChart) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const choices = useMemo(() => {
    if (!expanded) return [];
    return Array.from({ length: 12 }, (_, hour) => {
      try {
        const next = generateChart({ ...chart.birthInfo, hour, timePrecision: 'unknown' });
        const palace = next.palaces.find(p => p.isMingGong);
        const main = palace?.stars.filter(s => s.type === 'major').map(s => s.name).join('、') || '空宫';
        return {hour, chart:next, palace:palace?.name || '命宫', main};
      } catch { return null; }
    }).filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [expanded, chart.birthInfo]);
  if (chart.birthInfo.timePrecision !== 'unknown') return null;
  return (
    <section className="rounded-xl p-3 sm:p-4 mb-4" style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
      <h2 className="text-sm font-semibold" style={{color:'var(--t-gold)'}}>出生时间不详 · 命盘可能变化</h2>
      <p className="text-xs leading-6 mt-2" style={{color:'var(--t-text2)'}}>
        当前默认展示子时试排，并非已确认出生时辰。可以比较十二时辰的命宫与主星差异；实际大限、四化与个人解读仍需核实出生时间。
      </p>
      <button type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}
        className="min-h-11 px-4 mt-3 rounded-lg text-xs font-medium"
        style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}>
        {expanded ? '收起候选时辰' : '比较十二时辰候选盘'}
      </button>
      {expanded && <>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 mt-3">
          {choices.map(item=><button key={item.hour} type="button"
            aria-pressed={chart.birthInfo.hour===item.hour}
            onClick={()=>onSelect(item.chart)}
            className="rounded-xl min-h-[86px] p-3 text-left"
            style={{background:chart.birthInfo.hour===item.hour?'rgba(212,168,67,0.12)':'var(--t-surface)',
              border:chart.birthInfo.hour===item.hour?'1px solid var(--t-gold)':'1px solid var(--t-border)'}}>
            <span className="block text-sm font-semibold" style={{color:'var(--t-gold)'}}>{BRANCHES[item.hour]}时</span>
            <span className="block mt-1 text-xs leading-5" style={{color:'var(--t-text2)'}}>{item.palace}：{item.main}</span>
          </button>)}
        </div>
        <p className="text-xs mt-3 leading-6" style={{color:'var(--t-text2)'}}>
          这些都是试排，不能以「看上去像自己」来倒推准确出生时辰。子时还涉及早晚与换日口径，必要时应核对原始出生记录。
        </p>
      </>}
    </section>
  );
}
