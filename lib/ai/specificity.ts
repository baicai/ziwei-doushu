/**
 * Display specificity is an editorial / evaluation parameter, not sampling
 * temperature, a probability, an epistemic confidence score or a property of
 * the underlying natal chart. Zero means no EXTRA experimental prompt;
 * the core public-writing prompt is independently versioned and may improve.
 */
export const DEFAULT_SPECIFICITY = 0;
export const MAX_SPECIFICITY = 100;
export type SpecificityBand = 'baseline' | 'focused' | 'observable' | 'contrasting' | 'falsifiable';

export function parseSpecificity(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
    ? value : DEFAULT_SPECIFICITY;
}

export function specificityBand(value: number): SpecificityBand {
  if (value < 20) return 'baseline';
  if (value < 40) return 'focused';
  if (value < 60) return 'observable';
  if (value < 80) return 'contrasting';
  return 'falsifiable';
}

export function specificityLabel(value: number): string {
  const labels: Record<SpecificityBand,string> = {
    baseline:'直白解读（默认）',
    focused:'重点突出',
    observable:'具体行为',
    contrasting:'场景与反例',
    falsifiable:'可核验假设',
  };
  return labels[specificityBand(value)];
}

const GUARD = '重要：描述明确度不代表预测准确率、统计置信度或命盘可靠性。不可为了追求具体程度编造人物经历、事件、日期、结果或命盘事实。若现有规则不足以支持更具体的特征，明确回答“当前命盘资料不足以支持更具体的判断”，不要用确定语气弥补证据不足。每条具体描述须指出对应的宫位或星曜组合依据；传统象征只是待检验假设，不是科学验证的人格事实。';

export function specificityInstructions(value: number): string {
  const band = specificityBand(value);
  if (band === 'baseline') return '';
  const instructions: Record<Exclude<SpecificityBand,'baseline'>,string> = {
    focused:'相较默认模式，请减少任何人都适用的描述，选出最具代表性的1—2个不同倾向；每条用“当…时，可能倾向…”的条件表达，附一句其传统命盘依据。',
    observable:'在重点倾向基础上，将至少2个特征写成日常能观察的行动模式，分别包含：具体情境、可能采取的行为、和自身经历核对的一问。不允许捏造用户确实做过这些行为。',
    contrasting:'请提出3条有辨识度的“情境→倾向行为”的具体假设；同时对每条补充一条相反表现或不适用条件，指出什么情形下该解释不成立，避免通用的两面话。',
    falsifiable:'请输出3条彼此不同且可被用户经历否定的行为假设：每条都包括适用情境、预期的可观察做法、对照证据、反例/否定条件，以及可通过过去6—12个月真实经历核实的提问。只从现有宫位与组合推导，不猜实际经历、职业、财富或人际事件；缺乏证据时宁可输出“证据不足”，不可凑数。',
  };
  return GUARD + '\n' + instructions[band];
}

/**
 * Added equally to both default and detailed styles. Preserves existing
 * narrative scope while improving the *advice* rather than sharpening claims.
 */
export const ACTIONABLE_GUIDANCE =
  '解读完后另加【可以怎么做】小节，给出2—3条普通人可尝试、具体且低风险的行动建议。每条包含：适用情境、下一步可以做的小行动、如何判断是否有帮助。建议只基于文本中已解释的传统主题和用户主动提出的问题，不要空泛说“提高自己”“多沟通”“注意风险”。不得把建议表述为必须执行或结果保证。';
