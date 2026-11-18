import React from 'react';
import { CalendarDays, Cloud, Database, GraduationCap, Plus, Users } from 'lucide-react';
import { AppTab } from '../types';

interface NavigationProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  dataSource: 'supabase' | 'local';
  onOpenNewBooking: () => void;
}

export const Header: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  dataSource,
  onOpenNewBooking,
}) => {
  const navItems: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
    { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'professores', label: 'Professores', icon: <GraduationCap className="h-4 w-4" /> },
    { id: 'alunos', label: 'Alunos', icon: <Users className="h-4 w-4" /> },
    { id: 'config', label: 'Supabase', icon: <Database className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Identidade Curso Onyou */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200">
            <span className="text-base font-extrabold tracking-tight">OY</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                Curso Onyou
              </h1>
              <button
                type="button"
                onClick={() => onSelectTab('config')}
                title="Status da conexão com o banco de dados"
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  dataSource === 'supabase'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}
              >
                <Cloud className="h-3 w-3" />
                <span className="hidden xs:inline">
                  {dataSource === 'supabase' ? 'Supabase' : 'Modo Local'}
                </span>
              </button>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Agenda de Reforço Escolar
            </p>
          </div>
        </div>

        {/* Navegação Desktop */}
        <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100 p-1 md:flex">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Botão Rápido Nova Reserva */}
        <button
          type="button"
          onClick={onOpenNewBooking}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 sm:px-4 sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Agendar</span>
        </button>
      </div>
    </header>
  );
};

export const BottomNav: React.FC<{
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  dataSource: 'supabase' | 'local';
}> = ({ activeTab, onSelectTab, dataSource }) => {
  const items: Array<{ id: AppTab; label: string; icon: React.ReactNode; badge?: boolean }> = [
    { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="h-5 w-5" /> },
    { id: 'professores', label: 'Professores', icon: <GraduationCap className="h-5 w-5" /> },
    { id: 'alunos', label: 'Alunos', icon: <Users className="h-5 w-5" /> },
    {
      id: 'config',
      label: 'Banco',
      icon: <Database className="h-5 w-5" />,
      badge: dataSource === 'local',
    },
  ];

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-10 rounded-full bg-indigo-600" />
              )}
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
