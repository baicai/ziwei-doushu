/**
 * Last successfully submitted chart, stored only in this browser's localStorage.
 * Store input rather than the derived chart so engine fixes apply on restore.
 * Data is plaintext in same-origin localStorage: do not use on shared devices.
 */
import type { BirthInfo } from './types';
import type { BirthFormState } from '@/components/BirthForm';

export const LAST_CHART_STORAGE_KEY = 'ziwei_chart_last_v1';

export interface CachedChartInput {
  version: 1;
  savedAt: number;
  birthInfo: BirthInfo;
  form: BirthFormState;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dateExists(y: number, m: number, d: number): boolean {
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d;
}

function optionalString(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && value.length <= 120);
}

function isBirthInfo(value: unknown): value is BirthInfo {
  if (!isObject(value)) return false;
  const { year, month, day, hour, gender, longitude, name, province, city } = value;
  return typeof year === 'number' && Number.isInteger(year) && year >= 1900 && year <= 2100 &&
    typeof month === 'number' && Number.isInteger(month) && month >= 1 && month <= 12 &&
    typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 31 &&
    dateExists(year, month, day) &&
    typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 11 &&
    (gender === 'male' || gender === 'female') &&
    (longitude === undefined ||
      (typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180)) &&
    optionalString(name) && optionalString(province) && optionalString(city);
}

function isForm(value: unknown): value is BirthFormState {
  if (!isObject(value)) return false;
  const { name, year, month, day, clockHour, clockMinute, gender, province, city, longitude, unknownTime } = value;
  const parts = [name, year, month, day, clockHour, clockMinute, province, city];
  const shortStrings = parts.every(s => typeof s === 'string' && s.length <= 120);
  if (!shortStrings || typeof unknownTime !== 'boolean' ||
    (gender !== 'male' && gender !== 'female') ||
    typeof longitude !== 'number' || !Number.isFinite(longitude) ||
    longitude < -180 || longitude > 180) return false;
  const y = Number(year), m = Number(month), d = Number(day);
  const h = Number(clockHour), min = Number(clockMinute);
  return /^\d{4}$/.test(year as string) && y >= 1900 && y <= 2100 &&
    /^\d{1,2}$/.test(month as string) && m >= 1 && m <= 12 &&
    /^\d{1,2}$/.test(day as string) && dateExists(y, m, d) &&
    /^\d{1,2}$/.test(clockHour as string) && h >= 0 && h <= 23 &&
    /^\d{1,2}$/.test(clockMinute as string) && min >= 0 && min <= 59;
}

export function parseCachedChart(raw: string | null): CachedChartInput | null {
  if (!raw || raw.length > 12000) return null;
  try {
    const candidate: unknown = JSON.parse(raw);
    if (!isObject(candidate) || candidate.version !== 1 ||
      !Number.isSafeInteger(candidate.savedAt) ||
      !isBirthInfo(candidate.birthInfo) || !isForm(candidate.form)) return null;

    // A malformed/stale pair should not silently restore as a different user.
    if (candidate.birthInfo.gender !== candidate.form.gender) return null;

    return candidate as unknown as CachedChartInput;
  } catch {
    return null;
  }
}

export function buildCachedChart(birthInfo: BirthInfo, form: BirthFormState): CachedChartInput {
  return { version: 1, savedAt: Date.now(), birthInfo, form };
}
