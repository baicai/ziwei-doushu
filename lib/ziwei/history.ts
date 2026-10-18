import { useEffect, useState, useCallback } from 'react';
import type { BirthFormState } from '@/components/BirthForm';
import { resolveFormSolarDate } from './share';

const STORAGE_KEY = 'ziwei_history';
const MAX_ENTRIES = 10;

export interface HistoryEntry {
  id: string;
  label: string;
  form: BirthFormState;
  savedAt: number;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed:unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.filter((entry): entry is HistoryEntry =>
          !!entry && typeof entry === 'object' && typeof entry.id === 'string' &&
          typeof entry.label === 'string' && entry.label.length < 200 &&
          !!entry.form && typeof entry.form === 'object' &&
          typeof entry.form.year === 'string' && typeof entry.form.month === 'string' && typeof entry.form.day === 'string' &&
          !!resolveFormSolarDate(entry.form) && (entry.form.gender === 'male' || entry.form.gender === 'female')
        ).slice(0, MAX_ENTRIES));
      }
    } catch { /* localStorage 不可用时静默失败 */ }
  }, []);

  const save = useCallback((form: BirthFormState) => {
    const label = [
      form.name,
      `${form.isLunar ? '农历' : '公历'}${form.year}年${form.isLeapMonth ? '闰' : ''}${form.month}月${form.day}日`,
      form.city || form.province || '',
      form.gender === 'male' ? '男' : '女',
    ].filter(Boolean).join(' · ');

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      label,
      form,
      savedAt: Date.now(),
    };

    setHistory(prev => {
      // 去重：相同出生年月日+性别+时辰视为同一条记录
      const deduped = prev.filter(e =>
        !(e.form.year === form.year &&
          e.form.month === form.month &&
          e.form.day === form.day &&
          Boolean(e.form.isLunar) === Boolean(form.isLunar) &&
          Boolean(e.form.isLeapMonth) === Boolean(form.isLeapMonth) &&
          e.form.gender === form.gender &&
          e.form.clockHour === form.clockHour &&
          e.form.clockMinute === form.clockMinute)
      );
      const updated = [entry, ...deduped].slice(0, MAX_ENTRIES);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { history, save, remove, clear };
}
