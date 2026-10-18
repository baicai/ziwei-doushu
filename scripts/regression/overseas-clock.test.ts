import assert from 'node:assert/strict';
import type { BirthFormState } from '../../components/BirthForm';
import { localClockToBeijing } from '../../lib/ziwei/time-zone';
import { formToBirthInfo } from '../../lib/ziwei/share';

assert.deepEqual(localClockToBeijing({year:2024,month:1,day:1},12,0,'Asia/Tokyo'),
  {year:2024,month:1,day:1,clockHour:11,clockMinute:0});
assert.deepEqual(localClockToBeijing({year:2024,month:7,day:1},9,30,'Europe/London'),
  {year:2024,month:7,day:1,clockHour:16,clockMinute:30});
assert.deepEqual(localClockToBeijing({year:2024,month:1,day:1},0,30,'America/New_York'),
  {year:2024,month:1,day:1,clockHour:13,clockMinute:30});
assert.throws(()=>localClockToBeijing({year:2024,month:3,day:10},2,30,'America/New_York'),RangeError,
  'skipped DST hour cannot be interpreted silently');
assert.throws(()=>localClockToBeijing({year:2024,month:11,day:3},1,30,'America/New_York'),RangeError,
  'repeated DST hour needs disambiguation');
const base:BirthFormState={name:'',year:'2024',month:'7',day:'1',clockHour:'12',clockMinute:'30',
  province:'',city:'东京',longitude:139.7,timeZone:'Asia/Tokyo',
  locationMode:'overseas',gender:'female',unknownTime:false,isLunar:false,isLeapMonth:false};
const overseas = formToBirthInfo(base);
const beijing = formToBirthInfo({...base,locationMode:'china',province:'北京',clockHour:'11',
  timeZone:'Asia/Shanghai'});
assert.deepEqual([overseas.year,overseas.month,overseas.day,overseas.hour],
  [beijing.year,beijing.month,beijing.day,beijing.hour],
  'overseas local birth and the same Beijing civil instant should share one chart');
assert.equal(overseas.timeZone,'Asia/Tokyo');
console.log('Overseas IANA time zones and DST boundary checks passed');
