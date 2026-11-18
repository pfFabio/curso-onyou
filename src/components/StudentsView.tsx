import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Edit3,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AppDataState, BookingModalPreset, Student } from '../types';
import { cleanWhatsAppLink, GRADE_LEVELS, WEEKDAYS } from '../utils/dateUtils';
import { SchedulePicker } from './SchedulePicker';

interface StudentsViewProps {
  data: AppDataState;
  onSaveStudent: (input: Omit<Student, 'id' | 'created_at'> & { id?: string }) => Promise<Student>;
  onDeleteStudent: (id: string) => Promise<void>;
  onOpenBookingForStudent: (preset: BookingModalPreset) => void;
}

const EMPTY_FORM: Omit<Student, 'id' | 'created_at'> = {
  name: '',
  grade_level: '9º Ano EF',
  phone: '',
  guardian_name: '',
  guardian_phone: '',
  subjects_needed: ['Matemática'],
  preferred_days: [1, 3, 5],
  preferred_slots: ['14:00', '15:00'],
  notes: '',
  active: true,
};

export const StudentsView: React.FC<StudentsViewProps> = ({
  data,
  onSaveStudent,
  onDeleteStudent,
  onOpenBookingForStudent,
}) => {
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Omit<Student, 'id' | 'created_at'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.students.filter((s) => {
      const matchesSubject =
        filterSubject === 'ALL' ||
        s.subjects_needed.some((sub) => sub.toLowerCase() === filterSubject.toLowerCase());
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.grade_level.toLowerCase().includes(q) ||
        s.guardian_name.toLowerCase().includes(q) ||
        s.subjects_needed.some((sub) => sub.toLowerCase().includes(q));
      return matchesSubject && matchesSearch;
    });
  }, [data.students, search, filterSubject]);

  const openNewModal = () => {
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingId(student.id);
    setForm({
      name: student.name,
      grade_level: student.grade_level,
      phone: student.phone,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      subjects_needed: [...student.subjects_needed],
      preferred_days: [...student.preferred_days],
      preferred_slots: [...student.preferred_slots],
      notes: student.notes,
      active: student.active,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const toggleSubject = (name: string) => {
    if (form.subjects_needed.includes(name)) {
      setForm({
        ...form,
        subjects_needed: form.subjects_needed.filter((s) => s !== name),
      });
    } else {
      setForm({ ...form, subjects_needed: [...form.subjects_needed, name] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.name.trim()) return setErrorMsg('Informe o nome do aluno.');

    setSaving(true);
    try {
      await onSaveStudent({ id: editingId, ...form });
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar aluno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Cabeçalho e Busca */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <Users className="h-5 w-5 text-indigo-600" />
              Alunos & Disponibilidade
            </h2>
            <p className="text-xs text-slate-500">
              Cadastre alunos, matérias de reforço e seus horários disponíveis para encaixe rápido.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Novo Aluno
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar aluno por nome, série ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">Todas as Matérias</option>
            {data.subjects.map((sub) => (
              <option key={sub.id} value={sub.name}>
                Reforço em {sub.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Lista de Alunos */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhum aluno encontrado.</p>
          <p className="mt-1 text-xs text-slate-500">
            Cadastre seus alunos para acompanhar horários preferidos e reservar aulas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredStudents.map((student) => {
            const waUrl = cleanWhatsAppLink(student.guardian_phone || student.phone);
            const activeBookings = data.bookings.filter(
              (b) => b.student_id === student.id && b.status === 'agendado',
            );

            return (
              <article
                key={student.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">{student.name}</h3>
                        {student.grade_level && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {student.grade_level}
                          </span>
                        )}
                      </div>
                      {(student.guardian_name || student.phone) && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {student.guardian_name ? `Resp.: ${student.guardian_name}` : ''}
                          {student.guardian_name && student.phone ? ' • ' : ''}
                          {student.phone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="WhatsApp do aluno/responsável"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(student)}
                        title="Editar aluno"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remover aluno ${student.name}? As reservas dele também serão removidas.`,
                            )
                          ) {
                            onDeleteStudent(student.id);
                          }
                        }}
                        title="Excluir aluno"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Matérias de interesse */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {student.subjects_needed.length === 0 ? (
                      <span className="text-xs text-slate-400">Sem matérias definidas</span>
                    ) : (
                      student.subjects_needed.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"
                        >
                          {sub}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Horários disponíveis */}
                  <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold text-slate-600">Dias livres:</span>
                      {student.preferred_days.length === 0 ? (
                        <span className="text-slate-400">Flexível</span>
                      ) : (
                        student.preferred_days.map((d) => (
                          <span
                            key={d}
                            className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            {WEEKDAYS[d]?.short}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold text-slate-600">Horários:</span>
                      {student.preferred_slots.length === 0 ? (
                        <span className="text-slate-400">Flexível</span>
                      ) : (
                        student.preferred_slots.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {student.notes && (
                    <p className="mt-2 text-xs text-slate-500">{student.notes}</p>
                  )}
                </div>

                {/* Rodapé do Card: Aulas futuras + botão de agendar */}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-500">
                    {activeBookings.length}{' '}
                    {activeBookings.length === 1 ? 'aula agendada' : 'aulas agendadas'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenBookingForStudent({
                        studentId: student.id,
                        subject: student.subjects_needed[0],
                        timeSlot: student.preferred_slots[0],
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Reservar Aula
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição de Aluno */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {errorMsg && (
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nome do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Clara Souza"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Série / Nível
                  </label>
                  <select
                    value={form.grade_level}
                    onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    WhatsApp do Aluno
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ana Souza"
                    value={form.guardian_name}
                    onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    WhatsApp do Responsável
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={form.guardian_phone}
                    onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Matérias que precisa de reforço */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Matérias que precisa de reforço
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.subjects.map((sub) => {
                    const selected = form.subjects_needed.includes(sub.name);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubject(sub.name)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          selected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dias e Horários do Aluno */}
              <SchedulePicker
                selectedDays={form.preferred_days}
                selectedSlots={form.preferred_slots}
                onChangeDays={(days) => setForm({ ...form, preferred_days: days })}
                onChangeSlots={(slots) => setForm({ ...form, preferred_slots: slots })}
                daysLabel="Dias disponíveis do aluno"
                slotsLabel="Horários disponíveis do aluno"
              />

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Observações Pedagógicas
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dificuldade em frações, prefere aula individual..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Aluno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
