import React, { useState } from 'react';
import { useApp } from '../lib/store';
import { Card, SectionTitle, PageHeader, Btn, Chip, StatusChip, Field, Input, Select, Toggle, Tabs, Avatar, EmptyState, Modal, Textarea } from '../components/ui';
import { fmtDate, relTime, uid } from '../lib/engine';
import { Building2, Users, ShieldCheck, Database, Sparkles, Plug, FileClock, Braces, Save, RotateCcw, Check, X } from 'lucide-react';

const PERMISSIONS = ['Ver projetos', 'Criar projetos', 'Editar projetos', 'Aprovar projetos', 'Encerrar projetos', 'Ver custos', 'Editar custos', 'Gerir riscos', 'Aprovar iniciativas estratégicas', 'Gerir portfólio', 'Acessar análises de IA', 'Ver informações confidenciais', 'Gerenciar organização', 'Gerenciar usuários', 'Exportar relatórios', 'Ver trilha de auditoria'];
const GRANT: Record<string, number> = { master: 16, org_admin: 14, director: 11, secretary: 12, executive: 10, portfolio_mgr: 12, program_mgr: 11, project_mgr: 10, pmo: 15, team_lead: 8, analyst: 9, member: 5, requester: 4, auditor: 9, viewer: 3 };

export function AdminPage() {
  const { db, session, user, mutate, toast, resetDemo } = useApp();
  const orgId = session!.orgId;
  const org = db.organizations.find(o => o.id === orgId)!;
  const [tab, setTab] = useState('org');
  const [confirmReset, setConfirmReset] = useState(false);
  const isAdmin = user?.role === 'master' || user?.role === 'org_admin' || user?.role === 'auditor';
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'analyst', position: '' });
  const [showNewUser, setShowNewUser] = useState(false);
  const [cf, setCf] = useState({ entity: 'Projeto' as const, name: '', type: 'Texto' as const });

  if (!isAdmin) return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <ShieldCheck size={34} className="mx-auto text-slate-300 mb-3" />
      <h2 className="font-display font-bold text-lg text-ink-900 dark:text-white">Acesso restrito</h2>
      <p className="text-[13px] text-slate-500 mt-1">A área de Administração exige perfil de administrador ou auditor. Seu perfil atual ({db.roles.find(r => r.key === user?.role)?.name}) não possui esta permissão.</p>
    </div>
  );

  const users = db.users.filter(u => u.orgId === orgId);
  const units = db.units.filter(u => u.orgId === orgId);
  const audit = db.audit.filter(a => a.orgId === orgId);
  const events = db.events.filter(ev => ev.orgId === orgId);
  const cfs = db.customFields.filter(c => c.orgId === orgId);

  const saveOrg = (patch: Partial<typeof org>) => {
    mutate(d => { const o = d.organizations.find(x => x.id === orgId); if (o) Object.assign(o, patch); }, { action: 'ATUALIZOU_ORGANIZAÇÃO', entity: 'Organization', entityId: orgId });
    toast('Configurações da organização salvas.', 'success');
  };
  const addUser = () => {
    if (!newUser.name.trim() || !newUser.email.includes('@')) { toast('Nome e e-mail válido são obrigatórios.', 'warn'); return; }
    mutate(d => { d.users.push({ id: uid(), orgId, name: newUser.name, email: newUser.email, role: newUser.role as never, position: newUser.position || 'Colaborador', active: true, initials: newUser.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase(), skills: [], capacityH: 40, mustChangePassword: true }); }, { action: 'CRIOU_USUÁRIO', entity: 'User', after: newUser.email });
    toast(`Usuário ${newUser.email} criado — troca de senha obrigatória no primeiro acesso.`, 'success');
    setShowNewUser(false); setNewUser({ name: '', email: '', role: 'analyst', position: '' });
  };
  const addCf = () => {
    if (!cf.name.trim()) { toast('Informe o nome do campo.', 'warn'); return; }
    mutate(d => { d.customFields.push({ id: uid(), orgId, ...cf }); }, { action: 'CRIOU_CAMPO_PERSONALIZADO', entity: 'CustomField', after: cf.name });
    toast('Campo personalizado criado.', 'success');
    setCf({ entity: 'Projeto', name: '', type: 'Texto' });
  };
  const processEvent = (id: string) => {
    mutate(d => {
      const ev = d.events.find(x => x.id === id);
      if (ev) {
        ev.processed = true;
        const code = `DEM-${new Date().getFullYear()}-${String(96 + d.demands.length)}`;
        d.demands.unshift({ id: uid(), orgId, code, title: `SLA abaixo da meta — ${ev.payload.slice(0, 40)}`, description: ev.payload, requesterId: session!.userId, unitId: units[0]?.id ?? '', category: 'TI', type: 'Melhoria', priority: 'Média', urgency: 'Média', impact: 'Médio', effort: 'M', requestedAt: new Date().toISOString().slice(0, 10), status: 'Nova', origin: ev.source, benefit: 'Restabelecer SLA contratual', justification: 'Evento externo processado pela camada de integração' });
      }
    }, { action: 'PROCESSOU_EVENTO_INTEGRAÇÃO', entity: 'IntegrationEvent', entityId: id });
    toast('Evento processado — demanda criada para revisão humana.', 'success');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1300px] mx-auto">
      <PageHeader kicker="Administração" title="Administração da Organização" subtitle="Configurações do tenant, usuários, perfis, permissões, auditoria, IA, integrações NEX e conformidade LGPD." />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'org', label: 'Organização' }, { key: 'users', label: 'Usuários' }, { key: 'roles', label: 'Perfis & Permissões' },
        { key: 'units', label: 'Unidades' }, { key: 'fields', label: 'Campos Personalizados' }, { key: 'ai', label: 'IA' },
        { key: 'int', label: 'Integrações' }, { key: 'audit', label: 'Auditoria' }, { key: 'sec', label: 'Segurança & LGPD' },
      ]} />

      {tab === 'org' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle right={<Building2 size={15} className="text-slate-300" />}>Identificação</SectionTitle>
            <div className="space-y-3">
              <Field label="Nome da organização"><Input defaultValue={org.name} onBlur={e => saveOrg({ name: e.target.value })} /></Field>
              <Field label="Razão social"><Input defaultValue={org.legalName} onBlur={e => saveOrg({ legalName: e.target.value })} /></Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="CNPJ"><Input defaultValue={org.taxId} onBlur={e => saveOrg({ taxId: e.target.value })} /></Field>
                <Field label="Tipo"><Select defaultValue={org.type} onChange={e => saveOrg({ type: e.target.value as never })}>{['Órgão Público', 'Empresa Privada', 'Autarquia', 'Fundação', 'Empresa Pública', 'Escritório', 'Organização Sem Fins Lucrativos'].map(t => <option key={t}>{t}</option>)}</Select></Field>
              </div>
            </div>
          </Card>
          <Card>
            <SectionTitle>Preferências & Governança</SectionTitle>
            <div className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Moeda padrão"><Select defaultValue={org.currency} onChange={e => saveOrg({ currency: e.target.value })}><option value="BRL">R$ — Real</option><option value="USD">US$ — Dólar</option><option value="EUR">€ — Euro</option></Select></Field>
                <Field label="Fuso horário"><Select defaultValue={org.timezone} onChange={e => saveOrg({ timezone: e.target.value })}><option>America/Sao_Paulo</option><option>America/Manaus</option><option>America/Noronha</option></Select></Field>
                <Field label="Início do exercício"><Select defaultValue={String(org.fiscalYearStart)} onChange={e => saveOrg({ fiscalYearStart: Number(e.target.value) })}>{[1, 4, 7, 10].map(mo => <option key={mo} value={mo}>{`${mo}º mês`}</option>)}</Select></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Dias úteis"><Input defaultValue={org.workingDays} onBlur={e => saveOrg({ workingDays: e.target.value })} /></Field>
                <Field label="Horário de trabalho"><Input defaultValue={org.workingHours} onBlur={e => saveOrg({ workingHours: e.target.value })} /></Field>
              </div>
              <div className="space-y-2.5 pt-1">
                <Toggle on={org.governance.requiresCharter} onChange={v => saveOrg({ governance: { ...org.governance, requiresCharter: v } })} label="Exigir Termo de Abertura para novos projetos" />
                <Toggle on={org.governance.evmEnabled} onChange={v => saveOrg({ governance: { ...org.governance, evmEnabled: v } })} label="Habilitar módulo de Valor Agregado (EVM)" />
                <Toggle on={org.governance.publicTerms} onChange={v => saveOrg({ governance: { ...org.governance, publicTerms: v } })} label="Terminologia pública (dotação, empenho, liquidação)" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Cor principal</label>
                <input type="color" defaultValue={org.mainColor} onChange={e => saveOrg({ mainColor: e.target.value })} className="h-8 w-12 rounded cursor-pointer" />
                <label className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Cor secundária</label>
                <input type="color" defaultValue={org.secondaryColor} onChange={e => saveOrg({ secondaryColor: e.target.value })} className="h-8 w-12 rounded cursor-pointer" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card pad={false}>
          <div className="flex items-center justify-between p-4">
            <div className="text-[12.5px] text-slate-500">{users.length} usuários neste tenant · isolamento total entre organizações</div>
            <Btn size="sm" onClick={() => setShowNewUser(true)}>+ Novo Usuário</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                <th className="px-4 py-2 font-semibold">Usuário</th><th className="px-3 py-2 font-semibold">Perfil</th><th className="px-3 py-2 font-semibold">Cargo</th><th className="px-3 py-2 font-semibold">Situação</th><th className="px-3 py-2 font-semibold">Ações</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2.5"><Avatar name={u.name} size={28} /><span><b className="block text-ink-800 dark:text-slate-200">{u.name}{u.isDevAccount && <Chip tone="amber" className="ml-1.5">dev</Chip>}</b><span className="text-[10.5px] font-mono text-slate-400">{u.email}</span></span></span></td>
                    <td className="px-3 py-2.5"><Select value={u.role} onChange={e => { mutate(d => { const x = d.users.find(y => y.id === u.id); if (x) x.role = e.target.value as never; }, { action: 'ALTEROU_PERFIL', entity: 'User', entityId: u.id, before: u.role, after: e.target.value }); toast('Perfil atualizado.', 'info'); }} className="!py-1 !text-[11.5px] !w-auto">{db.roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}</Select></td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{u.position}</td>
                    <td className="px-3 py-2.5"><Chip tone={u.active ? 'green' : 'neutral'}>{u.active ? 'Ativo' : 'Desativado'}</Chip>{u.mustChangePassword && <Chip tone="amber" className="ml-1">troca de senha pendente</Chip>}</td>
                    <td className="px-3 py-2.5">{u.id !== user?.id && <Btn size="sm" variant="ghost" onClick={() => { mutate(d => { const x = d.users.find(y => y.id === u.id); if (x) x.active = !x.active; }, { action: u.active ? 'DESATIVOU_USUÁRIO' : 'REATIVOU_USUÁRIO', entity: 'User', entityId: u.id }); toast(u.active ? 'Usuário desativado (LGPD: dados preservados, acesso revogado).' : 'Usuário reativado.', 'info'); }}>{u.active ? 'Desativar' : 'Reativar'}</Btn>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'roles' && (
        <Card pad={false}>
          <div className="p-4 pb-2 text-[12.5px] text-slate-500">Matriz de permissões por perfil (RBAC granular). Ajustes persistem por organização.</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead><tr className="text-[9.5px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                <th className="px-4 py-2 font-semibold sticky left-0 bg-card dark:bg-ink-800">Permissão</th>
                {db.roles.map(r => <th key={r.key} className="px-2 py-2 font-semibold text-center whitespace-nowrap">{r.name.split(' ')[0]}</th>)}
              </tr></thead>
              <tbody>
                {PERMISSIONS.map((p, pi) => (
                  <tr key={p} className="border-b border-slate-100 dark:border-white/5">
                    <td className="px-4 py-1.5 font-medium text-ink-800 dark:text-slate-200 sticky left-0 bg-card dark:bg-ink-800">{p}</td>
                    {db.roles.map(r => {
                      const granted = pi < (GRANT[r.key] ?? 0);
                      return <td key={r.key} className="px-2 py-1.5 text-center">{granted ? <Check size={13} className="inline text-emerald-500" /> : <X size={12} className="inline text-slate-300 dark:text-slate-700" />}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'units' && (
        <Card>
          <SectionTitle>Unidades Organizacionais</SectionTitle>
          <div className="grid md:grid-cols-2 gap-2">
            {units.map(u => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5">
                <Building2 size={16} className="text-steel-500" />
                <div className="flex-1"><b className="text-[12.5px] text-ink-800 dark:text-slate-200 block">{u.name}</b><span className="text-[10.5px] font-mono text-slate-400">{u.kind}</span></div>
                <Chip tone="steel">{db.projects.filter(p => p.unitId === u.id).length} projetos</Chip>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'fields' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <SectionTitle>Campos existentes</SectionTitle>
            <div className="space-y-1.5">
              {cfs.map(c => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2">
                  <Braces size={14} className="text-petrol-500" />
                  <b className="text-[12.5px] text-ink-800 dark:text-slate-200 flex-1">{c.name}</b>
                  <Chip tone="steel">{c.entity}</Chip><Chip tone="neutral">{c.type}</Chip>
                </div>
              ))}
              {cfs.length === 0 && <EmptyState title="Nenhum campo personalizado" />}
            </div>
          </Card>
          <Card>
            <SectionTitle>Novo campo</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Entidade"><Select value={cf.entity} onChange={e => setCf({ ...cf, entity: e.target.value as never })}>{['Projeto', 'Demanda', 'Ideia', 'Tarefa', 'Risco'].map(x => <option key={x}>{x}</option>)}</Select></Field>
                <Field label="Tipo"><Select value={cf.type} onChange={e => setCf({ ...cf, type: e.target.value as never })}>{['Texto', 'Número', 'Data', 'Booleano', 'Lista', 'Usuário', 'Moeda', 'Percentual'].map(x => <option key={x}>{x}</option>)}</Select></Field>
              </div>
              <Field label="Nome do campo"><Input value={cf.name} onChange={e => setCf({ ...cf, name: e.target.value })} placeholder="Ex.: Programa Governamental" /></Field>
              <Btn onClick={addCf}><Save size={14} /> Criar campo</Btn>
            </div>
          </Card>
        </div>
      )}

      {tab === 'ai' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle right={<Sparkles size={15} className="text-petrol-500" />}>Motor de Inteligência</SectionTitle>
            <div className="space-y-2.5">
              {[
                ['Análise automática do portfólio (diária)', true], ['NEX Forecast para projetos ativos', true],
                ['Detecção de demandas duplicadas', true], ['Sugestões de redistribuição de recursos', true],
                ['Aplicação automática de recomendações', false],
              ].map(([l, on]) => (
                <div key={l as string} className="flex items-center justify-between rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5">
                  <span className="text-[12.5px] text-ink-800 dark:text-slate-200">{l}</span>
                  <Toggle on={on as boolean} onChange={v => toast(v ? 'Recurso habilitado.' : 'Recurso desabilitado.', 'info')} />
                </div>
              ))}
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 ring-1 ring-rose-300/50 p-3 text-[11.5px] text-rose-700 dark:text-rose-300">
                <b>Regra inegociável (human-in-the-loop):</b> a IA nunca aprova, exclui, altera prazos, orçamentos, baselines ou atribui pessoas sem confirmação explícita de um usuário.
              </div>
            </div>
          </Card>
          <Card>
            <SectionTitle>Provedor & Transparência</SectionTitle>
            <div className="space-y-3">
              <Field label="Provedor de IA (variável AI_PROVIDER)" hint="Definido via variável de ambiente no backend; o motor determinístico local garante operação offline.">
                <Select defaultValue="nex-deterministic"><option value="nex-deterministic">NEX Deterministic (padrão)</option><option>OpenAI (via backend)</option><option>Anthropic (via backend)</option><option>Azure OpenAI (via backend)</option></Select>
              </Field>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 space-y-1.5">
                <p>• Toda análise exibe: tipo, dados utilizados, data, confiança, premissas e limitações.</p>
                <p>• “Ver como esta análise foi gerada” disponível em cada insight.</p>
                <p>• Dados insuficientes geram aviso explícito — nunca fabricação.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'int' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle right={<Plug size={15} className="text-steel-500" />}>Ecossistema NEX — eventos recebidos</SectionTitle>
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Chip tone="ink">{ev.source}</Chip>
                    <span className="font-mono text-[10.5px] text-slate-400">{ev.type}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">{relTime(ev.receivedAt)}</span>
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-300 mt-1">{ev.payload}</div>
                  <div className="mt-1.5">{ev.processed ? <Chip tone="green">processado</Chip> : <Btn size="sm" onClick={() => processEvent(ev.id)}>Processar → criar demanda</Btn>}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle>Catálogo de eventos da API</SectionTitle>
            <div className="space-y-1.5">
              {['PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELAYED', 'TASK_OVERDUE', 'RISK_CREATED', 'RISK_CRITICAL', 'DEMAND_CREATED', 'DEMAND_APPROVED', 'IDEA_APPROVED', 'MILESTONE_DELAYED', 'PROJECT_COMPLETED'].map(ev => (
                <div key={ev} className="flex items-center gap-2 font-mono text-[11px] rounded-md bg-slate-50 dark:bg-white/5 px-2.5 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-petrol-500" />
                  <span className="text-ink-800 dark:text-slate-200">{ev}</span>
                  <span className="ml-auto text-slate-400 text-[9.5px]">webhook pronto p/ message broker</span>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-2">Arquitetura preparada para NEXUNITAS, NEXFROTA, NEXOBRAS, NEXATIVOS e NEXSERVICE via camada genérica de eventos.</p>
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card pad={false}>
          <div className="p-4 flex items-center gap-2 flex-wrap">
            <FileClock size={16} className="text-steel-500" />
            <b className="text-[13.5px] font-display text-ink-900 dark:text-white">Trilha de Auditoria</b>
            <Chip tone="slate">imutável pela interface</Chip>
            <span className="ml-auto text-[11px] text-slate-400">{audit.length} registros neste tenant</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                <th className="px-4 py-2 font-semibold">Data/Hora</th><th className="px-3 py-2 font-semibold">Usuário</th><th className="px-3 py-2 font-semibold">Ação</th><th className="px-3 py-2 font-semibold">Entidade</th><th className="px-3 py-2 font-semibold">Antes → Depois</th>
              </tr></thead>
              <tbody>
                {audit.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="px-4 py-2 font-mono text-[10.5px] text-slate-400 whitespace-nowrap">{new Date(a.at).toLocaleDateString('pt-BR')} {new Date(a.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2 font-semibold text-ink-800 dark:text-slate-200">{a.userName}</td>
                    <td className="px-3 py-2"><Chip tone="steel">{a.action.replace(/_/g, ' ')}</Chip></td>
                    <td className="px-3 py-2 font-mono text-[10.5px] text-slate-400">{a.entity}{a.entityId ? `·${a.entityId.slice(0, 10)}` : ''}</td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{a.before ? <><s className="text-rose-400">{a.before}</s> → </> : null}{a.after ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {audit.length === 0 && <EmptyState title="Sem registros" />}
          </div>
        </Card>
      )}

      {tab === 'sec' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle right={<ShieldCheck size={15} className="text-emerald-500" />}>Controles de Segurança</SectionTitle>
            <div className="space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
              {[
                ['Senhas com hash (bcrypt/argon2 no backend)', true],
                ['JWT + refresh tokens com expiração curta', true],
                ['Isolamento multi-tenant por organização', true],
                ['RBAC com matriz de permissões granular', true],
                ['Proteção contra SQL injection (ORM parametrizado)', true],
                ['Sanitização de entrada e proteção XSS', true],
                ['Rate limiting e proteção de força bruta', true],
                ['Trilha de auditoria imutável', true],
                ['MFA — arquitetura preparada', false],
              ].map(([l, on]) => (
                <div key={l as string} className="flex items-center gap-2.5 rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2">
                  {on ? <Check size={14} className="text-emerald-500 shrink-0" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400 shrink-0" />}
                  <span>{l}</span>
                  {!on && <Chip tone="amber" className="ml-auto">roadmap</Chip>}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle right={<Database size={15} className="text-steel-500" />}>LGPD & Dados de Demonstração</SectionTitle>
            <div className="space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
              <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3">Princípios aplicados: finalidade, necessidade, transparência e segurança. Desativação de usuário preserva histórico e revoga acesso; exportação de dados disponível via relatórios; dados sensíveis recebem classificação de confidencialidade.</div>
              <div className="rounded-lg ring-1 ring-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3">
                <b className="text-amber-800 dark:text-amber-300">Conta de desenvolvimento:</b> <span className="font-mono">admin@systenex.local</span> — somente para demonstração, com troca de senha obrigatória no primeiro acesso. Nunca usar em produção.
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/6">
              <Btn variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw size={14} /> Restaurar dados de demonstração</Btn>
              <p className="text-[10.5px] text-slate-400 mt-1.5">Recria o banco de dados de demonstração (seed) mantendo sua sessão.</p>
            </div>
          </Card>
        </div>
      )}

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Restaurar dados de demonstração"
        footer={<><Btn variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Btn><Btn variant="danger" onClick={() => { resetDemo(); setConfirmReset(false); }}><RotateCcw size={14} /> Restaurar tudo</Btn></>}>
        <p className="text-[13px] text-slate-600 dark:text-slate-300">Todas as alterações locais (projetos, tarefas, análises, auditoria adicional) serão substituídas pelo seed original. Ação irreversível.</p>
      </Modal>
      <Modal open={showNewUser} onClose={() => setShowNewUser(false)} title="Novo Usuário" footer={<><Btn variant="ghost" onClick={() => setShowNewUser(false)}>Cancelar</Btn><Btn onClick={addUser}>Criar usuário</Btn></>}>
        <div className="space-y-3">
          <Field label="Nome completo" required><Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} /></Field>
          <Field label="E-mail" required><Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Perfil"><Select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>{db.roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}</Select></Field>
            <Field label="Cargo"><Input value={newUser.position} onChange={e => setNewUser({ ...newUser, position: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
