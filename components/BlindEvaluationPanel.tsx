'use client';

import { useEffect, useRef, useState } from 'react';
import type { BirthInfo } from '@/lib/ziwei/types';
import { checkBlindAnswerLeakage } from '@/lib/ai/blind-quality';
import {
  assessBlindChoice, BLIND_COMPARISON_QUESTION, buildBlindComparison,
  exportBlindResult, minimalBlindBirth, syntheticControlBirth,
  type BlindChoice, type BlindComparison,
} from '@/lib/ai/blind-evaluation';

const CHOICES:{value:BlindChoice;label:string;detail:string}[]=[
  {value:'A',label:'解读 A',detail:'A 的描述更贴近我'},
  {value:'B',label:'解读 B',detail:'B 的描述更贴近我'},
  {value:'both',label:'两份都像',detail:'难以区分'},
  {value:'neither',label:'两份都不像',detail:'都与我的经历不符'},
  {value:'unsure',label:'无法判断',detail:'缺少足够具体的经历'},
];

type AiAnswer={answer:string;model:string};
async function askDeepSeek(birthInfo:BirthInfo,specificity:number,signal:AbortSignal):Promise<AiAnswer> {
  const response=await fetch('/api/interpret',{
    method:'POST',signal,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      provider:'deepseek',birthInfo,topic:'overview',style:'plain',specificity,
      question:BLIND_COMPARISON_QUESTION,
    }),
  });
  const raw:unknown=await response.json().catch(()=>null);
  const result=raw&&typeof raw==='object'?raw as Record<string,unknown>:null;
  if(!response.ok||typeof result?.answer!=='string'||!result.answer.trim()){
    const error=typeof result?.error==='string'?result.error:
      response.status===429?'当前请求次数较多，请稍后再试。':'模型分析未成功，请稍后重试。';
    throw new Error(error);
  }
  return {answer:result.answer,model:typeof result.model==='string'?result.model:'unknown'};
}
function downloadJson(value:unknown){
  const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='紫微研究_匿名对照盲评.json';
  document.body.appendChild(link);
  link.click();link.remove();URL.revokeObjectURL(url);
}

export default function BlindEvaluationPanel({birthInfo,specificity}:{
  birthInfo:BirthInfo;specificity:number;
}){
  const [expanded,setExpanded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [trial,setTrial]=useState<BlindComparison|null>(null);
  const [choice,setChoice]=useState<BlindChoice|null>(null);
  const [submittedAt,setSubmittedAt]=useState<string|null>(null);
  const [caseId,setCaseId]=useState('');
  const abortRef=useRef<AbortController|null>(null);
  useEffect(()=>{
    setTrial(null);setChoice(null);setSubmittedAt(null);setNotice('');setBusy(false);
    // One anonymous ID per chart in this tab. Subsequent 0/50/100 rounds
    // share it; opening a different chart assigns a new ID automatically.
    setCaseId('CASE-'+window.crypto.randomUUID().slice(0,8).toUpperCase());
    return ()=>abortRef.current?.abort();
  },[birthInfo]);
  const revealed=Boolean(trial&&choice&&submittedAt);
  const canCompare=birthInfo.timePrecision!=='unknown';

  const start=async()=>{
    if(busy||!canCompare)return;
    abortRef.current?.abort();
    const abort=new AbortController();
    abortRef.current=abort;
    setBusy(true);setNotice('');setChoice(null);setSubmittedAt(null);setTrial(null);
    try{
      const target=minimalBlindBirth(birthInfo);
      const synthetic=syntheticControlBirth(birthInfo);
      // Equal 50/50 assignment; not a security boundary.
      const random=new Uint32Array(1);
      window.crypto.getRandomValues(random);
      const targetFirst=(random[0]&1)===0;
      // Serial calls keep cost explicit and avoid one-button request bursts.
      const own=await askDeepSeek(target,specificity,abort.signal);
      const control=await askDeepSeek(synthetic,specificity,abort.signal);
      if(own.model!==control.model)
        throw new Error('两份解读使用了不同的模型版本，此次比较不成立，请重新开始。');
      const leakage=checkBlindAnswerLeakage([own.answer,control.answer],[target,synthetic]);
      if(!leakage.usable)
        throw new Error('模型回答可能泄露出生信息或对照盘来源，已将此次盲评标为无效：'+leakage.flags.join('；')+'。');
      if(!abort.signal.aborted)
        setTrial(buildBlindComparison(own,control,targetFirst,specificity,new Date().toISOString()));
    }catch(error){
      if(!abort.signal.aborted)
        setNotice((error instanceof Error?error.message:'生成失败')+
          ' 如已经产生部分调用，模型服务可能已计费；未完成的两份结果不会用于盲评。');
    }finally{
      if(!abort.signal.aborted)setBusy(false);
      if(abortRef.current===abort)abortRef.current=null;
    }
  };

  return <section className="mt-4 rounded-xl p-3 sm:p-4 space-y-3"
    style={{border:'1px solid var(--t-border)',background:'var(--t-surface)'}}>
    <div className="flex flex-wrap justify-end">
      <a href="/lab/blind-results" className="inline-flex items-center min-h-11 text-xs underline"
        style={{color:'var(--t-gold)'}}>打开盲评结果汇总工作台 →</a>
    </div>
    <div className="flex flex-wrap justify-between gap-2 items-center">
      <div>
        <h3 className="font-semibold text-sm" style={{color:'var(--t-text)'}}>匿名命盘对照 · 实验</h3>
        <p className="mt-1 text-xs leading-5" style={{color:'var(--t-text2)'}}>
          先看两份解读再选出更像自己的一份，提交后才揭晓来源。
        </p>
      </div>
      <button type="button" onClick={()=>{
        if(expanded&&busy){
          abortRef.current?.abort();
          setBusy(false);
          setNotice('已终止尚未完成的盲评；发出的单次请求可能已经计费。');
        }
        setExpanded(v=>!v);
      }} aria-expanded={expanded}
        className="min-h-11 rounded-lg px-3 text-xs"
        style={{border:'1px solid var(--t-border)',color:'var(--t-gold)'}}>
        {expanded?'收起实验':'开始盲评实验'}
      </button>
    </div>
    {expanded&&<>
      <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
        两份都由 DeepSeek 按相同提示词、模型和明确度生成：一份取自当前命盘，
        另一份是程序生成的合成对照命盘。生成前不展示哪份属于你。
        每轮需要 <strong>2 次 AI 请求</strong>，不会自动开始；请求会向 DeepSeek 发送用于排盘的年月日、时辰及性别。
        这是个人自我判断的弱盲评，不是严格双盲，也不能据此证明预测准确。
      </p>
      {!canCompare&&<p role="note" className="text-xs leading-6" style={{color:'#f59e0b'}}>
        当前出生时辰不详，暂不提供两份固定命盘的比较，请先核实出生时间。
      </p>}
      {!trial&&<button type="button" onClick={start} disabled={busy||!canCompare}
        className="min-h-11 rounded-lg px-4 text-sm disabled:opacity-50"
        style={{color:'var(--t-gold)',border:'1px solid rgba(212,168,67,0.5)'}}>
        {busy?'正在顺序生成两份解读（可能需要一些时间）…':`生成 A/B 两份解读（明确度 ${specificity}，2 次调用）`}
      </button>}
      {notice&&<p role="status" className="text-xs leading-6" style={{color:'#f59e0b'}}>{notice}</p>}
      {trial&&<>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          两份解读已经准备好。先依据真实经历评价，不要查看页面源代码或开发者工具；
          这种方式只能减少先验偏见，不能保证严格盲态。
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {trial.panels.map(panel=><article key={panel.label} className="rounded-xl p-4 space-y-2"
            style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
            <h4 className="font-semibold" style={{color:'var(--t-gold)'}}>解读 {panel.label}</h4>
            <p className="text-sm whitespace-pre-wrap leading-7" style={{color:'var(--t-text2)'}}>
              {panel.answer}
            </p>
          </article>)}
        </div>
        <p className="text-sm font-medium" style={{color:'var(--t-text)'}}>
          选择更符合你实际经历的解读
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CHOICES.map(option=><button key={option.value} type="button"
            disabled={Boolean(submittedAt)} aria-pressed={choice===option.value}
            onClick={()=>setChoice(option.value)}
            className="min-h-11 rounded-lg px-3 py-2 text-left disabled:opacity-75"
            style={{border:choice===option.value?'1px solid var(--t-gold)':'1px solid var(--t-border)',
              color:choice===option.value?'var(--t-gold)':'var(--t-text2)'}}>
            <span className="block text-sm">{option.label}</span>
            <span className="block text-xs mt-1">{option.detail}</span>
          </button>)}
        </div>
        {!submittedAt&&<button type="button" disabled={!choice} onClick={()=>setSubmittedAt(new Date().toISOString())}
          className="min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
          style={{color:'var(--t-gold)',border:'1px solid rgba(212,168,67,0.5)'}}>
          提交选择并揭晓来源
        </button>}
        {revealed&&choice&&submittedAt&&<div role="status" className="rounded-xl p-4 space-y-2"
          style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
          <h4 className="font-semibold text-sm" style={{color:'var(--t-gold)'}}>来源揭晓</h4>
          <p className="text-sm leading-7" style={{color:'var(--t-text)'}}>
            当前真实命盘对应的是解读 {trial.targetPosition}；
            另一份是合成对照命盘。你选择了「{CHOICES.find(x=>x.value===choice)?.label}」。
          </p>
          <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
            这次结果记录为 {assessBlindChoice(choice,trial.targetPosition)}。
            一次选择没有统计意义，也不代表紫微斗数的人格或事件预测能力得到证实。
          </p>
          <label className="block text-xs leading-6" style={{color:'var(--t-text2)'}}>
            匿名样本编号（自动生成；同一命盘的不同档位请沿用）
            <input value={caseId} onChange={e=>setCaseId(e.target.value)} maxLength={64}
              className="block mt-1 rounded-lg w-full p-3 text-base"
              style={{color:'var(--t-text)',background:'var(--t-surface)',border:'1px solid var(--t-border)'}}
              placeholder="例如 CASE-001"/>
          </label>
          <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
            建议保留此编号，方便把同一命盘的 0、50、100 档结果配对；切换到另一命盘会自动生成新编号。
            页面刷新后也会重新生成，需要跨会话对照时请自行抄录并填回。不要用姓名或联系方式作为编号。
          </p>
          <button type="button" onClick={()=>downloadJson(exportBlindResult(trial,choice,caseId,submittedAt))}
            className="min-h-11 rounded-lg px-3 text-sm"
            style={{border:'1px solid var(--t-border)',color:'var(--t-gold)'}}>
            导出此次盲评结果
          </button>
          <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
            仅在浏览器中导出，不自动上传或持久化出生数据。
            导出文本中仍可能包含模型编造的个人信息，请在对外分享前检查。
          </p>
        </div>}
        <button type="button" disabled={busy} onClick={()=>{setTrial(null);setChoice(null);setSubmittedAt(null);setNotice('');}}
          className="min-h-11 text-xs underline" style={{color:'var(--t-text2)'}}>
          清除当前对照结果（再次生成需另外 2 次调用）
        </button>
      </>}
    </>}
  </section>;
}
