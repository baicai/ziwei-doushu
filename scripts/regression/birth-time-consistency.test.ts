import assert from 'node:assert/strict';
import type { BirthFormState } from '../../components/BirthForm';
import { formToBirthInfo } from '../../lib/ziwei/share';
import { calculateTrueSolarTime, resolveZiweiDayOffset } from '../../lib/ziwei/true-solar-time';
import { generateChart } from '../../lib/ziwei/algorithm';

function form(partial: Partial<BirthFormState> = {}): BirthFormState {
  return { name:'', year:'2000',month:'1',day:'31',clockHour:'23',clockMinute:'30',
    province:'',city:'',longitude:120,gender:'male',unknownTime:false,...partial };
}
const late = formToBirthInfo(form());
assert.deepEqual([late.year,late.month,late.day,late.hour],[2000,2,1,0]);
assert.deepEqual(late.origInput,{year:2000,month:1,day:31,clockHour:23,clockMinute:30});
const early = formToBirthInfo(form({clockHour:'0',clockMinute:'30'}));
assert.deepEqual([early.year,early.month,early.day,early.hour],[2000,1,31,0]);

// A longitude adjustment near midnight crosses a real day boundary even when
// the entered clock hour is not 23. The same solar-time result is used by the UI.
const city = form({year:'2000',month:'2',day:'1',clockHour:'1',clockMinute:'10',
  province:'云南',city:'某地',longitude:90});
const solar=calculateTrueSolarTime({year:2000,month:2,day:1,clockHour:1,clockMinute:10,longitude:90});
const mapped=formToBirthInfo(city);
assert.equal(mapped.hour,solar.branch);
assert.deepEqual([mapped.year,mapped.month,mapped.day],[2000,1,31]);
assert.equal(resolveZiweiDayOffset(solar),-1);
assert.equal(generateChart(mapped).birthInfo.hour,mapped.hour);

const noCity=formToBirthInfo(form({year:'2001',month:'4',day:'5',clockHour:'4',
  province:'',city:'',longitude:90}));
const unadjusted=calculateTrueSolarTime({year:2001,month:4,day:5,clockHour:4,clockMinute:30});
assert.equal(noCity.hour,unadjusted.branch,'no birthplace should not assume hidden longitude correction');

const nearEnd=formToBirthInfo(form({year:'2024',month:'12',day:'31',clockHour:'23',clockMinute:'40'}));
assert.deepEqual([nearEnd.year,nearEnd.month,nearEnd.day],[2025,1,1]);

const prevLate=formToBirthInfo(form({year:'2000',month:'2',day:'1',clockHour:'0',clockMinute:'30',province:'云南',city:'某地',longitude:90}));
const st=calculateTrueSolarTime({year:2000,month:2,day:1,clockHour:0,clockMinute:30,longitude:90});
assert.equal(prevLate.hour,st.branch);
assert.equal(prevLate.day,2000===prevLate.year&&1===prevLate.month?31:prevLate.day);
console.log('Birth date / local solar-time / zishi regression checks passed');
