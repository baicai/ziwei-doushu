'use client';

import { useMemo, useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { OFFLINE_TOPICS, offlineTopicAnalysis } from '@/lib/ziwei/offline-interpretation';
import { selectedTimeReading } from '@/lib/ziwei/time-reading';

export function buildChartReport(chart: ZiweiChart, year: number): string {
  const lines = [
    '# 紫微研究 · 命盘综合报告',
    '',
    '称呼：' + (chart.birthInfo.name || '未填写'),
    '出生日期（换算后的公历）：' +
      [chart.birthInfo.year, chart.birthInfo.month, chart.birthInfo.day].join('-'),
    '出生时辰：' + (chart.birthInfo.timePrecision === 'unknown' ? '不详（仅为试排参考）' : '已填写'),
    '本报告属于传统文化资料，不构成医疗、投资及其他专业建议。',
    '',
  ];
  if (chart.birthInfo.timePrecision === 'unknown') {
    lines.push('**重要提示：** 因时辰不详，所示宫位及全部解读都不能作为确定命盘。', '');
  }
  for (const topic of OFFLINE_TOPICS) {
    lines.push('## ' + topic.label, '', offlineTopicAnalysis(chart, topic.key), '');
  }
  for (const [view, title] of [['daxian', '大限参考'], ['liunian', '流年参考']] as const) {
    const data = selectedTimeReading(chart, view, year);
    if (data) lines.push('## ' + title, '', data.title, ...data.details, ...data.limitations, '');
  }
  lines.push('---', '本报告由当前命盘的规则解读汇总生成，不包含 AI 的独立判断。');
  return lines.join('\n');
}
function downloadMarkdown(content: string) {
  const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = '紫微研究_命盘报告.md';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c] || c);
}
function printReport(report: string) {
  const popup = window.open('', '_blank', 'width=800,height=900');
  if (!popup) return false;
  popup.document.open();
  popup.document.write('<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>紫微研究 · 命盘综合报告</title><style>body{font-family:system-ui,"Microsoft Yahei",sans-serif;padding:32px;max-width:760px;margin:auto;white-space:pre-wrap;line-height:1.8;color:#222} @media print{body{padding:10mm}}</style></head><body>' + escapeHtml(report) + '</body></html>');
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}
export default function ReportPanel({ chart, year }: { chart: ZiweiChart; year: number }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const report = useMemo(() => buildChartReport(chart, year), [chart, year]);
  return (
    <section id="chart-report" className="mt-5 rounded-xl p-3 sm:p-5"
      style={{ border:'1px solid var(--t-border)', background:'var(--t-card)' }}>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-semibold text-base" style={{color:'var(--t-text)'}}>综合分析报告</h2>
          <p className="text-xs mt-1" style={{color:'var(--t-text2)'}}>汇总六专题、大限与流年，随当前命盘更新。</p>
        </div>
        <button type="button" onClick={() => setOpen(v => !v)}
          aria-expanded={open} className="min-h-11 rounded-lg px-4 text-sm"
          style={{border:'1px solid var(--t-border)',color:'var(--t-gold)'}}>
          {open ? '收起报告' : '查看报告'}
        </button>
      </div>
      {open && <>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-lg px-4 text-sm"
            style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}
            onClick={() => downloadMarkdown(report)}>下载文字报告</button>
          <button type="button" className="min-h-11 rounded-lg px-4 text-sm"
            style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}
            onClick={() => setNotice(printReport(report) ? '' : '请允许弹出新窗口，再使用打印或另存为 PDF。')}>
            打印／保存 PDF
          </button>
        </div>
        {notice && <p role="status" className="text-xs mt-2" style={{color:'var(--t-text2)'}}>{notice}</p>}
        <pre className="mt-4 p-4 rounded-lg whitespace-pre-wrap break-words text-xs sm:text-sm leading-7 max-h-[70vh] overflow-y-auto"
          style={{background:'var(--t-surface)',color:'var(--t-text2)'}}>{report}</pre>
      </>}
    </section>
  );
}
