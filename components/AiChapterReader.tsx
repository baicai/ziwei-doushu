'use client';

import { useEffect, useRef, useState } from 'react';
import { OFFLINE_TOPICS, type OfflineTopic } from '@/lib/ziwei/offline-interpretation';
import type { PlainSection } from '@/lib/ziwei/plain-language-report';
import type { AiReadingSection } from '@/lib/ai/reading-sections';
import type { AiEvidenceAuditResult } from '@/components/AiEvidencePanel';
import type { DeepGroundingResult } from '@/lib/ai/deep-grounding';
import type { BirthInfo } from '@/lib/ziwei/types';
import { splitReadingForFeedback } from '@/lib/ai/reading-presentation';
import {
  readingFeedbackScope, readingTextId, readReadingFeedback, writeReadingFeedback,
  excerptForReading, READING_FEEDBACK_EVENT, readingFeedbackKey,
  type ReadingFeedbackStore, type ReadingFeedbackChoice,
} from '@/lib/ai/reading-feedback';

export default function AiChapterReader({
  fallback,chapters,audit,grounding,birthInfo,enableFeedback=true,variant='basic',
}:{
  fallback:PlainSection[];
  chapters?:AiReadingSection[];
  audit?:AiEvidenceAuditResult|null;
  grounding?:DeepGroundingResult|null;
  birthInfo:BirthInfo;
  enableFeedback?:boolean;
  variant?:'basic'|'deep';
}){
  const [active,setActive]=useState<OfflineTopic>('overview');
  const viewport=useRef<HTMLDivElement>(null);
  const cards=useRef<Partial<Record<OfflineTopic,HTMLElement|null>>>({});
  const isAi=Boolean(chapters?.length);
  // Do not use the optional name as an identity key. The scope is a digest of the chart input.
  const birthMarker=JSON.stringify(birthInfo);
  const [feedbackState,setFeedbackState]=useState<{marker:string;scope:string;entries:ReadingFeedbackStore}|null>(null);
  const [feedbackError,setFeedbackError]=useState('');
  const feedbackScope=feedbackState?.marker===birthMarker?feedbackState.scope:null;
  const feedback=feedbackScope?feedbackState?.entries??{}:{};
  useEffect(()=>{
    if(!enableFeedback)return;
    let cancelled=false;
    readingFeedbackScope(birthInfo).then(scope=>{
      if(cancelled)return;
      if(!scope){setFeedbackError('当前浏览器无法保存解读反馈，已显示完整解读。');return;}
      const refresh=()=>setFeedbackState({marker:birthMarker,scope,entries:readReadingFeedback(window.localStorage,scope)});
      refresh();
      window.addEventListener(READING_FEEDBACK_EVENT,refresh);
      // Store the listener for cleanup in this effect's synchronous closure.
      unsubscribe=()=>window.removeEventListener(READING_FEEDBACK_EVENT,refresh);
    }).catch(()=>{if(!cancelled)setFeedbackError('当前浏览器无法保存解读反馈。');});
    let unsubscribe=()=>{};
    return ()=>{cancelled=true;unsubscribe();};
  },[birthMarker,enableFeedback]);
  const chooseFeedback=(id:string,topic:OfflineTopic,source:'offline'|'basic'|'deep',text:string,choice:ReadingFeedbackChoice)=>{
    if(!feedbackScope)return;
    const next={...feedback};
    if(next[id]?.choice===choice)delete next[id];
    else next[id]={id,topic,source,choice,excerpt:excerptForReading(text),updatedAt:Date.now()};
    try{
      writeReadingFeedback(window.localStorage,feedbackScope,next);
      setFeedbackError('');
      window.dispatchEvent(new Event(READING_FEEDBACK_EVENT));
    }catch{setFeedbackError('保存失败，请检查浏览器是否禁用了本地存储。');}
  };
  const clearFeedback=()=>{
    if(!feedbackScope||!window.confirm('清除当前命盘在此浏览器保存的全部解读反馈？'))return;
    try{
      window.localStorage.removeItem(readingFeedbackKey(feedbackScope));
      setFeedbackError('');
      window.dispatchEvent(new Event(READING_FEEDBACK_EVENT));
    }catch{setFeedbackError('清除失败，请检查浏览器存储权限。');}
  };
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
    {enableFeedback&&feedbackScope&&<div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs"
      style={{color:'var(--t-text2)'}}>
      <span>你的解读反馈：本机已记 {Object.keys(feedback).length} 条 · 不会上传或改变命盘</span>
      {Object.keys(feedback).length>0&&<button type="button" onClick={clearFeedback}
        className="min-h-11 underline" style={{color:'var(--t-text2)'}}>清除本命盘反馈</button>}
    </div>}
    {feedbackError&&<p role="alert" className="text-xs" style={{color:'#f59e0b'}}>{feedbackError}</p>}
    {OFFLINE_TOPICS.map((topic,i)=>{
      const section=fallback.find(s=>s.key===topic.key);
      const ai=chapters?.find(s=>s.key===topic.key);
      const ids=ai?.referenceIds??[];
      const references=audit?.cited.filter(ref=>ids.includes(ref.id))??[];
      const ground=variant==='deep'?grounding?.chapters.find(g=>g.topic===topic.key):undefined;
      const feedbackSource=ai?variant:'offline';
      // Keep existing content fingerprints: old feedback remains attached to the exact
      // reading even though the visible presentation now progressively reveals it.
      const feedbackText=ai?.text??(section?[section.lead,section.observation,section.suggestion].join('\n'):'');
      const feedbackId=readingTextId(feedbackSource,topic.key,feedbackText);
      const selected=feedback[feedbackId]?.choice;
      const aiReading=ai?splitReadingForFeedback(ai.text):null;
      const lead=aiReading?.lead??section?.lead??'当前缺少这部分分析。';
      const details=aiReading?.details??'';
      const expanded=!!selected||!enableFeedback||!!feedbackError;
      const evidenceNote=ai
        ? '本节生活情境仅用于说明传统命盘的解释方向，不表示你确实做过这些事。'
        : section?.evidenceNote??'本节是传统命盘解释参考，不表示已核实个人经历。';
      return <article key={topic.key} id={'ai-chapter-'+variant+'-'+topic.key}
        ref={node=>{cards.current[topic.key]=node;}}
        className="rounded-xl p-4 sm:p-5 space-y-3 scroll-mt-36"
        style={{border:'1px solid var(--t-border)',background:'var(--t-surface)'}}>
        <h3 className="font-semibold text-base" style={{color:'var(--t-gold)'}}>
          {i+1}. {topic.label}
        </h3>

        <p className="text-[15px] leading-8 font-semibold break-words" style={{color:'var(--t-text)'}}>
          {lead}
        </p>
        {enableFeedback&&feedbackScope&&feedbackText&&<div className="flex flex-wrap gap-2"
          role="group" aria-label={topic.label+'解读反馈'}>
          {([['agree','比较符合'],['partial','部分符合'],['disagree','不符合']] as const).map(([choice,label])=>
            <button key={choice} type="button" aria-pressed={selected===choice}
              aria-controls={'ai-chapter-details-'+variant+'-'+topic.key}
              aria-expanded={expanded}
              onClick={()=>chooseFeedback(feedbackId,topic.key,feedbackSource,feedbackText,choice)}
              className="min-h-11 rounded-lg px-3 sm:px-4 text-sm transition-colors"
              style={{
                border:selected===choice?'1px solid rgba(212,168,67,.5)':'1px solid var(--t-border)',
                background:selected===choice?'rgba(212,168,67,.15)':'transparent',
                color:selected===choice?'var(--t-gold)':'var(--t-text2)',
                fontWeight:selected===choice?600:400,
              }}>{label}</button>)}
        </div>}

        {expanded&&<div id={'ai-chapter-details-'+variant+'-'+topic.key}
          className="space-y-4 pt-3" style={{borderTop:'1px solid var(--t-border)'}}>
          {aiReading?details&&<p className="text-sm leading-8 whitespace-pre-wrap break-words"
            style={{color:'var(--t-text2)'}}>{details}</p>
          :section&&<div className="space-y-2">
            <p className="text-sm leading-8" style={{color:'var(--t-text2)'}}>{section.observation}</p>
            <p className="text-sm leading-8" style={{color:'var(--t-text2)'}}>{section.suggestion}</p>
          </div>}
          <section className="rounded-lg p-3 space-y-2"
            style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
            <h4 className="font-semibold text-sm" style={{color:'var(--t-text)'}}>命盘依据</h4>
            <div className="text-xs leading-7 space-y-1" style={{color:'var(--t-text2)'}}>
              {ground?.focus?<div className="space-y-1">
                <p>{ground.focus.fact}</p>
                {ground.opposite&&<p>对宫：{ground.opposite.fact}</p>}
              </div>:<p>{section?.evidence??'当前缺少可核对的宫位依据。'}</p>}
              {references.length>0&&<div className="space-y-1">
                {references.map(ref=><p key={ref.id}>[{ref.id}] {ref.fact}</p>)}
              </div>}
              {ai&&ids.length>0&&references.length===0&&
                <p style={{color:'#f59e0b'}}>本节引用编号尚未核实。</p>}
            </div>
            <p className="text-xs leading-6 pt-2" style={{
              color:'var(--t-faint)',borderTop:'1px solid var(--t-border)'}}>
              {evidenceNote}
            </p>
          </section>
        </div>}
        {isAi&&!ai&&<p className="text-xs leading-6" style={{color:'#f59e0b'}}>
          AI 这次未完整生成该主题，显示的是命盘规则参考内容。
        </p>}
      </article>;
  </div>;
}
