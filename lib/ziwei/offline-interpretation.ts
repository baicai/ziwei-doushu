/**
 * Offline chart interpretation for the public demo.
 *
 * This module derives its output ONLY from the current chart and a compact
 * original, non-quoted glossary of traditional star symbolism. It is NOT AI,
 * does not use the separately licensed Tianji quotations, and does not claim
 * to predict actual health, relationships or financial outcomes.
 */
import type { Palace, ZiweiChart, Star } from './types';

export type OfflineTopic = 'overview' | 'personality' | 'love' | 'career' | 'wealth' | 'health';

export const OFFLINE_TOPICS: ReadonlyArray<{ key: OfflineTopic; label: string }> = [
  { key: 'overview', label: '命格' },
  { key: 'love', label: '感情' },
  { key: 'career', label: '事业' },
  { key: 'wealth', label: '财运' },
  { key: 'health', label: '健康' },
  { key: 'personality', label: '性格' },
];

const STAR_SYMBOLS: Record<string, string> = {
  紫微: '传统上重视统筹、责任、主导与组织秩序，解读时须区分是否有辅佐星配合。',
  天机: '与思考、学习、计划及灵活应变有关；也提醒留意反复权衡与执行节奏。',
  太阳: '常关联公开表达、主动投入、服务及外向的行动方式。',
  武曲: '常关联执行、原则、资源管理与现实决策，不能只凭此星断定财富。',
  天同: '象征协调、舒适与人际亲和，需结合其他星曜看行动性。',
  廉贞: '常关联规则意识、复杂关系、审美和自我要求，具体含义取决于会照组合。',
  天府: '常关联管理、积累、稳定与资源整合，不能直接等同于必然富裕。',
  太阴: '多关联细致观察、内在感受、规划与照顾，需要结合亮度和落宫。',
  贪狼: '常关联兴趣广泛、社交、探索与欲望管理，不能单凭此星断言感情。',
  巨门: '常关联语言、质疑、论证与信息辨析，优势和摩擦往往来自沟通方式。',
  天相: '常关联协作、秩序、协调与专业服务，强调制度和团队配合。',
  天梁: '常关联经验、责任、守护与专业判断，也有较强的原则倾向。',
  七杀: '常关联决断、独立、面对变化的能力，行动前更应明确风险边界。',
  破军: '常关联调整、突破与重建，需综合盘面判断稳定性与变化节奏。',
};

const SIHUA_SYMBOLS: Record<string, string> = {
  禄: '传统上以资源、机会与投入意愿为观察角度',
  权: '传统上以责任、主导与执行力度为观察角度',
  科: '传统上以秩序、表达、声誉与协作为观察角度',
  忌: '传统上以牵挂、阻力、反复与需要处理的课题为观察角度',
};

const ROLE: Record<string, string> = {
  命: '自我取向和命盘核心',
  兄弟: '同辈相处和合作关系',
  夫妻: '亲密关系中的互动方式',
  子女: '照料、传承和培养关系',
  财帛: '资源使用与收入相关议题',
  疾厄: '传统上的身体与生活习惯议题',
  迁移: '外部环境、移动与对外互动',
  仆役: '朋友、社群和协作圈',
  交友: '朋友、社群和协作圈',
  官禄: '工作职责、能力运用和社会角色',
  田宅: '家居、不动产与生活基础',
  福德: '精神状态、休息与价值取向',
  父母: '长辈、制度和外部支持',
};

const TOPIC_META: Record<OfflineTopic, { heading: string; name: string; intro: string; related: string[]; reflection: string }> = {
  overview: { heading: '命格结构', name: '命', intro: '从命宫出发，并结合财帛、官禄、迁移三宫，观察传统命盘中的整体结构。', related: ['财帛', '官禄', '迁移'], reflection: '把星曜的传统象征当作自我反思的提示，而不是对人生的确定性判词。' },
  personality: { heading: '性格取象', name: '命', intro: '先看命宫主星的传统性格象征，再结合福德宫与迁移宫观察内在和外在表现。', related: ['福德', '迁移'], reflection: '可以用这些关键词与自己的真实经历对照，但不宜将人格固定在某种星曜标签中。' },
  love: { heading: '亲密关系取象', name: '夫妻', intro: '传统以夫妻宫观察关系互动，同时参考福德宫反映的内在需要。', related: ['福德', '命'], reflection: '实际关系更取决于沟通、尊重与共同选择，命盘不决定婚姻结果。' },
  career: { heading: '事业结构', name: '官禄', intro: '从官禄宫的星曜取象入手，再结合财帛宫和命宫看资源、职责与行动方式。', related: ['财帛', '命'], reflection: '职业选择仍应依据技能、兴趣、行业机会和实际条件，而不是仅按命盘决定。' },
  wealth: { heading: '财帛结构', name: '财帛', intro: '从财帛宫看传统的资源取象，并参考田宅宫与官禄宫。', related: ['田宅', '官禄'], reflection: '命盘无法预测收益率或投资结果；财务决策需要预算、风险评估和可验证的信息。' },
  health: { heading: '生活与健康取象', name: '疾厄', intro: '这里仅展示疾厄宫的传统象征与关联宫位，不会推断疾病、寿命或诊断。', related: ['福德', '命'], reflection: '健康问题应以医学检查和专业医生的判断为准，不应凭星曜判断病症。' },
};

function norm(name: string): string {
  const n = name.replace(/宫$/, '');
  return n === '交友' ? '仆役' : n;
}

function findPalace(chart: ZiweiChart, name: string): Palace | undefined {
  const target = norm(name);
  return chart.palaces.find(p => norm(p.name) === target);
}

function majorStars(p: Palace): Star[] {
  return p.stars.filter(s => s.type === 'major');
}

function starText(s: Star): string {
  return `${s.name}${s.brightnessRaw ? '（' + s.brightnessRaw + '）' : ''}${s.siHua ? '·化' + s.siHua : ''}`;
}

function starList(p: Palace | undefined): string {
  if (!p) return '未找到该宫';
  const majors = majorStars(p);
  if (majors.length) return majors.map(starText).join('、');
  if (p.borrowedStars?.length) return `空宫，参考对宫的${p.borrowedStars.join('、')}`;
  return '无十四主星（空宫，需结合对宫）';
}

function natalChanges(p: Palace): string {
  const changed = p.stars.filter(s => s.siHua);
  if (!changed.length) return '本宫未标注生年四化；这不代表吉凶。';
  return changed.map(s => `${s.name}化${s.siHua}：${SIHUA_SYMBOLS[s.siHua!] ?? '作为组合条件观察'}`).join('；') + '。';
}

function constellation(chart: ZiweiChart, center: Palace): string {
  const pair = chart.palaces.find(p => p.branch === (center.branch + 6) % 12);
  const left = chart.palaces.find(p => p.branch === (center.branch + 4) % 12);
  const right = chart.palaces.find(p => p.branch === (center.branch + 8) % 12);
  return [pair, left, right].filter((p): p is Palace => !!p)
    .map(p => `${p.name}：${starList(p)}`).join('；') + '。';
}

function starInterpretation(p: Palace): string {
  const majors = majorStars(p);
  if (!majors.length) {
    return p.borrowedStars?.length
      ? `此宫无十四主星，按传统空宫方法参考对宫的${p.borrowedStars.join('、')}；不可把借星理解为原宫直接拥有这些星。`
      : '此宫无十四主星。仅凭空宫不能判断吉凶，需要查看对宫及三方四正。';
  }
  return majors.map(s => `${s.name}：${STAR_SYMBOLS[s.name] ?? '该星需结合落宫、亮度与会照组合综合阅读。'}`).join('\n');
}

function basicPalace(chart: ZiweiChart, palace: Palace): string {
  const focus = ROLE[norm(palace.name)] ?? '本宫的传统议题';
  const helpers = palace.stars.filter(s => s.type === 'lucky').map(s => s.name);
  const challenges = palace.stars.filter(s => s.type === 'sha').map(s => s.name);
  return [
    '**【排盘依据】**',
    `${palace.name}主要用于观察${focus}。主星：${starList(palace)}。`,
    `辅助星（仅显示本宫）：${helpers.length ? helpers.join('、') : '无标记'}；煞星（仅显示本宫）：${challenges.length ? challenges.join('、') : '无标记'}。`,
    '',
    '**【主星的传统含义】**',
    starInterpretation(palace),
    '',
    '**【生年四化】**',
    natalChanges(palace),
    '',
    '**【三方四正的实际盘面】**',
    constellation(chart, palace),
  ].join('\n');
}

export function offlineTopicAnalysis(chart: ZiweiChart, topic: OfflineTopic): string {
  const meta = TOPIC_META[topic];
  const palace = findPalace(chart, meta.name);
  if (!palace) return '当前排盘未找到所需宫位，暂时无法生成规则解读。';
  const related = meta.related.map(name => {
    const p = findPalace(chart, name);
    return p ? `${p.name}：${starList(p)}` : null;
  }).filter(Boolean);
  const active = chart.daXians?.[chart.currentDaXianIndex];
  const overviewDetail = topic === 'overview'
    ? [
        '',
        '**【本命概要】**',
        `命主：${chart.mingZhu ?? '未提供'}；身主：${chart.shenZhu ?? '未提供'}；五行局：${chart.wuxingJuName}；身宫地支索引：${chart.shenGongBranch}。`,
        active ? `当前大限标记：${active.startAge}–${active.endAge} 岁，${active.palaceName}。此处仅展示排盘计算结果，不推断未来事件。` : '当前大限信息未提供。',
      ].join('\n')
    : '';
  return [
    `**【${meta.heading} · 离线规则解读】**`,
    meta.intro,
    '',
    basicPalace(chart, palace),
    '',
    '**【专题关联宫位】**',
    related.length ? related.join('；') + '。' : '暂无关联宫位数据。',
    overviewDetail,
    '',
    '**【现实参考】**',
    meta.reflection,
    '',
    '本页是根据当前命盘与传统术语生成的演示说明，未调用 AI 模型，内容不构成事实预测或专业建议。',
  ].filter(Boolean).join('\n');
}

export function offlinePalaceAnalysis(chart: ZiweiChart, palace: Palace): string {
  return [
    `**【${palace.name} · 宫位规则解读】**`,
    basicPalace(chart, palace),
    '',
    '**【如何阅读】**',
    '先核对主星、亮度和四化，再结合对宫及三合两宫。这里只展示成立的盘面条件，不把单个星曜直接等同于具体人生事件。',
    '此内容为传统文化学习用途，并非 AI 生成或现实预测。',
  ].join('\n');
}

export function offlineSihuaAnalysis(chart: ZiweiChart, info: { starName: string; siHua: string; view: string }): string {
  const p = chart.palaces.find(pal => pal.stars.some(s => s.name === info.starName));
  const layer = info.view === 'daxian' ? '大限' : info.view === 'liunian' ? '流年' : '本命';
  return [
    `**【${layer} · ${info.starName}化${info.siHua}】**`,
    `${SIHUA_SYMBOLS[info.siHua] ?? '此四化需要结合具体星曜'}；${info.starName}在本命盘的落宫为${p?.name ?? '未定位'}。`,
    '这里显示的是所选时间层的四化象征及本命星曜位置，不应当当作具体事件或健康、财务结果的预测。',
    p ? `本命落宫参考：${starList(p)}。` : '',
  ].filter(Boolean).join('\n');
}

/** Simple keyword navigation, not free-form AI conversation. */
export function matchOfflineTopic(question: string): OfflineTopic | null {
  if (/事业|工作|跳槽|职业|创业|升职|换工作/.test(question)) return 'career';
  if (/财|赚钱|收入|投资|理财|金钱/.test(question)) return 'wealth';
  if (/婚|恋爱|感情|伴侣|结婚/.test(question)) return 'love';
  if (/健康|身体|疾病|作息|睡眠/.test(question)) return 'health';
  if (/性格|性情|优点|缺点|个性/.test(question)) return 'personality';
  if (/命格|命盘|整体|概览|总览/.test(question)) return 'overview';
  return null;
}
