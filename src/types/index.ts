export type BookingType = 'individual' | 'grupo';
export type BookingStatus = 'agendado' | 'concluido' | 'cancelado' | 'falta';

export interface SubjectItem {
  id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email: string;
  color: string;
  subjects: string[];
  available_days: number[]; // 0 = Dom ... 6 = Sáb
  available_slots: string[]; // ['08:00', '09:00', ...]
  max_students_per_slot: number;
  notes: string;
  active: boolean;
  created_at?: string;
}

export interface Student {
  id: string;
  name: string;
  grade_level: string;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  subjects_needed: string[];
  preferred_days: number[]; // 0 = Dom ... 6 = Sáb
  preferred_slots: string[];
  notes: string;
  active: boolean;
  created_at?: string;
}

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // HH:MM
  teacher_id: string;
  student_id: string;
  subject: string;
  booking_type: BookingType;
  status: BookingStatus;
  topic_notes: string;
  created_at?: string;
}

export interface SlotAvailabilityStatus {
  timeSlot: string;
  status: 'livre' | 'grupo_aberto' | 'ocupado_individual' | 'lotado';
  activeBookings: Booking[];
  remainingSpots: number;
  maxSpots: number;
  bookingType: BookingType | null;
}

export interface AppDataState {
  subjects: SubjectItem[];
  teachers: Teacher[];
  students: Student[];
  bookings: Booking[];
}

export type AppTab = 'agenda' | 'professores' | 'alunos' | 'config';

export interface BookingModalPreset {
  date?: string;
  timeSlot?: string;
  subject?: string;
  teacherId?: string;
  studentId?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
