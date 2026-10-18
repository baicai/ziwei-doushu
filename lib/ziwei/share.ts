import type { BirthFormState } from '@/components/BirthForm';
import type { BirthInfo } from './types';
import { calculateTrueSolarTime, isValidGregorianDate, resolveZiweiDayOffset, shiftGregorianDate } from './true-solar-time';
import { lunarToSolar } from './lunar-solar';
import { localClockToBeijing } from './time-zone';

/** Legacy longitude-only branch helper; production form uses calculateTrueSolarTime with EoT. */
export function calcTrueSolarBranch(clockHour: number, clockMinute: number, longitude: number): number {
  const clockMins = clockHour * 60 + clockMinute;
  const offset = (longitude - 120) * 4;
  const solar = ((clockMins + offset) % 1440 + 1440) % 1440;
  if (solar >= 1380 || solar < 60) return 0;
  return Math.floor((solar - 60) / 120) + 1;
}

/** 将用户填写的公历或农历日期统一换成真实公历日期；错误农历/闰月不允许默默滚动。 */
export function resolveFormSolarDate(form: Pick<BirthFormState, 'year' | 'month' | 'day' | 'isLunar' | 'isLeapMonth'>) {
  const year = Number(form.year), month = Number(form.month), day = Number(form.day);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (form.isLunar) return lunarToSolar(year, month, day, Boolean(form.isLeapMonth));
  return isValidGregorianDate(year, month, day) ? { year, month, day } : null;
}

/** 将当地出生时间换算成东八区钟表时间，用于全站统一的真太阳时计算。 */
export function resolveFormBeijingClock(form: BirthFormState) {
  const entered = resolveFormSolarDate(form);
  if (!entered) throw new RangeError('出生日期无效');
  const hour=Number(form.clockHour), minute=Number(form.clockMinute);
  if(form.locationMode === 'overseas')
    return localClockToBeijing(entered,hour,minute,form.timeZone || '');
  return { ...entered,clockHour:hour,clockMinute:minute };
}

/** BirthFormState → BirthInfo
 *
 * 子时规则（传统排盘口径，可随流派调整）：
 * · 校正后的 23:00-23:59 = 晚子时，按次日排盘
 * · 校正后的 00:00-00:59 = 早子时，按当天排盘
 * 这与「时辰支同为子(0)」并不冲突——子时分早晚两段，需要在日期上区分。
 */
export function formToBirthInfo(form: BirthFormState): BirthInfo {
  const entered = resolveFormSolarDate(form);
  if (!entered) throw new RangeError('出生日期无效，请检查日期或闰月');
  const originalHour = Number(form.clockHour);
  const originalMinute = Number(form.clockMinute);
  const bjt = form.unknownTime ? { ...entered,clockHour:originalHour,clockMinute:originalMinute } : resolveFormBeijingClock(form);
  const hourValue = bjt.clockHour;
  const minuteValue = bjt.clockMinute;
  const hasClock = !form.unknownTime;
  const hasLocation = Boolean((form.locationMode === 'overseas' ? form.city : form.province && form.city)
    && Number.isFinite(form.longitude));
  const solar = hasClock ? calculateTrueSolarTime({
    year:bjt.year,month:bjt.month,day:bjt.day,
    clockHour: hourValue,
    clockMinute: minuteValue,
    longitude: hasLocation ? form.longitude : undefined,
  }) : null;
  const dayOffset = solar ? resolveZiweiDayOffset(solar, 'next-day') : 0;
  const baseDate = {year:bjt.year,month:bjt.month,day:bjt.day};
  const shifted = dayOffset ? shiftGregorianDate(baseDate, dayOffset) : baseDate;
  return {
    ...shifted,
    hour: solar?.branch ?? 0,
    gender: form.gender,
    name: form.name || undefined,
    province: form.province || undefined,
    city: form.city || undefined,
    longitude: hasLocation ? form.longitude : undefined,
    timeZone: form.locationMode === 'overseas' ? form.timeZone : 'Asia/Shanghai',
    timePrecision: form.unknownTime ? 'unknown' : 'known',
    origInput: hasClock ? {
      ...entered,
      clockHour: originalHour,
      clockMinute: originalMinute,
    } : undefined,
  };
}

/** BirthFormState → URLSearchParams（用于分享链接） */
export function formToSearchParams(form: BirthFormState): URLSearchParams {
  const p = new URLSearchParams();
  if (form.name) p.set('n', form.name);
  if (form.locationMode === 'overseas') {
    p.set('loc','overseas');
    if (form.timeZone) p.set('tz', form.timeZone);
  }
  p.set('y', form.year);
  p.set('m', form.month);
  p.set('d', form.day);
  if (form.isLunar) {
    p.set('cal', 'lunar');
    if (form.isLeapMonth) p.set('leap', '1');
  }
  if (form.unknownTime) {
    p.set('u', '1');
  } else {
    p.set('h', form.clockHour);
    p.set('mi', form.clockMinute);
  }
  if (form.province) p.set('p', form.province);
  if (form.city) p.set('c', form.city);
  if (form.longitude && form.longitude !== 120) p.set('lo', String(form.longitude));
  p.set('g', form.gender === 'male' ? 'm' : 'f');
  return p;
}

/** URLSearchParams → Partial<BirthFormState>，不完整时返回 null */
export function searchParamsToForm(params: URLSearchParams): Partial<BirthFormState> | null {
  const year = params.get('y');
  const month = params.get('m');
  const day = params.get('d');
  if (!year || !month || !day) return null;
  return {
    name: params.get('n') || '',
    year,
    month,
    day,
    isLunar: params.get('cal') === 'lunar',
    isLeapMonth: params.get('cal') === 'lunar' && params.get('leap') === '1',
    unknownTime: params.get('u') === '1',
    clockHour: params.get('h') || '8',
    clockMinute: params.get('mi') || '0',
    province: params.get('p') || '',
    city: params.get('c') || '',
    longitude: parseFloat(params.get('lo') || '120'),
    locationMode: params.get('loc') === 'overseas' ? 'overseas' : 'china',
    timeZone: params.get('loc') === 'overseas' ? (params.get('tz') || '') : 'Asia/Shanghai',
    gender: params.get('g') === 'f' ? 'female' : 'male',
  };
}
