import React, { useMemo, useState } from 'react';
import {
  AFTERNOON_SLOTS,
  EVENING_SLOTS,
  MORNING_SLOTS,
  TIME_SLOTS,
  WEEKDAYS,
  flattenDaySlots,
  groupSlotsByWeekday,
} from '../utils/dateUtils';
import { Calendar, Check, Clock, Copy, Trash2 } from 'lucide-react';

interface SchedulePickerProps {
  selectedDays: number[];
  selectedSlots: string[];
  onChangeDays: (days: number[]) => void;
  onChangeSlots: (slots: string[]) => void;
  daysLabel?: string;
  slotsLabel?: string;
}

export const SchedulePicker: React.FC<SchedulePickerProps> = ({
  selectedDays,
  selectedSlots,
  onChangeDays,
  onChangeSlots,
  daysLabel = 'Grade Semanal do Professor',
  slotsLabel = 'Horários do Dia Selecionado',
}) => {
  // Dia atualmente selecionado para edição (0 = Dom ... 6 = Sáb; padrão: 1 = Seg)
  const [activeDay, setActiveDay] = useState<number>(() => {
    if (selectedDays.length > 0 && selectedDays.includes(1)) return 1;
    if (selectedDays.length > 0) return selectedDays[0];
    return 1;
  });

  // Agrupamento interno por dia da semana { 0: [], 1: ['15:00'], 2: [] ... }
  const groupedSlots = useMemo(() => {
    return groupSlotsByWeekday(selectedSlots, selectedDays);
  }, [selectedSlots, selectedDays]);

  const activeDaySlots = groupedSlots[activeDay] || [];
  const activeDayObj = WEEKDAYS.find((w) => w.value === activeDay) || WEEKDAYS[1];

  // Dispara a atualização para o componente pai
  const updateGrouped = (newGrouped: Record<number, string[]>) => {
    const flat = flattenDaySlots(newGrouped);
    const daysWithSlots = Object.keys(newGrouped)
      .map(Number)
      .filter((d) => (newGrouped[d] || []).length > 0)
      .sort((a, b) => a - b);

    onChangeSlots(flat);
    onChangeDays(daysWithSlots);
  };

  const toggleSlotForActiveDay = (slot: string) => {
    const current = groupedSlots[activeDay] || [];
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot].sort();

    updateGrouped({
      ...groupedSlots,
      [activeDay]: updated,
    });
  };

  const applyPresetToActiveDay = (presetSlots: string[]) => {
    const current = groupedSlots[activeDay] || [];
    const allIncluded = presetSlots.every((s) => current.includes(s));
    const updated = allIncluded
      ? current.filter((s) => !presetSlots.includes(s))
      : Array.from(new Set([...current, ...presetSlots])).sort();

    updateGrouped({
      ...groupedSlots,
      [activeDay]: updated,
    });
  };

  const clearActiveDay = () => {
    updateGrouped({
      ...groupedSlots,
      [activeDay]: [],
    });
  };

  const copyActiveDayToWeekdays = () => {
    const current = groupedSlots[activeDay] || [];
    const newGrouped = { ...groupedSlots };
    // Copia para Segunda a Sexta (1 a 5)
    for (let d = 1; d <= 5; d++) {
      newGrouped[d] = [...current];
    }
    updateGrouped(newGrouped);
  };

  const clearAllDays = () => {
    updateGrouped({
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    });
  };

  // Contagem total de horários semanais configurados
  const totalSlotsCount = useMemo(() => {
    return Object.values(groupedSlots).reduce((acc, curr) => acc + curr.length, 0);
  }, [groupedSlots]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4">
      {/* 1. Seleção do Dia da Semana */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>{daysLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">
              {totalSlotsCount} {totalSlotsCount === 1 ? 'horário' : 'horários'} na semana
            </span>
            {totalSlotsCount > 0 && (
              <button
                type="button"
                onClick={clearAllDays}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
              >
                Limpar tudo
              </button>
            )}
          </div>
        </div>

        <p className="mb-2.5 text-[11px] text-slate-500">
          Clique no dia para personalizar os horários específicos daquele dia (ex: Seg às 15h, Terça em outro horário ou folga).
        </p>

        {/* Abas dos Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((day) => {
            const isSelected = activeDay === day.value;
            const dayCount = (groupedSlots[day.value] || []).length;
            const hasSlots = dayCount > 0;

            return (
              <button
                key={day.value}
                type="button"
                onClick={() => setActiveDay(day.value)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-2 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600 ring-offset-1'
                    : hasSlots
                    ? 'border border-indigo-200 bg-indigo-50/80 text-indigo-900 hover:bg-indigo-100'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold">{day.short}</span>
                <span
                  className={`mt-0.5 rounded-full px-1.5 text-[10px] font-semibold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : hasSlots
                      ? 'bg-indigo-200 text-indigo-800'
                      : 'text-slate-400'
                  }`}
                >
                  {dayCount > 0 ? `${dayCount}h` : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Horários Específicos do Dia Ativo */}
      <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-xs">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900">
              {slotsLabel} ({activeDayObj.full}):
            </span>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
              {activeDaySlots.length} {activeDaySlots.length === 1 ? 'horário' : 'horários'}
            </span>
          </div>

          {/* Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => applyPresetToActiveDay(MORNING_SLOTS)}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Manhã
            </button>
            <button
              type="button"
              onClick={() => applyPresetToActiveDay(AFTERNOON_SLOTS)}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Tarde
            </button>
            <button
              type="button"
              onClick={() => applyPresetToActiveDay(EVENING_SLOTS)}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Noite
            </button>
            {activeDaySlots.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={copyActiveDayToWeekdays}
                  title="Copia os horários deste dia para Segunda até Sexta"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copiar p/ Seg–Sex</span>
                </button>
                <button
                  type="button"
                  onClick={clearActiveDay}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Limpar</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Grade de Botões de Horário (07:00 a 21:00) */}
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 md:grid-cols-8">
          {TIME_SLOTS.map((slot) => {
            const active = activeDaySlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlotForActiveDay(slot)}
                className={`flex h-9 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 font-bold text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {active && <Check className="mr-1 h-3 w-3" />}
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Resumo Semanal Compacto */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Resumo da Disponibilidade Semanal:
        </span>
        <div className="mt-2 space-y-1.5">
          {WEEKDAYS.map((day) => {
            const slots = groupedSlots[day.value] || [];
            if (slots.length === 0) {
              return (
                <div
                  key={day.value}
                  className="flex items-center justify-between py-0.5 text-xs text-slate-400"
                >
                  <span className="w-20 font-semibold">{day.short}:</span>
                  <span className="flex-1 italic">Indisponível</span>
                  <button
                    type="button"
                    onClick={() => setActiveDay(day.value)}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    Adicionar
                  </button>
                </div>
              );
            }
            return (
              <div
                key={day.value}
                className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs"
              >
                <span className="w-16 font-bold text-slate-800">{day.short}:</span>
                <div className="flex flex-wrap gap-1">
                  {slots.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDay(day.value)}
                  className="ml-auto text-[10px] font-semibold text-indigo-600 hover:underline"
                >
                  Editar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
