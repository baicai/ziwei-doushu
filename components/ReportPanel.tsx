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
import BlindEvaluationPanel from '@/components/BlindEvaluationPanel';

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

export default function ReportPanel({ chart, year, specificity=0, aiLab=false, onSpecificityChange }: {
  chart: ZiweiChart; year: number; specificity?: number; aiLab?: boolean;
  onSpecificityChange?: (value:number)=>void;
}) {
  const [open,setOpen]=useState(true);
  const [version,setVersion]=useState<'plain'|'evidence'>('plain');
  const [notice,setNotice]=useState('');
  const [aiRuns,setAiRuns]=useState<ExperimentRun[]>([]);
  const [caseId,setCaseId]=useState('');
  const [aiBusy,setAiBusy]=useState(false);
  const sections=useMemo(()=>buildPlainSections(chart),[chart]);
  const plainText=useMemo(()=>buildPlainTextReport(chart,year),[chart,year]);
  const evidenceText=useMemo(()=>buildChartReport(chart,year),[chart,year]);
  const visible=version==='plain'?plainText:evidenceText;

  useEffect(()=>{setAiRuns([]);setNotice('');},[chart]);

  const requestAi=async()=>{
    if(aiBusy)return;
    setAiBusy(true);setNotice('');
    try{
      const response=await fetch('/api/interpret',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          birthInfo:chart.birthInfo,topic:'overview',style:'plain',specificity,
          question:'请面向完全不懂紫微斗数的普通用户，用通俗中文解释这份命盘。重点说明整体特点、性格、工作、关系、金钱管理与生活提醒；明确哪些是传统象征，不用术语堆砌，不编造盘面事实，不做确定性预测。',
        }),
      });
      const data:unknown=await response.json().catch(()=>null);
      const parsed=data && typeof data==='object'?data as Record<string,unknown>:null;
      if(!response.ok || !parsed || typeof parsed.answer!=='string')throw new Error(
        response.status===429?'当前 AI 体验次数较多，请稍后再试。':
        typeof parsed?.error==='string'?parsed.error:'AI 暂时不可用，请稍后再试。');
      const hypothesisCheck=specificity>=80?parseReviewableHypotheses(parsed.answer):null;
      setAiRuns(prev=>[...prev,{answer:parsed.answer as string,specificity,audit:toEvidenceAudit(parsed.evidenceAudit,parsed.factualAudit),
        model:typeof parsed.model==='string'?parsed.model:'unknown',review:null,note:'',
        hypotheses:hypothesisCheck?.hypotheses.map(h=>({...h,review:null,note:''})),
        hypothesisFormatComplete:hypothesisCheck?.complete,
        hypothesisFormatWarning:hypothesisCheck?.warning,
      }].slice(-4));
    }catch(e){setNotice(e instanceof Error?e.message:'AI 暂时不可用');}
    finally{setAiBusy(false);}
  };

  return <section id="chart-report" className="mt-5 rounded-xl p-3 sm:p-5"
    style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold" style={{color:'var(--t-text)'}}>我的命盘解读</h2>
        <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>
          默认使用日常语言解释命盘，想深入研究再查看专业依据。
        </p>
      </div>
      <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}
        className="min-h-11 px-4 rounded-lg text-sm"
        style={{border:'1px solid var(--t-border)',color:'var(--t-gold)'}}>
        {open?'收起报告':'展开报告'}
      </button>
    </div>

    {open&&<>
      <div role="group" aria-label="选择报告阅读版本"
        className="grid grid-cols-2 gap-2 mt-4 mb-3 rounded-xl p-1"
        style={{background:'var(--t-surface)'}}>
        {([{key:'plain',name:'通俗解读'},{key:'evidence',name:'专业依据'}] as const).map(item=>
          <button key={item.key} type="button" aria-pressed={version===item.key}
            onClick={()=>setVersion(item.key)}
            className="min-h-11 rounded-lg text-sm font-medium"
            style={{color:version===item.key?'var(--t-gold)':'var(--t-text2)',
              background:version===item.key?'var(--t-card)':'transparent'}}>
            {item.name}
          </button>)}
      </div>
      <p className="mb-4 text-xs leading-6" style={{color:'var(--t-text2)'}}>
        {version==='plain'?'这是根据命盘规则写成的通俗解释，不是 AI 分析。':
          '这里保留实际星曜、宫位和计算依据，供需要详细核对的人阅读。'}
      </p>
      {chart.birthInfo.timePrecision==='unknown'&&<p role="note" className="mb-4 rounded-xl p-3 text-xs leading-6"
        style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}>
        出生时辰不详：当前只是一张试排盘，实际宫位和解释都可能改变。
      </p>}

      {version==='plain'?<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map(section=><article key={section.key} className="rounded-xl p-4 space-y-3"
          style={{border:'1px solid var(--t-border)',background:'var(--t-surface)'}}>
          <h3 className="text-base font-semibold" style={{color:'var(--t-gold)'}}>{section.title}</h3>
          <p className="text-sm leading-7" style={{color:'var(--t-text)'}}>{section.lead}</p>
          <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>{section.observation}</p>
          <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>{section.suggestion}</p>
          <details className="pt-2 text-xs leading-6" style={{borderTop:'1px solid var(--t-border)',color:'var(--t-text2)'}}>
            <summary className="cursor-pointer py-2">为什么这样说？查看命盘依据</summary>
            <p className="pt-2">{section.evidence}</p>
          </details>
        </article>)}
      </div>:<ProfessionalReport report={evidenceText}/>}

      {version==='plain'&&<div className="mt-4 rounded-xl p-4 space-y-2"
        style={{border:'1px solid var(--t-border)',background:'var(--t-surface)'}}>
        <h3 className="font-semibold text-sm" style={{color:'var(--t-text)'}}>时间阶段怎么看？</h3>
        <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>
          {chart.daXians?.[chart.currentDaXianIndex]
            ? `按这张盘的传统划分，${chart.daXians[chart.currentDaXianIndex].startAge}—${chart.daXians[chart.currentDaXianIndex].endAge} 岁的观察重点是「${chart.daXians[chart.currentDaXianIndex].palaceName}」。这只是阅读主题，不代表一定发生某件事。`
            :'当前没有可用的大限资料。'}
        </p>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          {year} 年的流年十二宫和历法年界仍在完善，暂不据此提供确定性的年度预测。
        </p>
      </div>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={()=>downloadText(visible,version==='plain'?'紫微研究_通俗解读.txt':'紫微研究_专业依据.txt')}
          className="min-h-11 rounded-lg px-4 text-sm"
          style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}>下载当前版本</button>
        <button type="button" onClick={()=>setNotice(printReport(visible)?'':'请允许弹出新窗口，再尝试打印或保存 PDF。')}
          className="min-h-11 rounded-lg px-4 text-sm"
          style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}>打印／保存 PDF</button>
      </div>

      <div className="mt-5 rounded-xl p-4 space-y-2" style={{border:'1px solid var(--t-border)'}}>
        <h3 className="font-semibold text-sm" style={{color:'var(--t-text)'}}>想获得更详细的 AI 分析？</h3>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          由 DeepSeek 根据当前命盘进一步综合解读。点击后会向第三方 AI 服务发送命盘数据，并消耗一次 AI 调用额度。
        </p>
        {aiLab&&onSpecificityChange&&<AiSpecificityControl value={specificity}
          onChange={onSpecificityChange}/>}
        <button type="button" onClick={requestAi} disabled={aiBusy}
          className="min-h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50"
          style={{background:'rgba(212,168,67,0.12)',border:'1px solid rgba(212,168,67,0.4)',color:'var(--t-gold)'}}>
          {aiBusy?'正在生成 AI 解读…':'使用 DeepSeek 生成通俗分析'}
        </button>
        {aiRuns.length>0&&<div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs" style={{color:'var(--t-text2)'}}>
              {aiLab?'保留最近 4 次结果，方便对照不同明确度。':'本次 AI 分析结果'}
            </p>
            <button type="button" onClick={()=>setAiRuns([])}
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
      {aiLab&&<BlindEvaluationPanel birthInfo={chart.birthInfo} specificity={specificity}/>}
      {notice&&<p role="status" className="mt-3 text-xs" style={{color:'var(--t-text2)'}}>{notice}</p>}
      <p className="mt-4 text-xs leading-6" style={{color:'var(--t-faint)'}}>
        传统命盘是文化解释体系，不能证明个人性格、健康状况或未来事件。
      </p>
    </>}
  </section>;
}
