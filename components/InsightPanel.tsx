'use client';

import { useEffect, useRef, useState } from 'react';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
import WealthEvidencePanel from '@/components/WealthEvidencePanel';
import AiSpecificityControl from '@/components/AiSpecificityControl';
import AiEvidencePanel, {toEvidenceAudit,type AiEvidenceAuditResult} from '@/components/AiEvidencePanel';
import { specificityLabel } from '@/lib/ai/specificity';
import { selectedTimeReading } from '@/lib/ziwei/time-reading';
import {
  OFFLINE_TOPICS,
  matchOfflineTopic,
  offlineTopicAnalysis,
  offlinePalaceAnalysis,
  offlineSihuaAnalysis,
  type OfflineTopic,
} from '@/lib/ziwei/offline-interpretation';

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
  liunianYear?: number;
  timeView?: TimeView;
  specificity?: number;
  aiLab?: boolean;
  onSpecificityChange?: (value:number)=>void;
}

interface Reading {
  heading: string;
  content: string;
}

function ReadingContent({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1.5" aria-hidden="true" />;
        const title = line.match(/^\*\*【(.+?)】\*\*$/);
        if (title) {
          return (
            <h3 key={index} className="pt-2.5 pb-0.5 text-[12px] font-semibold" style={{ color: 'var(--t-gold)' }}>
              {title[1]}
            </h3>
          );
        }
        return (
          <p key={index} className="text-[12px] leading-[1.8] whitespace-pre-wrap" style={{ color: 'var(--t-text2)' }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

/** Rule interpretations and optional DeepSeek follow-up analysis. */
export default function InsightPanel({ chart, selectedPalace, selectedSiHua, liunianYear,
  timeView = 'mingpan', specificity=0, aiLab=false, onSpecificityChange }: InsightPanelProps) {
  const [activeTopic, setActiveTopic] = useState<OfflineTopic>('overview');
  const [input, setInput] = useState('');
  const [aiTurns, setAiTurns] = useState<Array<{ question: string; answer: string; specificity: number; audit:AiEvidenceAuditResult|null }>>([]);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [readings, setReadings] = useState<Reading[]>(() => [
    { heading: '命格', content: offlineTopicAnalysis(chart, 'overview') },
  ]);
  const lastPalace = useRef<string | null>(null);
  const lastSihua = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiError(''); setAiTurns([]);
    setActiveTopic('overview');
    setReadings([{ heading: '命格', content: offlineTopicAnalysis(chart, 'overview') }]);
    lastPalace.current = null;
    lastSihua.current = null;
  }, [chart]);

  useEffect(() => {
    if (!selectedPalace) return;
    const identity = `${selectedPalace.branch}:${selectedPalace.name}`;
    if (lastPalace.current === identity) return;
    lastPalace.current = identity;
    setReadings(prev => [...prev, {
      heading: selectedPalace.name,
      content: offlinePalaceAnalysis(chart, selectedPalace),
    }].slice(-4));
  }, [chart, selectedPalace]);

  useEffect(() => {
    if (!selectedSiHua) return;
    const identity = `${selectedSiHua.view}:${selectedSiHua.starName}:${selectedSiHua.siHua}`;
    if (lastSihua.current === identity) return;
    lastSihua.current = identity;
    setReadings(prev => [...prev, {
      heading: `${selectedSiHua.starName}化${selectedSiHua.siHua}`,
      content: offlineSihuaAnalysis(chart, selectedSiHua),
    }].slice(-4));
  }, [chart, selectedSiHua]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [readings]);

  const showTopic = (topic: OfflineTopic) => {
    setAiError(''); setAiTurns([]);
    setActiveTopic(topic);
    const label = OFFLINE_TOPICS.find(t => t.key === topic)?.label ?? '专题';
    setReadings([{ heading: label, content: offlineTopicAnalysis(chart, topic) }]);
  };

  const handleSearch = () => {
    const question = input.trim();
    if (!question) return;
    const topic = matchOfflineTopic(question);
    if (!topic) {
      setReadings([{
        heading: '未识别专题',
        content: '可以选择上方六个专题查看分析，或使用 AI 深度解读提出具体问题。',
      }]);
    } else {
      setActiveTopic(topic);
      const label = OFFLINE_TOPICS.find(t => t.key === topic)?.label ?? '专题';
      setReadings([{
        heading: `${label} · 关键词匹配`,
        content: `根据「${question}」，为你展示「${label}」专题：\n\n${offlineTopicAnalysis(chart, topic)}`,
      }]);
    }
    setInput('');
  };

  const askAi = async () => {
    if (aiLoading) return;
    setAiError(''); setAiLoading(true);
    try {
      const response = await fetch('/api/interpret', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({birthInfo:chart.birthInfo,topic:activeTopic,specificity,question:input.trim().slice(0,500),
          history:aiTurns.slice(-3).flatMap(turn => [
            {role:'user',content:turn.question.slice(0,500)},
            {role:'assistant',content:turn.answer.slice(0,600)},
          ])}),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(
        response.status === 429 ? '请求较多，请稍后再试。'
        : data && typeof data.error === 'string' ? data.error
        : 'AI 解读暂时不可用，请稍后重试。',
      );
      if (!data || typeof data.answer !== 'string') throw new Error('AI 暂时未返回有效解读，请稍后重试。');
      setAiTurns(prev => [...prev,{question:input.trim().slice(0,500) || '请解读当前专题',answer:data.answer,specificity,audit:toEvidenceAudit(data.evidenceAudit)}].slice(-4));
      setInput('');
    } catch (err) {setAiError(err instanceof Error ? err.message : 'AI 暂时不可用');}
    finally {setAiLoading(false);}
  };

  return (
    <section className="flex flex-col min-w-0 min-h-[420px] rounded-xl overflow-hidden card-glass" aria-label="命盘解读">
      <header className="flex-shrink-0 px-3 pt-3 pb-2.5" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--t-text)' }}>命盘解读</h2>
        </div>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--t-faint)' }}>
          选择感兴趣的主题，或点击命盘中的宫位查看详细分析。
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {OFFLINE_TOPICS.map(topic => (
            <button
              key={topic.key}
              type="button"
              onClick={() => showTopic(topic.key)}
              aria-pressed={activeTopic === topic.key}
              className="rounded-lg min-h-11 py-2 text-[12px] font-medium transition-colors"
              style={{
                color: activeTopic === topic.key ? 'var(--t-gold)' : 'var(--t-text2)',
                background: activeTopic === topic.key ? 'rgba(212,168,67,0.12)' : 'var(--t-card)',
                border: `1px solid ${activeTopic === topic.key ? 'rgba(212,168,67,0.32)' : 'var(--t-border)'}`,
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 min-h-[260px] max-h-[60vh] xl:max-h-[680px] overflow-y-auto p-3 space-y-4">
        {timeView !== 'mingpan' && (() => {
          const evidence = selectedTimeReading(chart, timeView, liunianYear ?? new Date().getFullYear());
          return evidence && <section className="rounded-lg p-3" style={{ border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
            <h3 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--t-gold)' }}>{evidence.title}</h3>
            {evidence.details.map((item, i) => <p key={i} className="text-[11px] leading-[1.8]" style={{ color: 'var(--t-text2)' }}>{item}</p>)}
            {evidence.limitations.map((item, i) => <p key={i} className="text-[10px] mt-1" style={{ color: 'var(--t-faint)' }}>{item}</p>)}
          </section>;
        })()}
        {activeTopic === 'wealth' && <WealthEvidencePanel chart={chart} year={liunianYear ?? new Date().getFullYear()} />}
        {aiLoading && <p role="status" className="text-[12px]" style={{color:'var(--t-text2)'}}>正在生成解读…</p>}
        {aiError && <p role="alert" className="text-[12px]" style={{color:'#f87171'}}>{aiError}</p>}
        {aiTurns.length > 0 && <div className="flex justify-end">
          <button type="button" onClick={() => setAiTurns([])} className="min-h-11 text-xs underline"
            style={{ color: 'var(--t-text2)' }}>清空 AI 对话</button>
        </div>}
        {aiTurns.map((turn, index) => <article key={index} className="rounded-lg p-3"
          style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
          <div className="text-[12px] font-semibold mb-1" style={{color:'var(--t-text)'}}>提问：{turn.question}</div>
          <div className="text-[12px] font-semibold mb-2 mt-3" style={{color:'var(--t-gold)'}}>AI 深度解读{aiLab?' · '+turn.specificity+'/100（'+specificityLabel(turn.specificity)+'）':''}</div>
          <p className="text-[12px] leading-[1.8] whitespace-pre-wrap" style={{color:'var(--t-text2)'}}>{turn.answer}</p>
          <AiEvidencePanel audit={turn.audit}/>
        </article>)}
        {readings.map((reading, index) => (
          <article key={index} className="rounded-lg p-3" style={{ border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
            <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--t-text)' }}>{reading.heading}</div>
            <ReadingContent content={reading.content} />
          </article>
        ))}
      </div>

      <footer className="flex-shrink-0 px-3 py-3 space-y-2" style={{ borderTop: '1px solid var(--t-border)' }}>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); handleSearch(); }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={120}
            placeholder="输入事业、感情等关键词查专题"
            aria-label="检索离线解读专题"
            className="min-w-0 flex-1 rounded-lg px-3 py-3 text-[16px] focus:outline-none"
            style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
          <button type="submit" disabled={!input.trim()} className="rounded-lg min-h-11 px-3 text-[12px] disabled:opacity-40"
            style={{ color: 'var(--t-gold)', border: '1px solid rgba(212,168,67,0.3)' }}>
            查专题
          </button>
        </form>
        {aiLab && onSpecificityChange && <AiSpecificityControl
          value={specificity} onChange={onSpecificityChange} />}
        <button type="button" onClick={askAi} disabled={aiLoading} className="w-full rounded-lg min-h-11 px-3 py-3 text-[13px] font-medium disabled:opacity-50"
          style={{border:'1px solid rgba(212,168,67,0.4)',color:'var(--t-gold)',background:'rgba(212,168,67,0.1)'}}>
          {aiLoading ? '正在解读…' : 'AI 深度解读'}
        </button>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--t-faint)' }}>
          内容仅供传统文化交流参考，不作为医疗、投资等决策依据。使用 AI 解读时，命盘资料将发送至第三方模型服务。
        </p>
      </footer>
    </section>
  );
}
