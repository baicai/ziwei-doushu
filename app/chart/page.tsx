'use client';
import { useState } from 'react';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import TimeNav, { type TimeView } from '@/components/TimeNav';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

/**
 * 命盘页 —— 开源版「排盘引擎 Demo」
 *
 * 这是一个最小可运行示例：用本仓库的排盘引擎 generateChart() 配合基础 UI
 * 组件，渲染一张完整紫微命盘 + 基础解读，并支持本命 / 大限 / 流年切换。
 *
 * 说明：线上商业版的完整交互界面（重设计的新 UI、AI 流式解读、合盘、分享
 * 卡片等）不在开源范围内；但排盘内核——安星算法、四化、格局识别、古籍库——
 * 完全开放（见 lib/ziwei/*），可自由二次开发出你自己的界面。
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [view, setView] = useState<TimeView>('mingpan');
  const [liunianYear, setLiunianYear] = useState(() => new Date().getFullYear());
  const sampleBirth: BirthInfo = { year: 1990, month: 5, day: 17, hour: 6, gender: 'male', name: '虚构演示样例' };

  // ── 未起盘：展示出生信息表单 ──
  if (!chart) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>紫微斗数排盘</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 14, lineHeight: 1.7 }}>
          输入出生年月日时，开源排盘引擎即时生成命盘。
          <br />
          命盘生成后可离线阅读命格、事业、财运、感情等规则解读。此功能不依赖 AI 接口，也不冒充 AI 问答。
        </p>
        <div className="mb-6 rounded-xl p-4" style={{ border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
          <div className="text-sm font-semibold mb-2">先体验一张完整命盘</div>
          <p className="text-xs mb-3" style={{ color: 'var(--t-text2)' }}>使用虚构演示样例（1990-05-17 午时），查看十二宫与解读专题，不必填写个人信息。</p>
          <button
            type="button"
            onClick={() => setChart(generateChart(sampleBirth))}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: 'rgba(212,168,67,0.18)', border: '1px solid rgba(212,168,67,0.4)', color: 'var(--t-gold)' }}
          >一键查看示例命盘与解读</button>
        </div>
        <BirthForm onSubmit={(info: BirthInfo) => setChart(generateChart(info))} />
      </main>
    );
  }

  // ── 已起盘：命盘 + 解读 ──
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px' }}>
      <button
        type="button"
        onClick={() => { setChart(null); setSelectedPalace(null); }}
        style={{
          marginBottom: 16, padding: '6px 14px', cursor: 'pointer',
          border: '1px solid #ccc', borderRadius: 8, background: 'transparent',
        }}
      >
        ← 重新起盘
      </button>

      <TimeNav
        chart={chart}
        view={view}
        liunianYear={liunianYear}
        onViewChange={setView}
        onYearChange={setLiunianYear}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 mt-4 items-start">
        <div className="min-w-0"><ChartBoard chart={chart} onPalaceSelect={setSelectedPalace} /></div>
        <div className="min-w-0"><InsightPanel chart={chart} selectedPalace={selectedPalace} /></div>
      </div>
    </main>
  );
}
