import assert from 'node:assert/strict';
import { buildCachedChart, parseCachedChart } from '../../lib/ziwei/chart-cache';
import type { BirthInfo } from '../../lib/ziwei/types';
import type { BirthFormState } from '../../components/BirthForm';

const info: BirthInfo = {
  year: 1990, month: 5, day: 17, hour: 6, gender: 'male',
  name: '测试用户', city: '北京', province: '北京市', longitude: 116.4,
};
const form: BirthFormState = {
  name: '测试用户', year: '1990', month: '5', day: '17',
  clockHour: '12', clockMinute: '15', unknownTime: false,
  province: '北京市', city: '北京', longitude: 116.4, gender: 'male',
};
const saved = buildCachedChart(info, form);
assert.equal(saved.version, 1);
assert.equal(saved.birthInfo.hour, 6);
assert.deepEqual(parseCachedChart(JSON.stringify(saved)), saved);
assert.equal(parseCachedChart(null), null);
assert.equal(parseCachedChart('not json'), null);
assert.equal(parseCachedChart('a'.repeat(12001)), null);

for (const data of [
  { ...saved, version: 99 },
  { ...saved, birthInfo: { ...info, gender: 'invalid' } },
  { ...saved, birthInfo: { ...info, hour: 12 } },
  { ...saved, birthInfo: { ...info, month: 2, day: 30 } },
  { ...saved, birthInfo: { ...info, longitude: Infinity } },
  { ...saved, birthInfo: { ...info, gender: 'female' } },
  { ...saved, form: { ...form, clockHour: '25' } },
  { ...saved, form: { ...form, date: 'junk', day: '31', month: '2' } },
  { ...saved, form: null },
]) {
  assert.equal(parseCachedChart(JSON.stringify(data)), null);
}

console.log('chart-cache regression passed: restore, version, invalid inputs, cross-gender and corrupt payload');
