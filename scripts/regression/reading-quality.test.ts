import assert from 'node:assert/strict';
import {parseSixTopicAnswer} from '../../lib/ai/reading-sections';
import {filterUsableChapters,isMetaOnlyLead} from '../../lib/ai/reading-quality';
import {LAY_WRITING_PROMPT,DEEP_READING_PROMPT} from '../../lib/ai/lay-writing';
const chapters=parseSixTopicAnswer([
 '【命格】你遇到争议时可能先要求把责任分清楚。比如几个朋友意见不同，你会提议先明确分工。',
 '【感情】当对方没有回应时，你可能先询问对方真正想法。',
 '【事业】这章只说工作安排，不推断你具体从事什么职业。',
 '【财运】不能通过命盘判断你的收入、储蓄、投资偏好。',
 '【健康】这章只说日常作息与休息安排，不推断你熬夜、失眠、硬撑或任何病症。',
 '【性格】听到新的方案时，你可能会先查看具体依据。',
].join('\n'));
assert.equal(chapters.length,6);
assert.deepEqual(filterUsableChapters(chapters).map(c=>c.key),['overview','love','personality']);
for(const s of ['这章只说日常作息与休息安排，不推断你熬夜、失眠、硬撑或任何病症。',
 '命盘无法推断你是否失眠。','本节仅讨论生活作息，不预测病症。']){
 assert(isMetaOnlyLead(s),s);
}
for(const s of ['你遇到争议时可能先问清楚谁负责。','如果别人提出新做法，你可能先问有没有依据。']){
 assert(!isMetaOnlyLead(s),s);
}
assert(LAY_WRITING_PROMPT.includes('不能写成“这章只说作息'));
assert(DEEP_READING_PROMPT.includes('免责声明统一放到报告末尾'));
console.log('AI quality gate: policy-only leads blocked; actual behavioral observations preserved');
