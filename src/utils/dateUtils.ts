export const TIME_SLOTS: string[] = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export const MORNING_SLOTS = ['08:00', '09:00', '10:00', '11:00'];
export const AFTERNOON_SLOTS = ['14:00', '15:00', '16:00', '17:00'];
export const EVENING_SLOTS = ['18:00', '19:00', '20:00'];

export const WEEKDAYS = [
  { value: 0, short: 'Dom', full: 'Domingo' },
  { value: 1, short: 'Seg', full: 'Segunda-feira' },
  { value: 2, short: 'Ter', full: 'Terça-feira' },
  { value: 3, short: 'Qua', full: 'Quarta-feira' },
  { value: 4, short: 'Qui', full: 'Quinta-feira' },
  { value: 5, short: 'Sex', full: 'Sexta-feira' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
];

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const GRADE_LEVELS = [
  '6º Ano EF',
  '7º Ano EF',
  '8º Ano EF',
  '9º Ano EF',
  '1º Ano EM',
  '2º Ano EM',
  '3º Ano EM',
  'Pré-Vestibular / ENEM',
  'Ensino Superior',
  'Outro',
];

export const TEACHER_COLORS = [
  '#4f46e5', // Indigo
  '#0891b2', // Cyan
  '#059669', // Emerald
  '#db2777', // Pink
  '#ea580c', // Orange
  '#7c3aed', // Violet
  '#2563eb', // Blue
  '#d97706', // Amber
];

/**
 * Faz o parse seguro de 'YYYY-MM-DD' no fuso local para evitar deslocamento UTC (-03:00).
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Formata um Date local para 'YYYY-MM-DD'.
 */
export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayYMD(): string {
  return formatDateToYMD(new Date());
}

export function addDaysToYMD(dateStr: string, offsetDays: number): string {
  const dt = parseLocalDate(dateStr);
  dt.setDate(dt.getDate() + offsetDays);
  return formatDateToYMD(dt);
}

export function getWeekdayFromYMD(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

export function formatFriendlyDate(dateStr: string): string {
  const dt = parseLocalDate(dateStr);
  const weekday = WEEKDAYS[dt.getDay()]?.full ?? '';
  const day = dt.getDate();
  const month = MONTH_NAMES[dt.getMonth()] ?? '';
  const year = dt.getFullYear();
  return `${weekday}, ${day} de ${month} de ${year}`;
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Retorna a matriz de células do calendário mensal (sempre começando no Domingo).
 */
export function getMonthCalendarDays(year: number, monthIndex: number): Array<{ dateStr: string; day: number; isCurrentMonth: boolean }> {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Dom
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: Array<{ dateStr: string; day: number; isCurrentMonth: boolean }> = [];

  // Dias do mês anterior para completar a primeira semana
  const prevMonthLastDate = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDate - i;
    const dt = new Date(year, monthIndex - 1, d);
    cells.push({
      dateStr: formatDateToYMD(dt),
      day: d,
      isCurrentMonth: false,
    });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, monthIndex, d);
    cells.push({
      dateStr: formatDateToYMD(dt),
      day: d,
      isCurrentMonth: true,
    });
  }

  // Completar até fechar múltiplo de 7 (35 ou 42 células)
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const needed = 7 - remainder;
    for (let d = 1; d <= needed; d++) {
      const dt = new Date(year, monthIndex + 1, d);
      cells.push({
        dateStr: formatDateToYMD(dt),
        day: d,
        isCurrentMonth: false,
      });
    }
  }

  return cells;
}

export function cleanWhatsAppLink(phone: string, text?: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${full}${query}`;
}
