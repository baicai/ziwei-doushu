'use client';
import { useMemo } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { buildDeepTimeContext } from '@/lib/ai/deep-time';

export default function DeepTimeMap({chart,year}:{chart:ZiweiChart;year:number}){
  const time=useMemo(()=>buildDeepTimeContext(chart,year),[chart,year]);
  const selected=time.stages.find(s=>s.position==='selected');
  return <section className="rounded-xl p-3 sm:p-4 space-y-3"
    style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h4 className="font-semibold text-sm" style={{color:'var(--t-text)'}}>人生阶段 · 命盘时间地图</h4>
        <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
          以所选 {year} 年为中心 · 传统虚岁 {time.virtualAge} 岁 · 无需额外填写资料
        </p>
      </div>
      <span className="text-xs" style={{color:'var(--t-faint)'}}>规则计算 · 非 AI 猜测</span>
    </div>
    {time.timePrecision==='unknown'&&<p role="note" className="text-xs leading-6"
      style={{color:'#f59e0b'}}>时辰不详：以下属于候选盘的阶段参考，不能据此确定命盘。</p>}
    {selected?<div className="grid gap-2 sm:grid-cols-3">
      {time.stages.map(stage=><article key={stage.position}
        className="rounded-lg p-3 space-y-1"
        style={{border:stage.position==='selected'?'1px solid rgba(212,168,67,.6)':'1px solid var(--t-border)',
          background:stage.position==='selected'?'rgba(212,168,67,.06)':'var(--t-surface)'}}>
        <div className="text-xs font-semibold" style={{color:stage.position==='selected'?'var(--t-gold)':'var(--t-text2)'}}>
          {stage.position==='previous'?'上一阶段':stage.position==='next'?'下一阶段':'所选年份所属阶段'}
        </div>
        <p className="text-sm font-semibold" style={{color:'var(--t-text)'}}>
          {stage.startAge}–{stage.endAge} 虚岁
        </p>
        <p className="text-xs" style={{color:'var(--t-text2)'}}>{stage.startYear}–{stage.endYear} 年（年段参考）</p>
        <p className="text-xs leading-6" style={{color:'var(--t-text)'}}>
          {stage.palace} · {stage.theme}
        </p>
        <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>
          本命该宫：{stage.mainStars.join('、')||'无直接主星（须参考对宫）'}
        </p>
        <details className="text-xs" style={{color:'var(--t-text2)'}}>
          <summary className="min-h-11 flex items-center cursor-pointer">展开阶段四化和关联宫位</summary>
          <div className="space-y-1 pb-2 leading-6">
            {stage.transformations.map(t=><p key={t.change}>
              大限 {t.star}化{t.change} → 本命{t.natalPalace??'落宫待核实'}
            </p>)}
            <p>该宫的对宫／三合：{stage.network.join('；')}</p>
          </div>
        </details>
      </article>)}
    </div>:<p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
      所选年份没有对应的已计算十年大限（可能处于童限或超出已计算范围），不套用其他大限。
    </p>}
    <details className="rounded-lg px-3" style={{border:'1px solid var(--t-border)'}}>
      <summary className="min-h-11 flex items-center cursor-pointer text-xs"
        style={{color:'var(--t-text2)'}}>{year} 年干四化参考 · {time.yearStem}干 · 查看四化落宫与口径说明</summary>
      <div className="pb-3 space-y-1 text-xs leading-6" style={{color:'var(--t-text2)'}}>
        {time.yearTransformations.map(t=><p key={t.change}>
          {t.star}化{t.change} → 本命{t.natalPalace??'落宫待核实'}
        </p>)}
        {time.limitations.map((item,i)=><p key={i}>{item}</p>)}
        <p>这是一份可以核对的传统排盘结构，不代表某一年一定会发生特定事件。</p>
      </div>
    </details>
  </section>;
}
