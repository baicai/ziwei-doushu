import assert from 'node:assert/strict';
import {
 readingFeedbackScope, readingTextId, readingFeedbackKey,
 readReadingFeedback, writeReadingFeedback, excerptForReading,
} from '../../lib/ai/reading-feedback';
import type { BirthInfo } from '../../lib/ziwei/types';

const birth:BirthInfo={year:1990,month:5,day:17,hour:6,gender:'female',name:'匿名',longitude:116.4};
const main=await readingFeedbackScope(birth);
assert.ok(main && /^[a-f0-9]{32}$/.test(main));
assert.equal(main,await readingFeedbackScope({...birth,name:'改称呼'}),'nickname must never change identity');
assert.notEqual(main,await readingFeedbackScope({...birth,hour:5}),'birth time must distinguish charts');
assert.notEqual(main,await readingFeedbackScope({...birth,longitude:106.08}),'coordinates must distinguish charts');
const local=new Map<string,string>();
const storage={
 getItem:(key:string)=>local.get(key)??null,
 setItem:(key:string,value:string)=>{local.set(key,value);},
};
const id=readingTextId('deep','career','你的事业主题');
assert.equal(id,readingTextId('deep','career','你的事业主题'));
assert.notEqual(id,readingTextId('deep','career','改过的事业主题'));
assert.notEqual(id,readingTextId('offline','career','你的事业主题'));
const entry={id,topic:'career' as const,source:'deep' as const,choice:'partial' as const,
 excerpt:excerptForReading('你的事业主题'),updatedAt:123456789};
assert.deepEqual(readReadingFeedback(storage,main!),{});
writeReadingFeedback(storage,main!,{[id]:entry});
assert.deepEqual(readReadingFeedback(storage,main!),{[id]:entry});
assert.equal(readReadingFeedback(storage,(await readingFeedbackScope({...birth,hour:3}))!)[id],undefined);
const key=readingFeedbackKey(main!);
assert.equal(key.includes('1990'),false,'raw birthday must not appear in key');
assert.equal(key.includes('匿名'),false,'name must not appear in key');
local.set(key,JSON.stringify({...JSON.parse(local.get(key)!),bad:{choice:'invalid'}}));
assert.deepEqual(readReadingFeedback(storage,main!),{[id]:entry},'reject malformed entries');
local.set(key,'bad json');
assert.deepEqual(readReadingFeedback(storage,main!),{});
console.log('Reading feedback privacy, chart isolation and content-key regression passed');
