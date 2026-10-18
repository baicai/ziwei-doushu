import type { GregorianDate } from './true-solar-time';
import { isValidGregorianDate } from './true-solar-time';

/** Common IANA time zones; historical offsets and DST come from the runtime tzdata. */
export const BIRTH_TIME_ZONES: ReadonlyArray<{ value:string; label:string }> = [
  {value:'Asia/Shanghai',label:'中国标准时间（北京）'},
  {value:'Asia/Hong_Kong',label:'香港'},
  {value:'Asia/Macau',label:'澳门'},
  {value:'Asia/Taipei',label:'台北'},
  {value:'Asia/Singapore',label:'新加坡'},
  {value:'Asia/Kuala_Lumpur',label:'吉隆坡'},
  {value:'Asia/Tokyo',label:'东京'},
  {value:'Asia/Seoul',label:'首尔'},
  {value:'Asia/Bangkok',label:'曼谷'},
  {value:'Asia/Jakarta',label:'雅加达'},
  {value:'Asia/Manila',label:'马尼拉'},
  {value:'Asia/Kolkata',label:'加尔各答／新德里'},
  {value:'Asia/Dubai',label:'迪拜'},
  {value:'Australia/Sydney',label:'悉尼'},
  {value:'Australia/Melbourne',label:'墨尔本'},
  {value:'Pacific/Auckland',label:'奥克兰'},
  {value:'Europe/London',label:'伦敦'},
  {value:'Europe/Paris',label:'巴黎'},
  {value:'Europe/Berlin',label:'柏林'},
  {value:'America/New_York',label:'纽约'},
  {value:'America/Chicago',label:'芝加哥'},
  {value:'America/Los_Angeles',label:'洛杉矶'},
  {value:'America/Toronto',label:'多伦多'},
  {value:'America/Vancouver',label:'温哥华'},
];

export interface BeijingClock extends GregorianDate {
  clockHour: number;
  clockMinute: number;
}
function localParts(ms:number, timeZone:string): number {
  const f=new Intl.DateTimeFormat('en-GB',{
    timeZone,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  });
  const pieces=Object.fromEntries(f.formatToParts(new Date(ms))
    .filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
  return Date.UTC(pieces.year,pieces.month-1,pieces.day,pieces.hour,pieces.minute);
}

/**
 * A local wall-clock birth time -> civil time in Beijing.
 * Reject nonexistent spring-forward times AND ambiguous fall-back times rather
 * than guessing a UTC instant; the user must verify the original birth record.
 */
export function localClockToBeijing(
  date:GregorianDate,hour:number,minute:number,timeZone:string,
): BeijingClock {
  if(!isValidGregorianDate(date.year,date.month,date.day) || !Number.isInteger(hour) || hour<0 || hour>23 ||
    !Number.isInteger(minute) || minute<0 || minute>59)
    throw new RangeError('出生日期或时间不正确');
  if(!timeZone) throw new RangeError('请选择出生时区');
  const target=Date.UTC(date.year,date.month-1,date.day,hour,minute);
  let utc=target;
  for(let n=0;n<8;n++){
    const difference=target-localParts(utc,timeZone);
    if(difference===0)break;
    utc+=difference;
  }
  if(localParts(utc,timeZone)!==target) throw new RangeError('所选出生时间处于当地夏令时跳时，请核实时间');
  // Check repeated clock hour at DST fall-back or historic UTC offset changes.
  for(const delta of [-7200000,-3600000,-1800000,1800000,3600000,7200000]){
    if(localParts(utc+delta,timeZone)===target)
      throw new RangeError('出生时间处于当地夏令时重复时段，请核实标准时或联系管理员');
  }
  const beijing=new Date(utc+8*60*60000);
  return {year:beijing.getUTCFullYear(),month:beijing.getUTCMonth()+1,
    day:beijing.getUTCDate(),clockHour:beijing.getUTCHours(),clockMinute:beijing.getUTCMinutes()};
}
