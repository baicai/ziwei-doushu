import assert from 'node:assert/strict';
import type { BirthFormState } from '../../components/BirthForm';
import { formToBirthInfo, resolveFormSolarDate, formToSearchParams, searchParamsToForm } from '../../lib/ziwei/share';
import { leapMonthOfLunarYear, lunarToSolar, isValidLunarDate } from '../../lib/ziwei/lunar-solar';
import { buildCachedChart, parseCachedChart } from '../../lib/ziwei/chart-cache';

const base: BirthFormState = {
  name:'',year:'2024',month:'2',day:'10',clockHour:'12',clockMinute:'0',
  unknownTime:false,province:'',city:'',longitude:120,gender:'female',isLunar:false,isLeapMonth:false,
};
const solar = formToBirthInfo(base);
const lunarForm: BirthFormState = {...base,isLunar:true,year:'2024',month:'1',day:'1'};
const lunar = formToBirthInfo(lunarForm);
assert.deepEqual([solar.year,solar.month,solar.day,solar.hour],[lunar.year,lunar.month,lunar.day,lunar.hour],
  'Lunar January 1 2024 and solar February 10 must produce the same birth chart input');
assert.deepEqual(resolveFormSolarDate(lunarForm),{year:2024,month:2,day:10});
assert.equal(leapMonthOfLunarYear(2023),2);
assert.deepEqual(lunarToSolar(2023,2,1,true),{year:2023,month:3,day:22},
  '2023 lunar leap February must convert to the real March date');
assert.equal(isValidLunarDate(2024,2,1,true),false,'nonexistent leap month must be rejected');
assert.equal(lunarToSolar(2024,2,1,true),null);
assert.throws(()=>formToBirthInfo({...lunarForm,year:'2024',month:'2',isLeapMonth:true}),RangeError);
const link=formToSearchParams({...lunarForm,year:'2023',month:'2',isLeapMonth:true});
const parsed=searchParamsToForm(link);
assert.equal(parsed?.isLunar,true);
assert.equal(parsed?.isLeapMonth,true);
const cached=buildCachedChart(lunar,lunarForm);
assert(parseCachedChart(JSON.stringify(cached)),'lunar forms must survive safe cache restore');
assert.equal(formToBirthInfo({...lunarForm,unknownTime:true}).timePrecision,'unknown');
console.log('Lunar birth input / leap month / cache / share regression checks passed');
