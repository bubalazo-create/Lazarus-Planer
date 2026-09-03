import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday as isTodayDateFns,
  isSameDay as isSameDayDateFns,
  isWeekend as isWeekendDateFns,
  addDays as addDaysDateFns,
  parseISO,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = addDaysDateFns(start, 6); // Sunday
  return eachDayOfInterval({ start, end });
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'd MMM yyyy'); // "25 Aug 2026"
}

export function formatEuropeanDate(date: Date): string {
  return format(date, 'dd/MM/yyyy'); // "25/08/2026"
}

export function formatDayShort(date: Date): string {
  return format(date, 'EEE'); // "Mon"
}

export function formatDayNum(date: Date): string {
  return format(date, 'dd/MM'); // "25/08"
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy'); // "August 2026"
}

export function isToday(date: Date): boolean {
  return isTodayDateFns(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return isSameDayDateFns(a, b);
}

export function getDatesInRange(start: string, end: string): string[] {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const dates = eachDayOfInterval({ start: startDate, end: endDate });
  return dates.map(d => format(d, 'yyyy-MM-dd'));
}

export function isWeekend(date: Date): boolean {
  return isWeekendDateFns(date);
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

export function addDays(date: Date, days: number): Date {
  return addDaysDateFns(date, days);
}

export function parseDate(dateStr: string): Date {
  return parseISO(dateStr);
}
