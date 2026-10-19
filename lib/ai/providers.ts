/**
 * Server-only AI provider registry.
 *
 * Explicit allowlists prevent user-supplied endpoints, unrecognized models,
 * and accidental credential reuse across providers. No fallback calls that
 * might silently bill another provider.
 */
export type AiProviderId = 'deepseek' | 'qwen';
export type AiChatMessage = {role:'system' | 'user' | 'assistant';content:string};
export interface AiProviderConfig {
  id:AiProviderId;
  model:string;
  endpoint:string;
  apiKey:string;
}
export function parseAiProvider(v:unknown):AiProviderId|null {
  if(v===undefined || v===null || v==='deepseek') return 'deepseek';
  return v==='qwen'?'qwen':null;
}
function safeQwenUrl(v:string):string|null {
  try{
    const url=new URL(v);
    const domain=url.hostname.toLowerCase();
    const allowed = domain==='dashscope-intl.aliyuncs.com' ||
      domain==='dashscope.aliyuncs.com' ||
      (domain.endsWith('.maas.aliyuncs.com') && domain.length>'.maas.aliyuncs.com'.length);
    if(url.protocol!=='https:' || !allowed || url.username || url.password ||
       url.port || url.search || url.hash ||
       url.pathname!=='/compatible-mode/v1/chat/completions') return null;
    return url.href;
  }catch{return null;}
}
export function resolveAiProvider(
  id:AiProviderId,
  env:Record<string,string|undefined>=process.env,
):AiProviderConfig|null {
  if(id==='deepseek'){
    const key=env.DEEPSEEK_API_KEY;
    if(!key)return null;
    return {
      id,apiKey:key,endpoint:'https://api.deepseek.com/chat/completions',
      model:env.DEEPSEEK_MODEL==='deepseek-v4-pro'?'deepseek-v4-pro':'deepseek-flash',
    };
  }
  const key=env.DASHSCOPE_API_KEY;
  if(!key)return null;
  // Defaults to the legacy Singapore URL, which is still documented. A
  // region/workspace-specific endpoint can be explicitly configured.
  const endpoint=safeQwenUrl(env.QWEN_CHAT_COMPLETIONS_URL ||
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');
  if(!endpoint)return null;
  const model=['qwen-plus','qwen-max','qwen-turbo'].includes(env.QWEN_MODEL||'')
    ? env.QWEN_MODEL! : 'qwen-plus';
  return {id,apiKey:key,endpoint,model};
}
export function availableAiProviders(env:Record<string,string|undefined>=process.env):AiProviderId[]{
  return (['deepseek','qwen'] as const).filter(id=>Boolean(resolveAiProvider(id,env)));
}
export function aiRequestPayload(provider:AiProviderConfig,messages:AiChatMessage[]) {
  const shared={model:provider.model,temperature:0.3,max_tokens:1200,stream:false,messages};
  return provider.id==='deepseek'?{...shared,thinking:{type:'disabled'}}:shared;
}
