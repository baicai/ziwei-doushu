'use client';

export interface AiEvidenceAuditResult {
  cited: Array<{id:string;fact:string}>;
  invalidIds: string[];
  citationCount: number;
  scope: 'reference-existence-only';
}
export function toEvidenceAudit(value:unknown):AiEvidenceAuditResult|null {
  if(!value || typeof value!=='object') return null;
  const a=value as Record<string,unknown>;
  if(a.scope!=='reference-existence-only' || !Array.isArray(a.cited) ||
    !Array.isArray(a.invalidIds) || typeof a.citationCount!=='number') return null;
  const cited=a.cited.filter((v):v is {id:string;fact:string}=>
    !!v&&typeof v==='object'&&typeof v.id==='string'&&typeof v.fact==='string');
  const invalidIds=a.invalidIds.filter((v):v is string=>typeof v==='string');
  return {cited,invalidIds,citationCount:a.citationCount,scope:'reference-existence-only'};
}

export default function AiEvidencePanel({audit}:{audit:AiEvidenceAuditResult|null}) {
  if(!audit) return null;
  return <details className="mt-3 rounded-lg p-3 text-xs"
    style={{background:'var(--t-card)',border:'1px solid var(--t-border)',color:'var(--t-text2)'}}>
    <summary className="cursor-pointer min-h-11 flex flex-wrap items-center gap-2 font-medium">
      <span>命盘依据检查</span>
      <span>引用 {audit.cited.length} 条 · 无效编号 {audit.invalidIds.length} 条</span>
    </summary>
    {audit.citationCount===0&&<p className="mt-2 leading-6">模型没有按要求附来源编号。这次输出的命盘事实尚未得到自动引用检查。</p>}
    {audit.invalidIds.length>0&&<p role="alert" className="mt-2 leading-6" style={{color:'#f59e0b'}}>
      部分来源编号无法对应当前命盘：{audit.invalidIds.join('、')}。请勿直接将对应结论视为已核实。
    </p>}
    {audit.cited.length>0&&<ul className="list-disc pl-5 mt-2 space-y-1">
      {audit.cited.map(item=><li key={item.id} className="leading-6">
        <span className="font-semibold">[{item.id}]</span> {item.fact}
      </li>)}
    </ul>}
    <p className="mt-3 leading-6" style={{color:'var(--t-faint)'}}>
      该检查只核对模型引用的编号确实存在于当前命盘，不能证明行为解释正确，
      也无法排除没有标注来源的错误结论。建议结合亲身经历或盲评反例继续验证。
    </p>
  </details>;
}
