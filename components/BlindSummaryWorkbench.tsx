'use client';

import { useMemo, useState } from 'react';
import { summarizePairedBlindTrials } from '@/lib/ai/blind-cohorts';
import {
  deduplicateBlindTrials, exportBlindSummaryCsv, parseBlindExport,
  summarizeBlindTrials, type ImportedBlindTrial,
} from '@/lib/ai/blind-summary';

const pct=(v:number|null)=>v===null?'—':(v*100).toFixed(1)+'%';
const MAX_FILES=100;
const MAX_SIZE=512*1024;

function downloadAggregate(csv:string){
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='紫微研究_盲评汇总.csv';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  URL.revokeObjectURL(url);
}

export default function BlindSummaryWorkbench(){
  const [records,setRecords]=useState<ImportedBlindTrial[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [issues,setIssues]=useState<string[]>([]);
  const summary=useMemo(()=>summarizeBlindTrials(records),[records]);
  const paired=useMemo(()=>summarizePairedBlindTrials(records),[records]);

  async function importFiles(files:File[]) {
    if(busy)return;
    if(files.length>MAX_FILES){
      setNotice('一次最多选择 100 个 JSON 文件；请分批导入。');
      return;
    }
    setBusy(true);
    const parsed:ImportedBlindTrial[]=[];
    const errors:string[]=[];
    for(const file of files) {
      if(file.size>MAX_SIZE){
        errors.push(file.name.slice(0,100)+'：单个文件超过 512 KB。');continue;
      }
      try {
        const raw:unknown=JSON.parse(await file.text());
        // A bad row rejects this entire file; no silently partial import.
        const fileRecords:ImportedBlindTrial[]=Array.isArray(raw)
          ? (raw.length<=500?raw.map(item=>parseBlindExport(item)):(()=>{throw new Error('单个文件最多包含 500 条记录。');})())
          : [parseBlindExport(raw)];
        parsed.push(...fileRecords);
      }catch(error){
        errors.push(file.name.slice(0,100)+'：'+
          (error instanceof Error?error.message:'无法读取 JSON 文件。'));
      }
    }
    try{
      const {records:merged,duplicates}=deduplicateBlindTrials([...records,...parsed]);
      setRecords(merged);
      setNotice('新读取 '+parsed.length+' 条；去除重复 '+duplicates+
        ' 条；当前有效合计 '+merged.length+' 条。'+
        (errors.length?' 另有 '+errors.length+' 个文件未成功导入。':''));
    }catch(error){
      setNotice(error instanceof Error?error.message:'导入量超出限制');
    }finally{
      setIssues(errors.slice(0,12));
      setBusy(false);
    }
  }

  return <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6"
    style={{color:'var(--t-text)'}}>
    <header className="space-y-3">
      <a href="/chart?ai_lab=1" className="inline-flex min-h-11 items-center text-sm underline"
        style={{color:'var(--t-gold)'}}>← 返回命盘实验</a>
      <h1 className="text-xl sm:text-2xl font-semibold">匿名盲评 · 本地汇总工作台</h1>
      <p className="text-sm leading-7" style={{color:'var(--t-text2)'}}>
        把之前导出的匿名盲评 JSON 文件导入这里，按描述明确度比较 A/B 选择情况。
        所有解析与统计只在当前浏览器内完成，不会自动上传文件、调用 DeepSeek 或创建数据库。
      </p>
    </header>
    <section className="rounded-xl p-4 space-y-3"
      style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
      <h2 className="text-base font-semibold">导入盲评文件</h2>
      <label className="block text-sm space-y-2" style={{color:'var(--t-text2)'}}>
        <span>选择一个或多个「紫微研究_匿名对照盲评.json」文件</span>
        <input type="file" accept=".json,application/json" multiple
          disabled={busy} className="block w-full min-h-11 rounded-lg p-2 text-sm"
          style={{border:'1px solid var(--t-border)',color:'var(--t-text)'}}
          onChange={e=>{
            const files=Array.from(e.currentTarget.files||[]);
            e.currentTarget.value='';
            if(files.length)void importFiles(files);
          }}/>
      </label>
      <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
        可追加导入，完全相同的轮次会去重。每个文件最大 512 KB，一次最多 100 个文件，最多汇总 500 条记录。
        导入时只保留匿名编号、日期、模型版本、明确度、选择及 A/B 位置；不保留 AI 原文。
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!records.length} onClick={()=>downloadAggregate(exportBlindSummaryCsv(summary))}
          className="min-h-11 px-4 rounded-lg text-sm disabled:opacity-40"
          style={{color:'var(--t-gold)',border:'1px solid var(--t-border)'}}>导出汇总 CSV</button>
        <button type="button" disabled={!records.length||busy}
          onClick={()=>{setRecords([]);setNotice('已清空本页导入记录。');setIssues([]);}}
          className="min-h-11 px-4 rounded-lg text-sm disabled:opacity-40"
          style={{color:'var(--t-text2)',border:'1px solid var(--t-border)'}}>清空本地记录</button>
      </div>
      {notice&&<p role="status" className="text-xs leading-6" style={{color:'var(--t-text2)'}}>{notice}</p>}
      {issues.length>0&&<details className="text-xs leading-6" style={{color:'#f59e0b'}}>
        <summary className="cursor-pointer min-h-11">查看被拒绝的文件及原因</summary>
        <ul className="list-disc pl-5">{issues.map((err,i)=><li key={i}>{err}</li>)}</ul>
      </details>}
    </section>

    <section className="space-y-3" aria-label="盲评汇总">
      <h2 className="text-lg font-semibold">总体结果</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['有效轮次',String(summary.total)],
          ['明确度组数',String(summary.groups.length)],
          ['有编号的不同样本',String(summary.uniqueCaseIds)],
          ['缺少样本编号',String(summary.unlabelledCount)],
        ] as const).map(([label,value])=>
          <div key={label} className="rounded-xl p-4 space-y-1"
            style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
            <p className="text-xs" style={{color:'var(--t-text2)'}}>{label}</p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          </div>)}
      </div>
      {summary.warning.length>0&&<div className="rounded-xl p-4 space-y-2"
        style={{border:'1px solid var(--t-border)'}}>
        <h3 className="font-semibold text-sm">统计解释与样本提醒</h3>
        <ul className="list-disc pl-5 space-y-1 text-xs leading-6" style={{color:'var(--t-text2)'}}>
          {summary.warning.map((w,i)=><li key={i}>{w}</li>)}
        </ul>
      </div>}
    </section>

    <section className="rounded-xl p-4 space-y-3"
      style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">同一样本的 0／50／100 三档配对</h2>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          只有匿名编号和模型名称都一致，且三个档位各有一轮结果，才纳入配对。
          同一档重复测试固定取最早的一次，不按结果挑选。
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          ['有编号的模型样本组',paired.cohorts],
          ['三档完整组',paired.completeTriplets],
          ['未完成三档组',paired.incompleteCohorts],
          ['相同档位重复轮次',paired.repeatedCells],
        ] as const).map(([label,value])=><div key={label}
          className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
          <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>{label}</p>
          <p className="text-xl font-semibold tabular-nums mt-1">{value}</p>
        </div>)}
      </div>
      {paired.completeTriplets>0&&<>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead><tr className="text-xs" style={{color:'var(--t-text2)'}}>
              <th className="py-3 pr-3">明确度</th>
              <th className="py-3 px-3">选真实盘</th>
              <th className="py-3 px-3">选合成盘</th>
              <th className="py-3 pl-3">其他选择</th>
            </tr></thead>
            <tbody>{paired.perSpecificity.map(row=><tr key={row.specificity}
              style={{borderTop:'1px solid var(--t-border)'}}>
              <td className="py-3 pr-3 tabular-nums">{row.specificity}</td>
              <td className="py-3 px-3 tabular-nums">{row.selectedTarget}</td>
              <td className="py-3 px-3 tabular-nums">{row.selectedControl}</td>
              <td className="py-3 pl-3 tabular-nums">{row.ambiguous}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
            <p style={{color:'var(--t-text2)'}}>0 → 100：从选合成盘变为选真实盘</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{paired.changedTowardTarget}</p>
          </div>
          <div className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
            <p style={{color:'var(--t-text2)'}}>0 → 100：从选真实盘变为选合成盘</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{paired.changedTowardControl}</p>
          </div>
          <div className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
            <p style={{color:'var(--t-text2)'}}>明确二选一且结果不变</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{paired.unchangedDecisive}</p>
          </div>
          <div className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
            <p style={{color:'var(--t-text2)'}}>任一端未明确选择，无法比较变化</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{paired.nonDecisivePairs}</p>
          </div>
        </div>
      </>}
      <ul className="list-disc pl-5 text-xs leading-6 space-y-1" style={{color:'var(--t-text2)'}}>
        {paired.notes.map((note,i)=><li key={i}>{note}</li>)}
      </ul>
    </section>

    {summary.groups.length>0&&<section className="space-y-3">
      <h2 className="text-lg font-semibold">按 AI 描述明确度分组</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {summary.groups.map(g=><article key={g.specificity}
          className="rounded-xl p-4 space-y-3"
          style={{border:'1px solid var(--t-border)',background:'var(--t-card)'}}>
          <div className="flex justify-between items-center gap-2">
            <h3 className="font-semibold">明确度 {g.specificity}/100</h3>
            <span className="text-xs" style={{color:'var(--t-text2)'}}>{g.count} 轮</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
              <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>选择真实盘（全部轮次）</p>
              <p className="font-semibold text-xl tabular-nums">{pct(g.targetShareOfAll)}</p>
            </div>
            <div className="rounded-lg p-3" style={{background:'var(--t-surface)'}}>
              <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>仅明确二选一时选真实盘</p>
              <p className="font-semibold text-xl tabular-nums">{pct(g.targetShareOfDecisive)}</p>
              <p className="text-xs" style={{color:'var(--t-text2)'}}>分母 {g.decisive} 轮</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {([
              ['选择真实盘',g.target],['选择合成对照盘',g.control],['两份都像',g.both],
              ['两份都不像',g.neither],['无法判断',g.unsure],
            ] as const).map(([label,value])=><div key={label} className="flex items-center gap-2">
              <span className="w-24 shrink-0" style={{color:'var(--t-text2)'}}>{label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'var(--t-surface)'}}>
                <div className="h-full rounded-full" style={{
                  width:(100*value/g.count)+'%',background:'var(--t-gold)'}}/>
              </div>
              <span className="w-10 text-right tabular-nums">{value}</span>
            </div>)}
          </div>
          <div className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
            来源 A/B：{g.targetA}/{g.targetB}；
            不明确选择占比 {pct(g.ambiguityShare)}；
            唯一匿名编号 {g.uniqueCaseIds}；
            模型 {g.models.join('、')}
          </div>
        </article>)}
      </div>
    </section>}
    <section className="rounded-xl p-4 text-xs leading-6 space-y-2"
      style={{border:'1px solid var(--t-border)',color:'var(--t-text2)'}}>
      <h2 className="text-sm font-semibold" style={{color:'var(--t-text)'}}>如何正确理解这些数字</h2>
      <p>「选择真实盘」只是参与者对两份文本的主观匹配结果，不是命理预测准确率。
        特别需要保留「两份都像／都不像／无法判断」，否则只看二选一比例容易夸大效果。</p>
      <p>同一个人反复测试、不同模型版本、A/B 位置偏差、样本不独立以及 AI 文字中的隐含线索，
        都可能影响结果。合成对照不等同于另一个人的真实出生资料。
        正式研究仍需要独立样本、盲态管理、预设分析计划和交叉复测。</p>
    </section>
  </div>;
}
