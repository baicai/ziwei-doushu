import type { ZiweiChart, Palace } from '../ziwei/types';
import type { OfflineTopic } from '../ziwei/offline-interpretation';

export interface DeepThesisCard {
  topic:OfflineTopic;
  axis:string;
  trigger:string[];
  hypothesis:string;
  alternative:string;
  checkQuestion:string;
  limitations:string[];
}
function byName(chart:ZiweiChart,name:string){
  return chart.palaces.find(p=>p.name.replace(/宫$/,'')===name);
}
function has(p:Palace|undefined,name:string,transformation?:string){
  return !!p?.stars.some(s=>s.name===name && (transformation===undefined||s.siHua===transformation));
}
function pressure(p:Palace|undefined,name:string){
  return !!p?.stars.some(s=>s.name===name);
}
function base(topic:OfflineTopic,axis:string):DeepThesisCard {
  return {topic,axis,trigger:[],hypothesis:'',
    alternative:'本宫及相关宫位没有命中预设分析组合；请只对照结构化事实提出较弱的待核验假设，不要沿用其他章节的人设。',
    checkQuestion:'请用户回忆一个最近半年符合或相反的具体行为。',
    limitations:['这只是传统取象的解读候选，不是已经确认的用户生活事实。']};
}
/**
 * Small, auditable reading hypothesis library. Only conditional combinations
 * supported by the chart may produce a thesis. Never treat a hypothesis as a
 * verified real-world fact or infer a career, income or relationship status.
 */
export function buildDeepThesisCards(chart:ZiweiChart):DeepThesisCard[]{
  const ming=byName(chart,'命'),fu=byName(chart,'福德'),career=byName(chart,'官禄');
  const wealth=byName(chart,'财帛'),love=byName(chart,'夫妻'),health=byName(chart,'疾厄');
  const cards:DeepThesisCard[]=[];
  const overview=base('overview','面临方向分歧时，先重定规则还是先推翻重做');
  if(has(ming,'紫微','权')&&has(ming,'破军')){
    overview.trigger=['命宫紫微化权','命宫破军'];
    overview.hypothesis='传统取象中可能较在意最终责任、决策权和改变已有安排，但不能等同“爱掌控一切”。重点分辨是反对旧办法本身，还是反对旧办法迟迟达不到目标。';
    overview.alternative='有的人会先比较成熟方案和验收标准，确认失败后才推动重做；这与不经评估就推倒重来是两种不同路线。';
    overview.checkQuestion='遇到一个表现不佳的现成工具，你通常先查说明及可配置项，还是先提议整套替换？';
  }
  cards.push(overview);
  const relationships=base('love','亲近关系发生意见分歧时，先理解诉求还是先给解决办法');
  if(love?.isEmpty||(!love?.stars.some(s=>s.type==='major') && (love?.borrowedStars?.length??0)>0)){
    relationships.trigger=['夫妻宫无主星','夫妻宫借对宫主星'];
    relationships.hypothesis='本宫需要借对宫取象，单凭这组结构不宜断言“喜欢新鲜感”或“容易替别人做主”。可就亲近关系中需求是否说清、是否有不同期待提出弱假设。';
    relationships.alternative='也可能在工作中善于解决问题，在亲密关系中却倾向多听少说，不能将事业风格直接照搬到感情。';
    relationships.checkQuestion='亲近的人说“我只是想聊聊”时，你会先问对方想被倾听，还是立刻给出解决方案？';
  }
  cards.push(relationships);
  const work=base('career','选项目时的机会判断，与真正启动前的资源核验');
  if(has(career,'廉贞')&&has(career,'贪狼')&&
    (pressure(career,'地空')||pressure(career,'地劫')||pressure(career,'天空'))){
    work.trigger=['官禄宫廉贞与贪狼','官禄宫见空劫类星曜'];
    work.hypothesis='传统上可讨论机会多元、变动与资源兑现之间的拉扯，但这些盘面不能证明“先答应再补资源”。应比较两种可相反的做法：先接受再补位，或先严审资源和风险，确定可落地才接受。';
    work.alternative='对执行结果要求高的人，也可能对启动前的资源、角色分配和验收非常严格；严审失败后才亲自介入。';
    work.checkQuestion='别人交给你一个新项目，你通常先答应再找资源，还是先检查已有方案、负责人、成本和验收条件？';
  }
  cards.push(work);
  const money=base('wealth','较大的资源投入是否有清楚的决策门槛');
  if(has(wealth,'武曲','忌')&&has(wealth,'七杀')){
    money.trigger=['财帛宫武曲化忌','财帛宫七杀'];
    money.hypothesis='传统取象可讨论资源使用与损失容忍度，但不能从此推断AA计较、借钱、投资失败或收入状况。把讨论限定于较大支出或项目预算的决策门槛。';
    money.alternative='在日常小额消费可能很随意，但在企业项目和较大投入上非常审慎；也可能反过来。命盘不足以区分，必须让本人验证。';
    money.checkQuestion='面对一个价格高但能省掉大量人力的成熟工具，你更愿意核算总成本后付费，还是坚持低价方案？';
  }
  cards.push(money);
  const wellness=base('health','作息与休息主题是否有独立、可核验的观察依据');
  if(has(health,'天同')&&has(health,'天梁','禄')){
    wellness.trigger=['疾厄宫天同','疾厄宫天梁化禄'];
    wellness.hypothesis='这里只能作为传统文化里的生活照顾主题，不能从这组星曜推出熬夜、失眠、身体不好或长期硬撑；如果没有个人作息信息，不要装作知道。';
    wellness.alternative='有人工作投入但严格按时休息；有人作息不规律但工作并不强势。二者不可由命盘互相推导。';
    wellness.checkQuestion='当手头任务还没完成但到了休息时间，你实际上通常选择停止，还是继续做？';
  }
  cards.push(wellness);
  const character=base('personality','听到批评时如何判断证据、接纳不同方法');
  if(has(ming,'紫微','权')&&has(fu,'天府')){
    character.trigger=['命宫紫微化权','福德宫天府'];
    character.hypothesis='传统上可提出“对标准与决策权较敏感”的待验证推测，性格章应专讲处理不同意见，不能再次重复命格章的“喜欢主导”。';
    character.alternative='对不合格的结果强硬，不一定对过程固执；当别人提出更好、更成熟的方案时，也可能很快改变原有主张。';
    character.checkQuestion='当有人拿出实际证据证明另一方案更省事时，你通常坚持自己原来的路线，还是愿意换方案？';
  }
  cards.push(character);
  return cards;
}
