'use client';

import { useEffect, useRef, useState } from 'react';
import { OFFLINE_TOPICS, type OfflineTopic } from '@/lib/ziwei/offline-interpretation';
import type { PlainSection } from '@/lib/ziwei/plain-language-report';
import type { AiReadingSection } from '@/lib/ai/reading-sections';
import type { AiEvidenceAuditResult } from '@/components/AiEvidencePanel';
import type { DeepGroundingResult } from '@/lib/ai/deep-grounding';

export default function AiChapterReader({
  fallback,chapters,audit,grounding,variant='basic',
}:{
  fallback:PlainSection[];
  chapters?:AiReadingSection[];
  audit?:AiEvidenceAuditResult|null;
  grounding?:DeepGroundingResult|null;
  variant?:'basic'|'deep';
}){
  const [active,setActive]=useState<OfflineTopic>('overview');
  const viewport=useRef<HTMLDivElement>(null);
  const cards=useRef<Partial<Record<OfflineTopic,HTMLElement|null>>>({});
  const isAi=Boolean(chapters?.length);
  useEffect(()=>{
    let frame=0;
    const update=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const start=128;
        let next:OfflineTopic=OFFLINE_TOPICS[0].key;
        for(const topic of OFFLINE_TOPICS){
          const node=cards.current[topic.key];
          if(node && node.getBoundingClientRect().top<=start)next=topic.key;
        }
        setActive(prev=>prev===next?prev:next);
        const activeTab=viewport.current?.querySelector<HTMLButtonElement>('[data-topic="'+next+'"]');
        if(activeTab && viewport.current) {
          const bar=viewport.current;
          const a=activeTab.offsetLeft;
          if(a<bar.scrollLeft || a+activeTab.offsetWidth>bar.scrollLeft+bar.clientWidth)
            bar.scrollTo({left:Math.max(0,a-bar.clientWidth/3),behavior:'smooth'});
        }
      });
    };
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    update();
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[chapters,fallback]);

  const jump=(key:OfflineTopic)=>{
    setActive(key);
    cards.current[key]?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  return <div className="space-y-3">
    <div className="sticky z-30 rounded-xl p-2" style={{
      top:'calc(var(--ziwei-nav-height, 60px) + 8px)',
      background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
      <div ref={viewport} className="flex items-center gap-1.5 overflow-x-auto" role="navigation"
        aria-label={variant==='deep'?'深度解读六大主题':'通俗解读六大主题'}>
        {OFFLINE_TOPICS.map(topic=><button key={topic.key} type="button"
          data-topic={topic.key} aria-current={active===topic.key?'location':undefined}
          onClick={()=>jump(topic.key)}
          className="rounded-lg px-3 py-2 min-h-11 whitespace-nowrap text-sm font-medium shrink-0"
          style={{background:active===topic.key?'rgba(212,168,67,0.14)':'transparent',
            color:active===topic.key?'var(--t-gold)':'var(--t-text2)'}}>
          {topic.label}
        </button>)}
      </div>
    </div>
    {OFFLINE_TOPICS.map((topic,i)=>{
      const section=fallback.find(s=>s.key===topic.key);
      const ai=chapters?.find(s=>s.key===topic.key);
      const ids=ai?.referenceIds??[];
      const references=audit?.cited.filter(ref=>ids.includes(ref.id))??[];
      const ground=variant==='deep'?grounding?.chapters.find(g=>g.topic===topic.key):undefined;
      return <article key={topic.key} id={'ai-chapter-'+variant+'-'+topic.key}
        ref={node=>{cards.current[topic.key]=node;}}
        className="rounded-xl p-4 sm:p-5 space-y-3 scroll-mt-36"
        style={{border:'1px solid var(--t-border)',background:'var(--t-surface)'}}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-base" style={{color:'var(--t-gold)'}}>
            {i+1}. {topic.label}
          </h3>
          <span className="text-xs" style={{color:'var(--t-faint)'}}>
            {ai?'DeepSeek':'命盘规则参考'}
          </span>
        </div>
        {ai?<p className="text-[15px] leading-8 whitespace-pre-wrap break-words"
          style={{color:'var(--t-text)'}}>{ai.text}</p>
        :section?<div className="space-y-2">
          <p className="text-[15px] leading-8 font-medium" style={{color:'var(--t-text)'}}>{section.lead}</p>
          <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>{section.observation}</p>
          <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>{section.suggestion}</p>
        </div>:<p className="text-sm" style={{color:'var(--t-text2)'}}>当前缺少这部分分析。</p>}
        {ground?.focus&&<div className="rounded-lg p-3 text-xs leading-6 space-y-1"
          style={{border:'1px solid var(--t-border)',background:'var(--t-card)',color:'var(--t-text2)'}}>
          <p className="font-semibold">本章排盘事实 · 非 AI 推断</p>
          <p>[{ground.focus.id}] {ground.focus.fact}</p>
          {ground.opposite&&<p>对宫参考 [{ground.opposite.id}] {ground.opposite.fact}</p>}
          {ai&&<p style={{color:ground.hasRelevantCitation?'var(--t-text2)':'#f59e0b'}}>
            {ground.hasRelevantCitation
              ? 'AI 已引用本章本宫／对宫／三方的 '+ground.relevantCitations.length+' 项盘面资料；人生解释仍待本人核对。'
              : 'AI 未引用本章本宫／对宫／三方的可核查编号；下方事实由排盘引擎独立提供，不等于 AI 结论有依据。'}
            {' '}已识别到可核对事实 {ground.explicitFactMatches} 条，矛盾 {ground.explicitFactConflicts} 条（仅限固定句式）。
          </p>}
        </div>}
        {isAi&&!ai&&<p className="text-xs leading-6" style={{color:'#f59e0b'}}>
          AI 这次没有按要求生成该主题，下面保留命盘规则解读供参考。
        </p>}
        <details className="rounded-lg px-3" style={{border:'1px solid var(--t-border)'}}>
          <summary className="cursor-pointer flex items-center min-h-11 text-sm"
            style={{color:'var(--t-text2)'}}>为什么这样说？展开查看对应命盘依据</summary>
          <div className="pb-3 space-y-2 text-xs leading-6" style={{color:'var(--t-text2)'}}>
            <p>{section?.evidence||'尚无对应的命盘规则资料。'}</p>
            {ground&&<p>本章事实由排盘引擎直接生成，AI 的生活推测不能仅凭引用编号获得真实性背书。</p>}
            {references.length>0&&<div>
              <p className="font-medium">AI 引用的盘面资料：</p>
              {references.map(ref=><p key={ref.id}>[{ref.id}] {ref.fact}</p>)}
            </div>}
            {ai&&ids.length>0&&references.length===0&&
              <p>模型引用的编号尚未核实，请在完整事实检查中复核。</p>}
            <p>这里说明传统取象所依据的盘面结构，不代表这些人生判断已被事实验证。</p>
          </div>
        </details>
      </article>;
    })}
  </div>;
}
