import type { BirthInfo } from '../ziwei/types';

/** The comparison chart is synthetic, never another person's birth record. */
export interface BlindBirthSample {
  year:number; month:number; day:number; hour:number;
  gender:'male'|'female';
  timePrecision:'known';
}

export type BlindChoice='A'|'B'|'both'|'neither'|'unsure';
export type BlindOutcome='selected-target'|'selected-control'|'both'|'neither'|'unsure';
export type BlindPosition='A'|'B';

export interface BlindPanel {
  label:BlindPosition;
  answer:string;
  model:string;
  writingVersion?:string;
}
export interface BlindComparison {
  panels:[BlindPanel,BlindPanel];
  targetPosition:BlindPosition; // Only revealed after committing a choice.
  specificity:number;
  generatedAt:string;
}

/**
 * Remove all identifiers, original-clock metadata, city, and longitude from
 * the request. The adjusted Gregorian date and 12-branch birth hour are enough
 * for the natal chart engine and consistent between target and synthetic.
 */
export function minimalBlindBirth(birth:BirthInfo):BlindBirthSample {
  return {year:birth.year,month:birth.month,day:birth.day,hour:birth.hour,
    gender:birth.gender,timePrecision:'known'};
}

/** Not a match to a real person. Calendar-valid, deliberately distinct. */
export function syntheticControlBirth(birth:BirthInfo):BlindBirthSample {
  if(!Number.isInteger(birth.year)||birth.year<1900||birth.year>2100 ||
    !Number.isInteger(birth.month)||birth.month<1||birth.month>12 ||
    !Number.isInteger(birth.hour)||birth.hour<0||birth.hour>11)
    throw new RangeError('不能为无效出生资料创建盲评对照');
  return {
    year:1900+(birth.year-1900+13)%201,
    month:1+(birth.month+3)%12,
    day:15,
    hour:(birth.hour+5)%12,
    gender:birth.gender,
    timePrecision:'known',
  };
}
export const BLIND_COMPARISON_QUESTION =
  '请仅从提供的传统命盘事实给出通俗中文解读，覆盖整体处事、工作、关系与金钱管理，并提供可在现实中检验或否定的行为假设和反例。不预测确定事件；不得猜测或泄露出生年份、年月日、时辰、地域、年龄、姓名、性别等身份线索。不要声明这份命盘是真实出生资料还是合成样本。不要将已发生的个人经历当作已知事实。';

export function buildBlindComparison(
  own:{answer:string;model:string;writingVersion?:string},
  synthetic:{answer:string;model:string;writingVersion?:string},
  targetFirst:boolean,
  specificity:number,
  generatedAt:string,
):BlindComparison {
  if(!own.answer.trim()||!synthetic.answer.trim())
    throw new RangeError('两份 AI 内容均须生成成功才能开始盲评');
  return {
    panels:[
      {label:'A',...(targetFirst?own:synthetic)},
      {label:'B',...(targetFirst?synthetic:own)},
    ],
    targetPosition:targetFirst?'A':'B',
    specificity,
    generatedAt,
  };
}
export function assessBlindChoice(choice:BlindChoice,targetPosition:BlindPosition):BlindOutcome {
  if(choice==='both'||choice==='neither'||choice==='unsure')return choice;
  return choice===targetPosition?'selected-target':'selected-control';
}
export function exportBlindResult(
  trial:BlindComparison,choice:BlindChoice,caseId:string,submittedAt:string,
) {
  const outcome=assessBlindChoice(choice,trial.targetPosition);
  return {
    schema:'iziwei-blind-comparison-v1',
    caseId:caseId.trim().slice(0,64)||null,
    generatedAt:trial.generatedAt,
    submittedAt,
    specificity:trial.specificity,
    models:[...new Set(trial.panels.map(x=>x.model))],
    writingVersions:[...new Set(trial.panels.map(x=>x.writingVersion??'untracked'))],
    choice,
    targetPosition:trial.targetPosition,
    outcome,
    isScientificAccuracy:false,
    controlType:'synthetic-generated-birth',
    birthDataIncluded:false,
    explanation:'自我匹配的弱盲评；合成对照命盘不是另一个真实人，单次选择不能推导命理预测准确率。导出包含 AI 文本，用户应检查个人隐私。',
    panels:trial.panels.map(p=>({label:p.label,answer:p.answer,model:p.model,
      writingVersion:p.writingVersion??'untracked'})),
  };
}
