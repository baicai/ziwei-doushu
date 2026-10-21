import type { Palace, Star, ZiweiChart } from './types';
import { OFFLINE_TOPICS, type OfflineTopic } from './offline-interpretation';

/**
 * Human-readable traditional-cultural reading. Only the chart is factual.
 * Phrases describe traditional star symbolism, not verified personality,
 * diagnosis, investment outcome or predictions.
 */
export interface PlainSection {
  key: OfflineTopic;
  title: string;
  lead: string;
  observation: string;
  suggestion: string;
  evidence: string;
}

type Behavior={say:string;scene:string};
type Key=OfflineTopic;
type Story=Record<Key,Behavior>;
/**
 * Editorial scenarios illustrate star symbolism, NOT user facts.
 * Individual topic cards differ by star and situation so the lay report
 * cannot become a repeated dictionary of abstract positive adjectives.
 */
const STORIES:Record<string,Story>={
  紫微:{
    overview:{say:'你更喜欢事情有个明确的安排，最受不了大家都说“随便”。',scene:'比如一群人商量去哪儿，迟迟定不下来，你可能就会把时间地点定好。麻烦是，最后大家都等你张罗。'},
    personality:{say:'你一旦觉得这事该有人管，就不太愿意装作没看见。',scene:'碰到没人愿意拍板的事，你可能先把责任接过来；但别人做得不如你预期，你也容易心烦。'},
    love:{say:'跟亲近的人相处，你可能很想把日子安排稳当。',scene:'小到出门时间、大到怎么花钱，你可能更愿意先商量出个准话。对方如果只想随性一点，容易觉得被你管着。'},
    career:{say:'工作上你很难长期接受“出了问题也没人负责”。',scene:'一个任务几个人推来推去，你可能会直接分工、定时间。好处是事情有人推进，代价是别人容易把难事都甩给你。'},
    wealth:{say:'花大钱时，你更在意这笔钱是不是花在了正事上。',scene:'一件东西贵不贵倒不是唯一问题，你可能先想买回来谁负责、能用多久。容易因为替大家操心，最后自己承担额外开销。'},
    health:{say:'你可能很难眼看着一件事没收尾就去休息。',scene:'如果还有人等你回复、事情没交代清楚，你可能总想再看一眼消息。这只是做事习惯的例子，不能据此判断身体状况。'},
  },
  天机:{
    overview:{say:'你脑子转得快，但遇到选择多的事，容易越想越多。',scene:'比如买手机，原本只想挑一款，查着查着又觉得另一款也好，最后花很多时间比较。'},
    personality:{say:'你不太爱照本宣科，碰到麻烦时会先想有没有别的办法。',scene:'别人说“以前一直这样”，你可能忍不住追问还能不能换一种做法。问题是点子多时，反而不容易定下来。'},
    love:{say:'跟人闹别扭，你可能会反复想对方那句话到底什么意思。',scene:'对方说“没事”，你却还想把前后细节理清楚。一直分析，可能让本来不大的分歧拖得更久。'},
    career:{say:'工作有变化时，你可能更快想到替代方案。',scene:'原计划走不通，你会想试第二条路；但有时改了太多次，旁边的人还没跟上。'},
    wealth:{say:'花钱之前，你可能会研究好几种选择，怕买亏了。',scene:'为了省一点钱反复比价、看评测，最后花掉半天。特别要留意，省下的钱是不是抵不上花进去的时间。'},
    health:{say:'脑子里有件事没想通时，你可能很难马上切换到休息状态。',scene:'晚上明明放下手机，脑子还在整理白天的事。这里只谈可能的生活节奏，不代表失眠或其他病症。'},
  },
  太阳:{
    overview:{say:'看到有人需要搭把手，你可能比别人更快站出来。',scene:'别人忙不过来时，你会想“我来帮一下”，结果自己的事反而排到后面。'},
    personality:{say:'你有意见时，往往不太喜欢一直藏着。',scene:'大家都不说话，你可能先开口说明白。别人未必做好听意见的准备，容易觉得你说得太直接。'},
    love:{say:'你表达关心更像是在做事，而不只是嘴上安慰。',scene:'对方遇到麻烦，你可能急着帮忙解决，却忘了问一句“你是不是只想让我听听”。'},
    career:{say:'有人需要解释、协调、对外沟通时，你可能愿意站到前面。',scene:'团队要向客户讲清楚方案，你会想把话说透。麻烦是承诺说早了，后面还得自己追进度。'},
    wealth:{say:'有时候你花钱，是为了让事情体面一点、让人舒服一点。',scene:'一起吃饭时你可能主动付账，事后才算自己花了多少。最好分清楚帮忙和长期替别人买单。'},
    health:{say:'忙的时候，你可能会先顾眼前的人和事，再想到自己要停下来。',scene:'有人临时来找你帮忙，你本来安排好的休息又往后挪。这不说明健康好坏，只是一个可观察的时间安排方式。'},
  },
  武曲:{
    overview:{say:'你不太喜欢光说不做，更想马上看到事情有没有结果。',scene:'听人讲了半天计划，你可能直接问“什么时候做、要花多少钱”。别人有时会觉得你太硬。'},
    personality:{say:'你更愿意用实际结果判断一件事值不值得继续。',scene:'一套办法试了几次没效果，你可能干脆停掉重来。容易忽略别人还需要一点时间适应。'},
    love:{say:'你可能不太擅长说漂亮话，却会用行动表示重视。',scene:'你觉得替对方办好一件麻烦事就是关心，对方却可能更想听一句安慰。'},
    career:{say:'上班做事，你更想把目标、时间和结果讲清楚。',scene:'有人开会一直绕圈，你可能直接要求给结论；推进是快了，语气太冲却容易伤人。'},
    wealth:{say:'一谈到钱，你可能更关注数字到底对不对。',scene:'别人说“差不多吧”，你会想把实际价格、账单、结余算清楚。太盯细节时，也可能舍不得为体验花钱。'},
    health:{say:'定好的事情没完成，你可能不愿意停。',scene:'眼看只差一点就做完，可能连休息也想往后推。身体情况不能由命盘推断，这里只提醒留意是否有这种习惯。'},
  },
  天同:{
    overview:{say:'你最希望日子过得顺心，能少一场争执就少一场。',scene:'朋友选地方吃饭，你可能说“都行”，哪怕自己其实更想去另一家。时间久了别人反而不知道你要什么。'},
    personality:{say:'遇到让人不舒服的场面，你可能先想把气氛缓和下来。',scene:'两个人意见不合，你会想先说点别的缓一缓。难处是问题没谈清，过后还得重来。'},
    love:{say:'你和亲近的人相处，可能很怕把话说重了。',scene:'明明不赞成对方的安排，你还是先点头，等到不舒服积累起来才说。'},
    career:{say:'同事相处上，你可能宁愿多配合一点，也不想把气氛搞僵。',scene:'别人临时调班或换任务，你会先答应。可答应得太快，就容易压缩自己的时间。'},
    wealth:{say:'花钱时，你可能更愿意为省心和舒服买单。',scene:'两样东西差不多，你也许会选那个用起来方便的，而不是一味选最便宜的。要小心小额开销慢慢堆起来。'},
    health:{say:'你可能很在意每天能不能留下一点舒服自在的时间。',scene:'一整天被安排得满满当当时，你会很想躲开人群歇一歇。这是生活偏好的取象，不代表真实身体状况。'},
  },
  廉贞:{
    overview:{say:'你对规矩和分寸比较敏感，别人越过线时很难装作没事。',scene:'说好了某个做法，对方临时反悔，你可能不是在乎那件小事，而是在乎“说话算不算数”。'},
    personality:{say:'你能接受别人有不同意见，却不太能接受有人说一套做一套。',scene:'看到前后标准不一样，你可能当面问清楚，结果别人觉得你在较真。'},
    love:{say:'你跟亲近的人相处，很在意彼此有没有被尊重。',scene:'对方没打招呼就替你做决定，你可能比事情本身更介意“为什么不先问我”。'},
    career:{say:'工作里碰到规则不清、责任不明，你可能会不舒服。',scene:'同样的事有人能做、有人不能做，你会想问标准是什么。问得太直白时，容易和人起冲突。'},
    wealth:{say:'钱和人情混在一起时，你可能特别想把界限讲清楚。',scene:'朋友找你合买东西，你可能会先说清谁出多少钱、以后怎么算；有人可能觉得你不够爽快。'},
    health:{say:'碰到不合理安排时，你可能会一直记挂着那口气。',scene:'白天受了委屈，晚上还想着该怎么讲清楚。这里只描写情绪处理方式，不判断病症。'},
  },
  天府:{
    overview:{say:'你做事更喜欢有余地、有准备，不爱把所有筹码一次押上。',scene:'出门前你可能先看路线、时间和备用办法。别人觉得你想太多，你只是怕临时手忙脚乱。'},
    personality:{say:'遇到突然改变计划，你可能先想稳住已有的安排。',scene:'别人提议全部推倒重来，你会先问原来的东西哪些还可以用。麻烦是启动新东西可能慢一点。'},
    love:{say:'你在亲近关系里，可能更看重长期能不能过得安稳。',scene:'对方提出一个很突然的计划，你会先考虑时间、钱和家里怎么安排，容易被说“不够浪漫”。'},
    career:{say:'做工作你更适合把事情慢慢做稳，而不是天天换方向。',scene:'团队想换一套新流程，你会先查旧流程哪里真有问题。速度可能不最快，但你很怕折腾半天白忙。'},
    wealth:{say:'花钱时，你可能习惯先留出一部分备用。',scene:'哪怕手头能买更贵的东西，你也会想“万一后面还要用钱呢”。风险是有时连该花的钱也舍不得花。'},
    health:{say:'你的生活安排可能更喜欢固定一点、可预期一点。',scene:'突然打乱吃饭、睡觉或休息时间，你可能比别人更不适应。传统命盘不能据此判断健康问题。'},
  },
  太阴:{
    overview:{say:'你可能不急着表态，而是先悄悄把细节看清楚。',scene:'大家说都没问题时，你会留意还有哪个地方没交代好。细心是好事，但容易为小事费神。'},
    personality:{say:'你会记住不少别人随口说过的小事。',scene:'有人前几天提过一个需求，你可能还记得；可对方一句无心的话，你也可能琢磨很久。'},
    love:{say:'你关心人时，可能更注意小细节。',scene:'对方喜欢什么、什么事会不舒服，你可能默默记着。但你不说出自己的需要，对方未必知道。'},
    career:{say:'做事你可能愿意先检查一遍细节，再交出去。',scene:'文件发出前你会多看一眼数字或措辞。代价是别人已经交差，你还在改最后几个地方。'},
    wealth:{say:'用钱上你可能更喜欢心里有数，而不是只看眼前够不够。',scene:'买一件贵东西前，你会想接下来几个月还有什么支出。算得细，有时也会让自己太纠结。'},
    health:{say:'碰到心里放不下的事，你可能会带着它忙一天。',scene:'本来想安静歇会儿，突然想起某件细节，又拿起手机确认。这是生活表现的假设，不是健康诊断。'},
  },
  贪狼:{
    overview:{say:'有新鲜东西出现，你可能很难不想试一试。',scene:'刷到一个新地方、新玩法或新机会，你就想去了解；麻烦是开了太多头，后面不一定都做完。'},
    personality:{say:'你很容易被有趣的人和事吸引，闷着不动反而没精神。',scene:'朋友讲起一件没见过的事，你可能主动追问甚至想马上参与。容易一时兴起答应太多。'},
    love:{say:'跟人相处时，你可能更喜欢有新鲜感，不爱每天都一个样。',scene:'你会想换个地方约会、找点新节目；对方如果只想安静待着，可能觉得跟不上你的节奏。'},
    career:{say:'工作出现新机会、新做法，你可能愿意第一个去接触。',scene:'有人提议开辟新客户或尝试新工具，你会好奇能不能做。最大麻烦是新方向多了，老事情容易分心。'},
    wealth:{say:'让你心动的东西出现时，你可能容易想“先体验再说”。',scene:'一场活动、一件新装备很吸引你，买完才想起还有其他开销。最好分清尝鲜和真正需要。'},
    health:{say:'你可能更难长时间待在单调的生活节奏里。',scene:'原本打算早点休息，临时有人喊你出去看看新地方，就可能改主意。这与身体好坏没有直接关系。'},
  },
  巨门:{
    overview:{say:'别人说一件事，你可能先想“这话有没有漏洞”。',scene:'大家都说这个办法好，你偏偏会问坏处是什么。你问的是问题，别人却可能以为你专门唱反调。'},
    personality:{say:'你不太容易被一句“大家都这么说”说服。',scene:'听到一个结论，你会继续追问依据。问到最后，对方可能不想聊了，你却觉得还没说清楚。'},
    love:{say:'吵架时，你可能很想把前因后果一条条讲明白。',scene:'对方想先停一停，你还想解释那句原话。道理可能没错，但越解释越像在争输赢。'},
    career:{say:'工作里，你可能特别会挑出计划中没说清的地方。',scene:'别人报方案，你会问谁负责、出了问题怎么办。事前能少踩坑，但也容易被看作太挑剔。'},
    wealth:{say:'别人推荐赚钱办法时，你可能先想哪里不靠谱。',scene:'听到“稳赚”的说法，你会追问怎么算钱、谁承担损失。警惕有价值，但别因为总怀疑而迟迟不作必要决定。'},
    health:{say:'一件事没解释清楚，你可能会忍不住继续争论。',scene:'明明准备休息，却还在手机上和别人把一个问题说到底。命盘不能判断这是否影响真实健康。'},
  },
  天相:{
    overview:{say:'你很在意事情是不是公平、有没有照规矩来。',scene:'大家轮流做一件事，有人总不出力，你可能会提出来。别人觉得是小事，你却在乎以后怎么合作。'},
    personality:{say:'你更愿意把分工讲清楚，而不是完全靠感觉做事。',scene:'一群人合办活动，你会想把谁负责哪块说清楚。碰上有人随意改规则，你容易不舒服。'},
    love:{say:'你跟人相处，希望两个人都能有商有量。',scene:'对方一声不响改变共同计划，你可能会认真追问为什么不先商量。问题在于太讲道理时少了点温度。'},
    career:{say:'团队里分工不均时，你可能比别人更容易看出来。',scene:'有人老加班，有人一直躲事，你会想重新划分职责；若总替别人调解，自己也会很累。'},
    wealth:{say:'涉及一起花钱时，你可能很在意算得公不公平。',scene:'几个人聚餐或合租，你会希望事前说清楚怎么分摊。太认真时可能被误会成小气。'},
    health:{say:'当周围安排很乱时，你可能总想把秩序恢复过来。',scene:'大家临时改时间，你会忍不住重新协调，连自己休息时间也拿来帮忙安排。'},
  },
  天梁:{
    overview:{say:'看到别人犯你走过的错，你可能忍不住想提醒。',scene:'朋友说要做一件冒险的事，你会先讲以前有哪些坑。对方有时只想被支持，却觉得你在说教。'},
    personality:{say:'你比较容易把“我来提醒一下”变成“我来负责到底”。',scene:'有人问你一句意见，你可能连后续怎么处理都替他想好了。这样很容易帮人帮过头。'},
    love:{say:'你表达关心时，可能更像在提醒对方少走弯路。',scene:'亲近的人做决定，你会指出哪里有风险。讲得多了，对方可能觉得你像在管教他。'},
    career:{say:'遇到新人或缺经验的人，你可能愿意教他怎么做。',scene:'同事出了差错，你会想着把方法说透。麻烦是教着教着，别人干的活也变成你在操心。'},
    wealth:{say:'花钱碰到没把握的事，你可能喜欢先听有经验的人怎么说。',scene:'面对一个陌生项目，你会想查历史、看风险。光听经验有时也会错过现实情况已变的信号。'},
    health:{say:'周围人需要帮忙时，你可能很难完全撒手。',scene:'本来打算休息，看到家人朋友有麻烦又想去管。这里说的是可能的照顾习惯，不是身体预测。'},
  },
  七杀:{
    overview:{say:'遇到必须做决定的时候，你可能不太愿意一直等别人。',scene:'一件事拖来拖去，你会想“先做一个选择再说”。动作快，但有时别人还没准备好。'},
    personality:{say:'你不喜欢被人一步一步盯着做事。',scene:'别人隔几分钟问一次进展，你可能会直接说“让我自己来”。这份独立有时会让人误会你不愿配合。'},
    love:{say:'你对自己的空间可能看得比较重。',scene:'对方总想知道你每件事怎么安排，你会觉得被管太多；不解释清楚，又容易让对方不安。'},
    career:{say:'新任务没人敢接时，你可能愿意先冲上去试。',scene:'领导还在犹豫方案，你会说不如先做小范围尝试。速度上来了，但风险也可能先落到你身上。'},
    wealth:{say:'你可能更愿意为明确目标快速作决定。',scene:'认定一件东西有用时，你不想来回比价。要防的是判断太快、忽略后续开销。'},
    health:{say:'手头有个目标时，你可能很难中途收手。',scene:'明明已到休息时间，事情只差最后一点，你还想继续完成。不能据此判断身体状况。'},
  },
  破军:{
    overview:{say:'如果一件事老是没效果，你可能很想直接换个做法。',scene:'大家还想修补旧方案，你已经在想是不是干脆从头做。改变有劲头，但容易把原本能用的也推翻。'},
    personality:{say:'你对“反正一直如此”这句话可能没什么耐心。',scene:'看到一套重复又低效的流程，你会想把它改掉。麻烦是你想得快，别人接受得没那么快。'},
    love:{say:'相处里有什么一直不舒服，你可能不愿装作没问题。',scene:'一个矛盾反复出现，你会提出必须改变的办法；说得太急，容易让对方觉得你在下最后通牒。'},
    career:{say:'工作上你可能更想解决老毛病，而不是天天补漏洞。',scene:'同一个问题三番五次出现，你会想重新设计流程。若没有先和相关的人沟通，改革可能推不动。'},
    wealth:{say:'遇到让你不满意的花钱方式，你可能突然决定全部调整。',scene:'发现某项长期支出不划算，你会想直接取消或换方案。改变之前最好留意是否会产生新的费用。'},
    health:{say:'被固定安排困住久了，你可能突然很想换个节奏。',scene:'连续忙了几天，你会想彻底改变休息计划。但是否影响健康不能靠命盘判断。'},
  },
};

const ACTIONS:Record<Key,string>={
  overview:'碰到一件别人都不愿定下来的事时，先看自己会不会出现上面那种具体做法；没有就不要硬套。',
  personality:'遇到类似情境，可以先留意自己的第一反应，而不是只看别人怎么评价你。',
  love:'有分歧时先说“刚才哪件事让我不舒服”，别让对方猜心思。',
  career:'下次接一个任务，先确认谁负责、什么时候做完，再决定要不要多扛一份。',
  wealth:'要花一笔超出平时预算的钱时，先写出总价和之后还要花多少，再决定。',
  health:'忙完一段时间，试着定一个不看工作消息的休息时段；身体问题仍以现实检查为准。',
};
const TITLES:Record<Key,string>={
  overview:'你做事的样子',personality:'性格与脾气',love:'跟亲近的人相处',
  career:'工作上',wealth:'花钱习惯',health:'生活节奏',
};

function norm(value:string):string {
  return value.replace(/宫$/, '').replace('交友','仆役');
}
function findPalace(chart:ZiweiChart,name:string):Palace|undefined {
  return chart.palaces.find(p=>norm(p.name)===name);
}
function majors(p?:Palace):Star[] {return p?.stars.filter(s=>s.type==='major') ?? [];}
function focusStars(chart:ZiweiChart,p?:Palace):{stars:Star[],borrowed:boolean,origin?:Palace} {
  if (!p) return {stars:[],borrowed:false};
  const own=majors(p);
  if (own.length) return {stars:own,borrowed:false,origin:p};
  const opposite=chart.palaces.find(q=>q.branch===(p.branch+6)%12);
  return {stars:majors(opposite),borrowed:true,origin:opposite};
}

function describeSiHua(stars:Star[]):string {
  const markers=stars.filter(s=>s.siHua);
  if(!markers.length)return '';
  const change = markers.map(s=>{
    switch(s.siHua){
      case '权': return '对承担责任、推进事情的关注';
      case '禄': return '对投入、资源和机会的关注';
      case '科': return '对表达、口碑和协作的关注';
      case '忌': return '对阻力、取舍和需要反复处理的问题的关注';
      default: return '';
    }
  }).filter(Boolean);
  return change.length?' 盘中的四化还提醒，可以同时留意'+Array.from(new Set(change)).slice(0,2).join('，以及')+'。':'';
}
function evidenceFor(p:Palace|undefined,stars:Star[],borrowed:boolean):string {
  if(!p)return '当前未找到对应的宫位资料。';
  const description=stars.length?stars.map(s=>s.name+(s.siHua?'化'+s.siHua:'')).join('、'):'无直接主星';
  return p.name + (borrowed?'（空宫，借对宫参考）':'') + '：' + description + '。';
}

export function buildPlainSections(chart:ZiweiChart):PlainSection[] {
  return OFFLINE_TOPICS.map(item=>{
    const key=item.key;
    const name:Record<Key,string>={
      overview:'命',personality:'命',love:'夫妻',career:'官禄',wealth:'财帛',health:'疾厄',
    };
    const palace=findPalace(chart,name[key]);
    if(!palace)return {key,title:TITLES[key],lead:'这一部分暂时没有找到对应命盘资料。',
      observation:'不能只凭其他宫位补出对你的描述。',
      suggestion:'等资料完整后再看。',evidence:'缺少'+name[key]+'宫'};
    const focus=focusStars(chart,palace);
    // The first directly placed (or explicitly borrowed) major star is the
    // topic's lead. It does not imply the other stars are unimportant.
    const chosen=focus.stars.find(star=>Boolean(STORIES[star.name]));
    const story=chosen?STORIES[chosen.name][key]:null;
    const cautious=chart.birthInfo.timePrecision==='unknown';
    const lead=cautious?'出生时辰不详，下面只是一种试排出来的说法。':
      story?.say??'这部分没有足够明确的主星信息，不能硬编成你的性格特点。';
    const observation=story?.scene??'需要先核对完整盘面，才能选择更贴近这个领域的典型行为。';
    const starNames=focus.stars.map(s=>s.name+(s.siHua?'化'+s.siHua:'')).join('、');
    const provenance=palace.name+(focus.borrowed?'（空宫，参考对宫星曜）':'')+
      '：'+(starNames||'没有直接主星')+'。'+
      (chosen?'本节示例以'+chosen.name+'的传统象征为线索，并不说明用户确实做过这些事。':'')+
      (focus.borrowed?'来源宫位：'+(focus.origin?.name||'对宫')+'；不可理解成原宫有这些星。':'');
    return {
      key,title:TITLES[key],lead,observation,
      suggestion:ACTIONS[key],evidence:provenance,
    };
  });
}

export function buildPlainTextReport(chart:ZiweiChart,year:number):string {
  const lines=[
    '紫微研究 · 命盘解读（通俗版）',
    chart.birthInfo.name ? '称呼：'+chart.birthInfo.name : '',
    '出生日期（用于排盘的公历）：'+
      [chart.birthInfo.year,chart.birthInfo.month,chart.birthInfo.day].join('-'),
    '',
    '这份内容是依据当前命盘生成的传统文化解释，并非 AI 分析或现实预测。',
    chart.birthInfo.timePrecision==='unknown'
      ? '出生时辰不详：当前仅是一张试排盘，宫位和解读都有可能变化。' : '',
    '',
  ];
  for(const section of buildPlainSections(chart)){
    lines.push('【'+section.title+'】',section.lead,section.observation,section.suggestion,'');
  }
  const dx=chart.daXians?.[chart.currentDaXianIndex];
  if(dx){
    lines.push('【当前阶段参考】',
      '按照这张命盘的传统时间划分，'+dx.startAge+'—'+dx.endAge+
      '岁以「'+dx.palaceName+'」为重点观察主题。它不代表这一年龄段一定发生某种事件。','');
  }
  lines.push('【'+year+' 年参考】',
    '流年分析仍在完善。这一版只提供年干四化参考，尚未完成春节／立春交界核对，不宜用来预测年度事件。','',
    '内容仅供传统文化学习，不是医疗、法律、投资等专业建议。');
  return lines.filter((line,i)=>line || (i>0&&lines[i-1]!=='')).join('\n');
}
