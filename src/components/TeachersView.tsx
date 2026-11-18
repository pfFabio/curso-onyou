import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit3,
  GraduationCap,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AppDataState, SubjectItem, Teacher } from '../types';
import {
  cleanWhatsAppLink,
  TEACHER_COLORS,
  WEEKDAYS,
} from '../utils/dateUtils';
import { SchedulePicker } from './SchedulePicker';

interface TeachersViewProps {
  data: AppDataState;
  onSaveTeacher: (input: Omit<Teacher, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  onCreateSubject: (name: string, color: string) => Promise<SubjectItem>;
}

const EMPTY_FORM: Omit<Teacher, 'id' | 'created_at'> = {
  name: '',
  phone: '',
  email: '',
  color: TEACHER_COLORS[0],
  subjects: ['Matemática'],
  available_days: [1, 2, 3, 4, 5],
  available_slots: ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'],
  max_students_per_slot: 4,
  notes: '',
  active: true,
};

export const TeachersView: React.FC<TeachersViewProps> = ({
  data,
  onSaveTeacher,
  onDeleteTeacher,
  onCreateSubject,
}) => {
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<Omit<Teacher, 'id' | 'created_at'>>(EMPTY_FORM);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.teachers.filter((t) => {
      const matchesSubject =
        filterSubject === 'ALL' ||
        t.subjects.some((s) => s.toLowerCase() === filterSubject.toLowerCase());
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.subjects.some((s) => s.toLowerCase().includes(q));
      return matchesSubject && matchesSearch;
    });
  }, [data.teachers, search, filterSubject]);

  const openNewModal = () => {
    setEditingId(undefined);
    setForm({
      ...EMPTY_FORM,
      color: TEACHER_COLORS[data.teachers.length % TEACHER_COLORS.length],
    });
    setNewSubjectName('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingId(teacher.id);
    setForm({
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      color: teacher.color,
      subjects: [...teacher.subjects],
      available_days: [...teacher.available_days],
      available_slots: [...teacher.available_slots],
      max_students_per_slot: teacher.max_students_per_slot,
      notes: teacher.notes,
      active: teacher.active,
    });
    setNewSubjectName('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const toggleSubject = (name: string) => {
    if (form.subjects.includes(name)) {
      setForm({ ...form, subjects: form.subjects.filter((s) => s !== name) });
    } else {
      setForm({ ...form, subjects: [...form.subjects, name] });
    }
  };

  const handleAddSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    try {
      const color = TEACHER_COLORS[data.subjects.length % TEACHER_COLORS.length];
      const created = await onCreateSubject(trimmed, color);
      if (!form.subjects.includes(created.name)) {
        setForm((prev) => ({ ...prev, subjects: [...prev.subjects, created.name] }));
      }
      setNewSubjectName('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar matéria.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.name.trim()) return setErrorMsg('Informe o nome do professor.');
    if (form.subjects.length === 0) return setErrorMsg('Selecione pelo menos uma matéria.');
    if (form.available_days.length === 0) return setErrorMsg('Selecione pelo menos um dia.');
    if (form.available_slots.length === 0) return setErrorMsg('Selecione pelo menos um horário.');

    setSaving(true);
    try {
      await onSaveTeacher({ id: editingId, ...form });
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar professor.');
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
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              Professores & Grade de Horários
            </h2>
            <p className="text-xs text-slate-500">
              Cadastre professores, matérias que lecionam e horários disponíveis.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Novo Professor
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar professor por nome ou matéria..."
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
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Lista de Professores */}
      {filteredTeachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhum professor encontrado.</p>
          <p className="mt-1 text-xs text-slate-500">
            Clique em &quot;Novo Professor&quot; para cadastrar o primeiro docente do Curso Onyou.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredTeachers.map((teacher) => {
            const waUrl = cleanWhatsAppLink(teacher.phone);
            const futureCount = data.bookings.filter(
              (b) => b.teacher_id === teacher.id && b.status === 'agendado',
            ).length;

            return (
              <article
                key={teacher.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: teacher.color }}
                      >
                        {teacher.name
                          .replace(/^(Prof\.|Profa\.)\s*/i, '')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">{teacher.name}</h3>
                          {!teacher.active && (
                            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Máx {teacher.max_students_per_slot} alunos/h • {futureCount} aulas agendadas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir WhatsApp"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(teacher)}
                        title="Editar professor"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remover ${teacher.name}? As reservas vinculadas também serão removidas.`,
                            )
                          ) {
                            onDeleteTeacher(teacher.id);
                          }
                        }}
                        title="Excluir professor"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Matérias */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {teacher.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>

                  {/* Dias & Horários */}
                  <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold text-slate-600">Dias:</span>
                      {teacher.available_days.map((d) => (
                        <span
                          key={d}
                          className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          {WEEKDAYS[d]?.short}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="font-bold text-slate-600">Horários:</span>
                      {teacher.available_slots.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {teacher.notes && (
                    <p className="mt-2 text-xs text-slate-500">{teacher.notes}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição de Professor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingId ? 'Editar Professor' : 'Cadastrar Novo Professor'}
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
                    Nome do Professor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Prof. Carlos Eduardo"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    WhatsApp
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
                    Máx. Alunos por Horário (Grupo)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.max_students_per_slot}
                    onChange={(e) =>
                      setForm({ ...form, max_students_per_slot: Number(e.target.value) || 1 })
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Cor na Agenda */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Cor na Agenda
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEACHER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform ${
                        form.color === c ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {form.color === c && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Matérias que leciona */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Matérias que leciona *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.subjects.map((sub) => {
                    const selected = form.subjects.includes(sub.name);
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

                {/* Adicionar nova matéria inline */}
                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar nova matéria (ex: Geometria)"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubject}
                    className="rounded-xl bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    + Matéria
                  </button>
                </div>
              </div>

              {/* Dias e Horários */}
              <SchedulePicker
                selectedDays={form.available_days}
                selectedSlots={form.available_slots}
                onChangeDays={(days) => setForm({ ...form, available_days: days })}
                onChangeSlots={(slots) => setForm({ ...form, available_slots: slots })}
                daysLabel="Dias em que o professor dá aula"
                slotsLabel="Horários em que o professor atende"
              />

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Especialidade, nível escolar que atende..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                Professor ativo na agenda
              </label>
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
                {saving ? 'Salvando...' : 'Salvar Professor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
