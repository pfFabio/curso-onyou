import React from 'react';
import {
  AFTERNOON_SLOTS,
  EVENING_SLOTS,
  MORNING_SLOTS,
  TIME_SLOTS,
  WEEKDAYS,
} from '../utils/dateUtils';

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
  daysLabel = 'Dias da semana disponíveis',
  slotsLabel = 'Horários disponíveis',
}) => {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChangeDays(selectedDays.filter((d) => d !== day));
    } else {
      onChangeDays([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  const toggleSlot = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      onChangeSlots(selectedSlots.filter((s) => s !== slot));
    } else {
      onChangeSlots([...selectedSlots, slot].sort());
    }
  };

  const applySlotPreset = (presetSlots: string[]) => {
    const allIncluded = presetSlots.every((s) => selectedSlots.includes(s));
    if (allIncluded) {
      onChangeSlots(selectedSlots.filter((s) => !presetSlots.includes(s)));
    } else {
      const merged = Array.from(new Set([...selectedSlots, ...presetSlots])).sort();
      onChangeSlots(merged);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dias da Semana */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {daysLabel}
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onChangeDays([1, 2, 3, 4, 5])}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Seg–Sex
            </button>
            <button
              type="button"
              onClick={() => onChangeDays([1, 2, 3, 4, 5, 6])}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
            >
              Seg–Sáb
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => {
            const active = selectedDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`flex h-10 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {day.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {slotsLabel}
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applySlotPreset(MORNING_SLOTS)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                MORNING_SLOTS.every((s) => selectedSlots.includes(s))
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Manhã
            </button>
            <button
              type="button"
              onClick={() => applySlotPreset(AFTERNOON_SLOTS)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                AFTERNOON_SLOTS.every((s) => selectedSlots.includes(s))
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tarde
            </button>
            <button
              type="button"
              onClick={() => applySlotPreset(EVENING_SLOTS)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                EVENING_SLOTS.every((s) => selectedSlots.includes(s))
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Noite
            </button>
            {selectedSlots.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSlots([])}
                className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-100"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-5">
          {TIME_SLOTS.map((slot) => {
            const active = selectedSlots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => toggleSlot(slot)}
                className={`flex h-10 items-center justify-center rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
