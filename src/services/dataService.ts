import { createInitialSeedData } from '../data/seedData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  AppDataState,
  Booking,
  BookingStatus,
  BookingType,
  SlotAvailabilityStatus,
  Student,
  SubjectItem,
  Teacher,
} from '../types';

const LOCAL_DATA_KEY = 'onyou_local_data_v1';

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function loadLocalData(): AppDataState {
  try {
    const raw = localStorage.getItem(LOCAL_DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppDataState>;
      if (parsed.teachers && parsed.students && parsed.bookings && parsed.subjects) {
        return {
          subjects: parsed.subjects,
          teachers: parsed.teachers,
          students: parsed.students,
          bookings: parsed.bookings,
        };
      }
    }
  } catch {
    // fallback to seed
  }

  const seeded = createInitialSeedData();
  saveLocalData(seeded);
  return seeded;
}

export function saveLocalData(state: AppDataState): void {
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(state));
}

export function resetLocalDemoData(): AppDataState {
  const seeded = createInitialSeedData();
  saveLocalData(seeded);
  return seeded;
}

/**
 * Avalia a disponibilidade real de um professor em uma data e horário específicos.
 */
export function getSlotAvailability(
  teacher: Teacher,
  date: string,
  timeSlot: string,
  bookings: Booking[],
): SlotAvailabilityStatus {
  const activeBookings = bookings.filter(
    (b) =>
      b.teacher_id === teacher.id &&
      b.date === date &&
      b.time_slot === timeSlot &&
      b.status !== 'cancelado',
  );

  const maxSpots = Math.max(1, teacher.max_students_per_slot || 4);

  if (activeBookings.length === 0) {
    return {
      timeSlot,
      status: 'livre',
      activeBookings: [],
      remainingSpots: maxSpots,
      maxSpots,
      bookingType: null,
    };
  }

  const hasIndividual = activeBookings.some((b) => b.booking_type === 'individual');
  if (hasIndividual) {
    return {
      timeSlot,
      status: 'ocupado_individual',
      activeBookings,
      remainingSpots: 0,
      maxSpots: 1,
      bookingType: 'individual',
    };
  }

  const remaining = Math.max(0, maxSpots - activeBookings.length);
  return {
    timeSlot,
    status: remaining > 0 ? 'grupo_aberto' : 'lotado',
    activeBookings,
    remainingSpots: remaining,
    maxSpots,
    bookingType: 'grupo',
  };
}

/**
 * Carrega todos os dados do Supabase (se configurado) ou do localStorage.
 */
export async function fetchAllData(): Promise<{ data: AppDataState; source: 'supabase' | 'local'; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { data: loadLocalData(), source: 'local' };
  }

  try {
    const [subRes, teachRes, studRes, bookRes] = await Promise.all([
      supabase.from('subjects').select('*').order('name'),
      supabase.from('teachers').select('*').order('name'),
      supabase.from('students').select('*').order('name'),
      supabase.from('bookings').select('*').order('date', { ascending: true }).order('time_slot', { ascending: true }),
    ]);

    const firstError = subRes.error || teachRes.error || studRes.error || bookRes.error;
    if (firstError) {
      throw new Error(firstError.message);
    }

    const remoteData: AppDataState = {
      subjects: (subRes.data ?? []) as SubjectItem[],
      teachers: (teachRes.data ?? []) as Teacher[],
      students: (studRes.data ?? []) as Student[],
      bookings: (bookRes.data ?? []) as Booking[],
    };

    return { data: remoteData, source: 'supabase' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido ao consultar Supabase';
    return { data: loadLocalData(), source: 'local', error: msg };
  }
}

export async function createSubject(name: string, color: string): Promise<SubjectItem> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Informe o nome da matéria.');

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ name: trimmed, color })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SubjectItem;
  }

  const local = loadLocalData();
  const exists = local.subjects.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  if (exists) return exists;

  const item: SubjectItem = { id: generateUuid(), name: trimmed, color };
  local.subjects = [...local.subjects, item].sort((a, b) => a.name.localeCompare(b.name));
  saveLocalData(local);
  return item;
}

export async function saveTeacher(
  input: Omit<Teacher, 'id' | 'created_at'> & { id?: string },
): Promise<Teacher> {
  const payload = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    color: input.color,
    subjects: input.subjects,
    available_days: [...input.available_days].sort((a, b) => a - b),
    available_slots: [...input.available_slots].sort(),
    max_students_per_slot: Math.max(1, input.max_students_per_slot || 4),
    notes: input.notes.trim(),
    active: input.active,
  };

  if (!payload.name) throw new Error('Nome do professor é obrigatório.');
  if (payload.subjects.length === 0) throw new Error('Selecione pelo menos uma matéria.');

  const supabase = getSupabaseClient();
  if (supabase) {
    if (input.id) {
      const { data, error } = await supabase
        .from('teachers')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Teacher;
    }

    const { data, error } = await supabase.from('teachers').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Teacher;
  }

  const local = loadLocalData();
  const saved: Teacher = {
    id: input.id || generateUuid(),
    ...payload,
  };

  if (input.id) {
    local.teachers = local.teachers.map((t) => (t.id === input.id ? saved : t));
  } else {
    local.teachers = [...local.teachers, saved];
  }
  saveLocalData(local);
  return saved;
}

export async function deleteTeacher(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const local = loadLocalData();
  local.teachers = local.teachers.filter((t) => t.id !== id);
  local.bookings = local.bookings.filter((b) => b.teacher_id !== id);
  saveLocalData(local);
}

export async function saveStudent(
  input: Omit<Student, 'id' | 'created_at'> & { id?: string },
): Promise<Student> {
  const payload = {
    name: input.name.trim(),
    grade_level: input.grade_level.trim(),
    phone: input.phone.trim(),
    guardian_name: input.guardian_name.trim(),
    guardian_phone: input.guardian_phone.trim(),
    subjects_needed: input.subjects_needed,
    preferred_days: [...input.preferred_days].sort((a, b) => a - b),
    preferred_slots: [...input.preferred_slots].sort(),
    notes: input.notes.trim(),
    active: input.active,
  };

  if (!payload.name) throw new Error('Nome do aluno é obrigatório.');

  const supabase = getSupabaseClient();
  if (supabase) {
    if (input.id) {
      const { data, error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Student;
    }

    const { data, error } = await supabase.from('students').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Student;
  }

  const local = loadLocalData();
  const saved: Student = {
    id: input.id || generateUuid(),
    ...payload,
  };

  if (input.id) {
    local.students = local.students.map((s) => (s.id === input.id ? saved : s));
  } else {
    local.students = [...local.students, saved];
  }
  saveLocalData(local);
  return saved;
}

export async function deleteStudent(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const local = loadLocalData();
  local.students = local.students.filter((s) => s.id !== id);
  local.bookings = local.bookings.filter((b) => b.student_id !== id);
  saveLocalData(local);
}

export interface CreateBookingInput {
  date: string;
  time_slot: string;
  teacher_id: string;
  student_id: string;
  subject: string;
  booking_type: BookingType;
  topic_notes?: string;
}

export async function createBooking(
  input: CreateBookingInput,
  currentState: AppDataState,
): Promise<Booking> {
  const teacher = currentState.teachers.find((t) => t.id === input.teacher_id);
  const student = currentState.students.find((s) => s.id === input.student_id);

  if (!teacher) throw new Error('Professor selecionado não encontrado.');
  if (!student) throw new Error('Aluno selecionado não encontrado.');
  if (!input.date || !input.time_slot) throw new Error('Selecione a data e o horário.');
  if (!input.subject) throw new Error('Selecione a matéria da aula.');

  // Valida se o aluno já tem aula ativa nesse mesmo dia e horário
  const studentConflict = currentState.bookings.find(
    (b) =>
      b.student_id === input.student_id &&
      b.date === input.date &&
      b.time_slot === input.time_slot &&
      b.status !== 'cancelado',
  );
  if (studentConflict) {
    const otherTeacher = currentState.teachers.find((t) => t.id === studentConflict.teacher_id);
    throw new Error(
      `${student.name} já possui aula reservada em ${input.date} às ${input.time_slot} (${studentConflict.subject} com ${otherTeacher?.name ?? 'outro professor'}).`,
    );
  }

  const availability = getSlotAvailability(teacher, input.date, input.time_slot, currentState.bookings);

  if (availability.status === 'ocupado_individual') {
    throw new Error('Este horário já está reservado como Aula Individual (1x1) para este professor.');
  }
  if (availability.status === 'lotado') {
    throw new Error(`Este grupo já atingiu o limite de ${availability.maxSpots} alunos.`);
  }
  if (availability.status === 'grupo_aberto' && input.booking_type === 'individual') {
    throw new Error('Este horário já possui alunos em Grupo. Escolha a modalidade "Grupo" para incluir mais um aluno.');
  }

  const payload = {
    date: input.date,
    time_slot: input.time_slot,
    teacher_id: input.teacher_id,
    student_id: input.student_id,
    subject: input.subject,
    booking_type: input.booking_type,
    status: 'agendado' as BookingStatus,
    topic_notes: (input.topic_notes || '').trim(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('bookings').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Booking;
  }

  const local = loadLocalData();
  const created: Booking = {
    id: generateUuid(),
    ...payload,
  };
  local.bookings = [...local.bookings, created];
  saveLocalData(local);
  return created;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const local = loadLocalData();
  local.bookings = local.bookings.map((b) => (b.id === id ? { ...b, status } : b));
  saveLocalData(local);
}

export async function deleteBooking(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const local = loadLocalData();
  local.bookings = local.bookings.filter((b) => b.id !== id);
  saveLocalData(local);
}

/**
 * Envia os dados salvos localmente (inclusive os exemplos do Curso Onyou) para o Supabase.
 */
export async function syncLocalToSupabase(): Promise<{
  subjectsCount: number;
  teachersCount: number;
  studentsCount: number;
  bookingsCount: number;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error('Configure a URL e a Anon Key do Supabase primeiro.');
  }
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Cliente Supabase indisponível.');

  const local = loadLocalData();

  if (local.subjects.length > 0) {
    const { error } = await supabase
      .from('subjects')
      .upsert(local.subjects.map(({ id, name, color }) => ({ id, name, color })), {
        onConflict: 'name',
      });
    if (error) throw new Error(`Erro ao enviar matérias: ${error.message}`);
  }

  if (local.teachers.length > 0) {
    const { error } = await supabase.from('teachers').upsert(
      local.teachers.map(({ created_at: _c, ...rest }) => rest),
      { onConflict: 'id' },
    );
    if (error) throw new Error(`Erro ao enviar professores: ${error.message}`);
  }

  if (local.students.length > 0) {
    const { error } = await supabase.from('students').upsert(
      local.students.map(({ created_at: _c, ...rest }) => rest),
      { onConflict: 'id' },
    );
    if (error) throw new Error(`Erro ao enviar alunos: ${error.message}`);
  }

  if (local.bookings.length > 0) {
    const { error } = await supabase.from('bookings').upsert(
      local.bookings.map(({ created_at: _c, ...rest }) => rest),
      { onConflict: 'id' },
    );
    if (error) throw new Error(`Erro ao enviar reservas: ${error.message}`);
  }

  return {
    subjectsCount: local.subjects.length,
    teachersCount: local.teachers.length,
    studentsCount: local.students.length,
    bookingsCount: local.bookings.length,
  };
}
