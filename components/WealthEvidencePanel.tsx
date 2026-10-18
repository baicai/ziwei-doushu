'use client';
import { useMemo } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { buildWealthReading, validateWealthReading } from '@/lib/analysis/wealth';
import { buildWealthTimeEvidence } from '@/lib/analysis/wealth-time';

export default function WealthEvidencePanel({ chart, year }: { chart: ZiweiChart; year: number }) {
  const reading = useMemo(() => buildWealthReading(chart), [chart]);
  const errors = useMemo(() => validateWealthReading(chart, reading), [chart, reading]);
  const map = new Map(reading.evidence.map(e => [e.id, e]));
  const time = useMemo(() => buildWealthTimeEvidence(chart, year), [chart, year]);
  return (
    <section style={{ marginTop: 20, padding: 20, border: '1px solid var(--t-border)', borderRadius: 14, background: 'var(--t-surface)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t-text)' }}>财运 · 离线综合解读（试验版）</h2>
      <p style={{ marginTop: 8, fontSize: 12, color: 'var(--t-text2)' }}>
        W01–W04 基于实际命盘星曜组合生成，无需 AI Key；属于传统象征解读，不预测实际收入或投资结果。
      </p>
      {reading.status === 'invalid' || errors.length > 0 ? (
        <p role="alert" style={{ color: '#e57373', marginTop: 12 }}>排盘校验失败：{[...reading.errors, ...errors].join('；')}</p>
      ) : (
        <>
          {reading.missing.length > 0 && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--t-text2)' }}>
            数据未齐：{reading.missing.join('、')}。以下仅显示有足够依据的结论。
          </p>}
          <article style={{ borderTop: '1px solid var(--t-border)', paddingTop: 14, marginTop: 14 }}>
            <h3 style={{ color: 'var(--t-text)', fontSize: 14, fontWeight: 600 }}>W05–W06 · 大限及流年证据（数据层预览）</h3>
            <p style={{ color: 'var(--t-text2)', fontSize: 12, marginTop: 8 }}>当前大限：{time.activeDaXian ? `${time.activeDaXian.startAge}–${time.activeDaXian.endAge}岁 · ${time.activeDaXian.palaceName}` : '未能核实'}</p>
            <p style={{ color: 'var(--t-text2)', fontSize: 12, marginTop: 5 }}>大限三方四正：{time.daXianThreeFour.map(p => `${p.relation}·${p.palace}`).join('、') || '待计算'}</p>
            <details style={{ color: 'var(--t-text2)', fontSize: 12, marginTop: 8 }}>
              <summary style={{ cursor: 'pointer' }}>查看大限四化与 {year} 年流年四化</summary>
              <p style={{ marginTop: 6 }}>大限四化：{time.activeDaXian?.siHua.map(s => `${s.star}化${s.type}→${s.palace ?? '落宫待核实'}`).join('、') || '暂无数据'}</p>
              <p style={{ marginTop: 6 }}>流年四化：{time.annual.siHua.map(s => `${s.star}化${s.type}→${s.palace ?? '落宫待核实'}`).join('、') || '暂无数据'}</p>
              {time.warnings.length > 0 && <p role="status" style={{ marginTop: 6 }}>数据限制：{time.warnings.join('；')}</p>}
            </details>
            <p style={{ color: 'var(--t-text2)', fontSize: 11, marginTop: 8 }}>当前只展示结构化事实，尚未生成大限/流年财务走势结论；大限年龄按引擎口径，不代表事业或财富期限。</p>
          </article>
          {reading.findings.length === 0 && <p style={{ marginTop: 12, color: 'var(--t-text2)' }}>
            当前命盘不满足试验版四条组合规则；不能套用其他命盘的结论。
          </p>}
          {reading.findings.map(f => (
            <article key={f.ruleId} style={{ borderTop: '1px solid var(--t-border)', paddingTop: 14, marginTop: 14 }}>
              <h3 style={{ color: 'var(--t-text)', fontSize: 14, fontWeight: 600 }}>{f.ruleId} · {f.title}</h3>
              <p style={{ color: 'var(--t-text2)', fontSize: 12, lineHeight: 1.8, marginTop: 6 }}>{f.interpretation}</p>
              <details style={{ marginTop: 8, color: 'var(--t-text2)', fontSize: 12 }}>
                <summary style={{ cursor: 'pointer' }}>为什么这么说 · 查看 {f.evidenceIds.length} 条排盘依据</summary>
                <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                  {f.evidenceIds.map(id => { const e = map.get(id); return e && <li key={id}>
                    {e.palace} · {e.star}{e.brightness ? '（' + e.brightness + '）' : ''}
                    {e.natalSiHua ? ' · 化' + e.natalSiHua : ''}
                  </li>; })}
                </ul>
                <p style={{ marginTop: 6 }}>解释边界：{f.limitations.join('；')}</p>
              </details>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
