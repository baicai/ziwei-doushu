'use client';
import { useMemo } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { buildWealthReading, validateWealthReading } from '@/lib/analysis/wealth';

export default function WealthEvidencePanel({ chart }: { chart: ZiweiChart }) {
  const reading = useMemo(() => buildWealthReading(chart), [chart]);
  const errors = useMemo(() => validateWealthReading(chart, reading), [chart, reading]);
  const map = new Map(reading.evidence.map(e => [e.id, e]));
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
