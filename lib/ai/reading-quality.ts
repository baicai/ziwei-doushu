import type { AiReadingSection } from './reading-sections';
import {splitReadingForFeedback} from './reading-presentation';

/** Screens for policy statements masquerading as the main finding. */
export function isMetaOnlyLead(text:string):boolean{
 const lead=splitReadingForFeedback(text).lead.replace(/[\s“”‘’"'（）()]/g,'');
 if(!lead)return true;
 if(/^(?:这[一章节段部分]|本[章节段]|以下|这里|下文|此处|这份解读|本次解读).{0,70}(?:只(?:谈|说|讲|讨论|涉及|聚焦)|不(?:推断|预测|判断|涉及|代表)|不能|不会|仅(?:说|谈|是|限于)|无法)/.test(lead))return true;
 if(/^(?:不(?:推断|预测|判断)|不能|无法|不可|不得|命盘(?:不能|无法|不(?:能|会))|传统命盘(?:无法|不能)|从命盘(?:无法|不能))/.test(lead))return true;
 if(/^(?:这一章|本节|这里|下文).{0,80}(?:不代表|仅供参考|没有经过验证|不会判断)/.test(lead))return true;
 if(/^(?:健康|生活作息|休息).{0,15}(?:不(?:能|应|会)|无法|不可|仅供)/.test(lead))return true;
 return false;
}
export function filterUsableChapters<T extends AiReadingSection>(chapters:readonly T[]):T[]{
 return chapters.filter(ch=>!isMetaOnlyLead(ch.text));
}
