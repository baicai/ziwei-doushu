import { assessBlindChoice, type BlindChoice, type BlindPosition, type BlindOutcome } from './blind-evaluation';

/**
 * Pure, offline, aggregate-only importer. Do not keep raw answers from files:
 * they may include sensitive personal details even when birthDataIncluded=false.
 * This does not provide scientific evidence of predictive validity.
 */
export interface ImportedBlindTrial {
  id:string;
  caseId:string|null;
  specificity:number;
  model:string;
  writingVersion:string;
  generatedAt:string;
  submittedAt:string;
  choice:BlindChoice;
  targetPosition:BlindPosition;
  outcome:BlindOutcome;
}
export interface BlindGroupStats {
  specificity:number;
  count:number;
  target:number;
  control:number;
  both:number;
  neither:number;
  unsure:number;
  decisive:number;
  targetShareOfDecisive:number|null;
  targetShareOfAll:number;
  ambiguityShare:number;
  targetA:number;
  targetB:number;
  uniqueCaseIds:number;
  unlabelledCount:number;
  repeatedCaseCount:number;
  models:string[];
  writingVersions:string[];
}
export interface BlindSummary {
  total:number;
  groups:BlindGroupStats[];
  uniqueCaseIds:number;
  unlabelledCount:number;
  repeatedCaseCount:number;
  modelCount:number;
  writingVersionCount:number;
  warning:string[];
}
const MAX_TRIALS=500;
const validChoices=['A','B','both','neither','unsure'];
function object(value:unknown):value is Record<string,unknown> {
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function isoDate(v:unknown):v is string {
  return typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v)&&
    !Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,19)===v.slice(0,19);
}
function cleanCase(v:unknown):string|null {
  return typeof v==='string'&&v.trim()?v.trim().slice(0,64):null;
}
export function parseBlindExport(value:unknown):ImportedBlindTrial {
  if(!object(value) || value.schema!=='iziwei-blind-comparison-v1' ||
    value.controlType!=='synthetic-generated-birth' ||
    value.birthDataIncluded!==false || value.isScientificAccuracy!==false)
    throw new Error('不是受支持的匿名盲评导出文件。');
  if(!Number.isInteger(value.specificity)||(value.specificity as number)<0||
     (value.specificity as number)>100)
    throw new Error('描述明确度必须为 0–100 的整数。');
  if(!isoDate(value.generatedAt)||!isoDate(value.submittedAt)||
    Date.parse(value.submittedAt)<Date.parse(value.generatedAt))
    throw new Error('实验时间无效或提交早于生成。');
  if(!validChoices.includes(value.choice as string)||
    (value.targetPosition!=='A'&&value.targetPosition!=='B'))
    throw new Error('缺少有效的选择或 A/B 位置。');
  const choice=value.choice as BlindChoice;
  const targetPosition=value.targetPosition as BlindPosition;
  if(value.outcome!==assessBlindChoice(choice,targetPosition))
    throw new Error('记录的盲评结果与原始选择及真实位置不一致。');
  if(!Array.isArray(value.panels)||value.panels.length!==2 ||
    !object(value.panels[0])||!object(value.panels[1])||
    value.panels[0].label!=='A'||value.panels[1].label!=='B'||
    !value.panels.every((panel:unknown)=>object(panel)&&
      typeof panel.answer==='string'&&panel.answer.length>0&&panel.answer.length<=16000&&
      typeof panel.model==='string'&&panel.model.length>0&&panel.model.length<=80))
    throw new Error('A/B 解读结构不完整。');
  const model=value.panels[0].model as string;
  if(value.panels[1].model!==model)
    throw new Error('A/B 使用了不同的模型，不符合单模型对照条件。');
  const writingVersions=value.panels.map((panel:Record<string,unknown>)=>panel.writingVersion??'untracked');
  if(writingVersions.some(v=>typeof v!=='string'||v.length<1||v.length>80) ||
    writingVersions[0]!==writingVersions[1])
    throw new Error('同一轮 A/B 的文案版本不一致。');
  const writingVersion=writingVersions[0] as string;
  const caseId=cleanCase(value.caseId);
  // Duplicate identity uses timestamps + source metadata, excluding raw model
  // text and any personal notes. Legitimate separate runs have new timestamps.
  const id=[value.generatedAt,value.submittedAt,caseId||'-',
    value.specificity,model,writingVersion,choice,targetPosition].join('|');
  return {
    id,caseId,specificity:value.specificity as number,model,writingVersion,
    generatedAt:value.generatedAt,submittedAt:value.submittedAt,
    choice,targetPosition,outcome:assessBlindChoice(choice,targetPosition),
  };
}

function repeatedCaseStats(records:ImportedBlindTrial[]) {
  const counts=new Map<string,number>();
  for(const record of records)if(record.caseId)
    counts.set(record.caseId,(counts.get(record.caseId)||0)+1);
  return {
    uniqueCaseIds:counts.size,
    unlabelledCount:records.filter(r=>!r.caseId).length,
    repeatedCaseCount:records.filter(r=>r.caseId&&(counts.get(r.caseId)||0)>1).length,
  };
}
function groupStats(specificity:number,records:ImportedBlindTrial[]):BlindGroupStats {
  const count=records.length;
  const target=records.filter(r=>r.outcome==='selected-target').length;
  const control=records.filter(r=>r.outcome==='selected-control').length;
  const both=records.filter(r=>r.outcome==='both').length;
  const neither=records.filter(r=>r.outcome==='neither').length;
  const unsure=records.filter(r=>r.outcome==='unsure').length;
  const decisive=target+control;
  return {
    specificity,count,target,control,both,neither,unsure,decisive,
    targetShareOfDecisive:decisive?target/decisive:null,
    targetShareOfAll:target/count,
    ambiguityShare:(both+neither+unsure)/count,
    targetA:records.filter(r=>r.targetPosition==='A').length,
    targetB:records.filter(r=>r.targetPosition==='B').length,
    ...repeatedCaseStats(records),
    models:[...new Set(records.map(r=>r.model))].sort(),
    writingVersions:[...new Set(records.map(r=>r.writingVersion))].sort(),
  };
}
export function summarizeBlindTrials(records:ImportedBlindTrial[]):BlindSummary {
  const unique=deduplicateBlindTrials(records).records;
  const groups=new Map<number,ImportedBlindTrial[]>();
  for(const record of unique) {
    const group=groups.get(record.specificity)||[];
    group.push(record);groups.set(record.specificity,group);
  }
  const allCases=repeatedCaseStats(unique);
  const allModels=new Set(unique.map(r=>r.model));
  const allWritingVersions=new Set(unique.map(r=>r.writingVersion));
  const warning:string[]=[];
  if(unique.length===0)warning.push('目前尚未导入有效的盲评结果。');
  if(unique.length>0&&unique.length<20)warning.push('总样本少于 20 轮，只适合探索性观察，不适合推断总体表现。');
  if(allCases.unlabelledCount)warning.push('部分记录没有匿名样本编号，无法确认是否来自同一位参与者。');
  if(allCases.repeatedCaseCount)warning.push('同一样本编号出现多轮结果；重复试验不能当作相互独立的参与者。');
  if(allModels.size>1)warning.push('记录混有不同模型版本，按明确度比较时存在模型差异影响。');
  if(allWritingVersions.size>1)warning.push('记录混有不同文案提示词版本（旧版与新版不能直接比较）；请筛选同版数据再分析。');
  const result=[...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([value,r])=>groupStats(value,r));
  for(const g of result) {
    if(g.count<10)warning.push('明确度 '+g.specificity+' 仅 '+g.count+' 轮，样本较少。');
    if(g.count>=10&&Math.min(g.targetA,g.targetB)<g.count*0.25)
      warning.push('明确度 '+g.specificity+' 的 A/B 位置分配明显不均衡，可能影响判断。');
  }
  return {
    total:unique.length,groups:result,...allCases,
    modelCount:allModels.size,writingVersionCount:allWritingVersions.size,warning,
  };
}
export function deduplicateBlindTrials(input:ImportedBlindTrial[]) {
  const seen=new Set<string>();
  const records:ImportedBlindTrial[]=[];
  let duplicates=0;
  for(const record of input) {
    if(seen.has(record.id)){duplicates++;continue;}
    if(records.length>=MAX_TRIALS)throw new Error('最多一次汇总 500 条不同的盲评记录。');
    seen.add(record.id);records.push(record);
  }
  return {records,duplicates};
}
export function exportBlindSummaryCsv(summary:BlindSummary):string {
  const lines=[
    'specificity,runs,selected_target,selected_control,both,neither,unsure,decisive,target_share_of_decisive,target_share_all,ambiguous_share,target_A,target_B,unique_case_ids,unlabelled,repeated_case_runs',
  ];
  for(const g of summary.groups) {
    const numbers=[g.specificity,g.count,g.target,g.control,g.both,g.neither,g.unsure,
      g.decisive,g.targetShareOfDecisive??'',g.targetShareOfAll,
      g.ambiguityShare,g.targetA,g.targetB,g.uniqueCaseIds,g.unlabelledCount,g.repeatedCaseCount];
    lines.push(numbers.join(','));
  }
  return '\ufeff'+lines.join('\r\n');
}
