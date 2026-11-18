import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const CONFIG_STORAGE_KEY = 'onyou_supabase_config_v1';
const DISABLED_FLAG = 'disabled';

const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: 'https://orpvacgbydosdxqmrlol.supabase.co',
  anonKey: 'sb_publishable_CoeGO0YFKVHVGDbIMJW-lw_SK1v1_l0',
};

let cachedClient: SupabaseClient | null = null;
let cachedSignature = '';

export function getStoredSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw === DISABLED_FLAG) {
      return null;
    }
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch {
    // ignore storage errors
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  return DEFAULT_SUPABASE_CONFIG;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  const clean: SupabaseConfig = {
    url: config.url.trim().replace(/\/+$/, ''),
    anonKey: config.anonKey.trim(),
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(clean));
  cachedClient = null;
  cachedSignature = '';
}

export function clearSupabaseConfig(): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, DISABLED_FLAG);
  cachedClient = null;
  cachedSignature = '';
}

export function isSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  return Boolean(cfg?.url && cfg?.anonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getStoredSupabaseConfig();
  if (!cfg) return null;

  const signature = `${cfg.url}::${cfg.anonKey}`;
  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    cachedSignature = signature;
  }

  return cachedClient;
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = anonKey.trim();

  if (!cleanUrl || !cleanKey) {
    return { ok: false, message: 'Preencha a URL do projeto e a Chave Anon (Public) do Supabase.' };
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return { ok: false, message: 'A URL do Supabase deve começar com https://.' };
  }

  try {
    const tempClient = createClient(cleanUrl, cleanKey, {
      auth: { persistSession: false },
    });

    const { error } = await tempClient.from('teachers').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.message.toLowerCase().includes('does not exist') ||
        error.message.toLowerCase().includes('schema cache')
      ) {
        return {
          ok: false,
          message:
            'Conexão alcançada, mas as tabelas ainda não existem! Copie o SQL abaixo e execute no SQL Editor do Supabase.',
        };
      }
      return {
        ok: false,
        message: `Erro retornado pelo Supabase: ${error.message}`,
      };
    }

    return {
      ok: true,
      message: 'Conexão validada com sucesso! Banco pronto para uso.',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha de rede ao conectar no Supabase.';
    return { ok: false, message: msg };
  }
}
