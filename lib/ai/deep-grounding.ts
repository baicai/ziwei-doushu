import type { ZiweiChart } from '../ziwei/types';
import { chartEvidence, type ChartEvidence } from '../ziwei/chart-evidence';
import { checkAiChartFacts } from '../ziwei/ai-fact-check';
import { parseSixTopicAnswer } from './reading-sections';
import { OFFLINE_TOPICS, type OfflineTopic } from '../ziwei/offline-interpretation';

/**
 * This audits traceability of model citations against each chapter's own natal
 * palace network. The underlying anchors are calculated, not model-generated.
 * Matching a reference or a natal placement never validates a life inference.
 */
export interface DeepChapterGrounding {
  topic: OfflineTopic;
  label: string;
  chapterPresent: boolean;
  focus: ChartEvidence | null;
  opposite: ChartEvidence | null;
  relevantCitations: string[];
  supplementalCitations: string[];
  hasRelevantCitation: boolean;
  explicitFactMatches: number;
  explicitFactConflicts: number;
}
export interface DeepGroundingResult {
  scope: 'per-chapter-natal-traceability';
  chapters: DeepChapterGrounding[];
  limitation: string;
}

const FOCUS: Record<OfflineTopic,string> = {
  overview:'命', love:'夫妻', career:'官禄',
  wealth:'财帛', health:'疾厄', personality:'命',
};
function normalize(value:string) {
  const base=value.replace(/宫$/,'');
  return base==='交友'?'仆役':base;
}

export function buildDeepChapterGrounding(chart:ZiweiChart,answer:string):DeepGroundingResult {
  const catalog=chartEvidence(chart);
  const byId=new Map(catalog.map(item=>[item.id,item]));
  const sections=parseSixTopicAnswer(answer);
  const chapters=OFFLINE_TOPICS.map(topic=>{
    const palace=chart.palaces.find(p=>normalize(p.name)===FOCUS[topic.key]);
    const section=sections.find(c=>c.key===topic.key);
    const main=palace?.branch;
    const branches=main===undefined ? new Set<number>() : new Set([
      main,(main+6)%12,(main+4)%12,(main+8)%12,
    ]);
    const focus=main===undefined?null:byId.get('P'+main)??null;
    const opposite=main===undefined?null:byId.get('P'+((main+6)%12))??null;
    const relevantCitations:string[]=[];
    const supplementalCitations:string[]=[];
    for(const id of section?.referenceIds??[]){
      const evidence=byId.get(id);
      if(!evidence)continue; // The separate catalog audit reports invalid IDs.
      if(branches.has(evidence.palaceBranch))relevantCitations.push(id);
      else supplementalCitations.push(id);
    }
    const check=section?checkAiChartFacts(section.text,chart):null;
    return {
      topic:topic.key,label:topic.label,chapterPresent:!!section,
      focus,opposite,relevantCitations,supplementalCitations,
      hasRelevantCitation:relevantCitations.length>0,
      explicitFactMatches:check?.matchingCount??0,
      explicitFactConflicts:check?.contradictionCount??0,
    };
  });
  return {
    scope:'per-chapter-natal-traceability',chapters,
    limitation:'每章核心宫位及对宫事实来自排盘引擎。相关引用仅表明编号属于本章本宫／对宫／三方；自动识别星曜句式的范围有限，两种核对均不证明人生解释成立。',
  };
}
