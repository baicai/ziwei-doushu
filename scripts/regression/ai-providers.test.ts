import assert from 'node:assert/strict';
import {parseAiProvider,resolveAiProvider,availableAiProviders,aiRequestPayload}
  from '../../lib/ai/providers';

assert.equal(parseAiProvider(undefined),'deepseek');
assert.equal(parseAiProvider('deepseek'),'deepseek');
assert.equal(parseAiProvider('qwen'),'qwen');
assert.equal(parseAiProvider('QWEN'),null);
assert.equal(parseAiProvider('https://evil.invalid'),null);
assert.deepEqual(availableAiProviders({}),[]);
const deep=resolveAiProvider('deepseek',{DEEPSEEK_API_KEY:'test-deepseek-key'});
assert(deep);
assert.equal(deep.model,'deepseek-flash');
assert.equal(deep.endpoint,'https://api.deepseek.com/chat/completions');
assert.equal(resolveAiProvider('deepseek',{DEEPSEEK_API_KEY:'test',DEEPSEEK_MODEL:'untrusted-model'})?.model,'deepseek-flash');
assert.equal(resolveAiProvider('deepseek',{DEEPSEEK_API_KEY:'test',DEEPSEEK_MODEL:'deepseek-v4-pro'})?.model,'deepseek-v4-pro');
const qwen=resolveAiProvider('qwen',{DASHSCOPE_API_KEY:'test-qwen-key'});
assert(qwen);
assert.equal(qwen.model,'qwen-plus');
assert.equal(qwen.endpoint,'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');
assert.deepEqual(availableAiProviders({DEEPSEEK_API_KEY:'d',DASHSCOPE_API_KEY:'q'}),['deepseek','qwen']);
assert.equal(resolveAiProvider('qwen',{DEEPSEEK_API_KEY:'other'}),null,'never reuse DeepSeek credentials for Qwen');
for(const endpoint of [
  'http://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  'https://evil.example.com/compatible-mode/v1/chat/completions',
  'https://maas.aliyuncs.com/compatible-mode/v1/chat/completions',
  'https://dashscope-intl.aliyuncs.com.evil.example/compatible-mode/v1/chat/completions',
  'https://dashscope-intl.aliyuncs.com@evil.example/compatible-mode/v1/chat/completions',
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions?test=1',
  'https://dashscope-intl.aliyuncs.com:1234/compatible-mode/v1/chat/completions',
]) assert.equal(resolveAiProvider('qwen',{DASHSCOPE_API_KEY:'test',QWEN_CHAT_COMPLETIONS_URL:endpoint}),null,
  'untrusted endpoint must be rejected: '+endpoint);
const workspace=resolveAiProvider('qwen',{
  DASHSCOPE_API_KEY:'test',QWEN_MODEL:'qwen-plus',
  QWEN_CHAT_COMPLETIONS_URL:'https://abc-123.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
});
assert(workspace);
const messages=[{role:'user' as const,content:'你好'}];
const dsPayload=aiRequestPayload(deep,messages);
const qwenPayload=aiRequestPayload(qwen,messages);
assert.equal(dsPayload.model,'deepseek-flash');
assert.deepEqual(dsPayload.messages,messages);
assert.deepEqual(qwenPayload.messages,messages);
assert('thinking' in dsPayload,'DeepSeek should explicitly disable thinking');
assert(!('thinking' in qwenPayload),'Qwen should not receive DeepSeek-only thinking option');
assert.equal(dsPayload.temperature,0.3);
assert.equal(qwenPayload.temperature,0.3);
console.log('AI provider registry and safe routing regression passed');
