import type { BlindBirthSample } from './blind-evaluation';

/**
 * Conservative heuristic guard against compromising an A/B blind experiment.
 * It can catch explicit birth metadata and identity disclosures, not subtle
 * stylistic hints or inferred chart details. It is NOT a privacy sanitizer.
 */
export type BlindLeakCheck = { usable: boolean; flags: string[] };
export function checkBlindAnswerLeakage(
  answers:readonly string[],
  samples:readonly BlindBirthSample[],
):BlindLeakCheck {
  const flags=new Set<string>();
  for(const answer of answers) {
    const text=answer.normalize('NFKC');
    if(/(?:出生[年月日期时辰信息]|生于|出生于|公历生日|农历生日)/.test(text))
      flags.add('模型提到了出生资料，可能破坏盲态');
    if(/(?:这是|属于|来自|对应|使用)(?:一份|一个|该|这份|真实的|合成的|虚构的|对照的|用户的)?(?:真实|合成|虚构|对照)(?:盘|命盘|样本|资料)/.test(text) ||
      /(?:真实命盘|合成命盘|对照命盘|虚构命盘)/.test(text))
      flags.add('模型尝试揭示样本来源');
    for(const sample of samples) {
      const y=String(sample.year);
      const escaped='(?:^|[^0-9])'+y+'(?:[^0-9]|$)';
      if(new RegExp(escaped).test(text))flags.add('出现出生年份');
      const dateForms=[
        new RegExp(y+'\\s*[年/-]\\s*0?'+sample.month+'\\s*[月/-]\\s*0?'+sample.day+'(?:日|号)?'),
        new RegExp('(?:出生|生辰).{0,16}'+sample.month+'月'+sample.day+'日'),
      ];
      if(dateForms.some(exp=>exp.test(text)))flags.add('出现出生日期');
    }
  }
  return {usable:flags.size===0,flags:[...flags]};
}
