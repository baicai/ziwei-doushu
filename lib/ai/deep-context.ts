import type { Palace, ZiweiChart } from '../ziwei/types';
import { OFFLINE_TOPICS, type OfflineTopic } from '../ziwei/offline-interpretation';
import { topicSynthesis } from '../ziwei/topic-synthesis';

/**
 * Fact-only deep-reading context. Values are computed from the existing chart,
 * never fabricated from user history. The model interprets them as traditional
 * symbolism; the data itself does not establish a user's personality.
 */
const CENTER:Record<OfflineTopic,string>={
  overview:'命',love:'夫妻',career:'官禄',wealth:'财帛',health:'疾厄',personality:'命',
};
const EXTRAS:Record<OfflineTopic,string[]>={
  overview:['福德','身'],love:['福德','命'],career:['命','财帛','迁移'],
  wealth:['田宅','官禄','福德'],health:['福德','命'],personality:['福德','迁移'],
};
function normalized(name:string){return name.replace(/宫$/,'').replace('交友','仆役');}
function starFacts(p:Palace){
  return {
    name:p.name,branch:p.branch,empty:!p.stars.some(s=>s.type==='major'),
    borrowedStars:p.borrowedStars||[],
    main:p.stars.filter(s=>s.type==='major').map(s=>({
      name:s.name,brightness:s.brightnessRaw||null,birthYearSihua:s.siHua||null,
    })),
    helpers:p.stars.filter(s=>s.type==='lucky').map(s=>s.name),
    pressures:p.stars.filter(s=>s.type==='sha').map(s=>s.name),
    otherBirthYearSihua:p.stars.filter(s=>s.type!=='major'&&s.siHua).map(s=>s.name+'化'+s.siHua),
    selfTransformation:(p.selfSihua||[]).map(m=>m.starName+'自化'+m.siHua),
  };
}
export function buildDeepReadingContext(chart:ZiweiChart){
  const byName=(name:string)=>chart.palaces.find(p=>normalized(p.name)===normalized(name));
  const byBranch=(branch:number)=>chart.palaces.find(p=>p.branch===(branch+12)%12);
  const chapters=OFFLINE_TOPICS.map(topic=>{
    const center=byName(CENTER[topic.key]);
    if(!center)return {key:topic.key,label:topic.label,available:false,limitations:['关键宫位缺失']};
    const companion=[
      ['本宫',center],
      ['对宫',byBranch(center.branch+6)],
      ['三合之一',byBranch(center.branch+4)],
      ['三合之二',byBranch(center.branch+8)],
    ] as const;
    const constellation=companion.flatMap(([relationship,p])=>p
      ? [{relationship,details:starFacts(p)}] : []);
    const inNetwork=new Set(constellation.map(x=>x.details.branch));
    const supplements=EXTRAS[topic.key].map(byName).filter((p):p is Palace=>Boolean(p))
      .filter(p=>!inNetwork.has(p.branch))
      .map(starFacts);
    return {
      key:topic.key,label:topic.label,available:true,
      traditionalScope:topicSynthesis(chart,topic.key),
      constellation,supplements,
      limitations:topic.key==='health'
        ? ['仅分析生活作息与压力应对；禁止疾病或寿命推断']
        : topic.key==='wealth'
          ? ['仅分析金钱决策和资源取舍；不得推断真实收入、投资结果']
          : ['传统命盘结构不是已证实的人格与经历证据'],
    };
  });
  return {
    scope:'natal-structure-only' as const,
    timePrecision:chart.birthInfo.timePrecision??'known',
    mingZhu:chart.mingZhu||null,shenZhu:chart.shenZhu||null,
    mingGongBranch:chart.mingGongBranch,shenGongBranch:chart.shenGongBranch,
    wuxingJuName:chart.wuxingJuName,
    chapters,
    note:'本资料只含实际排盘结构与传统解释条件；无真实经历、身份或预测事件。',
  };
}
