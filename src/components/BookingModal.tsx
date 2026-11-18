import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { AppDataState, BookingModalPreset, BookingType, Student } from '../types';
import { CreateBookingInput, getSlotAvailability } from '../services/dataService';
import {
  formatShortDate,
  getTeacherSlotsForDay,
  getTodayYMD,
  getWeekdayFromYMD,
  GRADE_LEVELS,
  isTeacherAvailableOnDay,
  TIME_SLOTS,
  WEEKDAYS,
} from '../utils/dateUtils';

interface BookingModalProps {
  isOpen: boolean;
  preset: BookingModalPreset | null;
  data: AppDataState;
  onClose: () => void;
  onCreateBooking: (input: CreateBookingInput) => Promise<void>;
  onQuickCreateStudent: (input: Omit<Student, 'id' | 'created_at'>) => Promise<Student>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  preset,
  data,
  onClose,
  onCreateBooking,
  onQuickCreateStudent,
}) => {
  const [date, setDate] = useState<string>(getTodayYMD());
  const [subject, setSubject] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [bookingType, setBookingType] = useState<BookingType>('individual');
  const [studentId, setStudentId] = useState<string>('');
  const [topicNotes, setTopicNotes] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [showCustomTime, setShowCustomTime] = useState<boolean>(false);

  // Cadastro rápido de aluno dentro do modal
  const [showQuickStudent, setShowQuickStudent] = useState<boolean>(false);
  const [quickName, setQuickName] = useState<string>('');
  const [quickGrade, setQuickGrade] = useState<string>('9º Ano EF');
  const [quickPhone, setQuickPhone] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const activeTeachers = useMemo(() => data.teachers.filter((t) => t.active), [data.teachers]);
  const activeStudents = useMemo(() => data.students.filter((s) => s.active), [data.students]);

  // Inicializa com valores do preset quando o modal abre
  useEffect(() => {
    if (!isOpen) return;

    const initialDate = preset?.date || getTodayYMD();
    const initialSubject =
      preset?.subject ||
      (preset?.teacherId
        ? activeTeachers.find((t) => t.id === preset.teacherId)?.subjects[0]
        : '') ||
      data.subjects[0]?.name ||
      'Matemática';

    setDate(initialDate);
    setSubject(initialSubject);
    setTeacherId(preset?.teacherId || '');
    setTimeSlot(preset?.timeSlot || '');
    setStudentId(preset?.studentId || '');
    setTopicNotes('');
    setStudentSearch('');
    setErrorMsg('');
    setShowCustomTime(false);
    setShowQuickStudent(false);
  }, [isOpen, preset, activeTeachers, data.subjects]);

  // Professores filtrados pela matéria selecionada
  const matchingTeachers = useMemo(() => {
    if (!subject) return activeTeachers;
    return activeTeachers.filter((t) =>
      t.subjects.some((s) => s.toLowerCase() === subject.toLowerCase()),
    );
  }, [activeTeachers, subject]);

  // Ajusta teacherId automaticamente se o selecionado não dá a matéria
  useEffect(() => {
    if (!isOpen) return;
    if (matchingTeachers.length === 0) {
      setTeacherId('');
      return;
    }
    if (!matchingTeachers.some((t) => t.id === teacherId)) {
      const weekday = getWeekdayFromYMD(date);
      const onDay = matchingTeachers.find((t) => isTeacherAvailableOnDay(t, weekday));
      setTeacherId((onDay || matchingTeachers[0]).id);
    }
  }, [isOpen, matchingTeachers, teacherId, date]);

  const selectedTeacher = useMemo(
    () => activeTeachers.find((t) => t.id === teacherId) || null,
    [activeTeachers, teacherId],
  );

  // Avalia disponibilidade de todos os horários do professor selecionado naquela data
  const teacherSlotsWithStatus = useMemo(() => {
    if (!selectedTeacher) return [];
    const selectedWeekday = getWeekdayFromYMD(date);
    const daySlots = selectedTeacher
      ? getTeacherSlotsForDay(selectedTeacher, selectedWeekday)
      : [];

    const baseSlots = showCustomTime
      ? TIME_SLOTS
      : Array.from(
          new Set([
            ...daySlots,
            ...(timeSlot ? [timeSlot] : []),
          ]),
        ).sort();

    return baseSlots.map((slot) => getSlotAvailability(selectedTeacher, date, slot, data.bookings));
  }, [selectedTeacher, date, data.bookings, showCustomTime, timeSlot]);

  // Seleciona automaticamente primeiro horário livre se nenhum estiver marcado ou atual estiver indisponível
  useEffect(() => {
    if (!isOpen || !selectedTeacher) return;
    const current = teacherSlotsWithStatus.find((s) => s.timeSlot === timeSlot);
    if (current && (current.status === 'livre' || current.status === 'grupo_aberto')) {
      if (current.status === 'grupo_aberto') {
        setBookingType('grupo');
      }
      return;
    }

    const firstAvailable = teacherSlotsWithStatus.find(
      (s) => s.status === 'livre' || s.status === 'grupo_aberto',
    );
    if (firstAvailable) {
      setTimeSlot(firstAvailable.timeSlot);
      if (firstAvailable.status === 'grupo_aberto') {
        setBookingType('grupo');
      }
    } else {
      setTimeSlot('');
    }
  }, [isOpen, selectedTeacher, teacherSlotsWithStatus, timeSlot]);

  const selectedSlotInfo = useMemo(
    () => teacherSlotsWithStatus.find((s) => s.timeSlot === timeSlot) || null,
    [teacherSlotsWithStatus, timeSlot],
  );

  // Quando o slot selecionado já é grupo_aberto, força bookingType = 'grupo'
  useEffect(() => {
    if (selectedSlotInfo?.status === 'grupo_aberto') {
      setBookingType('grupo');
    }
  }, [selectedSlotInfo]);

  const selectedWeekday = getWeekdayFromYMD(date);

  // Ordena alunos destacando compatibilidade de matéria e horário
  const rankedStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const filtered = activeStudents.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.grade_level.toLowerCase().includes(q) ||
        s.subjects_needed.some((sub) => sub.toLowerCase().includes(q)),
    );

    return filtered
      .map((student) => {
        const wantsSubject = student.subjects_needed.some(
          (s) => s.toLowerCase() === subject.toLowerCase(),
        );
        const matchesTime =
          Boolean(timeSlot) &&
          student.preferred_slots.includes(timeSlot) &&
          (student.preferred_days.length === 0 ||
            student.preferred_days.includes(selectedWeekday));

        const alreadyBookedSameSlot = Boolean(
          timeSlot &&
            data.bookings.some(
              (b) =>
                b.student_id === student.id &&
                b.date === date &&
                b.time_slot === timeSlot &&
                b.status !== 'cancelado',
            ),
        );

        const score = (wantsSubject ? 2 : 0) + (matchesTime ? 2 : 0) - (alreadyBookedSameSlot ? 10 : 0);
        return { student, wantsSubject, matchesTime, alreadyBookedSameSlot, score };
      })
      .sort((a, b) => b.score - a.score || a.student.name.localeCompare(b.student.name));
  }, [activeStudents, studentSearch, subject, timeSlot, selectedWeekday, data.bookings, date]);

  if (!isOpen) return null;

  const handleQuickStudentSave = async () => {
    if (!quickName.trim()) {
      setErrorMsg('Digite o nome do aluno no cadastro rápido.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const created = await onQuickCreateStudent({
        name: quickName.trim(),
        grade_level: quickGrade,
        phone: quickPhone.trim(),
        guardian_name: '',
        guardian_phone: '',
        subjects_needed: subject ? [subject] : [],
        preferred_days: [selectedWeekday],
        preferred_slots: timeSlot ? [timeSlot] : [],
        notes: 'Cadastro rápido via agenda.',
        active: true,
      });
      setStudentId(created.id);
      setShowQuickStudent(false);
      setQuickName('');
      setQuickPhone('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar aluno.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!subject) return setErrorMsg('Selecione a matéria da aula.');
    if (!teacherId) return setErrorMsg('Selecione um professor disponível.');
    if (!timeSlot) return setErrorMsg('Selecione um horário disponível.');
    if (!studentId) return setErrorMsg('Selecione o aluno para esta reserva.');

    setSubmitting(true);
    try {
      await onCreateBooking({
        date,
        time_slot: timeSlot,
        teacher_id: teacherId,
        student_id: studentId,
        subject,
        booking_type: bookingType,
        topic_notes: topicNotes,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível concluir a reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  const studentNameMap = new Map(data.students.map((s) => [s.id, s.name]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">
              Reservar Horário de Aula
            </h2>
            <p className="text-xs text-slate-500">
              Escolha matéria, professor, horário e aluno
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Passo 1: Data e Matéria */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                Data da Aula
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                {WEEKDAYS[selectedWeekday]?.full} ({formatShortDate(date)})
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Matéria
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              >
                {data.subjects.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Passo 2: Professor da Matéria */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Professor de {subject || 'Reforço'}
            </label>
            {matchingTeachers.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Nenhum professor cadastrado leciona <strong>{subject}</strong>. Cadastre ou edite um
                professor na aba Professores.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {matchingTeachers.map((teacher) => {
                  const active = teacher.id === teacherId;
                  const worksOnDay = isTeacherAvailableOnDay(teacher, selectedWeekday);
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => setTeacherId(teacher.id)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                        active
                          ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: teacher.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{teacher.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {worksOnDay ? 'Atende neste dia' : 'Fora do dia fixo'}
                          </p>
                        </div>
                      </div>
                      {active && <Check className="h-4 w-4 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Passo 3: Horário e Modalidade */}
          {selectedTeacher && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  Horário na Data
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomTime((v) => !v)}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  {showCustomTime ? 'Mostrar só grade do professor' : 'Mostrar todos horários (07h–21h)'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {teacherSlotsWithStatus.map((slotInfo) => {
                  const selected = timeSlot === slotInfo.timeSlot;
                  const disabled =
                    slotInfo.status === 'ocupado_individual' || slotInfo.status === 'lotado';

                  return (
                    <button
                      key={slotInfo.timeSlot}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTimeSlot(slotInfo.timeSlot)}
                      className={`flex flex-col items-center justify-center rounded-xl border py-2 text-center transition-all ${
                        selected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : disabled
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            : slotInfo.status === 'grupo_aberto'
                              ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                              : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-extrabold">{slotInfo.timeSlot}</span>
                      <span className="text-[10px] font-medium opacity-90">
                        {slotInfo.status === 'livre' && 'Livre'}
                        {slotInfo.status === 'grupo_aberto' &&
                          `Grupo ${slotInfo.activeBookings.length}/${slotInfo.maxSpots}`}
                        {slotInfo.status === 'ocupado_individual' && '1x1 Ocup.'}
                        {slotInfo.status === 'lotado' && 'Lotado'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Alunos já inscritos neste horário se houver grupo aberto */}
              {selectedSlotInfo && selectedSlotInfo.activeBookings.length > 0 && (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="font-bold">Já reservados às {timeSlot}:</span>{' '}
                  {selectedSlotInfo.activeBookings
                    .map((b) => studentNameMap.get(b.student_id) || 'Aluno')
                    .join(', ')}
                </div>
              )}

              {/* Modalidade Individual vs Grupo */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Modalidade da Reserva
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={selectedSlotInfo?.status === 'grupo_aberto'}
                    onClick={() => setBookingType('individual')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      bookingType === 'individual'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                        : selectedSlotInfo?.status === 'grupo_aberto'
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>Individual (1x1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingType('grupo')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                      bookingType === 'grupo'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Grupo (até {selectedTeacher.max_students_per_slot})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Passo 4: Selecionar Aluno */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Selecionar Aluno
              </label>
              <button
                type="button"
                onClick={() => setShowQuickStudent((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <Plus className="h-3 w-3" />
                {showQuickStudent ? 'Cancelar novo aluno' : 'Novo aluno rápido'}
              </button>
            </div>

            {showQuickStudent ? (
              <div className="space-y-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-3">
                <p className="text-xs font-bold text-indigo-900">Cadastro Rápido de Aluno</p>
                <input
                  type="text"
                  placeholder="Nome completo do aluno *"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={quickGrade}
                    onChange={(e) => setQuickGrade(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="WhatsApp (opcional)"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleQuickStudentSave}
                  className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Salvar e Selecionar Aluno
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar aluno por nome, série ou matéria..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {rankedStudents.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">
                      Nenhum aluno encontrado. Clique em &quot;Novo aluno rápido&quot; acima.
                    </p>
                  ) : (
                    rankedStudents.map(
                      ({ student, wantsSubject, matchesTime, alreadyBookedSameSlot }) => {
                        const selected = student.id === studentId;
                        return (
                          <button
                            key={student.id}
                            type="button"
                            disabled={alreadyBookedSameSlot}
                            onClick={() => setStudentId(student.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition-all ${
                              alreadyBookedSameSlot
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                                : selected
                                  ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {student.name}{' '}
                                {student.grade_level && (
                                  <span className="font-normal text-slate-500">
                                    • {student.grade_level}
                                  </span>
                                )}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {alreadyBookedSameSlot && (
                                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                    Já tem aula às {timeSlot}
                                  </span>
                                )}
                                {wantsSubject && (
                                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                    Estuda {subject}
                                  </span>
                                )}
                                {matchesTime && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    Horário compatível
                                  </span>
                                )}
                              </div>
                            </div>
                            {selected && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                          </button>
                        );
                      },
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Observação / Assunto da Aula */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Conteúdo / Observação da Aula (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Revisão para prova de equações do 2º grau"
              value={topicNotes}
              onChange={(e) => setTopicNotes(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
        </form>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || !teacherId || !timeSlot || !studentId}
            onClick={handleSubmit}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Reservando...' : 'Confirmar Reserva'}
          </button>
        </div>
      </div>
    </div>
  );
};
