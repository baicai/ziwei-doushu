'use client';

import { useEffect, useRef, useState } from 'react';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import MobilePalaceExplorer from '@/components/MobilePalaceExplorer';
import InsightPanel from '@/components/InsightPanel';
import TimeNav, { type TimeView } from '@/components/TimeNav';
import { generateChart } from '@/lib/ziwei/algorithm';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { LAST_CHART_STORAGE_KEY, buildCachedChart, parseCachedChart, type CachedChartInput } from '@/lib/ziwei/chart-cache';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

const SAMPLE_BIRTH: BirthInfo = {
  year: 1990,
  month: 5,
  day: 17,
  hour: 6,
  gender: 'male',
  name: '虚构演示样例',
};

/**
 * Offline chart demo. On successful *user* submission, persist the submitted
 * birth parameters and source form, not the derived chart. Reload recalculates
 * with the current engine. The sample button never overwrites saved data.
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [view, setView] = useState<TimeView>('mingpan');
  const [liunianYear, setLiunianYear] = useState(() => new Date().getFullYear());
  const [cached, setCached] = useState<CachedChartInput | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formRevision, setFormRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [showingSample, setShowingSample] = useState(false);
  const draftRef = useRef<BirthFormState | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [navHeight, setNavHeight] = useState(60);

  useEffect(() => {
    if (!chart || !navRef.current || typeof ResizeObserver === 'undefined') return;
    const node = navRef.current;
    const observer = new ResizeObserver(() => setNavHeight(Math.ceil(node.getBoundingClientRect().height)));
    observer.observe(node);
    setNavHeight(Math.ceil(node.getBoundingClientRect().height));
    return () => observer.disconnect();
  }, [chart]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_CHART_STORAGE_KEY);
      const stored = parseCachedChart(raw);
      if (stored) {
        try {
          // Recalculate from the saved original form so time-rule improvements
          // do not silently keep a chart made with an older conversion path.
          const latestBirth = formToBirthInfo(stored.form);
          const generated = generateChart(latestBirth);
          setChart(generated);
          setShowingSample(false);
          setCached({ ...stored, birthInfo: latestBirth });
          draftRef.current = stored.form;
        } catch {
          // An old or invalid engine input must not prevent using the form.
          window.localStorage.removeItem(LAST_CHART_STORAGE_KEY);
          setNotice('此前的本地命盘无法恢复，已忽略该记录，请重新起盘。');
        }
      } else if (raw) {
        window.localStorage.removeItem(LAST_CHART_STORAGE_KEY);
        setNotice('保存的资料已失效，请重新填写。');
      }
    } catch {
      setNotice('暂时无法自动保存资料，请留意。');
    } finally {
      setRestoring(false);
    }
  }, []);

  const submitBirth = (birthInfo: BirthInfo) => {
    try {
      const generated = generateChart(birthInfo);
      setChart(generated);
      setShowingSample(false);
      setSelectedPalace(null);
      setEditing(false);
      setView('mingpan');
      const sourceForm = draftRef.current;
      if (!sourceForm) {
        setNotice('命盘已生成，本次资料未能保存。');
        return;
      }
      const entry = buildCachedChart(birthInfo, sourceForm);
      try {
        window.localStorage.setItem(LAST_CHART_STORAGE_KEY, JSON.stringify(entry));
        setCached(entry);
        setNotice('出生资料已保存。');
      } catch {
        setNotice('命盘已生成，本次资料未能保存。');
      }
    } catch {
      setNotice('排盘失败，请检查出生日期与时辰后重试。');
    }
  };

  const showSample = () => {
    try {
      setChart(generateChart(SAMPLE_BIRTH));
      setShowingSample(true);
      setSelectedPalace(null);
      setEditing(false);
      setNotice('当前是虚构示例命盘，不会覆盖你自己保存的出生资料。');
    } catch {
      setNotice('示例命盘暂时无法生成，请稍后重试。');
    }
  };

  const clearCache = () => {
    try {
      window.localStorage.removeItem(LAST_CHART_STORAGE_KEY);
      setCached(null);
      draftRef.current = null;
      setChart(null);
      setShowingSample(false);
      setSelectedPalace(null);
      setEditing(false);
      setView('mingpan');
      setFormRevision(n => n + 1);
      setNotice('已清除本页保存的出生资料和当前命盘。');
    } catch {
      setNotice('清除失败，请稍后重试。');
    }
  };

  if (restoring) {
    return <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }} role="status">
      正在恢复上次命盘…
    </main>;
  }

  if (!chart || editing) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 12px 64px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {editing ? '修改出生资料' : '紫微斗数排盘'}
        </h1>
        <p style={{ color: 'var(--t-text2)', marginBottom: 18, fontSize: 13, lineHeight: 1.8 }}>
          填写出生资料，查看专属命盘与解读。
        </p>
        {notice && (
          <p role="status" className="rounded-lg px-3 py-2 mb-4 text-[12px]"
            style={{ color: 'var(--t-text2)', border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
            {notice}
          </p>
        )}
        {editing && chart && (
          <button type="button" onClick={() => setEditing(false)}
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--t-border)', color: 'var(--t-text)' }}>
            ← 取消修改，返回命盘
          </button>
        )}
        {!chart && (
          <div className="mb-6 rounded-xl p-4" style={{ border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
            <div className="text-sm font-semibold mb-2">先体验一张完整命盘</div>
            <p className="text-xs mb-3" style={{ color: 'var(--t-text2)' }}>
              使用虚构示例（1990-05-17 午时），无需填写自己的出生信息。
            </p>
            <button type="button" onClick={showSample}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: 'rgba(212,168,67,0.18)', border: '1px solid rgba(212,168,67,0.4)', color: 'var(--t-gold)' }}>
              一键查看示例命盘与解读
            </button>
          </div>
        )}
        <BirthForm key={formRevision} initialData={cached?.form ?? undefined}
          onFormSave={data => { draftRef.current = data; }}
          onSubmit={submitBirth} />
        {cached && (
          <div className="mt-5 flex flex-wrap gap-3 items-center">
            <span className="text-xs" style={{ color: 'var(--t-faint)' }}>上次提交的资料已填入表单。</span>
            <button type="button" onClick={clearCache} className="text-xs underline" style={{ color: 'var(--t-text2)' }}>
              清除保存资料
            </button>
          </div>
        )}
        <p className="mt-5 text-xs leading-relaxed" style={{ color: 'var(--t-faint)' }}>
          隐私提示：出生资料仅保存在当前设备，且未加密。共用设备请及时清除。
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 12px 72px', '--ziwei-nav-height': `${navHeight}px` } as React.CSSProperties}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => { setEditing(true); setFormRevision(n => n + 1); }}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--t-border)', color: 'var(--t-text)' }}>
            修改出生资料
          </button>
          <button type="button" onClick={clearCache} className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--t-border)', color: 'var(--t-text2)' }}>
            清除保存资料
          </button>
        </div>
        <span className="text-xs" style={{ color: 'var(--t-faint)' }}>
          {showingSample ? '正在查看虚构示例 · 不会覆盖已缓存资料' : cached ? '已保存于当前浏览器 · 刷新后自动恢复' : '当前命盘未保存到本地缓存'}
        </span>
      </div>
      {notice && (
        <p role="status" className="rounded-lg px-3 py-2 mb-4 text-[12px]"
          style={{ color: 'var(--t-text2)', border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
          {notice}
        </p>
      )}

      <div ref={navRef} id="chart-time-tabs" className="sticky top-0 z-40 xl:static px-1 py-2 -mx-1 rounded-xl" style={{ background: 'var(--t-bg, rgba(12,17,27,0.95))', backdropFilter: 'blur(14px)' }}>
        <TimeNav chart={chart} view={view} liunianYear={liunianYear}
          onViewChange={v => { setView(v); if (window.innerWidth < 1280) navRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          onYearChange={setLiunianYear} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 xl:gap-5 mt-3 items-start min-w-0">
        <div className="min-w-0">
          <div className="xl:hidden">
            <MobilePalaceExplorer chart={chart}
              selectedPalace={selectedPalace} onSelect={setSelectedPalace}
              onClear={() => setSelectedPalace(null)}
              timeView={view} liunianYear={liunianYear} />
          </div>
          <div className="hidden xl:block">
            <ChartBoard chart={chart} selectedBranch={selectedPalace?.branch ?? null}
              onPalaceSelect={setSelectedPalace} onPalaceClear={() => setSelectedPalace(null)}
              timeView={view} liunianYear={liunianYear} />
          </div>
        </div>
        <div className="min-w-0"><InsightPanel chart={chart} selectedPalace={selectedPalace} liunianYear={liunianYear} timeView={view} /></div>
      </div>

      {chart.birthInfo.timePrecision === 'unknown' && <p role="note" className="mb-3 rounded-xl px-3 py-3 text-sm" style={{ background:'var(--t-card)', border:'1px solid var(--t-border)',color:'var(--t-text2)' }}>
        出生时辰不详：当前仅按子时展示一张试排盘，宫位与分析可能变化，不能视为确定命盘。建议补充出生时间。
      </p>}
      <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--t-faint)' }}>
        隐私提示：出生资料保存在当前设备，且未加密。共用设备请及时清除。
      </p>
    </main>
  );
}
