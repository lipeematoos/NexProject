import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard, Target, Lightbulb, Inbox, Layers, FolderKanban, Briefcase, KanbanSquare,
  CheckSquare, CalendarRange, Users, Gauge, AlertTriangle, AlertOctagon, GitPullRequest, Coins,
  FileBarChart2, Sparkles, FolderOpen, Video, BookOpen, ShieldCheck, Search, Bell, Siren,
  Plus, ChevronRight, LogOut, Moon, Sun, Command as CommandIcon, FileText, Scale, X, ArrowRight
} from 'lucide-react';
import { useApp } from '../lib/store';
import type { Page, Route } from '../lib/types';
import { Avatar, IconBtn, Kbd, Chip } from './ui';
import { relTime } from '../lib/engine';

// ---------------- role-gated menu ----------------
const ALL: Page[] = ['painel', 'estrategia', 'ideias', 'demandas', 'portfolios', 'programas', 'projetos', 'atividades', 'tarefas', 'cronograma', 'equipes', 'recursos', 'riscos', 'problemas', 'mudancas', 'custos', 'relatorios', 'inteligencia', 'documentos', 'reunioes', 'licoes', 'decisoes', 'admin'];
const ROLE_ACCESS: Record<string, Page[]> = {
  master: ALL, org_admin: ALL,
  director: ['painel', 'estrategia', 'portfolios', 'programas', 'projetos', 'riscos', 'custos', 'relatorios', 'inteligencia', 'decisoes', 'mudancas', 'reunioes', 'licoes', 'documentos'],
  secretary: ALL.filter(p => p !== 'admin'),
  executive: ['painel', 'estrategia', 'portfolios', 'programas', 'projetos', 'riscos', 'custos', 'relatorios', 'inteligencia', 'decisoes'],
  portfolio_mgr: ALL.filter(p => !['admin'].includes(p)),
  program_mgr: ALL.filter(p => p !== 'admin'),
  project_mgr: ['painel', 'ideias', 'demandas', 'programas', 'projetos', 'atividades', 'tarefas', 'cronograma', 'equipes', 'recursos', 'riscos', 'problemas', 'mudancas', 'custos', 'relatorios', 'inteligencia', 'documentos', 'reunioes', 'licoes', 'decisoes'],
  pmo: ALL,
  team_lead: ['painel', 'projetos', 'atividades', 'tarefas', 'cronograma', 'equipes', 'recursos', 'riscos', 'problemas', 'documentos', 'reunioes', 'licoes'],
  analyst: ['painel', 'ideias', 'demandas', 'portfolios', 'projetos', 'atividades', 'tarefas', 'riscos', 'custos', 'relatorios', 'inteligencia', 'documentos', 'reunioes', 'licoes'],
  member: ['painel', 'projetos', 'atividades', 'tarefas', 'cronograma', 'equipes', 'documentos', 'reunioes', 'licoes'],
  requester: ['painel', 'ideias', 'demandas', 'projetos', 'documentos'],
  auditor: ['painel', 'estrategia', 'projetos', 'riscos', 'custos', 'relatorios', 'inteligencia', 'documentos', 'admin'],
  viewer: ['painel', 'estrategia', 'projetos', 'relatorios', 'documentos'],
};
export const canAccess = (role: string, page: Page) => (ROLE_ACCESS[role] ?? ['painel']).includes(page);

const MENU: { group: string; items: { page: Page; label: string; icon: React.ReactNode }[] }[] = [
  { group: 'Visão Geral', items: [{ page: 'painel', label: 'Painel', icon: <LayoutDashboard size={17} /> }] },
  {
    group: 'Estratégia', items: [
      { page: 'estrategia', label: 'Estratégia', icon: <Target size={17} /> },
      { page: 'ideias', label: 'Ideias', icon: <Lightbulb size={17} /> },
      { page: 'demandas', label: 'Demandas', icon: <Inbox size={17} /> },
      { page: 'portfolios', label: 'Portfólio', icon: <Layers size={17} /> },
      { page: 'programas', label: 'Programas', icon: <FolderKanban size={17} /> },
    ],
  },
  {
    group: 'Execução', items: [
      { page: 'projetos', label: 'Projetos', icon: <Briefcase size={17} /> },
      { page: 'atividades', label: 'Atividades', icon: <KanbanSquare size={17} /> },
      { page: 'tarefas', label: 'Minhas Tarefas', icon: <CheckSquare size={17} /> },
      { page: 'cronograma', label: 'Cronograma', icon: <CalendarRange size={17} /> },
      { page: 'equipes', label: 'Equipes', icon: <Users size={17} /> },
      { page: 'recursos', label: 'Recursos', icon: <Gauge size={17} /> },
    ],
  },
  {
    group: 'Governança', items: [
      { page: 'riscos', label: 'Riscos', icon: <AlertTriangle size={17} /> },
      { page: 'problemas', label: 'Problemas', icon: <AlertOctagon size={17} /> },
      { page: 'mudancas', label: 'Mudanças', icon: <GitPullRequest size={17} /> },
      { page: 'custos', label: 'Custos', icon: <Coins size={17} /> },
      { page: 'decisoes', label: 'Decisões', icon: <Scale size={17} /> },
      { page: 'relatorios', label: 'Relatórios', icon: <FileBarChart2 size={17} /> },
    ],
  },
  {
    group: 'Inteligência & Conhecimento', items: [
      { page: 'inteligencia', label: 'Inteligência', icon: <Sparkles size={17} /> },
      { page: 'documentos', label: 'Documentos', icon: <FolderOpen size={17} /> },
      { page: 'reunioes', label: 'Reuniões', icon: <Video size={17} /> },
      { page: 'licoes', label: 'Lições Aprendidas', icon: <BookOpen size={17} /> },
    ],
  },
  { group: 'Sistema', items: [{ page: 'admin', label: 'Administração', icon: <ShieldCheck size={17} /> }] },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, session, user, route, nav } = useApp();
  const org = db.organizations.find(o => o.id === session?.orgId);
  const unread = db.notifications.filter(n => n.userId === user?.id && !n.read).length;
  const groups = useMemo(() =>
    MENU.map(g => ({ ...g, items: g.items.filter(i => user && canAccess(user.role, i.page)) })).filter(g => g.items.length > 0),
    [user]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-ink-950/50 z-40 lg:hidden anim-fade" onClick={onClose} />}
      <aside className={`fixed z-50 lg:z-30 top-0 left-0 bottom-0 w-[248px] bg-ink-900 text-slate-300 flex flex-col transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} grid-tex`}>
        <div className="px-4 pt-4 pb-3 border-b border-white/8">
          <button onClick={() => { nav('painel'); onClose(); }} className="w-full flex items-center gap-2.5 text-left group">
            <span className="h-9 w-9 rounded-lg bg-petrol-600 grid place-items-center shadow-lg shadow-petrol-900/50 group-hover:scale-105 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19V5m0 14h16M4 15l5-6 4 3 7-8" /></svg>
            </span>
            <span>
              <span className="block font-display font-bold text-[15px] tracking-tight text-white leading-none">NETPROJECT</span>
              <span className="block text-[9.5px] font-mono text-petrol-300/90 mt-1 tracking-wide">DA ESTRATÉGIA À ENTREGA</span>
            </span>
          </button>
        </div>
        {org && (
          <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
            <span className="h-7 w-7 rounded-md grid place-items-center text-[10px] font-display font-bold text-white shrink-0" style={{ background: org.mainColor }}>{org.initials}</span>
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold text-white truncate">{org.name}</div>
              <div className="text-[9.5px] font-mono text-slate-500 uppercase">{org.type}</div>
            </div>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {groups.map(g => (
            <div key={g.group}>
              <div className="px-2 text-[9.5px] font-mono uppercase tracking-[0.16em] text-slate-600 mb-1.5">{g.group}</div>
              <div className="space-y-0.5">
                {g.items.map(i => {
                  const active = route.page === i.page || (i.page === 'projetos' && route.page === 'projeto');
                  return (
                    <button key={i.page} onClick={() => { nav(i.page); onClose(); }}
                      className={`w-full flex items-center gap-2.5 px-2 py-[7px] rounded-lg text-[12.5px] font-medium transition group ${active ? 'bg-petrol-600/15 text-petrol-200' : 'hover:bg-white/6 hover:text-white text-slate-400'}`}>
                      <span className={active ? 'text-petrol-300' : 'text-slate-500 group-hover:text-slate-300'}>{i.icon}</span>
                      <span className="flex-1 text-left">{i.label}</span>
                      {active && <span className="h-4 w-[3px] rounded-full bg-petrol-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-white/8">
          <div className="flex items-center gap-2.5 px-1">
            {user && <Avatar name={user.name} size={32} />}
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{db.roles.find(r => r.key === user?.role)?.name}</div>
            </div>
            <LogoutBtn />
          </div>
        </div>
      </aside>
    </>
  );
}
function LogoutBtn() {
  const { logout } = useApp();
  return <IconBtn title="Encerrar sessão" onClick={logout} className="!text-slate-500 hover:!text-white hover:!bg-white/10"><LogOut size={15} /></IconBtn>;
}

// ---------------- Topbar ----------------
export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { db, user, dark, toggleDark, setSearchOpen, setNotifOpen, setAlertsOpen, nav } = useApp();
  const unread = db.notifications.filter(n => n.userId === user?.id && !n.read).length;
  const criticalAlerts = db.alerts.filter(a => a.orgId === user?.orgId && !a.read && a.severity !== 'Informação').length;
  return (
    <header className="sticky top-0 z-30 h-[54px] bg-paper/85 dark:bg-ink-950/85 backdrop-blur border-b border-slate-900/8 dark:border-white/8 flex items-center gap-2 px-3 sm:px-5">
      <button className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-white/8" onClick={onMenu}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <button onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 rounded-lg ring-1 ring-inset ring-slate-300 dark:ring-slate-700 bg-card dark:bg-ink-800 px-3 py-1.5 text-[12.5px] text-slate-400 hover:ring-petrol-400 transition w-[210px] sm:w-[300px]">
        <Search size={14} />
        <span className="flex-1 text-left">Buscar em tudo…</span>
        <span className="hidden sm:flex items-center gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
      </button>
      <div className="flex-1" />
      <div className="hidden md:flex items-center gap-1.5 mr-1 live-dot text-[10.5px] font-mono text-slate-400">dados ao vivo</div>
      <IconBtn title="Central de alertas" onClick={() => setAlertsOpen(true)} badge={criticalAlerts}><Siren size={17} /></IconBtn>
      <IconBtn title="Notificações" onClick={() => setNotifOpen(true)} badge={unread}><Bell size={17} /></IconBtn>
      <IconBtn title={dark ? 'Modo claro' : 'Modo escuro'} onClick={toggleDark}>{dark ? <Sun size={17} /> : <Moon size={17} />}</IconBtn>
      <button onClick={() => nav('projetos', undefined, 'novo')} className="hidden sm:inline-flex items-center gap-1.5 ml-1 bg-ink-900 dark:bg-petrol-700 hover:bg-ink-800 dark:hover:bg-petrol-600 text-white rounded-lg px-3 py-1.5 text-[12px] font-semibold transition active:scale-95">
        <Plus size={14} /> Novo Projeto
      </button>
    </header>
  );
}

// ---------------- Command palette ----------------
interface Cmd { id: string; label: string; hint?: string; icon?: React.ReactNode; run: () => void; kw: string }
export function CommandPalette() {
  const { searchOpen, setSearchOpen, nav, db, session, toast, mutate, user } = useApp();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) { setQ(''); setTimeout(() => inputRef.current?.focus(), 40); } }, [searchOpen]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(!searchOpen); } };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [setSearchOpen, searchOpen]);

  const orgId = session?.orgId ?? '';
  const cmds: Cmd[] = useMemo(() => [
    { id: 'c1', label: 'Novo Projeto', hint: 'Ação', icon: <Plus size={14} />, run: () => nav('projetos', undefined, 'novo'), kw: 'novo projeto criar' },
    { id: 'c2', label: 'Nova Demanda', hint: 'Ação', icon: <Plus size={14} />, run: () => nav('demandas', undefined, 'nova'), kw: 'nova demanda registrar' },
    { id: 'c3', label: 'Nova Ideia', hint: 'Ação', icon: <Lightbulb size={14} />, run: () => nav('ideias', undefined, 'nova'), kw: 'nova ideia inovacao' },
    { id: 'c4', label: 'Registrar Risco', hint: 'Ação', icon: <AlertTriangle size={14} />, run: () => nav('riscos', undefined, 'novo'), kw: 'registrar risco' },
    { id: 'c5', label: 'Abrir Painel Estratégico', hint: 'Navegação', icon: <Target size={14} />, run: () => nav('estrategia'), kw: 'painel estrategico cockpit' },
    { id: 'c6', label: 'Central de Inteligência', hint: 'Navegação', icon: <Sparkles size={14} />, run: () => nav('inteligencia'), kw: 'inteligencia ia nex advisor' },
    { id: 'c7', label: 'Perguntar ao NEX Advisor', hint: 'IA', icon: <Sparkles size={14} />, run: () => nav('inteligencia', undefined, 'advisor'), kw: 'pergunta advisor chat ia' },
    ...db.projects.filter(p => p.orgId === orgId).map(p => ({ id: `p-${p.id}`, label: p.name, hint: p.code, icon: <Briefcase size={14} />, run: () => nav('projeto', p.id), kw: `${p.name} ${p.code} projeto` })),
    ...db.demands.filter(x => x.orgId === orgId).map(x => ({ id: `d-${x.id}`, label: x.title, hint: x.code, icon: <Inbox size={14} />, run: () => nav('demandas', x.id), kw: `${x.title} ${x.code} demanda` })),
    ...db.tasks.filter(t => t.orgId === orgId).map(t => ({ id: `t-${t.id}`, label: t.title, hint: db.projects.find(p => p.id === t.projectId)?.code ?? '', icon: <CheckSquare size={14} />, run: () => nav('projeto', t.projectId, 'tarefas'), kw: `${t.title} tarefa` })),
    ...db.documents.filter(x => x.orgId === orgId).map(x => ({ id: `dc-${x.id}`, label: x.name, hint: x.category, icon: <FileText size={14} />, run: () => nav('documentos'), kw: `${x.name} documento` })),
    ...db.risks.filter(r => r.orgId === orgId).map(r => ({ id: `r-${r.id}`, label: r.title, hint: r.code, icon: <AlertTriangle size={14} />, run: () => nav('riscos'), kw: `${r.title} ${r.code} risco` })),
    ...db.users.filter(u => u.orgId === orgId).map(u => ({ id: `u-${u.id}`, label: u.name, hint: u.position, icon: <Users size={14} />, run: () => nav('equipes'), kw: `${u.name} usuario equipe` })),
    ...db.decisions.filter(x => x.orgId === orgId).map(x => ({ id: `dec-${x.id}`, label: x.title, hint: 'Decisão', icon: <Scale size={14} />, run: () => nav('decisoes'), kw: `${x.title} decisao` })),
  ], [db, orgId, nav]);

  const filtered = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const base = nq ? cmds.filter(c => c.kw.toLowerCase().includes(nq) || c.label.toLowerCase().includes(nq)) : cmds;
    return base.slice(0, 14);
  }, [q, cmds]);
  if (!searchOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-[2px] anim-fade" onClick={() => setSearchOpen(false)} />
      <div className="relative w-full max-w-xl bg-card dark:bg-ink-800 rounded-xl shadow-lift ring-1 ring-slate-900/10 dark:ring-white/10 anim-rise overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200/80 dark:border-white/8">
          <CommandIcon size={16} className="text-petrol-500" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && filtered[0]) { filtered[0].run(); setSearchOpen(false); } if (e.key === 'Escape') setSearchOpen(false); }}
            placeholder="Buscar projetos, tarefas, demandas, documentos, pessoas… ou digite um comando"
            className="flex-1 bg-transparent text-[14px] text-ink-900 dark:text-white placeholder:text-slate-400 focus:outline-none" />
          <Kbd>ESC</Kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {filtered.length === 0 && <div className="text-center py-8 text-[13px] text-slate-400">Nada encontrado para “{q}”.</div>}
          {filtered.map(c => (
            <button key={c.id} onClick={() => { c.run(); setSearchOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-petrol-50 dark:hover:bg-petrol-900/20 text-left transition group">
              <span className="text-slate-400 group-hover:text-petrol-600">{c.icon}</span>
              <span className="flex-1 text-[13px] font-medium text-ink-800 dark:text-slate-100 truncate">{c.label}</span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">{c.hint}</span>
              <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 text-petrol-500 transition" />
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-slate-200/80 dark:border-white/8 text-[10.5px] text-slate-400 flex gap-3">
          <span><Kbd>↵</Kbd> abrir</span><span><Kbd>Ctrl K</Kbd> alternar</span>
          {user && <span className="ml-auto font-mono">{user.orgId === 'org-pref' ? 'Prefeitura Municipal de Exemplo' : 'Systenex Engenharia S.A.'}</span>}
        </div>
      </div>
    </div>
  );
}

// ---------------- Notification & alert drawers ----------------
export function Drawers() {
  const { db, user, notifOpen, setNotifOpen, alertsOpen, setAlertsOpen, mutate, nav, toast } = useApp();
  const mine = db.notifications.filter(n => n.userId === user?.id);
  const alerts = db.alerts.filter(a => a.orgId === user?.orgId);
  const sevTone = { Crítica: 'red', Alta: 'orange', Atenção: 'amber', Informação: 'steel' } as const;
  return (
    <>
      {notifOpen && (
        <div className="fixed inset-0 z-[65]">
          <div className="absolute inset-0 bg-ink-950/45 anim-fade" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card dark:bg-ink-800 shadow-lift anim-slide-r flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/8">
              <h3 className="font-display font-semibold text-[15px] text-ink-900 dark:text-white">Notificações</h3>
              <div className="flex gap-2">
                <button className="text-[11px] font-semibold text-petrol-600 hover:underline" onClick={() => { mutate(d => { d.notifications.forEach(n => { if (n.userId === user?.id) n.read = true; }); }, { action: 'LEU_NOTIFICACOES', entity: 'Notification' }); toast('Notificações marcadas como lidas.', 'info'); }}>Marcar todas como lidas</button>
                <IconBtn onClick={() => setNotifOpen(false)}><X size={16} /></IconBtn>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {mine.length === 0 && <div className="text-center py-10 text-[13px] text-slate-400">Sem notificações.</div>}
              {mine.map(n => (
                <button key={n.id} onClick={() => mutate(d => { const x = d.notifications.find(y => y.id === n.id); if (x) x.read = true; })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition hover:bg-slate-100 dark:hover:bg-white/5 ${n.read ? 'opacity-55' : ''}`}>
                  <div className="flex gap-2 items-start">
                    {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-petrol-500 shrink-0" />}
                    <div>
                      <div className="text-[12.5px] text-ink-800 dark:text-slate-100">{n.text}</div>
                      <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">{relTime(n.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-white/8 text-[10.5px] text-slate-400">Canais futuros: e-mail, WhatsApp, Teams e Slack via camada de notificações.</div>
          </div>
        </div>
      )}
      {alertsOpen && (
        <div className="fixed inset-0 z-[65]">
          <div className="absolute inset-0 bg-ink-950/45 anim-fade" onClick={() => setAlertsOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card dark:bg-ink-800 shadow-lift anim-slide-r flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/8">
              <h3 className="font-display font-semibold text-[15px] text-ink-900 dark:text-white">Central de Alertas</h3>
              <IconBtn onClick={() => setAlertsOpen(false)}><X size={16} /></IconBtn>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {alerts.length === 0 && <div className="text-center py-10 text-[13px] text-slate-400">Nenhum alerta ativo.</div>}
              {alerts.map(a => (
                <button key={a.id} onClick={() => { if (a.link) { nav(a.link.page, a.link.id, a.link.tab); setAlertsOpen(false); } mutate(d => { const x = d.alerts.find(y => y.id === a.id); if (x) x.read = true; }); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition hover:bg-slate-100 dark:hover:bg-white/5 ${a.read ? 'opacity-55' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Chip tone={sevTone[a.severity]}>{a.severity}</Chip>
                    <span className="text-[10px] font-mono uppercase text-slate-400">{a.category}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">{relTime(a.createdAt)}</span>
                  </div>
                  <div className="text-[12.5px] text-ink-800 dark:text-slate-100">{a.message}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  const tone = { success: 'border-emerald-500 text-emerald-700 dark:text-emerald-300', info: 'border-steel-500 text-steel-700 dark:text-steel-300', warn: 'border-amber-500 text-amber-700 dark:text-amber-300', error: 'border-rose-500 text-rose-700 dark:text-rose-300' };
  return (
    <div className="fixed bottom-4 right-4 z-[90] space-y-2 w-[min(92vw,360px)]">
      {toasts.map(t => (
        <div key={t.id} className={`anim-slide-r bg-card dark:bg-ink-800 shadow-lift rounded-lg ring-1 ring-slate-900/10 dark:ring-white/10 border-l-[3px] ${tone[t.kind]} px-3.5 py-2.5 flex items-start gap-2`}>
          <span className="text-[12.5px] font-medium text-ink-800 dark:text-slate-100 flex-1">{t.text}</span>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
