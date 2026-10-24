import type { BirthInfo } from '../ziwei/types';
import type { OfflineTopic } from '../ziwei/offline-interpretation';

export const READING_FEEDBACK_PREFIX = 'ziwei:reading-feedback:v1:';
export const READING_FEEDBACK_EVENT = 'ziwei:reading-feedback-updated';
export type ReadingFeedbackChoice = 'agree' | 'partial' | 'disagree';
export type ReadingFeedbackSource = 'offline' | 'basic' | 'deep';
export type ReadingFeedbackEntry = {
  id:string; topic:OfflineTopic; source:ReadingFeedbackSource;
  choice:ReadingFeedbackChoice; excerpt:string; updatedAt:number;
};
export type ReadingFeedbackStore = Record<string,ReadingFeedbackEntry>;
const VALID_TOPICS = new Set(['overview','love','career','wealth','health','personality']);
const VALID_CHOICES = new Set(['agree','partial','disagree']);
const VALID_SOURCES = new Set(['offline','basic','deep']);
const MAX_ENTRIES = 48;

/** A one-way chart scope: never store a name, raw birthday or address in the key. */
export async function readingFeedbackScope(birth:BirthInfo):Promise<string|null>{
  if(typeof crypto==='undefined' || !crypto.subtle)return null;
  const source=JSON.stringify({
    y:birth.year,m:birth.month,d:birth.day,h:birth.hour,
    gender:birth.gender,longitude:birth.longitude??null,
    timeZone:birth.timeZone??null,
    precision:birth.timePrecision??'known',
    clock:birth.origInput??null,
  });
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  const hex=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return hex.slice(0,32);
}

/** A fingerprint of the actual rendered wording; ratings must not transfer to revised claims. */
export function readingTextId(source:ReadingFeedbackSource,topic:OfflineTopic,text:string){
  let hash=2166136261;
  const normalized=text.replace(/\s+/g,' ').trim();
  for(let i=0;i<normalized.length;i++){
    hash^=normalized.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return source+':'+topic+':'+(hash>>>0).toString(16).padStart(8,'0');
}
export function readingFeedbackKey(scope:string){
  if(!/^[a-f0-9]{32}$/.test(scope))throw new Error('Invalid chart scope');
  return READING_FEEDBACK_PREFIX+scope;
}
export function readReadingFeedback(store:Pick<Storage,'getItem'>,scope:string):ReadingFeedbackStore{
  try{
    const raw=store.getItem(readingFeedbackKey(scope));
    if(!raw || raw.length>48000)return {};
    const parsed:unknown=JSON.parse(raw);
    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed))return {};
    const accepted:ReadingFeedbackEntry[]=[];
    for(const [id,value] of Object.entries(parsed)){
      if(!value || typeof value!=='object' || Array.isArray(value))continue;
      const record=value as Record<string,unknown>;
      if(!/^(?:offline|basic|deep):(?:overview|love|career|wealth|health|personality):[a-f0-9]{8}$/.test(id)
        || record.id!==id || !VALID_TOPICS.has(String(record.topic))
        || !VALID_CHOICES.has(String(record.choice)) || !VALID_SOURCES.has(String(record.source))
        || typeof record.excerpt!=='string' || record.excerpt.length>100
        || typeof record.updatedAt!=='number' || !Number.isFinite(record.updatedAt))continue;
      accepted.push(record as ReadingFeedbackEntry);
    }
    return Object.fromEntries(accepted.sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,MAX_ENTRIES).map(e=>[e.id,e]));
  }catch{return {};}
}
export function writeReadingFeedback(store:Pick<Storage,'setItem'>,scope:string,entries:ReadingFeedbackStore){
  const sorted=Object.values(entries).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,MAX_ENTRIES);
  const clean=Object.fromEntries(sorted.map(e=>[e.id,e]));
  store.setItem(readingFeedbackKey(scope),JSON.stringify(clean));
  return clean as ReadingFeedbackStore;
}
export function excerptForReading(text:string){
  return text.replace(/\s+/g,' ').trim().slice(0,96);
}
