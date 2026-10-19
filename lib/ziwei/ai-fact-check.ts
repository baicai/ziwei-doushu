import type { ZiweiChart } from './types';

/**
 * A deliberately high-precision *partial* checker. It only checks explicit,
 * straightforward natal-placement, empty-palace and birth-year sihua phrases.
 * Unsupported language is not counted as verified; no claims about a person's
 * life, psychology or future can be validated by this function.
 */
const PALACES = ['命宫','兄弟宫','夫妻宫','子女宫','财帛宫','疾厄宫',
  '迁移宫','交友宫','仆役宫','官禄宫','田宅宫','福德宫','父母宫'] as const;
const MAJOR = ['紫微','天机','太阳','武曲','天同','廉贞','天府',
  '太阴','贪狼','巨门','天相','天梁','七杀','破军'] as const;
const SIHUA = ['禄','权','科','忌'] as const;
const EXTRA_SIHUA_STARS = ['文昌','文曲','左辅','右弼'] as const;
const knownStars = [...MAJOR,...EXTRA_SIHUA_STARS].sort((a,b)=>b.length-a.length);
const starPattern = knownStars.join('|');
const palacePattern = PALACES.map(name=>name.replace(/宫$/, '')+'宫?').join('|');
const majorPattern = MAJOR.join('|');
const directPlacement = new RegExp('('+palacePattern+')(?:的)?\\s*(?:主星\\s*(?:是|为|有)|有|坐守|坐有|落有|见)\\s*('+majorPattern+')','g');
const reversePlacement = new RegExp('('+majorPattern+')\\s*(?:坐守|落在|落入|位于|在)\\s*('+palacePattern+')','g');
const emptyPalace = new RegExp('('+palacePattern+')\\s*(?:是|为)?\\s*(?:空宫|没有主星|无主星)','g');
const huaPattern = new RegExp('('+starPattern+')\\s*(?:生年)?化(['+SIHUA.join('')+'])','g');

export type CheckedFact = {
  claim: string;
  kind: 'direct-star' | 'empty-palace' | 'natal-sihua';
  verdict: 'matches-chart' | 'contradicts-chart';
  evidenceId: string | null;
  expected: string;
};
export type FactualAudit = {
  checked: CheckedFact[];
  matchingCount: number;
  contradictionCount: number;
  scope: 'partial-natal-facts-only';
  limitation: string;
};

function normalizePalace(value:string) {
  // iztro returns a mixture such as "命宫", "疾厄" and "仆役".
  const base=value.replace(/宫$/, '');
  // Some UIs call 仆役 交友. Both map to the same palace.
  return base==='交友'?'仆役':base;
}
function describePalace(chart:ZiweiChart,name:string) {
  return chart.palaces.find(p=>normalizePalace(p.name)===normalizePalace(name));
}
function isExplicit(segment:string,idx:number):boolean {
  const preceding=segment.slice(Math.max(0,idx-4),idx);
  // Negative, hypothetical and borrowed-star phrases need semantic analysis.
  return !/(?:不|非|未|没|若|如|假设|倘|借|对宫)$/.test(preceding);
}
function skipContext(segment:string):boolean {
  // The chart context supplied to this API is natal. Do not mistake an
  // explicitly time-layer statement for a claim about natal facts.
  return /(?:大限|流年|流月|流日|今年|明年|去年|举例|例如|假设|借星|借对宫|借自对宫)/.test(segment);
}
function starRef(chart:ZiweiChart,branch:number,starName:string):string|null {
  const palace=chart.palaces.find(p=>p.branch===branch);
  if(!palace)return null;
  const index=palace.stars.findIndex(star=>star.name===starName);
  return index>=0?'P'+branch+':S'+index:null;
}
function actualMajors(chart:ZiweiChart,name:string):string {
  const p=describePalace(chart,name);
  return p?.stars.filter(s=>s.type==='major').map(s=>s.name).join('、')||'无直接主星';
}

export function checkAiChartFacts(text:string, chart:ZiweiChart):FactualAudit {
  const checks:CheckedFact[]=[];
  const seen=new Set<string>();
  const add=(check:CheckedFact)=>{
    const id=check.kind+'|'+check.claim+'|'+check.expected;
    if(!seen.has(id)){seen.add(id);checks.push(check);}
  };
  // Avoid parsing evidence catalogs, descriptions of borrowed stars, or
  // multiple independent time layers as simple natal-placement statements.
  const segments=text.split(/[。！？；;\n]/).map(s=>s.replace(/\[依据:[^\]]+\]/g,'').trim())
    .filter(s=>s && s.length<=350);
  for(const segment of segments) {
    if(skipContext(segment))continue;
    for(const match of segment.matchAll(directPlacement)){
      if(!isExplicit(segment,match.index||0))continue;
      const palace=describePalace(chart,match[1]);
      if(!palace)continue;
      const expected=actualMajors(chart,match[1]);
      const valid=palace.stars.some(s=>s.type==='major'&&s.name===match[2]);
      add({claim:match[0],kind:'direct-star',verdict:valid?'matches-chart':'contradicts-chart',
        evidenceId:valid?starRef(chart,palace.branch,match[2]):'P'+palace.branch,
        expected:match[1]+'实际主星：'+expected});
    }
    for(const match of segment.matchAll(reversePlacement)){
      if(!isExplicit(segment,match.index||0))continue;
      const palace=describePalace(chart,match[2]);
      if(!palace)continue;
      const valid=palace.stars.some(s=>s.type==='major'&&s.name===match[1]);
      add({claim:match[0],kind:'direct-star',verdict:valid?'matches-chart':'contradicts-chart',
        evidenceId:valid?starRef(chart,palace.branch,match[1]):'P'+palace.branch,
        expected:match[2]+'实际主星：'+actualMajors(chart,match[2])});
    }
    for(const match of segment.matchAll(emptyPalace)){
      if(!isExplicit(segment,match.index||0))continue;
      const palace=describePalace(chart,match[1]);
      if(!palace)continue;
      const empty=!palace.stars.some(s=>s.type==='major');
      add({claim:match[0],kind:'empty-palace',verdict:empty?'matches-chart':'contradicts-chart',
        evidenceId:'P'+palace.branch,expected:match[1]+'实际主星：'+actualMajors(chart,match[1])});
    }
    for(const match of segment.matchAll(huaPattern)){
      if(!isExplicit(segment,match.index||0))continue;
      const occurrence=chart.palaces.flatMap(p=>p.stars
        .filter(s=>s.name===match[1]).map(star=>({palace:p,star})));
      if(occurrence.length!==1)continue; // Different star names/schools can be ambiguous.
      const {palace,star}=occurrence[0];
      const correct=star.siHua===match[2];
      const expected=star.siHua
        ? match[1]+'生年化'+star.siHua+'（'+palace.name+'）'
        : match[1]+'没有标注生年四化（'+palace.name+'）';
      add({claim:match[0],kind:'natal-sihua',verdict:correct?'matches-chart':'contradicts-chart',
        evidenceId:starRef(chart,palace.branch,match[1]),expected});
    }
  }
  return {
    checked:checks,
    matchingCount:checks.filter(c=>c.verdict==='matches-chart').length,
    contradictionCount:checks.filter(c=>c.verdict==='contradicts-chart').length,
    scope:'partial-natal-facts-only',
    limitation:'仅按固定句式核对本命主星落宫、空宫和生年四化。没有识别到的文本未经核验；匹配事实也不证明性格、经历或预测准确。',
  };
}
