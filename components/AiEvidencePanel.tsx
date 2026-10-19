'use client';

export type PartialFactCheckResult = {
  checked:Array<{
    claim:string;
    kind:'direct-star'|'empty-palace'|'natal-sihua';
    verdict:'matches-chart'|'contradicts-chart';
    evidenceId:string|null;
    expected:string;
  }>;
  matchingCount:number;
  contradictionCount:number;
  scope:'partial-natal-facts-only';
  limitation:string;
};

export interface AiEvidenceAuditResult {
  cited: Array<{id:string;fact:string}>;
  invalidIds: string[];
  citationCount: number;
  scope: 'reference-existence-only';
  facts?:PartialFactCheckResult;
}
function parseFactCheck(value:unknown):PartialFactCheckResult|undefined {
  if (!value||typeof value!=='object') return undefined;
  const f=value as Record<string,unknown>;
  if(f.scope!=='partial-natal-facts-only'||!Array.isArray(f.checked)||
    typeof f.matchingCount!=='number'||typeof f.contradictionCount!=='number'||typeof f.limitation!=='string')
    return undefined;
  const checked=f.checked.filter(item=>{
    if(!item||typeof item!=='object')return false;
    const x=item as Record<string,unknown>;
    return typeof x.claim==='string'&&typeof x.expected==='string'&&
      (x.verdict==='matches-chart'||x.verdict==='contradicts-chart')&&
      (x.kind==='direct-star'||x.kind==='empty-palace'||x.kind==='natal-sihua');
  }) as PartialFactCheckResult['checked'];
  return {checked,matchingCount:f.matchingCount,contradictionCount:f.contradictionCount,
    scope:'partial-natal-facts-only',limitation:f.limitation};
}
export function toEvidenceAudit(value:unknown,factual?:unknown):AiEvidenceAuditResult|null {
  if(!value || typeof value!=='object') return null;
  const a=value as Record<string,unknown>;
  if(a.scope!=='reference-existence-only' || !Array.isArray(a.cited) ||
    !Array.isArray(a.invalidIds) || typeof a.citationCount!=='number') return null;
  const cited=a.cited.filter((v):v is {id:string;fact:string}=>
    !!v&&typeof v==='object'&&typeof v.id==='string'&&typeof v.fact==='string');
  const invalidIds=a.invalidIds.filter((v):v is string=>typeof v==='string');
  return {cited,invalidIds,citationCount:a.citationCount,scope:'reference-existence-only',
    facts:parseFactCheck(factual)};
}

export default function AiEvidencePanel({audit}:{audit:AiEvidenceAuditResult|null}) {
  if(!audit) return null;
  const facts=audit.facts;
  const serious=(facts?.contradictionCount??0)>0;
  return <details className="mt-3 rounded-lg p-3 text-xs"
    style={{background:'var(--t-card)',border:'1px solid var(--t-border)',color:'var(--t-text2)'}}>
    <summary className="cursor-pointer min-h-11 flex flex-wrap items-center gap-2 font-medium">
      <span>命盘依据检查</span>
      <span>引用 {audit.cited.length} 条 · 无效编号 {audit.invalidIds.length} 条</span>
      {facts&&<span style={{color:serious?'#f59e0b':'var(--t-text2)'}}>
        · 检出 {facts.checked.length} 条盘面表述，矛盾 {facts.contradictionCount} 条
      </span>}
    </summary>
    {audit.citationCount===0&&<p className="mt-2 leading-6">模型没有按要求附来源编号。本次输出缺少可追溯引用。</p>}
    {audit.invalidIds.length>0&&<p role="alert" className="mt-2 leading-6" style={{color:'#f59e0b'}}>
      部分来源编号无法对应当前命盘：{audit.invalidIds.join('、')}。对应结论不能视为已核实。
    </p>}
    {facts&&<>
      {facts.checked.length===0&&<p className="mt-2 leading-6">
        自动检查未识别到可确定核对的句式，不能据此认为分析没有错误。
      </p>}
      {facts.checked.filter(item=>item.verdict==='contradicts-chart').map((item,index)=>
        <div key={index} role="alert" className="mt-2 rounded-lg p-3 leading-6"
          style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.3)'}}>
          <p className="font-medium" style={{color:'#f59e0b'}}>发现与命盘不符的表述：{item.claim}</p>
          <p>实际盘面：{item.expected}</p>
        </div>)}
      <p className="mt-2 leading-6">
        已识别的事实句：{facts.matchingCount} 条与排盘一致，
        {facts.contradictionCount} 条矛盾。这不是全部分析的准确率。
      </p>
    </>}
    {audit.cited.length>0&&<ul className="list-disc pl-5 mt-2 space-y-1">
      {audit.cited.map(item=><li key={item.id} className="leading-6">
        <span className="font-semibold">[{item.id}]</span> {item.fact}
      </li>)}
    </ul>}
    <p className="mt-3 leading-6" style={{color:'var(--t-faint)'}}>
      {facts?.limitation||'仅确认来源编号确实存在，不能证明解读正确。'}
      自动检查范围有限，未覆盖的断言仍需人工核对；没有矛盾也不代表命理结论有效。
    </p>
  </details>;
}
