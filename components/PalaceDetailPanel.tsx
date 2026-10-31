import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import type { TimeView } from '@/components/TimeNav';
import { BRANCHES, STEMS, SI_HUA_TABLE } from '@/lib/ziwei/constants';
import { selectedTimeReading } from '@/lib/ziwei/time-reading';

const THEMES:Record<string,string>={
 命宫:'自我及整体取向',兄弟宫:'同辈关系与合作',夫妻宫:'亲密关系与协商',
 子女宫:'照顾、培养与创造',财帛宫:'资源与金钱取舍',疾厄宫:'生活与健康议题',
 迁移宫:'外部环境与发展',仆役宫:'团队与社会联系',交友宫:'团队与社会联系',
 官禄宫:'职业角色',田宅宫:'居住与积累',福德宫:'精神与休息',父母宫:'长辈与外部支持',
};
function stars(items:Star[]):string{
 return items.map(s=>s.name+(s.brightnessRaw?'（'+s.brightnessRaw+'）':'')+
   (s.siHua?' · 生年化'+s.siHua:'')).join('、');
}
function majors(p:Palace):string{
 const main=p.stars.filter(s=>s.type==='major');
 return main.length?stars(main):p.borrowedStars?.length
   ?'本宫无直接主星，参考对宫：'+p.borrowedStars.join('、'):'本宫无直接主星，参考对宫';
}
export default function PalaceDetailPanel({chart,selectedPalace,onSelect,timeView,liunianYear}:{
 chart:ZiweiChart;selectedPalace:Palace|null;onSelect:(p:Palace)=>void;
 timeView:TimeView;liunianYear:number;
}){
 const p=chart.palaces.find(x=>x.branch===selectedPalace?.branch)
   ??chart.palaces.find(x=>x.isMingGong)??chart.palaces[0];
 if(!p)return null;
 const groups=[
   {label:'主星',value:majors(p)},
   {label:'辅星',value:stars(p.stars.filter(s=>s.type==='lucky'))},
   {label:'煞星',value:stars(p.stars.filter(s=>s.type==='sha'))},
   {label:'其他星曜',value:stars(p.stars.filter(s=>s.type==='minor'))},
 ];
 const relations=[{label:'对宫',offset:6},{label:'三合',offset:4},{label:'三合',offset:8}]
  .flatMap(rel=>{const other=chart.palaces.find(x=>x.branch===(p.branch+rel.offset)%12);
    return other?[{label:rel.label,palace:other}]:[];});
 const natal=p.stars.filter(s=>s.siHua).map(s=>s.name+'化'+s.siHua).join('、');
 const self=(p.selfSihua??[]).map(s=>s.starName+'自化'+s.siHua).join('、');
 const dx=chart.daXians[chart.currentDaXianIndex];
 const stem=timeView==='daxian'?chart.palaces.find(x=>x.branch===dx?.palaceBranch)?.stem:
   timeView==='liunian'?((liunianYear-4)%10+10)%10:undefined;
 const overlay=stem!==undefined?SI_HUA_TABLE[stem]:undefined;
 const changes=overlay?.flatMap((name,i)=>p.stars.some(s=>s.name===name)?
   [name+'化'+(['禄','权','科','忌'][i])]:[])??[];
 const timing=selectedTimeReading(chart,timeView,liunianYear);
 return <section id="chart-palace-detail" aria-label="命盘详情" aria-live="polite"
   className="min-w-0 rounded-xl overflow-hidden card-glass scroll-mt-36">
   <header className="p-4" style={{borderBottom:'1px solid var(--t-border)'}}>
     <h2 className="font-semibold text-base" style={{color:'var(--t-text)'}}>命盘详情</h2>
     <p className="mt-1 text-xs leading-6" style={{color:'var(--t-text2)'}}>
       选择左侧宫位，查看其星曜、四化及三方四正。
     </p>
   </header>
   <div className="p-4 space-y-4">
     <div className="p-3 rounded-lg space-y-1" style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
       <div className="flex justify-between gap-2 items-center">
         <h3 className="text-lg font-semibold" style={{color:'var(--t-gold)'}}>{p.name}</h3>
         <span className="text-xs" style={{color:'var(--t-text2)'}}>{STEMS[p.stem]}{BRANCHES[p.branch]}</span>
       </div>
       <p className="text-xs leading-6" style={{color:'var(--t-text2)'}}>
         {THEMES[p.name]??'传统宫位主题'}
         {p.isMingGong?' · 命宫':''}{p.isShenGong?' · 身宫':''}
       </p>
       {p.daXianAge&&<p className="text-xs" style={{color:'var(--t-text2)'}}>
         所属大限：{p.daXianAge[0]}–{p.daXianAge[1]} 虚岁
       </p>}
     </div>
     <div className="space-y-3">
       {groups.map(g=><section key={g.label}>
         <h4 className="text-xs font-semibold mb-1" style={{color:'var(--t-text)'}}>{g.label}</h4>
         <p className="text-sm leading-7 break-words" style={{color:'var(--t-text2)'}}>{g.value||'本宫无记录'}</p>
       </section>)}
     </div>
     <section className="p-3 rounded-lg space-y-2" style={{border:'1px solid var(--t-border)'}}>
       <h4 className="text-sm font-semibold" style={{color:'var(--t-text)'}}>四化</h4>
       <div className="text-xs leading-6 space-y-1" style={{color:'var(--t-text2)'}}>
         <p>生年四化：{natal||'本宫无标注'}</p>
         <p>宫干自化：{self||'本宫无标注'}</p>
         {timeView!=='mingpan'&&<p>
           {timeView==='daxian'?'大限':'所选年份'}四化落本宫：{changes.join('、')||'没有对应星曜'}
         </p>}
       </div>
     </section>
     <section className="space-y-2">
       <h4 className="text-sm font-semibold" style={{color:'var(--t-text)'}}>三方四正</h4>
       {relations.map((r,i)=><button type="button" key={i} onClick={()=>onSelect(r.palace)}
         className="block w-full min-h-11 p-3 text-left rounded-lg"
         style={{background:'var(--t-card)',border:'1px solid var(--t-border)'}}>
         <span className="block text-xs font-semibold" style={{color:'var(--t-gold)'}}>
           {r.label} · {r.palace.name}
         </span>
         <span className="block text-xs leading-6 mt-1" style={{color:'var(--t-text2)'}}>
           {majors(r.palace)}
         </span>
       </button>)}
     </section>
     {timing&&<section className="p-3 rounded-lg space-y-2" style={{border:'1px solid var(--t-border)'}}>
       <h4 className="text-sm font-semibold" style={{color:'var(--t-text)'}}>时间层 · {timing.title}</h4>
       {timing.details.map((line,i)=><p key={i} className="text-xs leading-6"
         style={{color:'var(--t-text2)'}}>{line}</p>)}
       <details>
         <summary className="min-h-11 flex items-center cursor-pointer text-xs"
           style={{color:'var(--t-faint)'}}>时间口径说明</summary>
         {timing.limitations.map((line,i)=><p key={i} className="pb-2 text-xs leading-6"
           style={{color:'var(--t-faint)'}}>{line}</p>)}
       </details>
     </section>}
     <p className="text-xs leading-6" style={{color:'var(--t-faint)'}}>
       本区只展示宫位资料。完整解读、评价与 AI 追问统一放在下方。
     </p>
     <a href="#chart-report" className="inline-flex items-center min-h-11 text-sm underline"
       style={{color:'var(--t-gold)'}}>查看我的命盘解读</a>
   </div>
 </section>;
}
