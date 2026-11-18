import React, { useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Database,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import schemaSql from '../../supabase/schema.sql?raw';
import {
  clearSupabaseConfig,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase';
import { syncLocalToSupabase } from '../services/dataService';

interface SupabaseConfigViewProps {
  dataSource: 'supabase' | 'local';
  lastSyncError?: string;
  onRefreshData: () => Promise<void>;
  onResetDemoData: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const SupabaseConfigView: React.FC<SupabaseConfigViewProps> = ({
  dataSource,
  lastSyncError,
  onRefreshData,
  onResetDemoData,
  onNotify,
}) => {
  const existing = getStoredSupabaseConfig();
  const [url, setUrl] = useState(existing?.url || '');
  const [anonKey, setAnonKey] = useState(existing?.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setStatusFeedback(null);

    const res = await testSupabaseConnection(url, anonKey);
    setStatusFeedback(res);

    if (res.ok) {
      saveSupabaseConfig({ url, anonKey });
      await onRefreshData();
      onNotify('Conectado ao Supabase com sucesso!', 'success');
    } else {
      onNotify(res.message, 'error');
    }
    setTesting(false);
  };

  const handleDisconnect = async () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setStatusFeedback(null);
    await onRefreshData();
    onNotify('Desconectado. Usando armazenamento local do navegador.', 'success');
  };

  const handleSyncLocal = async () => {
    setSyncing(true);
    try {
      const counts = await syncLocalToSupabase();
      await onRefreshData();
      onNotify(
        `Sincronizado! ${counts.teachersCount} professores, ${counts.studentsCount} alunos e ${counts.bookingsCount} reservas enviados.`,
        'success',
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Erro ao enviar dados para o Supabase.',
        'error',
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql);
      setCopiedSql(true);
      onNotify('Script SQL copiado! Cole no SQL Editor do Supabase.', 'success');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      onNotify('Não foi possível copiar automaticamente. Selecione o texto manualmente.', 'error');
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Banner de Status Atual */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                dataSource === 'supabase'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {dataSource === 'supabase' ? (
                <Cloud className="h-5 w-5" />
              ) : (
                <HardDrive className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {dataSource === 'supabase'
                  ? 'Conectado ao Banco Supabase'
                  : 'Modo Local (Offline / Demonstração)'}
              </h2>
              <p className="text-xs text-slate-500">
                {dataSource === 'supabase'
                  ? 'Todas as reservas, professores e alunos estão salvos na nuvem.'
                  : 'Seus dados estão salvos neste navegador. Conecte o Supabase abaixo quando quiser sincronizar na nuvem.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recarregar
          </button>
        </div>

        {lastSyncError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            Aviso do Supabase: {lastSyncError}
          </div>
        )}
      </section>

      {/* Formulário de Credenciais */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Database className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-extrabold text-slate-900">
            Credenciais do Projeto Supabase
          </h3>
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Project URL (VITE_SUPABASE_URL)
            </label>
            <input
              type="url"
              placeholder="https://seu-projeto.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Anon / Publishable Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>

          {statusFeedback && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                statusFeedback.ok
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              {statusFeedback.message}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Cloud className="h-4 w-4" />
              {testing ? 'Testando conexão...' : 'Testar & Conectar Supabase'}
            </button>

            {dataSource === 'supabase' && (
              <>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncLocal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <UploadCloud className="h-4 w-4" />
                  {syncing ? 'Enviando...' : 'Enviar Dados Locais para o Supabase'}
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Desconectar
                </button>
              </>
            )}
          </div>
        </form>
      </section>

      {/* Script SQL do Banco */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              1º Passo no Supabase: Criar Tabelas (SQL Editor)
            </h3>
            <p className="text-xs text-slate-500">
              Copie o script abaixo, abra <strong>SQL Editor &gt; New query</strong> no painel do
              Supabase e clique em <strong>Run</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedSql ? 'Copiado!' : 'Copiar SQL'}
          </button>
        </div>

        <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
          <code>{schemaSql}</code>
        </pre>
      </section>

      {/* Utilitário de Dados de Demonstração */}
      {dataSource === 'local' && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Dados Locais de Demonstração</h3>
              <p className="text-xs text-slate-500">
                Restaure os professores, alunos e reservas de exemplo do Curso Onyou.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Restaurar dados locais iniciais do Curso Onyou?')) {
                  onResetDemoData();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar Exemplo
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
