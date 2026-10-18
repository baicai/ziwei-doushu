'use client';

import { useEffect, useRef, useState } from 'react';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
import WealthEvidencePanel from '@/components/WealthEvidencePanel';
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

/**
 * The open-source repository intentionally excludes /api/interpret.
 * A missing API must never appear as a functioning AI experience:
 * this component instead provides deterministic client-side explanations
 * grounded in actual chart values, with explicit limitations.
 */
export default function InsightPanel({ chart, selectedPalace, selectedSiHua, liunianYear, timeView = 'mingpan' }: InsightPanelProps) {
  const [activeTopic, setActiveTopic] = useState<OfflineTopic>('overview');
  const [input, setInput] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [readings, setReadings] = useState<Reading[]>(() => [
    { heading: '命格', content: offlineTopicAnalysis(chart, 'overview') },
  ]);
  const lastPalace = useRef<string | null>(null);
  const lastSihua = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiAnswer(''); setAiError('');
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
    setAiAnswer(''); setAiError('');
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
        content: '此版本仅支持命格、性格、感情、事业、财运、健康六个传统文化专题，以及点击十二宫查看盘面依据。自由提问需要另行接入真正的 AI 服务。这里不会用固定模板冒充 AI 答案。',
      }]);
    } else {
      setActiveTopic(topic);
      const label = OFFLINE_TOPICS.find(t => t.key === topic)?.label ?? '专题';
      setReadings([{
        heading: `${label} · 关键词匹配`,
        content: `你输入的「${question}」被匹配到「${label}」专题。以下为固定规则解读，并非 AI 对你提出的问题作出推理。\n\n${offlineTopicAnalysis(chart, topic)}`,
      }]);
    }
    setInput('');
  };

  const askAi = async () => {
    if (aiLoading) return;
    setAiError(''); setAiAnswer(''); setAiLoading(true);
    try {
      const response = await fetch('/api/interpret', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({birthInfo:chart.birthInfo,topic:activeTopic,question:input.trim().slice(0,500)}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 解读失败');
      setAiAnswer(data.answer);
      setInput('');
    } catch (err) {setAiError(err instanceof Error ? err.message : 'AI 暂时不可用');}
    finally {setAiLoading(false);}
  };

  return (
    <section className="flex flex-col min-w-0 min-h-[480px] rounded-xl overflow-hidden card-glass" aria-label="离线规则解读">
      <header className="flex-shrink-0 px-3 pt-3 pb-2.5" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[14px] font-semibold" style={{ color: 'var(--t-text)' }}>命盘规则解读</h2>
          <span className="rounded-full px-2 py-1 text-[10px]" style={{ color: 'var(--t-gold)', border: '1px solid var(--t-border)' }}>
            离线可用 · 非 AI
          </span>
        </div>
        <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--t-faint)' }}>
          读取当前命盘的星曜、四化及三方四正；点击左侧十二宫可查看宫位依据。无需 API Key，不上传命盘用于解读。
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {OFFLINE_TOPICS.map(topic => (
            <button
              key={topic.key}
              type="button"
              onClick={() => showTopic(topic.key)}
              aria-pressed={activeTopic === topic.key}
              className="rounded-lg py-2 text-[11px] font-medium transition-colors"
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

      <div ref={scrollRef} className="flex-1 min-h-[260px] max-h-[680px] overflow-y-auto p-3 space-y-4">
        {timeView !== 'mingpan' && (() => {
          const evidence = selectedTimeReading(chart, timeView, liunianYear ?? new Date().getFullYear());
          return evidence && <section className="rounded-lg p-3" style={{ border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
            <h3 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--t-gold)' }}>{evidence.title}</h3>
            {evidence.details.map((item, i) => <p key={i} className="text-[11px] leading-[1.8]" style={{ color: 'var(--t-text2)' }}>{item}</p>)}
            {evidence.limitations.map((item, i) => <p key={i} className="text-[10px] mt-1" style={{ color: 'var(--t-faint)' }}>{item}</p>)}
          </section>;
        })()}
        {activeTopic === 'wealth' && <WealthEvidencePanel chart={chart} year={liunianYear ?? new Date().getFullYear()} />}
        {aiLoading && <p role="status" className="text-[12px]" style={{color:'var(--t-text2)'}}>DeepSeek 正在综合解读当前专题…</p>}
        {aiError && <p role="alert" className="text-[12px]" style={{color:'#f87171'}}>{aiError}</p>}
        {aiAnswer && <article className="rounded-lg p-3" style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
          <div className="text-[12px] font-semibold mb-2" style={{color:'var(--t-gold)'}}>DeepSeek · AI 深度解读（传统文化参考）</div>
          <p className="text-[12px] leading-[1.8] whitespace-pre-wrap" style={{color:'var(--t-text2)'}}>{aiAnswer}</p>
        </article>}
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
            className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[11px] focus:outline-none"
            style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)', color: 'var(--t-text)' }}
          />
          <button type="submit" disabled={!input.trim()} className="rounded-lg px-3 text-[11px] disabled:opacity-40"
            style={{ color: 'var(--t-gold)', border: '1px solid rgba(212,168,67,0.3)' }}>
            查专题
          </button>
        </form>
        <button type="button" onClick={askAi} disabled={aiLoading} className="w-full rounded-lg px-3 py-2 text-[12px] font-medium disabled:opacity-50"
          style={{border:'1px solid rgba(212,168,67,0.4)',color:'var(--t-gold)',background:'rgba(212,168,67,0.1)'}}>
          {aiLoading ? 'DeepSeek 解读中…' : '使用 DeepSeek 深度解读当前专题'}
        </button>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--t-faint)' }}>
          传统术数文化学习演示，不作命运、疾病、婚姻或投资结果预测。DeepSeek 可选调用，需要服务端 API Key；提交 AI 请求时会向服务商发送当前命盘数据。
        </p>
      </footer>
    </section>
  );
}
