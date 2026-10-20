/**
 * Parse the 80–100 specificity experimental output into reviewable hypotheses.
 * This only extracts text; it neither validates the claims nor infers a
 * correlation between the chart and a person's real-world characteristics.
 */
export interface ReviewableHypothesis {
  id: 'H1' | 'H2' | 'H3';
  text: string;
  hasCounterexample: boolean;
  hasChartReference: boolean;
}
export interface HypothesisFormatCheck {
  hypotheses: ReviewableHypothesis[];
  complete: boolean;
  warning: string | null;
}

export const HYPOTHESIS_FORMAT_INSTRUCTIONS =
  '仅在实验性高明确度输出中，单独增加【待核验的三条假设】部分。使用三个独占一行的固定标题：【待核验假设1】、【待核验假设2】、【待核验假设3】。每个标题下分别写：①情境；②可观察的倾向行为；③对应的命盘依据（用[依据:P数字]引用）；④反例/不适用条件；⑤用户可以用过去6—12个月的经历回答的核对问题。禁止编造用户经历。没有充足证据时写“证据不足”，不要为了凑数编造。三条之后再写【可以怎么做】。';

export function parseReviewableHypotheses(answer: string): HypothesisFormatCheck {
  const matches=Array.from(answer.matchAll(/(?:^|\n)[ \t]*(?:\*\*)?【(?:待核验)?假设\s*([123])】(?:\*\*)?[ \t]*/g));
  const entries=new Map<number,ReviewableHypothesis>();
  for(let i=0;i<matches.length;i++){
    const match=matches[i];
    const n=Number(match[1]);
    if(entries.has(n)) continue; // Duplicate ID is a format error.
    let until=matches[i+1]?.index??answer.length;
    const rest=answer.slice((match.index??0)+match[0].length,until);
    const stop=rest.search(/(?:^|\n)\s*(?:\*\*)?【(?:可以怎么做|实际建议|行动建议|结语|免责声明)】/);
    if(stop>=0)until=(match.index??0)+match[0].length+stop;
    const text=answer.slice((match.index??0)+match[0].length,until).trim().slice(0,1200);
    if(!text)continue;
    entries.set(n,{
      id:(('H'+n) as ReviewableHypothesis['id']),
      text,
      hasCounterexample:/反例|不适用|不成立|相反表现|否定条件/.test(text),
      hasChartReference:/\[依据:P\d+(?::S\d+)?/.test(text),
    });
  }
  const hypotheses=Array.from(entries.values()).sort((a,b)=>a.id.localeCompare(b.id));
  const uniqueThree=matches.length===3 && hypotheses.length===3;
  const complete=uniqueThree && hypotheses.every(h=>h.hasCounterexample&&h.hasChartReference);
  return {
    hypotheses,
    complete,
    warning:complete?null:
      '模型未完整按实验模板给出三条包含命盘依据和反例的假设。这份内容可以阅读，但不能按“标准化完成的三条假设”计入有效评测样本。',
  };
}
