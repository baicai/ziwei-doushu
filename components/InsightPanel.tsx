'use client';

import { useEffect, useRef, useState } from 'react';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
import WealthEvidencePanel from '@/components/WealthEvidencePanel';
import AiSpecificityControl from '@/components/AiSpecificityControl';
import AiEvidencePanel, {toEvidenceAudit,type AiEvidenceAuditResult} from '@/components/AiEvidencePanel';
import { specificityLabel } from '@/lib/ai/specificity';
import { selectedTimeReading } from '@/lib/ziwei/time-reading';
import { buildLayTopicReading } from '@/lib/ziwei/plain-language-report';
import { parseSixTopicAnswer } from '@/lib/ai/reading-sections';
import {
  OFFLINE_TOPICS,
  matchOfflineTopic,
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
  sharedBasicAi?:{answer:string;audit:AiEvidenceAuditResult|null}|null;
}

interface Reading {
  heading: string;
  content: string;
  topic?: OfflineTopic;
}

function ReadingContent({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split('\n').map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1.5" aria-hidden="true" />;
        const title = line.match(/^\*\*【(.+?)】\*\*$/);
        if (title) {
          return (
            <h3 key={index} className="pt-2.5 pb-0.5 text-sm font-semibold" style={{ color: 'var(--t-gold)' }}>
              {title[1]}
            </h3>
          );
        }
        return (
          <p key={index} className="text-[14px] leading-[1.9] whitespace-pre-wrap" style={{ color: 'var(--t-text2)' }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

/** Rule interpretations and optional DeepSeek follow-up analysis. */
export default function InsightPanel({ chart, selectedPalace, selectedSiHua, liunianYear,
  timeView = 'mingpan', specificity=0, aiLab=false, onSpecificityChange,sharedBasicAi }: InsightPanelProps) {
  const [activeTopic, setActiveTopic] = useState<OfflineTopic>('overview');
  const [input, setInput] = useState('');
  const [aiTurns, setAiTurns] = useState<Array<{ question: string; answer: string; specificity: number; audit:AiEvidenceAuditResult|null }>>([]);
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [readings, setReadings] = useState<Reading[]>(() =>
    OFFLINE_TOPICS.map(t=>({topic:t.key,heading:t.label,content:buildLayTopicReading(chart,t.key)})));
  const lastPalace = useRef<string | null>(null);
  const lastSihua = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mainSource,setMainSource]=useState<'rules'|'deepseek'>('rules');
  const [mainAudit,setMainAudit]=useState<AiEvidenceAuditResult|null>(null);

  useEffect(() => {
    setAiError(''); setAiTurns([]);
    setActiveTopic('overview');
    setReadings(OFFLINE_TOPICS.map(t=>({topic:t.key,heading:t.label,content:buildLayTopicReading(chart,t.key)})));
    setMainSource('rules');setMainAudit(null);
    lastPalace.current = null;
    lastSihua.current = null;
  }, [chart]);

  useEffect(()=>{
    const chapters=parseSixTopicAnswer(sharedBasicAi?.answer||'');
    if(chapters.length) {
      setReadings(OFFLINE_TOPICS.map(t=>{
        const entry=chapters.find(c=>c.key===t.key);
        return {topic:t.key,heading:t.label,content:entry?.text||buildLayTopicReading(chart,t.key)};
      }));
      setMainAudit(sharedBasicAi?.audit||null);
      setMainSource('deepseek');
      setActiveTopic('overview');
      scrollRef.current?.scrollTo({top:0,behavior:'smooth'});
    }else{
      setReadings(OFFLINE_TOPICS.map(t=>({topic:t.key,heading:t.label,content:buildLayTopicReading(chart,t.key)})));
      setMainAudit(null);setMainSource('rules');setActiveTopic('overview');
    }
  },[chart,sharedBasicAi]);

  useEffect(() => {
    if (!selectedPalace) return;
    const identity = `${selectedPalace.branch}:${selectedPalace.name}`;
    if (lastPalace.current === identity) return;
    lastPalace.current = identity;
    setReadings(prev => {
      const chapters=prev.filter(r=>r.topic);
      const extras=prev.filter(r=>!r.topic);
      return [...chapters,...extras,{
        heading:selectedPalace.name,
        content:offlinePalaceAnalysis(chart,selectedPalace),
      }].slice(0,6).concat([...extras,{
        heading:selectedPalace.name,
        content:offlinePalaceAnalysis(chart,selectedPalace),
      }].slice(-2));
    });
  }, [chart, selectedPalace]);

  useEffect(() => {
    if (!selectedSiHua) return;
    const identity = `${selectedSiHua.view}:${selectedSiHua.starName}:${selectedSiHua.siHua}`;
    if (lastSihua.current === identity) return;
    lastSihua.current = identity;
    setReadings(prev => {
      const chapters=prev.filter(r=>r.topic);
      const extras=prev.filter(r=>!r.topic);
      return [...chapters,...extras,{
        heading:`${selectedSiHua.starName}化${selectedSiHua.siHua}`,
        content:offlineSihuaAnalysis(chart,selectedSiHua),
      }].slice(-8);
    });
  }, [chart, selectedSiHua]);

  const showTopic = (topic: OfflineTopic) => {
    setActiveTopic(topic);
    const node=scrollRef.current?.querySelector<HTMLElement>('[data-reading-topic="'+topic+'"]');
    if(node&&scrollRef.current){
      scrollRef.current.scrollTo({top:scrollRef.current.scrollTop+node.getBoundingClientRect().top-scrollRef.current.getBoundingClientRect().top-8,behavior:'smooth'});
    }
  };
  const onReadingScroll=()=>{
    const scroller=scrollRef.current;
    if(!scroller)return;
    const elements=Array.from(scroller.querySelectorAll<HTMLElement>('[data-reading-topic]'));
    let chosen:OfflineTopic='overview';
    for(const node of elements){
      if(node.getBoundingClientRect().top<=scroller.getBoundingClientRect().top+96)
        chosen=node.dataset.readingTopic as OfflineTopic;
    }
    setActiveTopic(prev=>prev===chosen?prev:chosen);
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
      showTopic(topic);
    }
    setInput('');
  };

  const askAi = async () => {
    if (aiLoading||!input.trim()) return;
    setAiError(''); setAiLoading(true);
    try {
      const response = await fetch('/api/interpret', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({birthInfo:chart.birthInfo,topic:activeTopic,
          style:'plain',specificity,question:input.trim().slice(0,500),
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
      setAiTurns(prev=>[...prev,{question:input.trim().slice(0,500),
        answer:data.answer,specificity,audit:toEvidenceAudit(data.evidenceAudit,data.factualAudit)}].slice(-4));
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
          六个主题直接上下滑动阅读；顶部主题会跟着当前章节自动切换。
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

      <div ref={scrollRef} onScroll={onReadingScroll} className="flex-1 min-h-[260px] max-h-[60vh] xl:max-h-[680px] overflow-y-auto p-3 space-y-4">
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
          <p className="text-[14px] leading-[1.9] whitespace-pre-wrap" style={{color:'var(--t-text2)'}}>{turn.answer}</p>
          <AiEvidencePanel audit={turn.audit}/>
        </article>)}
        {mainSource==='deepseek'&&<p className="text-xs leading-6"
          style={{color:'var(--t-text2)'}}>正在显示 DeepSeek 通俗版；命盘的传统规则依据可在下方完整报告逐条展开。</p>}
        {mainSource==='deepseek'&&<AiEvidencePanel audit={mainAudit}/>}
        {readings.map((reading, index) => (
          <article key={index} data-reading-topic={reading.topic}
            className="rounded-lg p-3 scroll-mt-3" style={{ border: '1px solid var(--t-border)', background: 'var(--t-card)' }}>
            <div className="text-[12px] font-semibold mb-2" style={{ color: 'var(--t-gold)' }}>{reading.heading}</div>
            <ReadingContent content={reading.content} />
            {reading.topic&&<details className="mt-3 pt-2" style={{borderTop:'1px solid var(--t-border)'}}>
              <summary className="cursor-pointer min-h-11 flex items-center text-xs"
                style={{color:'var(--t-text2)'}}>为什么这样说？查看本章命盘描述</summary>
              <ReadingContent content={buildLayTopicReading(chart,reading.topic)}/>
            </details>}
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
        {input.trim()?<button type="button" onClick={askAi} disabled={aiLoading}
          className="w-full rounded-lg min-h-11 px-3 py-3 text-[13px] font-medium disabled:opacity-50"
          style={{border:'1px solid rgba(212,168,67,0.4)',color:'var(--t-gold)',background:'rgba(212,168,67,0.1)'}}>
          {aiLoading?'正在解答…':'向 DeepSeek 提问（独立的一次调用）'}
        </button>:<a href="#chart-report" className="flex items-center justify-center w-full rounded-lg min-h-11 px-3 py-3 text-[13px] font-medium"
          style={{border:'1px solid rgba(212,168,67,0.4)',color:'var(--t-gold)',background:'rgba(212,168,67,0.1)'}}>
          {sharedBasicAi?'查看已生成的 AI 通俗版':'前往生成 AI 通俗版（只需一次）'}
        </a>}
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--t-faint)' }}>
          内容仅供传统文化交流参考，不作为医疗、投资等决策依据。使用 AI 解读时，命盘资料将发送至第三方模型服务。
        </p>
      </footer>
    </section>
  );
}
