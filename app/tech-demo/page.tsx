'use client';

import { useMemo, useState } from 'react';
import ChartBoard from '@/components/ChartBoard';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, Palace } from '@/lib/ziwei/types';

const DEMO_BIRTH: BirthInfo = {
  year: 1990,
  month: 5,
  day: 17,
  hour: 6,
  gender: 'male',
  name: '技术演示样例',
};

export default function TechDemoPage() {
  const chart = useMemo(() => generateChart(DEMO_BIRTH), []);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);

  const summary = {
    birthInfo: chart.birthInfo,
    lunarInfo: chart.lunarInfo,
    wuxingJu: chart.wuxingJuName,
    mingGongBranch: chart.mingGongBranch,
    shenGongBranch: chart.shenGongBranch,
    mingZhu: chart.mingZhu,
    shenZhu: chart.shenZhu,
    yinYangGender: chart.yinYangGender,
  };

  return (
    <main style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 16px 64px' }}>
      <header style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: '#777', marginBottom: 6 }}>
          Zero-backend technical demo
        </div>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: 0 }}>紫微斗数排盘引擎 · 技术演示</h1>
        <p style={{ color: '#666', lineHeight: 1.7, marginTop: 10, maxWidth: 900 }}>
          本页不调用任何后端 API，也不需要 AI Key。页面直接在浏览器中调用
          <code style={{ margin: '0 4px' }}>generateChart()</code>
          生成完整命盘，用来验证开源仓库的核心排盘能力与前端组件能否独立运行。
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <InfoCard label="公历出生" value="1990-05-17 · 午时" />
        <InfoCard label="性别" value="男" />
        <InfoCard label="五行局" value={chart.wuxingJuName} />
        <InfoCard label="命主 / 身主" value={`${chart.mingZhu ?? '-'} / ${chart.shenZhu ?? '-'}`} />
        <InfoCard label="阴阳性别" value={chart.yinYangGender ?? '-'} />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
          gap: 18,
          alignItems: 'start',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <ChartBoard chart={chart} onPalaceSelect={setSelectedPalace} />
        </div>

        <aside
          style={{
            border: '1px solid rgba(128,128,128,.28)',
            borderRadius: 12,
            padding: 16,
            position: 'sticky',
            top: 16,
          }}
        >
          <h2 style={{ fontSize: 18, marginTop: 0 }}>宫位结构数据</h2>
          {selectedPalace ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
                {selectedPalace.name}
              </div>
              <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                地支索引 {selectedPalace.branch} · 天干索引 {selectedPalace.stem}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedPalace.stars.map((star, index) => (
                  <span
                    key={`${star.name}-${index}`}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 999,
                      background: 'rgba(128,128,128,.12)',
                      fontSize: 13,
                    }}
                  >
                    {star.name}
                    {star.brightnessRaw ? ` · ${star.brightnessRaw}` : ''}
                    {star.siHua ? ` · 化${star.siHua}` : ''}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#777', lineHeight: 1.7, marginBottom: 0 }}>
              点击左侧任意宫位，查看该宫位的结构化星曜数据。
            </p>
          )}
        </aside>
      </section>

      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>查看核心结构化输出样例</summary>
        <pre
          style={{
            overflow: 'auto',
            padding: 14,
            borderRadius: 10,
            background: 'rgba(128,128,128,.08)',
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {JSON.stringify(summary, null, 2)}
        </pre>
      </details>

      <p style={{ marginTop: 18, color: '#888', fontSize: 12, lineHeight: 1.7 }}>
        说明：这是技术验证页，不包含 AI 解读、登录、会员、支付、服务端风控等商业能力。
      </p>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid rgba(128,128,128,.24)',
        borderRadius: 10,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
