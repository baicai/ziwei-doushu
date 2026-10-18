import assert from 'node:assert/strict';
import { topicSynthesis } from '../../lib/ziwei/topic-synthesis';
import type { ZiweiChart, Palace } from '../../lib/ziwei/types';
const names=['命','兄弟','夫妻','子女','财帛','疾厄','迁移','仆役','官禄','田宅','福德','父母'];
const palaces: Palace[]=names.map((name,i)=>({name,branch:i,stem:i%10,stars:[{name:i===4?'武曲':'天府',type:'major',siHua:i===4?'忌':undefined}]}));
const chart={palaces} as ZiweiChart;
for(const topic of ['overview','personality','love','career','wealth','health'] as const) {
 const output=topicSynthesis(chart,topic);
 assert.ok(output.includes('本宫') && output.includes('对宫') && output.includes('三合'));
 assert.ok(output.includes('证据范围'));
 assert.ok(!output.includes('2027年发财'));
}
const wealth=topicSynthesis(chart,'wealth');
assert.ok(wealth.includes('田宅'));
assert.ok(wealth.includes('武曲化忌'));
assert.ok(topicSynthesis({...chart,palaces:palaces.slice(1)},'wealth').includes('资料不完整'));
console.log('six topic synthesis regression passed');
