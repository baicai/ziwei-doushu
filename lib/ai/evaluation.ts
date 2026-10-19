/**
 * Opt-in, browser-only experimental review export.
 * Never includes birth date, time, location, name, or the full chart payload.
 * AI-generated text and user notes still may contain personal information:
 * users must inspect the export before sharing it.
 */
export type HumanReview = 'matches' | 'contradicts' | 'not_verifiable' | 'too_generic';
export interface ExperimentRun {
  specificity: number;
  model: string;
  answer: string;
  audit: {
    cited: Array<{id:string;fact:string}>;
    invalidIds: string[];
    citationCount: number;
    scope: 'reference-existence-only';
    facts?: {
      matchingCount:number;
      contradictionCount:number;
      scope:'partial-natal-facts-only';
    };
  } | null;
  review: HumanReview | null;
  note: string;
}

export const REVIEW_LABELS: Record<HumanReview,string> = {
  matches:'具体且符合经历',
  contradicts:'具体但不符合',
  not_verifiable:'无法验证',
  too_generic:'过于宽泛',
};

export function buildExperimentExport(caseId:string,runs:ExperimentRun[],timestamp:string) {
  return {
    schema:'iziwei-ai-evaluation-v1',
    sampleId:caseId.trim().slice(0,64) || null,
    exportedAt:timestamp,
    warning:'仅为用户自愿提供的主观反馈；不代表预测准确性或命理体系的科学有效性。导出包括 AI 文本及笔记，分享前请检查是否包含私人信息。',
    birthDataIncluded:false,
    summary:summarizeExperimentRuns(runs),
    runs:runs.map((run,index)=>({
      runIndex:index+1,
      model:run.model,
      specificity:run.specificity,
      // Keep user-authored notes short and retain no birth form or chart.
      answer:run.answer,
      referenceCount:run.audit?.cited.length ?? null,
      invalidReferenceIds:run.audit?.invalidIds ?? [],
      parsedFactMatches:run.audit?.facts?.matchingCount ?? null,
      parsedFactContradictions:run.audit?.facts?.contradictionCount ?? null,
      humanReview:run.review,
      humanReviewLabel:run.review?REVIEW_LABELS[run.review]:null,
      notes:run.note.slice(0,500),
    })),
  };
}

/**
 * Counts observations, not "accuracy". Different runs / people / cases are
 * not statistically independent, and unverifiable feedback stays distinct.
 */
export function summarizeExperimentRuns(runs:ExperimentRun[]) {
  const groups=new Map<number,{
    specificity:number; runs:number; matchingReferences:number;
    contradictedReferences:number; matchedReviews:number; contradictedReviews:number;
    tooGenericReviews:number; notVerifiableReviews:number; unansweredReviews:number;
  }>();
  for(const run of runs) {
    const group=groups.get(run.specificity)??{
      specificity:run.specificity,runs:0,matchingReferences:0,contradictedReferences:0,
      matchedReviews:0,contradictedReviews:0,tooGenericReviews:0,
      notVerifiableReviews:0,unansweredReviews:0,
    };
    group.runs++;
    group.matchingReferences+=run.audit?.facts?.matchingCount??0;
    group.contradictedReferences+=run.audit?.facts?.contradictionCount??0;
    switch(run.review) {
      case 'matches': group.matchedReviews++; break;
      case 'contradicts': group.contradictedReviews++; break;
      case 'too_generic': group.tooGenericReviews++; break;
      case 'not_verifiable': group.notVerifiableReviews++; break;
      default:group.unansweredReviews++;
    }
    groups.set(run.specificity,group);
  }
  return [...groups.values()].sort((a,b)=>a.specificity-b.specificity);
}
