'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { OFFLINE_TOPICS, offlineTopicAnalysis } from '@/lib/ziwei/offline-interpretation';
import { selectedTimeReading } from '@/lib/ziwei/time-reading';
import { buildPlainSections, buildPlainTextReport } from '@/lib/ziwei/plain-language-report';
import AiSpecificityControl from '@/components/AiSpecificityControl';
import AiEvidencePanel, {toEvidenceAudit} from '@/components/AiEvidencePanel';
import {buildExperimentExport, REVIEW_LABELS, type ExperimentRun, type HumanReview} from '@/lib/ai/evaluation';
import { specificityLabel } from '@/lib/ai/specificity';
import { parseReviewableHypotheses } from '@/lib/ai/hypotheses';
import { DIRECT_USER_QUESTION } from '@/lib/ai/lay-writing';
import BlindEvaluationPanel from '@/components/BlindEvaluationPanel';
import AiChapterReader from '@/components/AiChapterReader';
import { parseSixTopicAnswer } from '@/lib/ai/reading-sections';
import type { DeepGroundingResult } from '@/lib/ai/deep-grounding';

export function buildChartReport(chart: ZiweiChart, year: number): string {
  const lines = [
    '# 紫微研究 · 命盘专业依据',
    '',
    '称呼：' + (chart.birthInfo.name || '未填写'),
    '出生日期（换算后的公历）：' +
      [chart.birthInfo.year, chart.birthInfo.month, chart.birthInfo.day].join('-'),
    '出生时辰：' + (chart.birthInfo.timePrecision === 'unknown' ? '不详（仅为试排参考）' : '已填写'),
    '本报告属于传统文化资料，不构成医疗、投资及其他专业建议。',
    '',
  ];
  if (chart.birthInfo.timePrecision === 'unknown')
    lines.push('**重要提示：** 因时辰不详，所示宫位及全部解读都不能作为确定命盘。', '');
  for (const topic of OFFLINE_TOPICS)
    lines.push('## ' + topic.label, '', offlineTopicAnalysis(chart, topic.key), '');
  for (const [view, title] of [['daxian', '大限参考'], ['liunian', '流年参考']] as const) {
    const data = selectedTimeReading(chart, view, year);
    if (data) lines.push('## ' + title, '', data.title, ...data.details, ...data.limitations, '');
  }
  lines.push('---', '本报告由当前命盘的规则解读汇总生成，不包含 AI 的独立判断。');
  return lines.join('\n');
}

function downloadText(content:string,filename:string,mime='text/plain;charset=utf-8') {
  const file = new Blob([content], { type:mime });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char] || char);
}
function reportHtml(content:string):string {
  return content.split('\n').map(line=>{
    const value=line.trim();
    if (!value) return '<div style="height:10px"></div>';
    const section=value.match(/^#{1,2} (.+)$/) || value.match(/^【(.+)】$/);
    if(section)return '<h2>'+escapeHtml(section[1])+'</h2>';
    const heading=value.match(/^\*\*【(.+?)】\*\*$/);
    if(heading)return '<h3>'+escapeHtml(heading[1])+'</h3>';
    if(value==='---')return '<hr/>';
    return '<p>'+escapeHtml(value.replace(/\*\*/g,''))+'</p>';
  }).join('\n');
}
function printReport(content:string):boolean {
  const popup=window.open('','_blank','width=800,height=900');
  if(!popup)return false;
  popup.document.open();
  popup.document.write('<!doctype html><html lang="zh"><head><meta charset="utf-8"/><title>紫微研究 · 命盘报告</title><style>body{font-family:system-ui,"Microsoft Yahei",sans-serif;max-width:780px;padding:24px;margin:auto;color:#222;line-height:1.75}h2{font-size:19px;margin:24px 0 9px}h3{font-size:15px;margin:16px 0 6px}p{font-size:13px;margin:6px 0}@media print{body{padding:5mm}h2{break-after:avoid}}</style></head><body>'+reportHtml(content)+'</body></html>');
  popup.document.close();
  popup.focus();
  popup.print();
  return true;
}
function ProfessionalReport({report}:{report:string}) {
  return <div className="space-y-1 rounded-xl p-3 sm:p-5" style={{background:'var(--t-surface)'}}>
    {report.split('\n').map((line,i)=>{
      const value=line.trim();
      if(!value)return <div key={i} className="h-2"/>;
      if(value==='---')return <hr key={i} style={{borderColor:'var(--t-border)'}}/>;
      const headline=value.match(/^#{1,2} (.+)$/);
      if(headline)return <h3 key={i} className="font-semibold text-base sm:text-lg mt-4 mb-2"
        style={{color:'var(--t-gold)'}}>{headline[1]}</h3>;
      const subtitle=value.match(/^\*\*【(.+)】\*\*$/);
      if(subtitle)return <h4 key={i} className="font-medium text-sm mt-4"
        style={{color:'var(--t-text)'}}>{subtitle[1]}</h4>;
      return <p key={i} className="text-sm leading-7 break-words"
        style={{color:'var(--t-text2)'}}>{value.replace(/\*\*/g,'')}</p>;
    })}
  </div>;
}

export default function ReportPanel({ chart, year, specificity=0, aiLab=false, onSpecificityChange,
  onBasicAiReady,onBasicAiClear }: {
  chart: ZiweiChart; year: number; specificity?: number; aiLab?: boolean;
  onSpecificityChange?: (value:number)=>void;
  onBasicAiReady?:(answer:string,audit:ReturnType<typeof toEvidenceAudit>)=>void;
  onBasicAiClear?:()=>void;
}) {
  const [open,setOpen]=useState(true);
  const [version,setVersion]=useState<'plain'|'evidence'>('plain');
  const [notice,setNotice]=useState('');
  const [aiRuns,setAiRuns]=useState<ExperimentRun[]>([]);
  const [caseId,setCaseId]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  const [deepBusy,setDeepBusy]=useState(false);
  const [deepResult,setDeepResult]=useState<{
    answer:string;audit:ReturnType<typeof toEvidenceAudit>;
    grounding:DeepGroundingResult|null;
    quality:{complete:boolean;reviewRequired:boolean;
      warnings:{code:string;message:string;topics:string[]}[];limitation:string;}|null;
  }|null>(null);
  const [deepError,setDeepError]=useState('');
  const sections=useMemo(()=>buildPlainSections(chart),[chart]);
  const plainText=useMemo(()=>buildPlainTextReport(chart,year),[chart,year]);
  const evidenceText=useMemo(()=>buildChartReport(chart,year),[chart,year]);
  const visible=version==='plain'?plainText:evidenceText;
  const latestAi=aiRuns[aiRuns.length-1];
  const layChapters=useMemo(()=>parseSixTopicAnswer(latestAi?.answer||''),[latestAi?.answer]);
  const deepChapters=useMemo(()=>parseSixTopicAnswer(deepResult?.answer||''),[deepResult?.answer]);

  useEffect(()=>{setAiRuns([]);setDeepResult(null);setDeepError('');setNotice('');},[chart]);

  const requestAi=async()=>{
    if(aiBusy)return;
    setAiBusy(true);setNotice('');
    try{
      const response=await fetch('/api/interpret',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          birthInfo:chart.birthInfo,topic:'overview',style:'plain',specificity,
          question:DIRECT_USER_QUESTION,
        }),
      });
      const data:unknown=await response.json().catch(()=>null);
      const parsed=data && typeof data==='object'?data as Record<string,unknown>:null;
      if(!response.ok || !parsed || typeof parsed.answer!=='string')throw new Error(
        response.status===429?'当前 AI 体验次数较多，请稍后再试。':
        typeof parsed?.error==='string'?parsed.error:'AI 暂时不可用，请稍后再试。');
      const hypothesisCheck=specificity>=80?parseReviewableHypotheses(parsed.answer):null;
      const audit=toEvidenceAudit(parsed.evidenceAudit,parsed.factualAudit);
      onBasicAiReady?.(parsed.answer,audit);
      setAiRuns(prev=>[...prev,{answer:parsed.answer as string,specificity,audit,
        model:typeof parsed.model==='string'?parsed.model:'unknown',
        writingVersion:typeof parsed.writingVersion==='string'?parsed.writingVersion:'untracked',review:null,note:'',
        hypotheses:hypothesisCheck?.hypotheses.map(h=>({...h,review:null,note:''})),
        hypothesisFormatComplete:hypothesisCheck?.complete,
        hypothesisFormatWarning:hypothesisCheck?.warning,
      }].slice(-4));
    }catch(e){setNotice(e instanceof Error?e.message:'AI 暂时不可用');}
    finally{setAiBusy(false);}
  };

  const requestDeep=async()=>{
    if(deepBusy)return;
    setDeepBusy(true);setDeepError('');
    try {
      const response=await fetch('/api/interpret',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({birthInfo:chart.birthInfo,topic:'overview',style:'plain',
          readingTier:'deep',specificity:Math.max(20,specificity),
          question:'请写六个主题的深度版白话解读，比基础版更具体：遇事怎么做、为何容易吃亏、怎样用过去经历核对，以及这周能怎么改。不要编造我的真实经历。'}),
      });
      const data:unknown=await response.json().catch(()=>null);
      const result=data&&typeof data==='object'?data as Record<string,unknown>:null;
      if(!response.ok||typeof result?.answer!=='string'||!result.answer.trim())
        throw new Error(typeof result?.error==='string'?result.error:'深度解读未能生成，请稍后重试。');
      const qa=result.deepQualityAudit&&typeof result.deepQualityAudit==='object'
        ? result.deepQualityAudit as Record<string,unknown> : null;
      const warnings=Array.isArray(qa?.warnings) ? qa.warnings.flatMap(item=>{
        if(!item||typeof item!=='object')return [];
        const w=item as Record<string,unknown>;
        return typeof w.message==='string'&&typeof w.code==='string'
          ? [{code:w.code,message:w.message,topics:Array.isArray(w.topics)?w.topics.filter(x=>typeof x==='string') as string[]:[]}]
          : [];
      }) : [];
      setDeepResult({answer:result.answer,
        audit:toEvidenceAudit(result.evidenceAudit,result.factualAudit),
        grounding:result.deepGrounding && typeof result.deepGrounding==='object' ? result.deepGrounding as DeepGroundingResult : null,
        quality:qa?{complete:qa.complete===true,reviewRequired:qa.reviewRequired===true,
          warnings,limitation:typeof qa.limitation==='string'?qa.limitation:''}:null});
    }catch(e){setDeepError(e instanceof Error?e.message:'深度解读暂时不可用');}
    finally{setDeepBusy(false);}
  };

  return <section id="chart-report" className="mt-5 rounded-xl p-3 sm:p-5"
    style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold" style={{color:'var(--t-text)'}}>我的命盘解读</h2>
        <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>
          从传统命盘看不同领域的特点与关联；每章可查看依据，也可以一键反馈是否符合。
        </p>
      </div>
      <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}
        className="min-h-11 px-4 rounded-lg text-sm"
        style={{border:'1px solid var(--t-border)',color:'var(--t-gold)'}}>
        {open?'收起报告':'展开报告'}
      </button>
    </div>

    {open&&<>
      {chart.birthInfo.timePrecision==='unknown'&&<p role="note"
        className="mt-3 rounded-lg p-3 text-xs leading-6"
        style={{border:'1px solid var(--t-border)',color:'var(--t-text2)'}}>
        出生时辰不详：这些文字仅是试排参考，正式命盘可能不同。
      </p>}
      <section className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div>
            <h3 className="text-base font-semibold" style={{color:'var(--t-text)'}}>六大主题 · 通俗版</h3>
            <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
              {layChapters.length?'正在阅读 DeepSeek 为这张盘生成的解读。':'先展示无需等待的命盘规则解读；生成后这里直接换成 DeepSeek 通俗版。'}
            </p>
          </div>
          <button type="button" disabled={aiBusy} onClick={requestAi}
            className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{color:'var(--t-gold)',border:'1px solid rgba(212,168,67,.5)',
              background:'rgba(212,168,67,.10)'}}>
            {aiBusy?'正在生成通俗版…':layChapters.length?'重新生成 AI 通俗版':'生成 AI 通俗版（免费体验）'}
          </button>
        </div>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          AI 解读需要你主动点击才会生成；点击后当前命盘资料会发送至 DeepSeek 并产生一次模型调用。
          六个主题可以直接上下滑动，顶部标签自动跟随当前阅读位置；点某一条下面的「为什么这样说」即可查看对应命盘描述。
        </p>
        {notice&&<p role="alert" className="text-xs" style={{color:'#f59e0b'}}>{notice}</p>}
        {aiLab&&onSpecificityChange&&<AiSpecificityControl value={specificity} onChange={onSpecificityChange}/>}
        <AiChapterReader fallback={sections} chapters={layChapters} audit={latestAi?.audit} birthInfo={chart.birthInfo} variant="basic"/>
        {latestAi&&layChapters.length<6&&<p role="status" className="text-xs leading-6"
          style={{color:'#f59e0b'}}>
          AI 这次只按格式生成了 {layChapters.length}/6 个主题；其余使用命盘规则资料补足，不会把其他主题的内容硬塞进去。
        </p>}
        {latestAi&&layChapters.length===0&&<details className="rounded-lg p-3"
          style={{border:'1px solid var(--t-border)'}}>
          <summary className="min-h-11 cursor-pointer text-sm">查看这次未按六主题格式生成的 AI 原文</summary>
          <p className="text-sm leading-7 whitespace-pre-wrap">{latestAi.answer}</p>
        </details>}
        {latestAi&&<AiEvidencePanel audit={latestAi.audit}/>}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="min-h-11 underline text-xs"
            style={{color:'var(--t-text2)'}}
            onClick={()=>downloadText(latestAi?.answer||plainText,'紫微研究_通俗版.txt')}>
            保存通俗版
          </button>
          <button type="button" className="min-h-11 underline text-xs"
            style={{color:'var(--t-text2)'}}
            onClick={()=>setNotice(printReport(latestAi?.answer||plainText)?'':'浏览器拦截了打印窗口，请允许弹窗。')}>
            打印／保存 PDF
          </button>
          <details className="min-h-11">
            <summary className="cursor-pointer py-3 text-xs" style={{color:'var(--t-text2)'}}>查看完整传统排盘资料</summary>
            <ProfessionalReport report={evidenceText}/>
          </details>
        </div>
      </section>
      <section className="mt-6 rounded-xl p-4 sm:p-5 space-y-3"
        style={{border:'1px solid rgba(212,168,67,.35)',background:'var(--t-surface)'}}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h3 className="font-semibold text-base" style={{color:'var(--t-text)'}}>深度分析 · 进阶版</h3>
          <span className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{background:'rgba(212,168,67,.12)',color:'var(--t-gold)'}}>当前限时免费</span>
        </div>
        <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>
          不只是看你像什么人，还把六个方面容易出现的矛盾、具体生活情景、
          对照反例和能尝试的做法讲透。将来可作为付费内容，目前完整开放，不需要支付。
        </p>
        <button type="button" disabled={deepBusy} onClick={requestDeep}
          className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{color:'var(--t-gold)',border:'1px solid rgba(212,168,67,.5)'}}>
          {deepBusy?'正在生成深度版…':deepResult?'重新生成深度版':'免费解锁完整深度分析'}
        </button>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          点击才会进行一次额外 DeepSeek 调用并发送命盘资料；目前不收费、没有付款或自动续费。
          后续启用真实付费前，需要独立实现购买凭证与服务端权限校验。
        </p>
        {deepError&&<p role="alert" className="text-xs" style={{color:'#f59e0b'}}>{deepError}</p>}
        {deepResult&&<>
          <AiChapterReader fallback={sections} chapters={deepChapters} audit={deepResult.audit} grounding={deepResult.grounding} birthInfo={chart.birthInfo} variant="deep"/>
          {deepChapters.length<6&&<p role="status" className="text-xs leading-6" style={{color:'#f59e0b'}}>
            深度版只识别到 {deepChapters.length}/6 个主题，其余展示规则参考。
          </p>}
          {deepChapters.length===0&&<details><summary className="cursor-pointer min-h-11">
            查看未按章节生成的深度版 AI 原文
          </summary><p className="whitespace-pre-wrap leading-7 text-sm">{deepResult.answer}</p></details>}
          {deepResult.quality&&<details className="rounded-lg px-3"
            style={{border:'1px solid var(--t-border)'}}>
            <summary className="min-h-11 flex items-center cursor-pointer text-sm"
              style={{color:deepResult.quality.reviewRequired?'#f59e0b':'var(--t-text2)'}}>
              深度内容自动检查 · {deepResult.quality.reviewRequired
                ? '存在需要复核的地方':'未发现已知结构与引用问题'}
            </summary>
            <div className="pb-3 text-xs space-y-2 leading-6" style={{color:'var(--t-text2)'}}>
              {deepResult.quality.warnings.map((w,i)=><p key={i}>
                {w.message} {w.topics.length?'（涉及：'+w.topics.join('、')+'）':''}
              </p>)}
              <p>{deepResult.quality.limitation}</p>
            </div>
          </details>}
          <AiEvidencePanel audit={deepResult.audit}/>
          <button type="button" onClick={()=>downloadText(deepResult.answer,'紫微研究_深度分析.txt')}
            className="min-h-11 text-xs underline" style={{color:'var(--t-gold)'}}>保存完整深度分析</button>
        </>}
      </section>
      {aiLab&&<>
      <div className="mt-5 rounded-xl p-4 space-y-2" style={{border:'1px solid var(--t-border)'}}>
        <h3 className="font-semibold text-sm" style={{color:'var(--t-text)'}}>通俗版实验反馈（不再次调用模型）</h3>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          这里查看上方通俗版已经生成的样本及历史实验反馈，不提供第二个重复的通俗版生成按钮。
        </p>
        {aiRuns.length>0&&<div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs" style={{color:'var(--t-text2)'}}>
              {aiLab?'保留最近 4 次结果，方便对照不同明确度。':'本次 AI 分析结果'}
            </p>
            <button type="button" onClick={()=>{setAiRuns([]);onBasicAiClear?.();}}
              className="min-h-11 text-xs underline" style={{color:'var(--t-text2)'}}>清空 AI 分析</button>
          </div>
          {aiLab&&<div className="rounded-xl p-3 space-y-2" style={{border:'1px solid var(--t-border)'}}>
            <label className="block text-xs" style={{color:'var(--t-text2)'}}>
              匿名样本编号（选填，用于区分不同命盘的盲测记录）
              <input type="text" maxLength={64} value={caseId}
                onChange={e=>setCaseId(e.target.value)}
                className="mt-2 w-full rounded-lg p-3 text-base"
                placeholder="例如：CASE-001"
                style={{background:'var(--t-card)',border:'1px solid var(--t-border)',color:'var(--t-text)'}} />
            </label>
            <button type="button" className="min-h-11 rounded-lg px-4 text-xs"
              onClick={()=>downloadText(
                JSON.stringify(buildExperimentExport(caseId,aiRuns,new Date().toISOString()),null,2),
                '紫微研究_AI实验反馈.json','application/json;charset=utf-8')}
              style={{border:'1px solid var(--t-border)',color:'var(--t-gold)'}}>
              导出实验结果与主观反馈
            </button>
            <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
              仅在你点击导出时生成本地文件，不自动上传反馈或保存到服务器。
              文件不含出生日期、时间和地点，但 AI 内容和笔记本身可能包含私人信息，请检查后再分享。
              该反馈只是初步记录，不能直接当作命盘准确率。
            </p>
          </div>}
          {aiRuns.map((run,i)=><article key={i} className="rounded-xl p-4 space-y-2"
            style={{background:'var(--t-surface)'}}>
            <h4 className="text-sm font-semibold" style={{color:'var(--t-gold)'}}>
              DeepSeek · AI 分析{aiLab?' · '+run.specificity+'/100（'+specificityLabel(run.specificity)+'）':''}
            </h4>
            <p className="text-sm whitespace-pre-wrap leading-7" style={{color:'var(--t-text2)'}}>{run.answer}</p>
            <AiEvidencePanel audit={run.audit}/>
            {aiLab&&run.specificity>=80&&<details className="mt-3 rounded-xl p-3"
              style={{border:'1px solid var(--t-border)',color:'var(--t-text2)'}} open>
              <summary className="cursor-pointer min-h-11 text-sm font-medium" style={{color:'var(--t-text)'}}>
                逐条核对分析中的假设（{run.hypotheses?.length??0}/3）
              </summary>
              <p className="text-xs leading-6 mt-1">先回忆真实事件再选择是否符合，尽量记录具体反例；无法判断时选择「无法验证」。这不是命理准确率。</p>
              {!run.hypothesisFormatComplete&&<p role="status" className="text-xs leading-6 mt-2"
                style={{color:'#f59e0b'}}>{run.hypothesisFormatWarning??'实验模板未完整生成，请勿将此轮标记为有效的标准化样本。'}</p>}
              {(run.hypotheses??[]).map(h=><div key={h.id} className="rounded-lg p-3 space-y-2 mt-3"
                style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
                <h5 className="font-semibold text-sm" style={{color:'var(--t-gold)'}}>{h.id} · 待核验行为假设</h5>
                <p className="whitespace-pre-wrap text-xs leading-6">{h.text}</p>
                <p className="text-xs" style={{color:'var(--t-text2)'}}>
                  依据编号：{h.hasChartReference?'已包含':'缺失'} · 反例／不适用条件：{h.hasCounterexample?'已描述':'缺失'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(REVIEW_LABELS) as [HumanReview,string][]).map(([value,label])=>
                    <button type="button" key={value} aria-pressed={h.review===value}
                      onClick={()=>setAiRuns(prev=>prev.map((item,j)=>j!==i?item:{
                        ...item,hypotheses:item.hypotheses?.map(v=>v.id===h.id?{...v,review:value}:v)
                      }))}
                      className="min-h-11 rounded-lg px-2 text-xs"
                      style={{border:'1px solid var(--t-border)',
                        color:h.review===value?'var(--t-gold)':'var(--t-text2)',
                        background:h.review===value?'rgba(212,168,67,0.12)':'transparent'}}>{label}</button>)}
                </div>
                <label className="block text-xs leading-6">
                  事实或反例（可不填，请勿输入可识别个人身份的资料）
                  <textarea rows={2} maxLength={500} value={h.note}
                    onChange={e=>setAiRuns(prev=>prev.map((item,j)=>j!==i?item:{
                      ...item,hypotheses:item.hypotheses?.map(v=>v.id===h.id?{...v,note:e.target.value}:v)
                    }))}
                    className="mt-2 w-full resize-y rounded-lg p-2 text-sm"
                    style={{color:'var(--t-text)',background:'var(--t-surface)',border:'1px solid var(--t-border)'}}
                    placeholder="写下具体做过的事情，或明确的相反情况" />
                </label>
              </div>)}
            </details>}

            {aiLab&&<div className="mt-2 rounded-lg p-3 space-y-2" style={{border:'1px solid var(--t-border)'}}>
              <p className="text-xs font-medium" style={{color:'var(--t-text)'}}>
                实验反馈：这次分析中有可以核对的具体描述吗？
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(REVIEW_LABELS) as [HumanReview,string][]).map(([value,label])=>
                  <button type="button" key={value} aria-pressed={run.review===value}
                    onClick={()=>setAiRuns(prev=>prev.map((item,j)=>j===i?{...item,review:value}:item))}
                    className="min-h-11 rounded-lg px-2 py-2 text-xs"
                    style={{border:'1px solid var(--t-border)',
                      background:run.review===value?'rgba(212,168,67,0.12)':'transparent',
                      color:run.review===value?'var(--t-gold)':'var(--t-text2)'}}>{label}</button>)}
              </div>
              <label className="block text-xs" style={{color:'var(--t-text2)'}}>
                可以记录具体例子或反例（选填，避免姓名和联系方式）
                <textarea value={run.note} rows={2} maxLength={500}
                  onChange={e=>setAiRuns(prev=>prev.map((item,j)=>j===i?{...item,note:e.target.value}:item))}
                  className="mt-2 w-full resize-y rounded-lg p-2 text-sm"
                  style={{background:'var(--t-card)',border:'1px solid var(--t-border)',color:'var(--t-text)'}}
                  placeholder="例如：去年某次类似情境，我实际选择了相反做法。" />
              </label>
            </div>}
            <button type="button"
              onClick={()=>downloadText(run.answer,'紫微研究_AI分析_'+run.specificity+'.txt')}
              className="min-h-11 text-xs underline" style={{color:'var(--t-text2)'}}>保存这次 AI 分析</button>
          </article>)}
        </div>}
      </div>
      </>}
      {aiLab&&<BlindEvaluationPanel birthInfo={chart.birthInfo} specificity={specificity}/>}
      {notice&&<p role="status" className="mt-3 text-xs" style={{color:'var(--t-text2)'}}>{notice}</p>}
      <p className="mt-4 text-xs leading-6" style={{color:'var(--t-faint)'}}>
        传统命盘是文化解释体系，不能证明个人性格、健康状况或未来事件。
      </p>
    </>}
  </section>;
}
