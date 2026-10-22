import { parseSixTopicAnswer, PUBLIC_TOPIC_ORDER } from './reading-sections';
import type { OfflineTopic } from '../ziwei/offline-interpretation';

/**
 * Lightweight editorial QA, not an objective truthfulness score.
 * A passed heuristic neither proves accurate astrology nor validates a
 * reader's actual life. Results are informative warnings, never credentials.
 */
export type DeepQualityWarning={
  code:'MISSING_TOPICS'|'MISSING_REFERENCES'|'SIMILAR_CHAPTERS'|'UNSUPPORTED_PRIVATE_ASSERTION'|'SHORT_CHAPTER';
  message:string;
  topics:OfflineTopic[];
};
export type DeepQualityAudit={
  complete:boolean;
  chapters:number;
  warnings:DeepQualityWarning[];
  reviewRequired:boolean;
  limitation:string;
};

const CLICHES=[
  {pattern:/(?:先接[住下]|先答应|先揽下|先扛[下来])/g,label:'先接后补'},
  {pattern:/(?:主导|拍板|安排别人|直接接手|我要来管|催得紧)/g,label:'主导与控制'},
  {pattern:/(?:放不下|硬撑|撑一撑|再撑一会儿)/g,label:'放不下事情'},
  {pattern:/(?:先算清|反复权衡|怕吃亏)/g,label:'反复算账'},
];
const PRIVATE_ASSUMPTIONS=[
  /你(?:已经|去年|曾经|目前)(?:结婚|离婚|失业|负债|破产|买房|生病)/,
  /你(?:经常|总是|一直)(?:失眠|熬夜|借钱|喝酒|抽烟)/,
  /(?:你的|你家)(?:丈夫|妻子|孩子|房产|收入|存款)/,
  /你(?:每次|经常)聚餐.{0,12}(?:AA|几十元)/,
];
export function assessDeepReportQuality(answer:string):DeepQualityAudit {
  const chapters=parseSixTopicAnswer(answer);
  const warnings:DeepQualityWarning[]=[];
  const missing=PUBLIC_TOPIC_ORDER.filter(t=>!chapters.some(c=>c.key===t));
  if(missing.length){
    warnings.push({code:'MISSING_TOPICS',topics:missing,
      message:'没有完整生成六个主题；该次报告不应标记为完整深度解读。'});
  }
  const missingRefs=chapters.filter(c=>c.referenceIds.length===0).map(c=>c.key);
  if(missingRefs.length){
    warnings.push({code:'MISSING_REFERENCES',topics:missingRefs,
      message:'部分章节没有可核对的命盘来源编号；不能把对应结论标为已证实。'});
  }
  const tooShort=chapters.filter(c=>c.text.replace(/\s/g,'').length<95).map(c=>c.key);
  if(tooShort.length){
    warnings.push({code:'SHORT_CHAPTER',topics:tooShort,
      message:'部分章节过短，可能只有泛泛的结论，没有具体矛盾与反例。'});
  }
  const recurring=new Set<OfflineTopic>();
  for(const cliche of CLICHES){
    const topics=chapters.filter(c=>{const matches=[...c.text.matchAll(cliche.pattern)];
      return matches.length>0;}).map(c=>c.key);
    if(topics.length>=3)for(const t of topics)recurring.add(t);
  }
  if(recurring.size>=3){
    warnings.push({code:'SIMILAR_CHAPTERS',topics:[...recurring],
      message:'至少三个主题重复了相同的行为主线；建议重新分配各章独立的分析问题。'});
  }
  const unsafe=chapters.filter(c=>PRIVATE_ASSUMPTIONS.some(re=>re.test(c.text))).map(c=>c.key);
  if(unsafe.length){
    warnings.push({code:'UNSUPPORTED_PRIVATE_ASSERTION',topics:unsafe,
      message:'检测到可能把私人经历写成已知事实的措辞，请人工核对；规则检查不保证能发现全部编造。'});
  }
  return {
    complete:missing.length===0,chapters:chapters.length,warnings,
    reviewRequired:warnings.length>0,
    limitation:'这里只检测章节、引用格式、少量重复主题和明显私人断言；通过检查不代表预测准确或本人经历属实。',
  };
}
