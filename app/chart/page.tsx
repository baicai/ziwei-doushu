'use client';

import { useEffect, useRef, useState } from 'react';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import TimeNav, { type TimeView } from '@/components/TimeNav';
import { generateChart } from '@/lib/ziwei/algorithm';
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
  const releaseLabel = 'offline-six-topics-20261018-r2';
  const [showingSample, setShowingSample] = useState(false);
  const draftRef = useRef<BirthFormState | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_CHART_STORAGE_KEY);
      const stored = parseCachedChart(raw);
      if (stored) {
        try {
          const generated = generateChart(stored.birthInfo);
          setChart(generated);
          setShowingSample(false);
          setCached(stored);
          draftRef.current = stored.form;
        } catch {
          // An old or invalid engine input must not prevent using the form.
          window.localStorage.removeItem(LAST_CHART_STORAGE_KEY);
          setNotice('此前的本地命盘无法恢复，已忽略该记录，请重新起盘。');
        }
      } else if (raw) {
        window.localStorage.removeItem(LAST_CHART_STORAGE_KEY);
        setNotice('本地缓存格式无效，已忽略该记录。');
      }
    } catch {
      setNotice('无法读取当前浏览器的本地缓存。你仍然可以起盘，但刷新后可能需要重新输入。');
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
        setNotice('命盘已生成，但未取得原始表单，因此未写入本地缓存。');
        return;
      }
      const entry = buildCachedChart(birthInfo, sourceForm);
      try {
        window.localStorage.setItem(LAST_CHART_STORAGE_KEY, JSON.stringify(entry));
        setCached(entry);
        setNotice('已在此浏览器保存出生资料；下次打开将自动恢复命盘。');
      } catch {
        setNotice('命盘已生成，但浏览器禁止本地存储；下次打开可能需要重新填写。');
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
      setNotice('清除本地缓存失败，请检查浏览器存储权限。');
    }
  };

  if (restoring) {
    return <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }} role="status">
      正在检查本地保存的命盘…
    </main>;
  }

  if (!chart || editing) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 60px' }}>
        <p data-release={releaseLabel} style={{ fontSize: 11, color: 'var(--t-faint)', marginBottom: 8 }}>离线六专题 · {releaseLabel}</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {editing ? '修改出生资料' : '紫微斗数排盘'}
        </h1>
        <p style={{ color: 'var(--t-text2)', marginBottom: 18, fontSize: 13, lineHeight: 1.8 }}>
          提交一次后，出生资料会保存在当前浏览器，下次访问自动恢复命盘；解读在浏览器内生成，无需 AI Key。
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
              清除本地缓存
            </button>
          </div>
        )}
        <p className="mt-5 text-xs leading-relaxed" style={{ color: 'var(--t-faint)' }}>
          隐私提示：出生资料以明文保存在当前网站的浏览器 localStorage，不同步到其他设备；共用电脑请使用“清除本地缓存”。
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 60px' }}>
      <p data-release={releaseLabel} style={{ fontSize: 11, color: 'var(--t-faint)', marginBottom: 8 }}>离线六专题 · {releaseLabel}</p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => { setEditing(true); setFormRevision(n => n + 1); }}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--t-border)', color: 'var(--t-text)' }}>
            修改出生资料
          </button>
          <button type="button" onClick={clearCache} className="rounded-lg px-3 py-2 text-sm"
            style={{ border: '1px solid var(--t-border)', color: 'var(--t-text2)' }}>
            清除本地缓存
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

      <TimeNav chart={chart} view={view} liunianYear={liunianYear}
        onViewChange={setView} onYearChange={setLiunianYear} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 mt-4 items-start">
        <div className="min-w-0"><ChartBoard chart={chart} onPalaceSelect={setSelectedPalace} timeView={view} liunianYear={liunianYear} /></div>
        <div className="min-w-0"><InsightPanel chart={chart} selectedPalace={selectedPalace} liunianYear={liunianYear} timeView={view} /></div>
      </div>

      <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--t-faint)' }}>
        出生资料仅存放于本浏览器的 localStorage（未加密），不跨设备同步；如使用共用电脑，请清除缓存。
      </p>
    </main>
  );
}
