'use client';
import { useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { matchOfflineTopic } from '@/lib/ziwei/offline-interpretation';
import AiEvidencePanel,{toEvidenceAudit,type AiEvidenceAuditResult} from '@/components/AiEvidencePanel';
type Turn={question:string;answer:string;audit:AiEvidenceAuditResult|null};
export default function ReportFollowup({chart,specificity=0}:{chart:ZiweiChart;specificity?:number}){
 const [input,setInput]=useState('');
 const [history,setHistory]=useState<Turn[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const ask=async()=>{
   const question=input.trim().slice(0,120);
   if(!question||busy)return;
   setBusy(true);setError('');
   try{
     const resp=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({birthInfo:chart.birthInfo,topic:matchOfflineTopic(question)??'overview',
         style:'plain',specificity,question,
         history:history.slice(-3).flatMap(t=>[
           {role:'user',content:t.question.slice(0,500)},
           {role:'assistant',content:t.answer.slice(0,600)},
         ])})});
     const data:unknown=await resp.json().catch(()=>null);
     const v=data&&typeof data==='object'?data as Record<string,unknown>:null;
     if(!resp.ok||typeof v?.answer!=='string'||!v.answer.trim())
       throw new Error(resp.status===429?'AI 体验次数较多，请稍后再试。':
         typeof v?.error==='string'?v.error:'AI 暂时未返回有效解读，请稍后重试。');
     setHistory(prev=>[...prev,{question,answer:v.answer as string,
       audit:toEvidenceAudit(v.evidenceAudit,v.factualAudit)}].slice(-4));
     setInput('');
   }catch(e){setError(e instanceof Error?e.message:'AI 请求失败');}
   finally{setBusy(false);}
 };
 return <section className="mt-6 rounded-xl p-4 space-y-3"
   style={{border:'1px solid var(--t-border)',background:'var(--t-surface)'}}>
   <h3 className="text-base font-semibold" style={{color:'var(--t-text)'}}>围绕命盘继续提问</h3>
   <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
     可选。提交时会将当前命盘和最近问答发送至 DeepSeek，不会自动上传评价反馈。
   </p>
   <form className="flex flex-col sm:flex-row gap-2" onSubmit={e=>{e.preventDefault();void ask();}}>
     <input type="text" value={input} maxLength={120} onChange={e=>setInput(e.target.value)}
       className="min-w-0 flex-1 min-h-11 rounded-lg px-3 text-base"
       placeholder="例如：事业宫和财帛宫有什么关联？" aria-label="向 DeepSeek 追问"
       style={{background:'var(--t-card)',color:'var(--t-text)',border:'1px solid var(--t-border)'}}/>
     <button type="submit" disabled={!input.trim()||busy} className="min-h-11 rounded-lg px-4 text-sm disabled:opacity-40"
       style={{color:'var(--t-gold)',border:'1px solid rgba(212,168,67,.4)'}}>
       {busy?'正在解答…':'向 DeepSeek 提问'}
     </button>
   </form>
   {error&&<p role="alert" className="text-xs" style={{color:'#f59e0b'}}>{error}</p>}
   {history.length>0&&<div className="space-y-3">
     <button type="button" onClick={()=>{setHistory([]);setError('');}}
       className="text-xs min-h-11 underline" style={{color:'var(--t-text2)'}}>清空本次对话</button>
     {history.map((turn,i)=><article key={i} className="rounded-lg p-3 space-y-2"
       style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
       <h4 className="font-semibold text-sm" style={{color:'var(--t-gold)'}}>提问：{turn.question}</h4>
       <p className="text-sm leading-8 whitespace-pre-wrap" style={{color:'var(--t-text)'}}>{turn.answer}</p>
       <AiEvidencePanel audit={turn.audit}/>
     </article>)}
   </div>}
 </section>;
}
