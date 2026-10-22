import assert from 'node:assert/strict';
import type { Palace, ZiweiChart, Star } from '../../lib/ziwei/types';
import { generateChart } from '../../lib/ziwei/algorithm';
import { buildDeepThesisCards } from '../../lib/ai/deep-theses';
import { buildDeepReadingContext } from '../../lib/ai/deep-context';
import { assessDeepReportQuality } from '../../lib/ai/deep-quality';

const star=(name:string,type:Star['type']='major',siHua?:Star['siHua']):Star=>({name,type,siHua});
const original=generateChart({year:1991,month:3,day:18,hour:4,gender:'female'});
const palaces=original.palaces.map((p):Palace=>{
  const n=p.name.replace(/宫$/,'');
  if(n==='命')return {...p,stars:[star('紫微','major','权'),star('破军')]};
  if(n==='福德')return {...p,stars:[star('天府')]};
  if(n==='官禄')return {...p,stars:[star('廉贞'),star('贪狼'),star('地空','sha')]};
  if(n==='财帛')return {...p,stars:[star('武曲','major','忌'),star('七杀')]};
  if(n==='夫妻')return {...p,isEmpty:true,stars:[],borrowedStars:['廉贞','贪狼']};
  if(n==='疾厄')return {...p,stars:[star('天同'),star('天梁','major','禄')]};
  return p;
});
const fixture:ZiweiChart={...original,palaces};
const cards=buildDeepThesisCards(fixture);
assert.equal(cards.length,6);
assert.deepEqual(cards.map(c=>c.topic),
  ['overview','love','career','wealth','health','personality']);
assert(cards.every(c=>c.trigger.length>0));
assert(cards.every(c=>c.alternative&&c.checkQuestion));
assert(cards.find(c=>c.topic==='career')?.alternative.includes('启动前'));
assert(cards.find(c=>c.topic==='wealth')?.limitations.length);
const context=buildDeepReadingContext(fixture);
assert.equal(context.interpretiveHypotheses.length,6);
assert(context.interpretiveHypotheses[0].trigger.includes('命宫紫微化权'));
const noSignals:ZiweiChart={...original,palaces:original.palaces.map(p=>({
  ...p,stars:[],borrowedStars:[],
}))};
const weak=buildDeepThesisCards(noSignals);
assert(weak.every(x=>x.trigger.length===0&&!x.hypothesis));
const names=['命格','感情','事业','财运','健康','性格'];
const good=names.map((name,index)=>'## '+name+'\n'+
  '这是一条可以由过去行为核对的候选解释。'.repeat(12)+
  '请对照自己实际做过的事，而不是把命盘看成已证实的人格描述。[依据:P'+index+']').join('\n');
const checked=assessDeepReportQuality(good);
assert.equal(checked.complete,true);
assert.equal(checked.warnings.length,0);
const repeated=names.map((name,index)=>'## '+name+'\n'+
  '你容易先答应别人的事，也容易先接后补。'.repeat(12)+'[依据:P'+index+']').join('\n');
assert(assessDeepReportQuality(repeated).warnings.some(x=>x.code==='SIMILAR_CHAPTERS'));
const unsafe=good.replace('这是一条可以由过去行为核对的候选解释。',
  '你已经结婚了。这是一条可以由过去行为核对的候选解释。');
assert(assessDeepReportQuality(unsafe).warnings.some(x=>x.code==='UNSUPPORTED_PRIVATE_ASSERTION'));
assert(assessDeepReportQuality('## 命格\n一段很短的文字').warnings.some(x=>x.code==='MISSING_TOPICS'));
const appendix=good+'\n## 可以怎么做\n总结建议，不能算性格一章。';
assert.equal(assessDeepReportQuality(appendix).complete,true);
assert(!assessDeepReportQuality(appendix).warnings.some(x=>x.code==='SIMILAR_CHAPTERS'));
console.log('Conditional deep theses and editorial quality audit regression passed');
