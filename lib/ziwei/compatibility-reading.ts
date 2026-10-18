import type { Palace, ZiweiChart } from './types';
import { BRANCHES } from './constants';

const FOCUS: Array<{ label: string; names: string[]; note: string }> = [
  { label: '命宫', names: ['命', '命宫'], note: '观察个人的传统命盘核心主题' },
  { label: '夫妻宫', names: ['夫妻', '夫妻宫'], note: '观察关系互动与沟通的文化象征' },
  { label: '福德宫', names: ['福德', '福德宫'], note: '观察休息、精神取向与生活节奏的传统主题' },
  { label: '官禄宫', names: ['官禄', '官禄宫'], note: '观察角色分工与事业方式的传统主题' },
  { label: '财帛宫', names: ['财帛', '财帛宫'], note: '观察资源管理的传统主题' },
];
function findPalace(chart: ZiweiChart, names: string[]): Palace | undefined {
  return chart.palaces.find(p => names.some(n => p.name === n));
}
function facts(palace: Palace | undefined): string {
  if (!palace) return '暂无此宫的可用资料';
  const major = palace.stars.filter(s => s.type === 'major');
  const titles = major.length ? major.map(s => s.name).join('、') :
    palace.borrowedStars?.length ? '空宫，借对宫' + palace.borrowedStars.join('、') : '空宫';
  const sihua = palace.stars.filter(s => s.siHua).map(s => s.name + '化' + s.siHua).join('、');
  return BRANCHES[palace.branch] + '宫：' + titles + (sihua ? '；四化：' + sihua : '');
}
function selectFocus(question: string) {
  if (/工作|事业|合伙|创业|合作/.test(question)) return FOCUS.filter(x => ['命宫','官禄宫','财帛宫'].includes(x.label));
  if (/财运|财务|理财|消费|资金/.test(question)) return FOCUS.filter(x => ['财帛宫','福德宫'].includes(x.label));
  if (/感情|结婚|婚姻|恋爱|相处|配偶/.test(question)) return FOCUS.filter(x => ['夫妻宫','命宫','福德宫'].includes(x.label));
  return FOCUS;
}
/**
 * A deterministic side-by-side reading, not an AI prediction or compatibility score.
 * It uses the given two charts as the only factual input and sends no data to a model.
 */
export function buildCompatibilityReading(a: ZiweiChart, b: ZiweiChart, question = ''): string {
  const focus = selectFocus(question.trim());
  const sections = [
    '**【双方命盘概览】**',
    '甲方：命宫' + BRANCHES[a.mingGongBranch] + '；' + a.wuxingJuName + '。',
    '乙方：命宫' + BRANCHES[b.mingGongBranch] + '；' + b.wuxingJuName + '。',
    '以下将两张独立命盘并排呈现，不以出生资料推断关系的成功率或确定结果。',
  ];
  if (question.trim()) {
    sections.push('**【本次关注】**', '你关注的主题：' + question.trim().slice(0, 120) + '。以下展示相关宫位依据，而不是对问题作确定性预测。');
  }
  for (const item of focus) {
    const aPalace = findPalace(a, item.names);
    const bPalace = findPalace(b, item.names);
    sections.push('**【' + item.label + '对照】**',
      '甲方：' + facts(aPalace),
      '乙方：' + facts(bPalace),
      item.note + '；请结合真实的沟通、生活经历和双方意愿理解。');
  }
  sections.push(
    '**【现实参考】**',
    '可以围绕沟通习惯、财务目标、生活安排和共同决策开展具体讨论。传统星曜不能验证两个人是否适合结婚、合作或建立其他关系。',
    '本次为本地规则对照解读，未调用 AI 模型，也没有将双方出生资料发送到第三方 AI 服务。'
  );
  return sections.join('\n');
}
