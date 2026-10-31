'use client';

import { useRef, useState } from 'react';
import type { Palace, ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES } from '@/lib/ziwei/constants';
import type { TimeView } from './TimeNav';
import ChartBoard from './ChartBoard';

type MobilePalaceExplorerProps = {
  chart: ZiweiChart;
  selectedPalace: Palace | null;
  onSelect: (palace: Palace) => void;
  onClear: () => void;
  timeView: TimeView;
  liunianYear: number;
};

const PALACE_ORDER = ['命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '交友宫', '仆役宫', '官禄宫', '田宅宫', '福德宫', '父母宫'];

const shortName = (name: string) => name.replace(/宫$/, '');
const majorStars = (palace: Palace) => palace.stars.filter(star => star.type === 'major');

function palaceSummary(palace: Palace): string {
  const main = majorStars(palace);
  if (main.length) return main.map(star => star.name).join('、');
  if (palace.borrowedStars?.length) return '空宫 · 借对宫' + palace.borrowedStars.join('、');
  return '空宫 · 参考对宫';
}

export default function MobilePalaceExplorer({
  chart, selectedPalace, onSelect, onClear, timeView, liunianYear,
}: MobilePalaceExplorerProps) {
  const [mode, setMode] = useState<'overview' | 'chart'>('overview');
  const tabRef = useRef<HTMLDivElement>(null);
  const switchMode = (next: 'overview' | 'chart') => {
    setMode(next);
    requestAnimationFrame(() => tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const ordered = [...chart.palaces].sort((a, b) =>
    PALACE_ORDER.indexOf(a.name) - PALACE_ORDER.indexOf(b.name));
  const current = selectedPalace
    ?? chart.palaces.find(p => p.isMingGong)
    ?? chart.palaces.find(p => shortName(p.name) === '命')
    ?? ordered[0];
  const selectPalace = (palace: Palace, scroll = true) => {
    onSelect(palace);
    if(scroll) requestAnimationFrame(()=>
      document.getElementById('chart-palace-detail')?.scrollIntoView({behavior:'smooth',block:'start'}));
  };

  return (
    <section className="min-w-0" aria-label="手机版十二宫">
      <div ref={tabRef} className="sticky z-30 grid grid-cols-2 gap-2 mb-3 rounded-xl p-1"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)', top: 'var(--ziwei-nav-height,60px)', scrollMarginTop: 'var(--ziwei-nav-height,60px)' }}>
        <button type="button" onClick={() => switchMode('overview')}
          aria-pressed={mode === 'overview'} className="min-h-11 rounded-lg text-sm font-medium"
          style={{ color: mode === 'overview' ? 'var(--t-gold)' : 'var(--t-text2)',
            background: mode === 'overview' ? 'var(--t-card)' : 'transparent' }}>
          十二宫概览
        </button>
        <button type="button" onClick={() => switchMode('chart')}
          aria-pressed={mode === 'chart'} className="min-h-11 rounded-lg text-sm font-medium"
          style={{ color: mode === 'chart' ? 'var(--t-gold)' : 'var(--t-text2)',
            background: mode === 'chart' ? 'var(--t-card)' : 'transparent' }}>
          完整命盘
        </button>
      </div>

      {mode === 'overview' ? (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--t-faint)' }}>
            选择宫位查看星曜和三方四正。
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ordered.map(palace => {
              const selected = current?.branch === palace.branch;
              const changes = palace.stars.filter(star => star.siHua)
                .map(star => star.name + '化' + star.siHua);
              return (
                <button type="button" key={palace.branch} onClick={() => selectPalace(palace)}
                  aria-pressed={selected}
                  className="rounded-xl px-3 py-3 min-h-[92px] text-left flex flex-col gap-1"
                  style={{ background: selected ? 'rgba(212,168,67,0.1)' : 'var(--t-card)',
                    border: selected ? '1px solid var(--t-gold)' : '1px solid var(--t-border)' }}>
                  <span className="flex items-center justify-between gap-1 w-full">
                    <span className="text-sm font-semibold" style={{ color: selected ? 'var(--t-gold)' : 'var(--t-text)' }}>
                      {palace.name}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--t-faint)' }}>
                      {BRANCHES[palace.branch]}
                    </span>
                  </span>
                  <span className="text-xs leading-snug" style={{ color: 'var(--t-text2)' }}>
                    {palaceSummary(palace)}
                  </span>
                  {changes.length > 0 && <span className="text-[11px] leading-snug" style={{ color: 'var(--t-gold)' }}>
                    {changes.join(' · ')}
                  </span>}
                </button>
              );
            })}
          </div>

        </>
      ) : (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--t-faint)' }}>
            向左右滑动查看完整命盘，点选宫位可在下方「命盘详情」查看资料。
          </p>
          <div className="overflow-x-auto overscroll-x-contain rounded-xl"
            aria-label="完整命盘，可横向滑动">
            <div className="min-w-[600px]">
              <ChartBoard chart={chart} timeView={timeView} liunianYear={liunianYear}
                selectedBranch={selectedPalace?.branch ?? null}
                onPalaceSelect={palace=>selectPalace(palace)} onPalaceClear={onClear} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
