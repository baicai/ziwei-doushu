import type { Palace, Star, ZiweiChart } from './types';
import { OFFLINE_TOPICS, type OfflineTopic } from './offline-interpretation';

/**
 * Human-readable traditional-cultural reading. Only the chart is factual.
 * Phrases describe traditional star symbolism, not verified personality,
 * diagnosis, investment outcome or predictions.
 */
export interface PlainSection {
  key: OfflineTopic;
  title: string;
  lead: string;
  observation: string;
  suggestion: string;
  evidence: string;
}

const MEANINGS: Record<string,string> = {
  紫微: '统筹安排、承担责任',
  天机: '思考问题、寻找替代办法',
  太阳: '公开表达、主动投入',
  武曲: '执行计划、管理资源',
  天同: '重视舒适、协调关系',
  廉贞: '处理规则、界限和复杂关系',
  天府: '长期安排、稳步积累',
  太阴: '细致观察、耐心规划',
  贪狼: '探索新事物、拓展社交',
  巨门: '分析信息、沟通和质疑',
  天相: '协作配合、遵循秩序',
  天梁: '借助经验、承担照顾与责任',
  七杀: '独立决定、应对变化',
  破军: '打破旧做法、重新开始',
};

const TOPIC_META: Record<OfflineTopic, {
  name:string; label:string; subject:string; suggestion:string;
}> = {
  overview: {
    name:'命', label:'整体特点', subject:'处理事情时的整体倾向',
    suggestion:'想一想：遇到需要改变现状的事情，你更擅长做决定，还是让改变持续落地？',
  },
  personality: {
    name:'命', label:'性格与处事', subject:'思考和行动的传统象征',
    suggestion:'对照自己的真实经历：这些描述哪些贴近你，哪些完全不适合你？不需要为了命盘给自己贴标签。',
  },
  love: {
    name:'夫妻', label:'感情与相处', subject:'亲密关系中的互动方式',
    suggestion:'相处时更重要的是实际沟通：双方是否能表达需求、尊重界限并一起处理分歧。',
  },
  career: {
    name:'官禄', label:'事业与工作', subject:'工作职责与发挥能力的方式',
    suggestion:'结合自己的经验，考虑哪类岗位真正需要你的能力；重大职业选择仍要看现实机会与风险。',
  },
  wealth: {
    name:'财帛', label:'金钱与资源', subject:'管理金钱与资源的取向',
    suggestion:'可以检视预算、现金流、储蓄和风险承受能力。命盘无法判断收益或预测盈亏。',
  },
  health: {
    name:'疾厄', label:'生活与健康', subject:'传统文本中与生活节奏有关的象征',
    suggestion:'健康状况不能由星曜判断；实际应关注生活习惯，并以医学检查和医生判断为准。',
  },
};

function norm(value:string):string {
  return value.replace(/宫$/, '').replace('交友','仆役');
}
function findPalace(chart:ZiweiChart,name:string):Palace|undefined {
  return chart.palaces.find(p=>norm(p.name)===name);
}
function majors(p?:Palace):Star[] {return p?.stars.filter(s=>s.type==='major') ?? [];}
function focusStars(chart:ZiweiChart,p?:Palace):{stars:Star[],borrowed:boolean,origin?:Palace} {
  if (!p) return {stars:[],borrowed:false};
  const own=majors(p);
  if (own.length) return {stars:own,borrowed:false,origin:p};
  const opposite=chart.palaces.find(q=>q.branch===(p.branch+6)%12);
  return {stars:majors(opposite),borrowed:true,origin:opposite};
}

function describeSiHua(stars:Star[]):string {
  const markers=stars.filter(s=>s.siHua);
  if(!markers.length)return '';
  const change = markers.map(s=>{
    switch(s.siHua){
      case '权': return '对承担责任、推进事情的关注';
      case '禄': return '对投入、资源和机会的关注';
      case '科': return '对表达、口碑和协作的关注';
      case '忌': return '对阻力、取舍和需要反复处理的问题的关注';
      default: return '';
    }
  }).filter(Boolean);
  return change.length?' 盘中的四化还提醒，可以同时留意'+Array.from(new Set(change)).slice(0,2).join('，以及')+'。':'';
}
function evidenceFor(p:Palace|undefined,stars:Star[],borrowed:boolean):string {
  if(!p)return '当前未找到对应的宫位资料。';
  const description=stars.length?stars.map(s=>s.name+(s.siHua?'化'+s.siHua:'')).join('、'):'无直接主星';
  return p.name + (borrowed?'（空宫，借对宫参考）':'') + '：' + description + '。';
}

export function buildPlainSections(chart:ZiweiChart):PlainSection[] {
  return OFFLINE_TOPICS.map(item=>{
    const key=item.key, meta=TOPIC_META[key];
    const palace=findPalace(chart,meta.name);
    if (!palace) return {key,title:meta.label,lead:'当前缺少足够的命盘资料。',
      observation:'无法形成对应的传统文化解释。',suggestion:meta.suggestion,
      evidence:'未找到'+meta.name+'宫。'};
    const focus=focusStars(chart,palace);
    const descriptions=Array.from(new Set(focus.stars.map(s=>MEANINGS[s.name]).filter(Boolean))).slice(0,2);
    const starNames=focus.stars.map(s=>s.name).join('、');
    const subjects:Record<OfflineTopic,string>={
      overview:'这张盘的整体传统象征',personality:'性格和处事的传统象征',
      love:'亲密关系宫位的传统象征',career:'工作宫位的传统象征',
      wealth:'财务宫位的传统象征',health:'与生活节奏相关的传统象征',
    };
    let lead= descriptions.length
      ? subjects[key]+'，常与'+descriptions.join('，以及')+'联系在一起。'
      : subjects[key]+'需要结合关联宫位理解，不能只凭本宫有没有主星作判断。';
    if (focus.borrowed) lead='这一宫没有直接落入的主星，传统上会参考对面的宫位。'+lead;
    if (key==='health')
      lead='这张盘在传统文化中常被拿来讨论生活节奏和照顾自己的方式，但它不能反映真实身体状况。'
        +(descriptions.length?' 关联的星曜常与'+descriptions.join('、')+'等象征有关。':'');
    const relevant=focus.stars.filter(s=>s.siHua);
    const observation=key==='health'
      ? '不要把这里的「吉」「凶」理解成病症或健康风险。'
      : (relevant.length
        ? describeSiHua(relevant).trim()
        : '这些只是传统解释中的一个观察角度，不能推出某件事一定会发生。');
    const suggestion=meta.suggestion;
    return {key,title:meta.label,lead,observation,suggestion,
      evidence:evidenceFor(palace,focus.stars,focus.borrowed)+(focus.borrowed
        ? '借用参考来自'+(focus.origin?.name||'对宫')+'，不等于星曜实际落在'+palace.name+'。':'')};
  });
}

export function buildPlainTextReport(chart:ZiweiChart,year:number):string {
  const lines=[
    '紫微研究 · 命盘解读（通俗版）',
    chart.birthInfo.name ? '称呼：'+chart.birthInfo.name : '',
    '出生日期（用于排盘的公历）：'+
      [chart.birthInfo.year,chart.birthInfo.month,chart.birthInfo.day].join('-'),
    '',
    '这份内容是依据当前命盘生成的传统文化解释，并非 AI 分析或现实预测。',
    chart.birthInfo.timePrecision==='unknown'
      ? '出生时辰不详：当前仅是一张试排盘，宫位和解读都有可能变化。' : '',
    '',
  ];
  for(const section of buildPlainSections(chart)){
    lines.push('【'+section.title+'】',section.lead,section.observation,section.suggestion,'');
  }
  const dx=chart.daXians?.[chart.currentDaXianIndex];
  if(dx){
    lines.push('【当前阶段参考】',
      '按照这张命盘的传统时间划分，'+dx.startAge+'—'+dx.endAge+
      '岁以「'+dx.palaceName+'」为重点观察主题。它不代表这一年龄段一定发生某种事件。','');
  }
  lines.push('【'+year+' 年参考】',
    '流年分析仍在完善。这一版只提供年干四化参考，尚未完成春节／立春交界核对，不宜用来预测年度事件。','',
    '内容仅供传统文化学习，不是医疗、法律、投资等专业建议。');
  return lines.filter((line,i)=>line || (i>0&&lines[i-1]!=='')).join('\n');
}
