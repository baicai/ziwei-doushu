import type { Palace, ZiweiChart } from './types';

export type TopicKey = 'overview' | 'personality' | 'love' | 'career' | 'wealth' | 'health';
const focus: Record<TopicKey, string> = {
  overview: '命', personality: '命', love: '夫妻', career: '官禄', wealth: '财帛', health: '疾厄',
};
const norm = (x:string) => x.replace(/宫$/, '').replace('交友','仆役');
const palaceBy = (chart: ZiweiChart, name: string) => chart.palaces.find(p => norm(p.name) === name);
const summary = (p: Palace) => {
  const majors = p.stars.filter(s => s.type === 'major');
  return majors.length ? majors.map(s => s.name + (s.siHua ? '化'+s.siHua : '')).join('、')
    : (p.borrowedStars?.length ? '空宫，借对宫主星'+p.borrowedStars.join('、') : '空宫（主星未直接落入）');
};
export function topicSynthesis(chart: ZiweiChart, topic: TopicKey): string {
  const main = palaceBy(chart, focus[topic]);
  if (!main || !Array.isArray(chart.palaces) || chart.palaces.length !== 12)
    return '**【综合分析限制】**\n宫位资料不完整，无法建立三方四正关联。';
  const opposite = chart.palaces.find(p => p.branch === (main.branch+6)%12);
  const a = chart.palaces.find(p => p.branch === (main.branch+4)%12);
  const b = chart.palaces.find(p => p.branch === (main.branch+8)%12);
  if (!opposite || !a || !b) return '**【综合分析限制】**\n三方四正宫位缺失。';
  const network = [main, opposite, a, b];
  const changes = network.flatMap(p => p.stars.filter(s=>s.siHua).map(s=>p.name+' '+s.name+'化'+s.siHua));
  const helpers = network.flatMap(p => p.stars.filter(s=>s.type==='lucky').map(s=>p.name+' '+s.name));
  const pressures = network.flatMap(p => p.stars.filter(s=>s.type==='sha').map(s=>p.name+' '+s.name));
  const narrative: Record<TopicKey,string> = {
    overview:'对照命宫的自我取向、迁移宫的外部互动、官禄宫的角色和财帛宫的资源主题，避免将单星直接当作整体命格。',
    personality:'命宫说明传统的自我取向；福德宫可补充内在需求，但不代表心理人格测量。',
    love:'夫妻宫用于讨论传统的关系互动，不能仅凭空宫或单颗煞星推定婚姻结局。',
    career:'官禄宫看角色与工作主题，并与命宫行动方式、财帛宫资源主题交叉理解。',
    wealth:'财帛本宫与命、官禄、福德构成关联结构；田宅宫属于另外补充的积累视角。',
    health:'疾厄宫只作传统文化观察，不能据此预测疾病、寿命、检查结果或医学风险。',
  };
  const extras = topic==='wealth' ? [palaceBy(chart,'田宅')].filter((p):p is Palace=>!!p)
    : topic==='personality' ? [palaceBy(chart,'福德')].filter((p):p is Palace=>!!p) : [];
  return [
    '**【结构关系与综合观察】**',
    '本宫 '+main.name+'：'+summary(main)+'；对宫 '+opposite.name+'：'+summary(opposite)+'。',
    '两处三合宫：'+a.name+' '+summary(a)+'；'+b.name+' '+summary(b)+'。',
    narrative[topic],
    ...(extras.length ? ['专题补充宫位（不属于上述三方四正）：'+extras.map(p=>p.name+' '+summary(p)).join('；')+'。'] : []),
    '',
    '**【有利与制约因素共同核对】**',
    '本宫及三方四正的四化：'+(changes.join('；')||'未记录生年四化')+'。',
    '辅助星：'+(helpers.slice(0,12).join('；')||'未记录')+(helpers.length>12?'等':'')+'。',
    '煞星：'+(pressures.slice(0,12).join('；')||'未记录')+(pressures.length>12?'等':'')+'。',
    '这些资料只是传统术数使用的不同解释条件，不是可量化的吉凶得分。',
    '',
    '**【证据范围】**',
    '上述宫位和星曜均来自当前本命盘；未将大限或流年四化当作生年四化，也未推断具体事件。',
  ].join('\n');
}
