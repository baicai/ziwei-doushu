import type { Palace, ZiweiChart } from '../ziwei/types';
import { SI_HUA_TABLE, STEMS } from '../ziwei/constants';
import { getDaXianIndexForYear, getDaXianStartYear } from '../ziwei/yunxian-context';

const THEMES:Record<string,string>={
 '命宫':'自身定位与选择','兄弟':'同辈互动与支持','夫妻':'亲近关系与协商',
 '子女':'照顾、创造和责任','财帛':'资源分配与金钱取舍',
 '疾厄':'生活节奏与自我照顾','迁移':'外部环境与适应',
 '仆役':'合作伙伴与团队互动','交友':'合作伙伴与团队互动',
 '官禄':'工作角色与承担','田宅':'居住、家庭空间与积累',
 '福德':'内在满足与休息','父母':'长辈关系与支持系统',
};
export type StagePosition='previous'|'selected'|'next';
export interface TimeTransformation {
 star:string; change:'禄'|'权'|'科'|'忌'; natalPalace:string|null;
}
export interface DecadeStage {
 position:StagePosition;
 startAge:number; endAge:number; startYear:number; endYear:number;
 palace:string; branch:number; theme:string; mainStars:string[];
 network:string[]; transformations:TimeTransformation[];
}
/**
 * Rule-engine-only time lens. Year is a selected Gregorian year for stem
 * reference, while decade boundaries use the engine's lunar-birth-year
 * virtual-age convention. They must not be presented as exact event dates.
 */
export function buildDeepTimeContext(chart:ZiweiChart,selectedYear:number){
 if(!Number.isInteger(selectedYear)||selectedYear<1900||selectedYear>2200)
   throw new Error('invalid selected year');
 const palaces=chart.palaces??[];
 const palaceAt=(branch:number)=>palaces.find(p=>p.branch===((branch%12)+12)%12);
 const natalPlace=(star:string)=>palaces.find(p=>p.stars.some(s=>s.name===star))?.name??null;
 const siHua=(stem:number):TimeTransformation[]=>{
   const stars=SI_HUA_TABLE[stem];
   if(!stars)return [];
   return stars.map((star,i)=>({
     star,change:(['禄','权','科','忌'] as const)[i],
     natalPalace:natalPlace(star),
   }));
 };
 const selectedIndex=getDaXianIndexForYear(chart,selectedYear);
 const indices: {index:number;position:StagePosition}[]=selectedIndex>=0?
   [{index:selectedIndex-1,position:'previous'}, {index:selectedIndex,position:'selected'},
    {index:selectedIndex+1,position:'next'}] : [];
 const stages:DecadeStage[]=indices.flatMap(({index,position})=>{
   const dx=chart.daXians[index];
   if(!dx)return [];
   const palace=palaceAt(dx.palaceBranch);
   const startYear=getDaXianStartYear(chart,index);
   if(!palace||startYear===null)return [];
   const other=[6,4,8].map(offset=>palaceAt(palace.branch+offset))
     .filter((p):p is Palace=>!!p);
   return [{
     position,startAge:dx.startAge,endAge:dx.endAge,
     startYear,endYear:startYear+dx.endAge-dx.startAge,
     palace:palace.name,branch:palace.branch,
     theme:THEMES[palace.name]??'该宫的传统主题',
     mainStars:palace.stars.filter(s=>s.type==='major')
       .map(s=>s.name+(s.siHua?'（生年化'+s.siHua+'）':'')),
     network:other.map(p=>p.name+':'+
       (p.stars.filter(s=>s.type==='major').map(s=>s.name).join('、')||'无直接主星')),
     transformations:siHua(palace.stem),
   }];
 });
 const yearStem=((selectedYear-4)%10+10)%10;
 return {
   scope:'selected-year-structural-reference-only' as const,
   selectedYear,virtualAge:selectedYear-chart.lunarInfo.lunarYear+1,
   timePrecision:chart.birthInfo.timePrecision??'known',
   yearStem:STEMS[yearStem],
   yearTransformations:siHua(yearStem),
   stages,
   selectedStageAvailable:stages.some(s=>s.position==='selected'),
   limitations:[
     '所选年份的虚岁按农历生年换算，大限年段仅供传统排盘阶段对照，不是实际发生事件的起止日。',
     '所选年份四化仅按公历年干作基础参考，尚未结合立春／春节的具体日期界线，不等于完整流年命盘。',
     '大限与流年化禄、权、科、忌是不同时间层，不得当作生年四化或人格事实。',
     ...(chart.birthInfo.timePrecision==='unknown'?['出生时辰不详，本命宫位、大限及流年资料均是候选试排，不作确定分析。']:[]),
     ...(selectedIndex<0?['该年份未落入已计算的大限范围（可能为童限或超出范围），不要用当前大限替代。']:[]),
   ],
 };
}
