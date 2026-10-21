import type { ImportedBlindTrial } from './blind-summary';

export interface PairedBlindSummary {
  cohorts:number;
  completeTriplets:number;
  incompleteCohorts:number;
  repeatedCells:number;
  noCaseIdRounds:number;
  pairedDecisive:number;
  changedTowardTarget:number;
  changedTowardControl:number;
  unchangedDecisive:number;
  nonDecisivePairs:number;
  perSpecificity:Array<{
    specificity:0|50|100;
    selectedTarget:number;
    selectedControl:number;
    ambiguous:number;
  }>;
  notes:string[];
}

/**
 * A diagnostic cohort table, not a statistical test. Pairs are identified
 * solely by a voluntary anonymous ID, exact model and writing revision.
 * For repeated runs in the same cell, the chronologically earliest is chosen
 * in advance to avoid result-dependent cherry-picking.
 */
export function summarizePairedBlindTrials(records:ImportedBlindTrial[]):PairedBlindSummary {
  const cohorts=new Map<string,Map<number,ImportedBlindTrial>>();
  const noCaseIdRounds=records.filter(x=>!x.caseId).length;
  let repeatedCells=0;
  const ordered=[...records].filter(r=>Boolean(r.caseId))
    .sort((a,b)=>a.generatedAt.localeCompare(b.generatedAt)||a.id.localeCompare(b.id));
  for(const record of ordered) {
    const key=JSON.stringify([record.caseId,record.model,record.writingVersion]);
    const slots=cohorts.get(key)??new Map<number,ImportedBlindTrial>();
    if(slots.has(record.specificity))repeatedCells++;
    else slots.set(record.specificity,record);
    cohorts.set(key,slots);
  }
  const complete=[...cohorts.values()].filter(m=>[0,50,100].every(s=>m.has(s)));
  const perSpecificity=([0,50,100] as const).map(s=>{
    const outcomes=complete.map(m=>m.get(s)!.outcome);
    return {
      specificity:s,
      selectedTarget:outcomes.filter(x=>x==='selected-target').length,
      selectedControl:outcomes.filter(x=>x==='selected-control').length,
      ambiguous:outcomes.filter(x=>x!=='selected-target'&&x!=='selected-control').length,
    };
  });
  let changedTowardTarget=0,changedTowardControl=0,unchangedDecisive=0,nonDecisivePairs=0;
  for(const m of complete) {
    const before=m.get(0)!.outcome,after=m.get(100)!.outcome;
    const decisive=(x:string)=>x==='selected-target'||x==='selected-control';
    if(!decisive(before)||!decisive(after))nonDecisivePairs++;
    else if(before==='selected-control'&&after==='selected-target')changedTowardTarget++;
    else if(before==='selected-target'&&after==='selected-control')changedTowardControl++;
    else unchangedDecisive++;
  }
  const notes=[
    '本页配对使用匿名样本编号、模型名和文案版本匹配，不能确认不同文件确实来自同一命盘、同一参与者。',
    '每个明确度只选同组最早的一轮；重复测试及相同参与者的结果不视作独立样本。',
  ];
  if(complete.length===0)notes.push('还没有同一匿名编号、同一模型的 0／50／100 三档完整组合。');
  if(complete.length>0&&complete.length<10)notes.push('完整配对样本较少，指标仅供探索，不作显著性或预测效度判断。');
  if(repeatedCells)notes.push('部分样本在同一明确度有多次结果，已固定保留最早一次，避免按结果挑选。');
  if(noCaseIdRounds)notes.push('未填写匿名编号的结果未进入配对分析。');
  return {
    cohorts:cohorts.size,
    completeTriplets:complete.length,
    incompleteCohorts:cohorts.size-complete.length,
    repeatedCells,
    noCaseIdRounds,
    pairedDecisive:complete.length-nonDecisivePairs,
    changedTowardTarget,changedTowardControl,unchangedDecisive,nonDecisivePairs,
    perSpecificity,notes,
  };
}
