'use client';

import { useRef, useState } from 'react';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { buildSiHuaOverlay, getYearStemIndex, type TimeView } from './TimeNav';
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

function starCaption(star: Star, overlay: Record<string, string>): string {
  const details = [];
  if (star.brightnessRaw) details.push(star.brightnessRaw);
  if (star.siHua) details.push('生年化' + star.siHua);
  if (overlay[star.name]) details.push('所选时间化' + overlay[star.name]);
  return star.name + (details.length ? ' · ' + details.join(' · ') : '');
}

export default function MobilePalaceExplorer({
  chart, selectedPalace, onSelect, onClear, timeView, liunianYear,
}: MobilePalaceExplorerProps) {
  const [mode, setMode] = useState<'overview' | 'chart'>('overview');
  const detailRef = useRef<HTMLDivElement>(null);
  const ordered = [...chart.palaces].sort((a, b) =>
    PALACE_ORDER.indexOf(a.name) - PALACE_ORDER.indexOf(b.name));
  const current = selectedPalace
    ?? chart.palaces.find(p => p.isMingGong)
    ?? chart.palaces.find(p => shortName(p.name) === '命')
    ?? ordered[0];
  const dx = chart.daXians?.[chart.currentDaXianIndex];
  const dxPalace = dx && chart.palaces.find(p => p.branch === dx.palaceBranch);
  const overlayStem = timeView === 'daxian' ? dxPalace?.stem :
    timeView === 'liunian' && Number.isInteger(liunianYear)
      && liunianYear >= 1900 && liunianYear <= 2200 ? getYearStemIndex(liunianYear) : undefined;
  const overlay = overlayStem !== undefined && Number.isInteger(overlayStem)
    && overlayStem >= 0 && overlayStem < 10 ? buildSiHuaOverlay(overlayStem) : {};

  const selectPalace = (palace: Palace, scroll = true) => {
    onSelect(palace);
    if (scroll && mode === 'overview') {
      // The detail card stays mounted, so selecting a palace can reveal it immediately.
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const relatives = current ? [
    { label: '对宫', branch: (current.branch + 6) % 12 },
    { label: '三合', branch: (current.branch + 4) % 12 },
    { label: '三合', branch: (current.branch + 8) % 12 },
  ].map(rel => ({ ...rel, palace: chart.palaces.find(p => p.branch === rel.branch) }))
    .filter((rel): rel is { label: string; branch: number; palace: Palace } => !!rel.palace) : [];

  return (
    <section className="min-w-0" aria-label="手机版十二宫">
      <div className="grid grid-cols-2 gap-2 mb-3 rounded-xl p-1"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border)' }}>
        <button type="button" onClick={() => setMode('overview')}
          aria-pressed={mode === 'overview'} className="min-h-11 rounded-lg text-sm font-medium"
          style={{ color: mode === 'overview' ? 'var(--t-gold)' : 'var(--t-text2)',
            background: mode === 'overview' ? 'var(--t-card)' : 'transparent' }}>
          十二宫概览
        </button>
        <button type="button" onClick={() => setMode('chart')}
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

          {current && (
            <div ref={detailRef} id="mobile-palace-detail" className="mt-4 rounded-xl p-4 scroll-mt-4"
              aria-live="polite"
              style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--t-gold)' }}>
                    {current.name}
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--t-faint)' }}>
                    {STEMS[current.stem]}{BRANCHES[current.branch]}
                    {current.isMingGong ? ' · 命宫' : ''}
                    {current.isShenGong ? ' · 身宫' : ''}
                    {current.daXianAge ? ' · ' + current.daXianAge.join('–') + '岁' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--t-text)' }}>主星</h3>
                  <p className="text-sm leading-6" style={{ color: 'var(--t-text2)' }}>
                    {majorStars(current).length
                      ? majorStars(current).map(s => starCaption(s, overlay)).join('；')
                      : palaceSummary(current)}
                  </p>
                </div>
                {(['lucky', 'minor', 'sha'] as const).map(kind => {
                  const items = current.stars.filter(s => s.type === kind);
                  if (!items.length) return null;
                  const heading = kind === 'lucky' ? '辅星' : kind === 'minor' ? '其他星曜' : '煞星';
                  return (
                    <div key={kind}>
                      <h3 className="text-xs font-semibold mb-1" style={{ color: 'var(--t-text)' }}>{heading}</h3>
                      <p className="text-xs leading-6" style={{ color: 'var(--t-text2)' }}>
                        {items.map(s => starCaption(s, overlay)).join('；')}
                      </p>
                    </div>
                  );
                })}
                <div>
                  <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--t-text)' }}>三方四正</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatives.map(rel => (
                      <button type="button" key={rel.branch}
                        onClick={() => selectPalace(rel.palace, false)}
                        className="rounded-lg min-h-11 px-3 py-2 text-xs text-left"
                        style={{ color: 'var(--t-text2)', border: '1px solid var(--t-border)' }}>
                        {rel.label} · {rel.palace.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--t-faint)' }}>
                下方「命盘解读」将同步显示所选宫位的详细解释。
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--t-faint)' }}>
            向左右滑动查看完整命盘，点选宫位可查看下方解读。
          </p>
          <div className="overflow-x-auto overscroll-x-contain rounded-xl"
            aria-label="完整命盘，可横向滑动">
            <div className="min-w-[600px]">
              <ChartBoard chart={chart} timeView={timeView} liunianYear={liunianYear}
                selectedBranch={selectedPalace?.branch ?? null}
                onPalaceSelect={onSelect} onPalaceClear={onClear} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
