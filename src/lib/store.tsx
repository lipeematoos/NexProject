import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { DB, Session, Route, Page, ID, User, AuditLog } from './types';
import { buildSeed } from './seed';
import { uid } from './engine';

const DB_KEY = 'netproject.db.v3';
const SES_KEY = 'netproject.session.v3';
const PREF_KEY = 'netproject.prefs.v3';

export interface Toast { id: string; kind: 'success' | 'info' | 'warn' | 'error'; text: string; }

interface Prefs { dark: boolean; }

interface Ctx {
  db: DB; session: Session | null; user: User | null;
  route: Route; nav: (page: Page, id?: ID, tab?: string) => void;
  dark: boolean; toggleDark: () => void;
  toasts: Toast[]; toast: (text: string, kind?: Toast['kind']) => void; dismissToast: (id: string) => void;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  changePassword: (pwd: string) => void;
  mutate: (fn: (d: DB) => void, audit?: { action: string; entity: string; entityId?: ID; before?: string; after?: string }) => void;
  resetDemo: () => void;
  searchOpen: boolean; setSearchOpen: (v: boolean) => void;
  notifOpen: boolean; setNotifOpen: (v: boolean) => void;
  alertsOpen: boolean; setAlertsOpen: (v: boolean) => void;
  refreshTick: number; pulse: () => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
};

function loadDb(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (parsed.version === 3) return parsed; }
  } catch { /* corrupted storage -> reseed */ }
  return buildSeed();
}
function loadSession(): Session | null {
  try { const raw = localStorage.getItem(SES_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function loadPrefs(): Prefs {
  try { const raw = localStorage.getItem(PREF_KEY); return raw ? JSON.parse(raw) : { dark: false }; } catch { return { dark: false }; }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(loadDb);
  const [session, setSession] = useState<Session | null>(loadSession);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [route, setRoute] = useState<Route>({ page: 'painel' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* quota */ } }, [db]);
  useEffect(() => { try { session ? localStorage.setItem(SES_KEY, JSON.stringify(session)) : localStorage.removeItem(SES_KEY); } catch { /* noop */ } }, [session]);
  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
    document.documentElement.classList.toggle('dark', prefs.dark);
  }, [prefs]);

  const user = useMemo(() => db.users.find(u => u.id === session?.userId) ?? null, [db.users, session]);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = uid();
    setToasts(t => [...t, { id, kind, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const dismissToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  const nav = useCallback((page: Page, id?: ID, tab?: string) => {
    setRoute({ page, id, tab });
    window.scrollTo({ top: 0 });
  }, []);

  const mutate = useCallback<Ctx['mutate']>((fn, audit) => {
    setDb(prev => {
      const next: DB = structuredClone(prev);
      fn(next);
      if (audit && session) {
        const u = prev.users.find(x => x.id === session.userId);
        next.audit.unshift({
          id: uid(), orgId: session.orgId, userId: session.userId,
          userName: u?.name ?? 'Sistema', at: new Date().toISOString(),
          ...audit,
        } as AuditLog);
        next.audit = next.audit.slice(0, 400);
      }
      return next;
    });
  }, [session]);

  const pulse = useCallback(() => setRefreshTick(t => t + 1), []);

  const login = useCallback((email: string, password: string) => {
    const u = db.users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { ok: false, error: 'Usuário não encontrado. Verifique o e-mail informado.' };
    if (!u.active) return { ok: false, error: 'Usuário desativado. Contate o administrador da organização.' };
    // Development-only credential policy: demo password is "123456".
    if (password !== '123456') return { ok: false, error: 'Senha inválida para o ambiente de demonstração.' };
    const org = db.organizations.find(o => o.id === u.orgId)!;
    setSession({ userId: u.id, orgId: org.id, loggedAt: new Date().toISOString() });
    setRoute({ page: 'painel' });
    toast(`Sessão iniciada — ${org.name}`, 'info');
    return { ok: true };
  }, [db, toast]);

  const logout = useCallback(() => { setSession(null); }, []);
  const changePassword = useCallback((pwd: string) => {
    mutate(d => {
      const u = d.users.find(x => x.id === session?.userId);
      if (u) { u.mustChangePassword = false; }
    }, { action: 'ALTEROU_SENHA', entity: 'User', after: 'Senha atualizada no primeiro acesso' });
    void pwd;
    toast('Senha atualizada com sucesso.', 'success');
  }, [mutate, session, toast]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(DB_KEY);
    setDb(buildSeed());
    toast('Dados de demonstração restaurados.', 'info');
  }, [toast]);

  const toggleDark = useCallback(() => setPrefs(p => ({ ...p, dark: !p.dark })), []);

  const value: Ctx = {
    db, session, user, route, nav, dark: prefs.dark, toggleDark,
    toasts, toast, dismissToast, login, logout, changePassword, mutate, resetDemo,
    searchOpen, setSearchOpen, notifOpen, setNotifOpen, alertsOpen, setAlertsOpen,
    refreshTick, pulse,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
