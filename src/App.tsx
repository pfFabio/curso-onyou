import { useCallback, useEffect, useState } from 'react';
import { AgendaCalendarView } from './components/AgendaCalendarView';
import { BookingModal } from './components/BookingModal';
import { BottomNav, Header } from './components/Navigation';
import { StudentsView } from './components/StudentsView';
import { SupabaseConfigView } from './components/SupabaseConfigView';
import { TeachersView } from './components/TeachersView';
import {
  createBooking,
  CreateBookingInput,
  createSubject,
  deleteBooking,
  deleteStudent,
  deleteTeacher,
  fetchAllData,
  resetLocalDemoData,
  saveStudent,
  saveTeacher,
  updateBookingStatus,
} from './services/dataService';
import {
  AppDataState,
  AppTab,
  BookingModalPreset,
  BookingStatus,
  Student,
  SubjectItem,
  Teacher,
} from './types';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('agenda');
  const [data, setData] = useState<AppDataState>({
    subjects: [],
    teachers: [],
    students: [],
    bookings: [],
  });
  const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
  const [lastSyncError, setLastSyncError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [bookingPreset, setBookingPreset] = useState<BookingModalPreset | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3600);
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const res = await fetchAllData();
    setData(res.data);
    setDataSource(res.source);
    setLastSyncError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleOpenBookingModal = (preset: BookingModalPreset = {}) => {
    setBookingPreset(preset);
    setBookingModalOpen(true);
  };

  const handleCreateBooking = async (input: CreateBookingInput) => {
    await createBooking(input, data);
    await refreshData();
    notify('Horário reservado com sucesso!', 'success');
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status);
      await refreshData();
      notify('Status da aula atualizado.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao atualizar status.', 'error');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Excluir esta reserva da agenda?')) return;
    try {
      await deleteBooking(bookingId);
      await refreshData();
      notify('Reserva removida da agenda.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao excluir reserva.', 'error');
    }
  };

  const handleSaveTeacher = async (
    input: Omit<Teacher, 'id' | 'created_at'> & { id?: string },
  ) => {
    await saveTeacher(input);
    await refreshData();
    notify(input.id ? 'Professor atualizado!' : 'Professor cadastrado!', 'success');
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteTeacher(id);
      await refreshData();
      notify('Professor removido.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao remover professor.', 'error');
    }
  };

  const handleCreateSubject = async (name: string, color: string): Promise<SubjectItem> => {
    const created = await createSubject(name, color);
    await refreshData();
    notify(`Matéria "${created.name}" adicionada!`, 'success');
    return created;
  };

  const handleSaveStudent = async (
    input: Omit<Student, 'id' | 'created_at'> & { id?: string },
  ): Promise<Student> => {
    const saved = await saveStudent(input);
    await refreshData();
    notify(input.id ? 'Aluno atualizado!' : 'Aluno cadastrado!', 'success');
    return saved;
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      await deleteStudent(id);
      await refreshData();
      notify('Aluno removido.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erro ao remover aluno.', 'error');
    }
  };

  const handleResetDemoData = () => {
    const seeded = resetLocalDemoData();
    setData(seeded);
    notify('Dados de exemplo do Curso Onyou restaurados.', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dataSource={dataSource}
        onOpenNewBooking={() => handleOpenBookingModal({})}
      />

      <main className="mx-auto max-w-6xl px-3 pt-4 sm:px-4">
        {loading && data.teachers.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
              Carregando agenda do Curso Onyou...
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'agenda' && (
              <AgendaCalendarView
                data={data}
                onOpenBookingModal={handleOpenBookingModal}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onDeleteBooking={handleDeleteBooking}
                onGoToTeachers={() => setActiveTab('professores')}
              />
            )}

            {activeTab === 'professores' && (
              <TeachersView
                data={data}
                onSaveTeacher={handleSaveTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onCreateSubject={handleCreateSubject}
              />
            )}

            {activeTab === 'alunos' && (
              <StudentsView
                data={data}
                onSaveStudent={handleSaveStudent}
                onDeleteStudent={handleDeleteStudent}
                onOpenBookingForStudent={(preset) => {
                  setActiveTab('agenda');
                  handleOpenBookingModal(preset);
                }}
              />
            )}

            {activeTab === 'config' && (
              <SupabaseConfigView
                dataSource={dataSource}
                lastSyncError={lastSyncError}
                onRefreshData={refreshData}
                onResetDemoData={handleResetDemoData}
                onNotify={notify}
              />
            )}
          </>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dataSource={dataSource}
      />

      <BookingModal
        isOpen={bookingModalOpen}
        preset={bookingPreset}
        data={data}
        onClose={() => setBookingModalOpen(false)}
        onCreateBooking={handleCreateBooking}
        onQuickCreateStudent={(studentInput) => handleSaveStudent(studentInput)}
      />

      {/* Toast Mobile-First */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
          <div
            className={`pointer-events-auto rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-lg transition-all ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
