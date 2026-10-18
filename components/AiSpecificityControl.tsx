'use client';

import { specificityLabel } from '@/lib/ai/specificity';

export default function AiSpecificityControl({value,onChange}:{
  value:number;
  onChange:(next:number)=>void;
}) {
  return <div className="rounded-xl p-3 space-y-2"
    style={{background:'var(--t-surface)',border:'1px solid var(--t-border)'}}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor="ai-specificity-range" className="text-xs font-medium"
        style={{color:'var(--t-text)'}}>描述明确度 · 测试参数</label>
      <span className="text-xs" style={{color:'var(--t-gold)'}}>{value}/100 · {specificityLabel(value)}</span>
    </div>
    <input id="ai-specificity-range" type="range" min={0} max={100} step={10}
      value={value} onChange={event=>onChange(Number(event.target.value))}
      className="w-full min-h-11" style={{accentColor:'var(--t-gold)'}}
      aria-valuetext={specificityLabel(value)}/>
    <div className="flex justify-between text-[11px]" style={{color:'var(--t-text2)'}}>
      <span>默认 · 宽泛描述</span>
      <span>具体 · 可核验的行为假设</span>
    </div>
    <p className="text-xs leading-5" style={{color:'var(--t-text2)'}}>
      仅调整 AI 的描述方式，不改变命盘、采样温度或计算结果；具体程度不代表真实性、命中率或统计可信度。
    </p>
    <button type="button" onClick={()=>onChange(0)} className="min-h-11 text-xs underline"
      style={{color:'var(--t-gold)'}} disabled={value===0}>恢复默认</button>
  </div>;
}
