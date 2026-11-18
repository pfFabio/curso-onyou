import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MessageCircle,
  Plus,
  Trash2,
  UserCheck,
  Users,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { AppDataState, Booking, BookingModalPreset, BookingStatus } from '../types';
import { getSlotAvailability } from '../services/dataService';
import {
  cleanWhatsAppLink,
  formatFriendlyDate,
  getMonthCalendarDays,
  getTodayYMD,
  getWeekdayFromYMD,
  MONTH_NAMES,
  parseLocalDate,
} from '../utils/dateUtils';

interface AgendaCalendarViewProps {
  data: AppDataState;
  onOpenBookingModal: (preset: BookingModalPreset) => void;
  onUpdateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  onDeleteBooking: (bookingId: string) => Promise<void>;
  onGoToTeachers: () => void;
}

const STATUS_BADGE: Record<BookingStatus, { label: string; classes: string }> = {
  agendado: { label: 'Agendado', classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  concluido: { label: 'Concluída', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  falta: { label: 'Falta', classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  cancelado: { label: 'Cancelada', classes: 'bg-slate-100 text-slate-500 ring-slate-200 line-through' },
};

export const AgendaCalendarView: React.FC<AgendaCalendarViewProps> = ({
  data,
  onOpenBookingModal,
  onUpdateBookingStatus,
  onDeleteBooking,
  onGoToTeachers,
}) => {
  const todayYMD = getTodayYMD();
  const todayDate = parseLocalDate(todayYMD);

  const [selectedDate, setSelectedDate] = useState<string>(todayYMD);
  const [viewYear, setViewYear] = useState<number>(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDate.getMonth());

  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [dayTab, setDayTab] = useState<'horarios' | 'reservas'>('horarios');

  const activeTeachers = useMemo(() => data.teachers.filter((t) => t.active), [data.teachers]);

  // Professores filtrados automaticamente pela matéria selecionada!
  const teachersForSubject = useMemo(() => {
    if (selectedSubject === 'ALL') return activeTeachers;
    return activeTeachers.filter((t) =>
      t.subjects.some((s) => s.toLowerCase() === selectedSubject.toLowerCase()),
    );
  }, [activeTeachers, selectedSubject]);

  // Professores que realmente serão exibidos (após aplicar filtro de matéria + professor)
  const visibleTeachers = useMemo(() => {
    if (selectedTeacherId === 'ALL') return teachersForSubject;
    return teachersForSubject.filter((t) => t.id === selectedTeacherId);
  }, [teachersForSubject, selectedTeacherId]);

  const handleSelectSubject = (subjectName: string) => {
    setSelectedSubject(subjectName);
    // Se o professor selecionado não dá essa matéria, volta para 'ALL'
    if (subjectName !== 'ALL' && selectedTeacherId !== 'ALL') {
      const stillValid = activeTeachers.some(
        (t) =>
          t.id === selectedTeacherId &&
          t.subjects.some((s) => s.toLowerCase() === subjectName.toLowerCase()),
      );
      if (!stillValid) {
        setSelectedTeacherId('ALL');
      }
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const dt = parseLocalDate(todayYMD);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth());
    setSelectedDate(todayYMD);
  };

  const calendarCells = useMemo(
    () => getMonthCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  // Mapa de reservas filtradas por data para pintar o calendário rapidamente
  const filteredBookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of data.bookings) {
      if (selectedSubject !== 'ALL' && b.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        continue;
      }
      if (selectedTeacherId !== 'ALL' && b.teacher_id !== selectedTeacherId) {
        continue;
      }
      const list = map.get(b.date) ?? [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [data.bookings, selectedSubject, selectedTeacherId]);

  const selectedWeekday = getWeekdayFromYMD(selectedDate);

  // Professores que atendem no dia da semana selecionado
  const teachersAvailableOnDay = useMemo(
    () => visibleTeachers.filter((t) => t.available_days.includes(selectedWeekday)),
    [visibleTeachers, selectedWeekday],
  );

  // Outros professores (da matéria/filtro) que não atendem regularmente nesse dia da semana
  const teachersOffDay = useMemo(
    () => visibleTeachers.filter((t) => !t.available_days.includes(selectedWeekday)),
    [visibleTeachers, selectedWeekday],
  );

  const selectedDayBookings = useMemo(() => {
    const list = filteredBookingsByDate.get(selectedDate) ?? [];
    return [...list].sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [filteredBookingsByDate, selectedDate]);

  const activeDayBookingsCount = useMemo(
    () => selectedDayBookings.filter((b) => b.status !== 'cancelado').length,
    [selectedDayBookings],
  );

  const studentById = useMemo(() => new Map(data.students.map((s) => [s.id, s])), [data.students]);
  const teacherById = useMemo(() => new Map(data.teachers.map((t) => [t.id, t])), [data.teachers]);
  const subjectColorMap = useMemo(
    () => new Map(data.subjects.map((s) => [s.name.toLowerCase(), s.color])),
    [data.subjects],
  );

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Barra de Filtros: Matéria -> Professores disponíveis na matéria */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            <span>1. Filtrar por Matéria</span>
          </div>
          {selectedSubject !== 'ALL' && (
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('ALL');
                setSelectedTeacherId('ALL');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Chips horizontais deslizáveis no mobile */}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => handleSelectSubject('ALL')}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              selectedSubject === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todas as Matérias
          </button>

          {data.subjects.map((subj) => {
            const active = selectedSubject.toLowerCase() === subj.name.toLowerCase();
            const count = activeTeachers.filter((t) =>
              t.subjects.some((s) => s.toLowerCase() === subj.name.toLowerCase()),
            ).length;

            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => handleSelectSubject(subj.name)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                style={active ? { backgroundColor: subj.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active ? '#ffffff' : subj.color }}
                />
                <span>{subj.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtro secundário: Professores que lecionam a matéria selecionada */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              2. Professor {selectedSubject !== 'ALL' ? `de ${selectedSubject}` : '(Todos)'}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {teachersForSubject.length}{' '}
              {teachersForSubject.length === 1 ? 'professor disponível' : 'professores disponíveis'}
            </span>
          </div>

          {teachersForSubject.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              <span>Nenhum professor ativo cadastrado para {selectedSubject}.</span>
              <button
                type="button"
                onClick={onGoToTeachers}
                className="font-bold text-amber-900 underline"
              >
                Cadastrar / Vincular Professor
              </button>
            </div>
          ) : (
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedTeacherId('ALL')}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedTeacherId === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Todos ({teachersForSubject.length})
              </button>

              {teachersForSubject.map((teacher) => {
                const active = selectedTeacherId === teacher.id;
                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: active ? '#ffffff' : teacher.color }}
                    />
                    <span>{teacher.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Layout responsivo Mobile-First: Calendário em cima no mobile / 2 colunas no desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Calendário Mensal por Data */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGoToday}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="mb-1.5 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Grade de Dias */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayYMD;
              const dayBookings = (filteredBookingsByDate.get(cell.dateStr) ?? []).filter(
                (b) => b.status !== 'cancelado',
              );
              const weekday = getWeekdayFromYMD(cell.dateStr);
              const hasTeachersOnWeekday = visibleTeachers.some((t) =>
                t.available_days.includes(weekday),
              );

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.dateStr);
                    const parsed = parseLocalDate(cell.dateStr);
                    if (parsed.getMonth() !== viewMonth || parsed.getFullYear() !== viewYear) {
                      setViewMonth(parsed.getMonth());
                      setViewYear(parsed.getFullYear());
                    }
                  }}
                  className={`relative flex min-h-[54px] flex-col items-center justify-between rounded-xl p-1.5 text-xs transition-all sm:min-h-[64px] ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : isToday
                        ? 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-300 hover:bg-indigo-100'
                        : cell.isCurrentMonth
                          ? 'bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                          : 'bg-white text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-white'
                          : isToday
                            ? 'text-indigo-700'
                            : cell.isCurrentMonth
                              ? 'text-slate-700'
                              : 'text-slate-300'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {hasTeachersOnWeekday && cell.isCurrentMonth && (
                      <span
                        title="Há professor disponível neste dia"
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? 'bg-indigo-200' : 'bg-emerald-400'
                        }`}
                      />
                    )}
                  </div>

                  {/* Pontinhos / contagem de aulas no dia */}
                  <div className="flex w-full flex-wrap items-center justify-center gap-0.5">
                    {dayBookings.slice(0, 4).map((b) => {
                      const tColor = teacherById.get(b.teacher_id)?.color ?? '#4f46e5';
                      return (
                        <span
                          key={b.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? '#ffffff' : tColor }}
                        />
                      );
                    })}
                    {dayBookings.length > 4 && (
                      <span
                        className={`text-[9px] font-bold ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        +{dayBookings.length - 4}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Dia com atendimento
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Aulas reservadas
            </span>
          </div>
        </section>

        {/* Painel do Dia Selecionado: Horários Disponíveis & Aulas Reservadas */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4 lg:col-span-6">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                Agenda do Dia
              </p>
              <h3 className="text-base font-extrabold capitalize text-slate-900">
                {formatFriendlyDate(selectedDate)}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeDayBookingsCount}{' '}
                {activeDayBookingsCount === 1 ? 'aluno agendado' : 'alunos agendados'} •{' '}
                {teachersAvailableOnDay.length}{' '}
                {teachersAvailableOnDay.length === 1
                  ? 'professor atende neste dia'
                  : 'professores atendem neste dia'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenBookingModal({
                  date: selectedDate,
                  subject: selectedSubject !== 'ALL' ? selectedSubject : undefined,
                  teacherId: selectedTeacherId !== 'ALL' ? selectedTeacherId : undefined,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Reservar neste dia
            </button>
          </div>

          {/* Sub-abas do Dia */}
          <div className="my-3 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDayTab('horarios')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                dayTab === 'horarios'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Horários & Vagas</span>
            </button>
            <button
              type="button"
              onClick={() => setDayTab('reservas')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                dayTab === 'reservas'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Reservas ({selectedDayBookings.length})</span>
            </button>
          </div>

          {/* Conteúdo: Horários Disponíveis dos Professores */}
          {dayTab === 'horarios' ? (
            <div className="space-y-3">
              {teachersAvailableOnDay.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhum professor filtrado tem grade fixa neste dia da semana.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Você ainda pode clicar em &quot;Reservar neste dia&quot; para encaixar uma aula
                    extra ou escolher outro dia no calendário.
                  </p>
                </div>
              ) : (
                teachersAvailableOnDay.map((teacher) => {
                  // Combina horários padrão do professor + eventuais horários extras já reservados nesse dia
                  const extraBookedSlots = data.bookings
                    .filter(
                      (b) =>
                        b.teacher_id === teacher.id &&
                        b.date === selectedDate &&
                        b.status !== 'cancelado',
                    )
                    .map((b) => b.time_slot);

                  const allSlots = Array.from(
                    new Set([...teacher.available_slots, ...extraBookedSlots]),
                  ).sort();

                  return (
                    <div
                      key={teacher.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm"
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white"
                            style={{ backgroundColor: teacher.color }}
                          >
                            {teacher.name
                              .replace(/^(Prof\.|Profa\.)\s*/i, '')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{teacher.name}</h4>
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects.map((sub) => (
                                <span
                                  key={sub}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                          Máx {teacher.max_students_per_slot} alunos/h
                        </span>
                      </div>

                      {allSlots.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Sem horários cadastrados na grade deste professor.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {allSlots.map((slot) => {
                            const availability = getSlotAvailability(
                              teacher,
                              selectedDate,
                              slot,
                              data.bookings,
                            );

                            const bookedNames = availability.activeBookings
                              .map((b) => studentById.get(b.student_id)?.name.split(' ')[0] ?? 'Aluno')
                              .join(', ');

                            const canClick =
                              availability.status === 'livre' ||
                              availability.status === 'grupo_aberto';

                            let cardClasses =
                              'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100';
                            let statusText = 'Livre • Reservar';

                            if (availability.status === 'grupo_aberto') {
                              cardClasses =
                                'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100';
                              statusText = `Grupo (${availability.activeBookings.length}/${availability.maxSpots}) • + Vaga`;
                            } else if (availability.status === 'ocupado_individual') {
                              cardClasses =
                                'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed';
                              statusText = 'Individual 1x1';
                            } else if (availability.status === 'lotado') {
                              cardClasses =
                                'border-rose-200 bg-rose-50 text-rose-700 cursor-not-allowed';
                              statusText = `Lotado (${availability.maxSpots}/${availability.maxSpots})`;
                            }

                            const chosenSubject =
                              selectedSubject !== 'ALL'
                                ? selectedSubject
                                : teacher.subjects[0] || undefined;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={!canClick}
                                onClick={() =>
                                  onOpenBookingModal({
                                    date: selectedDate,
                                    timeSlot: slot,
                                    teacherId: teacher.id,
                                    subject: chosenSubject,
                                  })
                                }
                                className={`flex flex-col items-start rounded-xl border p-2 text-left transition-all ${cardClasses}`}
                              >
                                <div className="flex w-full items-center justify-between">
                                  <span className="text-xs font-extrabold">{slot}</span>
                                  {availability.status === 'livre' && (
                                    <Plus className="h-3.5 w-3.5 text-emerald-600" />
                                  )}
                                  {availability.status === 'grupo_aberto' && (
                                    <Users className="h-3.5 w-3.5 text-amber-600" />
                                  )}
                                  {availability.status === 'ocupado_individual' && (
                                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </div>
                                <span className="mt-0.5 text-[10px] font-semibold leading-tight">
                                  {statusText}
                                </span>
                                {bookedNames && (
                                  <span className="mt-1 line-clamp-1 text-[10px] opacity-80">
                                    {bookedNames}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {teachersOffDay.length > 0 && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  <span className="font-semibold">Não atendem regularmente neste dia:</span>{' '}
                  {teachersOffDay.map((t) => t.name).join(', ')}
                </div>
              )}
            </div>
          ) : (
            /* Conteúdo: Lista de Reservas do Dia */
            <div className="space-y-2.5">
              {selectedDayBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Nenhuma aula reservada para este dia
                    {selectedSubject !== 'ALL' ? ` em ${selectedSubject}` : ''}.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenBookingModal({
                        date: selectedDate,
                        subject: selectedSubject !== 'ALL' ? selectedSubject : undefined,
                        teacherId: selectedTeacherId !== 'ALL' ? selectedTeacherId : undefined,
                      })
                    }
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar primeira reserva
                  </button>
                </div>
              ) : (
                selectedDayBookings.map((booking) => {
                  const student = studentById.get(booking.student_id);
                  const teacher = teacherById.get(booking.teacher_id);
                  const subjColor =
                    subjectColorMap.get(booking.subject.toLowerCase()) ?? '#4f46e5';
                  const statusInfo = STATUS_BADGE[booking.status];

                  const waNumber = student?.guardian_phone || student?.phone || '';
                  const waText = `Olá! Lembrete da aula de ${booking.subject} no Curso Onyou no dia ${booking.date.split('-').reverse().join('/')} às ${booking.time_slot} com ${teacher?.name ?? 'nosso professor'}.`;
                  const waUrl = cleanWhatsAppLink(waNumber, waText);

                  return (
                    <div
                      key={booking.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white">
                            {booking.time_slot}
                          </span>
                          <span
                            className="rounded-lg px-2 py-1 text-[11px] font-bold text-white"
                            style={{ backgroundColor: subjColor }}
                          >
                            {booking.subject}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            {booking.booking_type === 'individual' ? 'Individual 1x1' : 'Grupo'}
                          </span>
                        </div>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusInfo.classes}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {student?.name ?? 'Aluno removido'}
                            {student?.grade_level && (
                              <span className="ml-1.5 text-xs font-medium text-slate-500">
                                ({student.grade_level})
                              </span>
                            )}
                          </p>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-600">
                          Professor:{' '}
                          <span className="font-semibold text-slate-800">
                            {teacher?.name ?? 'Professor removido'}
                          </span>
                        </p>

                        {booking.topic_notes && (
                          <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                            {booking.topic_notes}
                          </p>
                        )}
                      </div>

                      {/* Ações rápidas */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {booking.status !== 'concluido' && (
                            <button
                              type="button"
                              onClick={() => onUpdateBookingStatus(booking.id, 'concluido')}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Concluir
                            </button>
                          )}
                          {booking.status !== 'falta' && (
                            <button
                              type="button"
                              onClick={() => onUpdateBookingStatus(booking.id, 'falta')}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              Falta
                            </button>
                          )}
                          {booking.status !== 'cancelado' && (
                            <button
                              type="button"
                              onClick={() => onUpdateBookingStatus(booking.id, 'cancelado')}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancelar
                            </button>
                          )}
                          {booking.status === 'cancelado' && (
                            <button
                              type="button"
                              onClick={() => onUpdateBookingStatus(booking.id, 'agendado')}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              Reativar
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteBooking(booking.id)}
                          title="Excluir reserva"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
