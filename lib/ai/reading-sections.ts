import { OFFLINE_TOPICS, type OfflineTopic } from '../ziwei/offline-interpretation';

export const PUBLIC_TOPIC_HEADINGS:Record<OfflineTopic,string>={
  overview:'命格',love:'感情',career:'事业',wealth:'财运',health:'健康',personality:'性格',
};
export const PUBLIC_TOPIC_ORDER=OFFLINE_TOPICS.map(t=>t.key);
export type AiReadingSection={key:OfflineTopic;label:string;text:string;referenceIds:string[]};

/**
 * A model might omit a section: return only sections truly present, never
 * silently attribute a generic paragraph to a specific palace.
 */
export function parseSixTopicAnswer(answer:string):AiReadingSection[]{
  // Support both prescribed 【主题】 and common model Markdown headings
  // (## 主题). Do not mistake everyday mentions inside prose for a chapter.
  const titles='命格|感情|事业|财运|健康|性格';
  const head=new RegExp(
    '(?:^|\\n)[ \\t]*(?:'+
      '(?:#{1,4}[ \\t]+)(?:\\*\\*)?('+titles+')(?:\\*\\*)?[ \\t]*(?=\\r?\\n|$)'+
      '|(?:#{1,4}[ \\t]*)?(?:\\*\\*)?【('+titles+')】(?:\\*\\*)?[ \\t]*'+
    ')','g');

  const found=Array.from(answer.matchAll(head));
  const byLabel=new Map<string,AiReadingSection>();
  for(let i=0;i<found.length;i++){
    const label=found[i][1]||found[i][2];
    if(byLabel.has(label))continue;
    const begin=(found[i].index??0)+found[i][0].length;
    const end=found[i+1]?.index??answer.length;
    let raw=answer.slice(begin,end).trim();
    // Experimental hypothesis appendix is not part of the last 性格 chapter.
    const appendix=raw.search(/(?:^|\n)\s*(?:\*\*)?【(?:待核验假设[123]|假设[123]|可以怎么做|实验反馈)】/);
    if(appendix>=0)raw=raw.slice(0,appendix).trim();
    if(!raw)continue;
    const referenceIds=Array.from(raw.matchAll(/\[依据:([^\]]+)\]/g)).flatMap(m=>
      m[1].split(',').map(x=>x.trim()).filter(x=>/^P\d+(?::S\d+)?$/.test(x)));
    const key=(Object.entries(PUBLIC_TOPIC_HEADINGS).find(([,v])=>v===label)?.[0]) as OfflineTopic|undefined;
    if(key){
      byLabel.set(label,{key,label,text:raw.replace(/\[依据:[^\]]+\]/g,'').trim(),referenceIds:[...new Set(referenceIds)]});
    }
  }
  return PUBLIC_TOPIC_ORDER.flatMap(key=>{const v=byLabel.get(PUBLIC_TOPIC_HEADINGS[key]);return v?[v]:[];});
}
export function sixTopicFormatComplete(answer:string){
  return parseSixTopicAnswer(answer).length===PUBLIC_TOPIC_ORDER.length;
}
