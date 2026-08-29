import React, { useMemo } from 'react';
import { useApp } from '../lib/store';
import { Card, SectionTitle, Stat, StatusChip, Chip, Avatar, AiBadge, Progress, Btn } from '../components/ui';
import { Donut, HBars, AreaLine } from '../components/charts';
import { brlCompact, fmtDateShort, daysUntil, overdueTasks, activeProjects, greeting, generateInsights, computeHealth, healthLabel, criticalOverdue } from '../lib/engine';
import { ArrowRight, TrendingDown, TrendingUp, CalendarClock, Sparkles, Briefcase, Inbox, AlertTriangle, ClipboardList } from 'lucide-react';

export function DashboardPage() {
  const { db, session, user, nav, refreshTick } = useApp();
  const orgId = session!.orgId;

  const data = useMemo(() => {
    const projects = db.projects.filter(p => p.orgId === orgId);
    const active = projects.filter(p => ['Em Execução', 'Planejamento', 'Aprovado'].includes(p.status));
    const done = projects.filter(p => ['Concluído', 'Encerrado'].includes(p.status));
    const health = active.map(p => ({ p, h: computeHealth(db, p.id).overall }));
    const attention = health.filter(x => x.h < 75 && x.h >= 55);
    const critical = health.filter(x => x.h < 55);
    const programs = db.programs.filter(x => x.orgId === orgId && x.status === 'Ativo');
    const pendingDemands = db.demands.filter(x => x.orgId === orgId && ['Nova', 'Triagem', 'Em Análise', 'Aguardando Informação', 'Priorizada'].includes(x.status));
    const budget = projects.reduce((s, p) => s + p.budget, 0);
    const consumed = db.costs.filter(c => c.orgId === orgId).reduce((s, c) => s + c.actual, 0);
    const avgHealth = health.length ? Math.round(health.reduce((s, x) => s + x.h, 0) / health.length) : 0;
    const critRisks = db.risks.filter(r => r.orgId === orgId && r.probability * r.impact >= 15 && r.status !== 'Encerrado');
    const pendingDeliveries = db.tasks.filter(t => t.orgId === orgId && !['Concluída', 'Cancelada'].includes(t.status)).length;
    const pendingDecisions = db.decisions.filter(x => x.orgId === orgId && x.status === 'Pendente').length + db.changes.filter(c => c.orgId === orgId && ['Solicitada', 'Em Análise'].includes(c.status)).length;
    const delayed = projects.filter(p => (p.forecastEnd ?? p.plannedEnd) > p.plannedEnd && !['Concluído', 'Encerrado', 'Cancelado'].includes(p.status));
    const avgProgress = active.length ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length) : 0;

    const byUnit = db.units.filter(u => u.orgId === orgId).map(u => ({ label: u.name.replace('Secretaria de ', 'Sec. '), value: projects.filter(p => p.unitId === u.id).length })).filter(x => x.value > 0);
    const byPriority = ['Crítica', 'Alta', 'Média', 'Baixa'].map(pr => ({ label: pr, value: projects.filter(p => p.priority === pr && !['Concluído', 'Encerrado', 'Cancelado'].includes(p.status)).length })).filter(x => x.value > 0);
    const byStatus = [...new Set(projects.map(p => p.status))].map(s => ({ label: s, value: projects.filter(p => p.status === s).length }));
    const byStrategy = db.objectives.filter(o => o.orgId === orgId).map(o => ({ label: o.code, value: projects.filter(p => p.objectiveIds.includes(o.id)).length, name: o.name })).filter(x => x.value > 0);
    const insights = generateInsights(db, orgId);
    const upcoming = db.milestones.filter(m => { const p = db.projects.find(x => x.id === m.projectId); return p?.orgId === orgId && !m.actual && daysUntil(m.planned) >= -3; }).sort((a, b) => a.planned.localeCompare(b.planned)).slice(0, 5);
    const myPending = db.tasks.filter(t => t.orgId === orgId && (t.responsibleId === user?.id || t.collaboratorIds.includes(user?.id ?? '')) && !['Concluída', 'Cancelada'].includes(t.status));
    return { projects, active, done, attention, critical, programs, pendingDemands, budget, consumed, avgHealth, critRisks, pendingDeliveries, pendingDecisions, delayed, avgProgress, byUnit, byPriority, byStatus, byStrategy, insights, upcoming, myPending };
  }, [db, orgId, user, refreshTick]);

  const statusColors: Record<string, string> = { 'Em Execução': '#17998c', 'Planejamento': '#5b9ec6', 'Concluído': '#10b981', 'Aprovado': '#34d399', 'Suspenso': '#f59e0b', 'Encerrado': '#94a3b8', 'Cancelado': '#e11d48', 'Em Análise': '#f59e0b', 'Potencial': '#cbd5e1' };
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5 anim-rise">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-petrol-600 dark:text-petrol-300">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900 dark:text-white mt-0.5">{greeting()}, {firstName}</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">Resumo executivo da organização — atualizado em tempo real.</p>
        </div>
        <AiBadge />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5 stagger mb-6">
        <Stat label="Projetos Ativos" value={data.active.length} tone="teal" icon={<Briefcase size={15} />} onClick={() => nav('projetos')} />
        <Stat label="Concluídos" value={data.done.length} tone="green" onClick={() => nav('projetos')} />
        <Stat label="Em Atenção" value={data.attention.length} tone="amber" onClick={() => nav('inteligencia')} />
        <Stat label="Críticos" value={data.critical.length} tone="red" onClick={() => nav('inteligencia')} />
        <Stat label="Programas Ativos" value={data.programs.length} tone="steel" onClick={() => nav('programas')} />
        <Stat label="Demandas Pendentes" value={data.pendingDemands.length} tone="steel" icon={<Inbox size={15} />} onClick={() => nav('demandas')} />
        <Stat label="Orçamento Total" value={brlCompact(data.budget)} tone="teal" hint={`Consumido: ${brlCompact(data.consumed)}`} onClick={() => nav('custos')} />
        <Stat label="Progresso Médio" value={`${data.avgProgress}%`} tone="teal" hint={`Saúde média: ${data.avgHealth}/100`} onClick={() => nav('relatorios')} />
      </div>

      {/* Attention — AI prioritized */}
      <Card className="mb-5 bg-ink-900 dark:bg-ink-800 !ring-white/10 relative overflow-hidden" pad>
        <div className="absolute inset-0 grid-tex pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-petrol-300" />
                <h2 className="font-display font-semibold text-[15px] text-white">O que precisa da sua atenção hoje?</h2>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-0.5">Alertas priorizados pela Inteligência NEX com base nos dados atuais.</p>
            </div>
            <Btn size="sm" variant="outline" className="!ring-white/20 !text-slate-200 hover:!bg-white/10" onClick={() => nav('inteligencia')}>Central de Inteligência <ArrowRight size={13} /></Btn>
          </div>
          <div className="grid md:grid-cols-2 gap-2.5">
            {data.insights.slice(0, 4).map(i => (
              <button key={i.id} onClick={() => nav(i.projectId ? 'projeto' : 'inteligencia', i.projectId, i.projectId ? 'ia' : 'analises')}
                className="text-left rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 px-3.5 py-3 transition group">
                <div className="flex items-center gap-2 mb-1">
                  <Chip tone={i.severity === 'Crítica' ? 'red' : i.severity === 'Alta' ? 'orange' : 'amber'}>{i.severity}</Chip>
                  <span className="text-[10px] font-mono uppercase text-slate-500">{i.kind}</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-500">confiança {i.confidence}%</span>
                </div>
                <div className="text-[13px] font-semibold text-white group-hover:text-petrol-200 transition">{i.title}</div>
                <div className="text-[11.5px] text-slate-400 mt-0.5 line-clamp-2">{i.detail}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5 stagger">
        <Card>
          <SectionTitle>Projetos por Status</SectionTitle>
          <div className="flex items-center gap-4">
            <Donut segments={data.byStatus.map(s => ({ ...s, color: statusColors[s.label] ?? '#94a3b8' }))} center={String(data.projects.length)} sub="projetos" />
            <div className="space-y-1.5 flex-1 min-w-0">
              {data.byStatus.map(s => (
                <div key={s.label} className="flex items-center gap-2 text-[11.5px]">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: statusColors[s.label] ?? '#94a3b8' }} />
                  <span className="text-slate-500 dark:text-slate-400 truncate flex-1">{s.label}</span>
                  <span className="font-mono font-semibold text-ink-800 dark:text-slate-200">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle>Projetos por Unidade</SectionTitle>
          <HBars items={data.byUnit} />
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/6">
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-2">Por prioridade</div>
            <div className="flex gap-2 flex-wrap">
              {data.byPriority.map(p => <Chip key={p.label} tone={p.label === 'Crítica' ? 'red' : p.label === 'Alta' ? 'orange' : p.label === 'Média' ? 'steel' : 'neutral'}>{p.label}: {p.value}</Chip>)}
            </div>
          </div>
        </Card>
        <Card>
          <SectionTitle right={<span className="text-[10.5px] font-mono text-slate-400">média móvel 6 medições</span>}>Saúde do Portfólio</SectionTitle>
          <AreaLine points={[64, 66, 69, 67, 70, data.avgHealth || 70]} labels={['S-5', 'S-4', 'S-3', 'S-2', 'S-1', 'Hoje']} suffix="/100" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
              <div className="text-[10.5px] text-slate-400 uppercase font-semibold">Índice médio</div>
              <div className={`font-display font-bold text-lg flex items-center gap-1 ${data.avgHealth >= 75 ? 'text-emerald-600' : data.avgHealth >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>
                {data.avgHealth}/100 {data.avgHealth >= 70 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
              <div className="text-[10.5px] text-slate-400 uppercase font-semibold">Atrasados</div>
              <div className="font-display font-bold text-lg text-ink-900 dark:text-white">{data.delayed.length} projeto{data.delayed.length === 1 ? '' : 's'}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Priority projects + upcoming */}
      <div className="grid lg:grid-cols-3 gap-4 stagger">
        <Card className="lg:col-span-2">
          <SectionTitle right={<Btn size="sm" variant="ghost" onClick={() => nav('projetos')}>Ver todos <ArrowRight size={13} /></Btn>}>Projetos Prioritários</SectionTitle>
          <div className="space-y-2">
            {[...data.active].sort((a, b) => (a.priority === 'Crítica' ? -1 : 0) - (b.priority === 'Crítica' ? -1 : 0) || computeHealth(db, a.id).overall - computeHealth(db, b.id).overall).slice(0, 5).map(p => {
              const h = computeHealth(db, p.id).overall;
              const slip = daysUntil(p.forecastEnd ?? p.plannedEnd) - daysUntil(p.plannedEnd);
              return (
                <button key={p.id} onClick={() => nav('projeto', p.id)} className="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_auto_auto] items-center gap-3 rounded-lg px-3 py-2.5 ring-1 ring-slate-200/70 dark:ring-white/8 hover:ring-petrol-400/60 hover:bg-petrol-50/40 dark:hover:bg-petrol-900/10 transition text-left">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-ink-900 dark:text-slate-100 truncate">{p.name}</span>
                      <Chip tone={p.priority === 'Crítica' ? 'red' : p.priority === 'Alta' ? 'orange' : 'steel'}>{p.priority}</Chip>
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">{p.code} · {p.methodology} · {brlCompact(p.budget)}</div>
                  </div>
                  <div className="hidden sm:block"><Progress value={p.progress} tone="teal" /><div className="text-[10px] font-mono text-slate-400 mt-1">{p.progress}% concluído</div></div>
                  <div className="hidden sm:block text-right">
                    <div className={`font-display font-bold ${h >= 75 ? 'text-emerald-600' : h >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>{h}</div>
                    <div className="text-[9.5px] text-slate-400 -mt-0.5">{healthLabel(h)}</div>
                  </div>
                  <div className="text-right">
                    <StatusChip s={p.status} />
                    {slip > 0 && <div className="text-[10px] font-mono text-rose-500 mt-1">+{slip} dias</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <SectionTitle right={<CalendarClock size={15} className="text-slate-300" />}>Próximas Entregas</SectionTitle>
            <div className="space-y-2.5">
              {data.upcoming.length === 0 && <div className="text-[12px] text-slate-400">Nenhuma entrega próxima.</div>}
              {data.upcoming.map(m => {
                const p = db.projects.find(x => x.id === m.projectId);
                const dd = daysUntil(m.planned);
                return (
                  <button key={m.id} onClick={() => nav('projeto', m.projectId, 'cronograma')} className="w-full flex items-center gap-2.5 text-left group">
                    <span className={`h-8 w-8 rounded-lg grid place-items-center text-[10px] font-display font-bold shrink-0 ${dd < 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' : dd <= 14 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40' : 'bg-petrol-100 text-petrol-700 dark:bg-petrol-900/40'}`}>{dd < 0 ? `${dd}` : dd === 0 ? 'hoje' : `D-${dd}`}</span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-ink-800 dark:text-slate-200 truncate group-hover:text-petrol-700 dark:group-hover:text-petrol-300">{m.name}</span>
                      <span className="block text-[10.5px] font-mono text-slate-400">{p?.code} · {fmtDateShort(m.planned)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card>
            <SectionTitle right={<AiBadge>Alertas</AiBadge>}>Alertas da Inteligência</SectionTitle>
            <div className="space-y-2">
              {data.insights.length <= 4 && <div className="text-[12px] text-slate-400">Nenhum alerta adicional — portfólio dentro dos limites.</div>}
              {data.insights.slice(4, 7).map(i => (
                <div key={i.id} className="flex gap-2 items-start text-[12px] text-slate-600 dark:text-slate-300">
                  <AlertTriangle size={13} className={i.severity === 'Crítica' ? 'text-rose-500 mt-0.5' : 'text-amber-500 mt-0.5'} />
                  <span>{i.title}</span>
                </div>
              ))}
              <button onClick={() => nav('inteligencia')} className="text-[11.5px] font-semibold text-petrol-600 hover:underline flex items-center gap-1 pt-1">Ver todas as análises <ArrowRight size={12} /></button>
            </div>
          </Card>
          <Card>
            <SectionTitle right={<Chip tone="teal">{data.myPending.length}</Chip>}>Minhas Pendências</SectionTitle>
            {data.myPending.length === 0 && <div className="text-[12px] text-slate-400">Nenhuma tarefa atribuída a você.</div>}
            <div className="space-y-1.5">
              {data.myPending.slice(0, 4).map(t => (
                <button key={t.id} onClick={() => nav('tarefas')} className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 text-left">
                  <span className="text-[12px] text-ink-800 dark:text-slate-200 truncate">{t.title}</span>
                  <StatusChip s={t.status} />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* strategy alignment strip */}
      <div className="mt-4 grid lg:grid-cols-2 gap-4 stagger">
        <Card>
          <SectionTitle>Projetos por Objetivo Estratégico</SectionTitle>
          <HBars items={data.byStrategy.map(s => ({ label: `${s.label} — ${s.name}`, value: s.value, color: '#2a6691' }))} />
        </Card>
        <Card>
          <SectionTitle>Riscos & Decisões</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            <Stat label="Riscos Críticos" value={data.critRisks.length} tone="red" icon={<AlertTriangle size={14} />} onClick={() => nav('riscos')} />
            <Stat label="Entregas Pendentes" value={data.pendingDeliveries} tone="amber" onClick={() => nav('tarefas')} />
            <Stat label="Decisões Pendentes" value={data.pendingDecisions} tone="steel" icon={<ClipboardList size={14} />} onClick={() => nav('decisoes')} />
          </div>
          <div className="mt-3 text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sparkles size={13} className="text-petrol-500" />
            {data.pendingDecisions > 0
              ? `A Inteligência recomenda priorizar ${data.pendingDecisions} decisão(ões) pendente(s) para destravar o portfólio.`
              : 'Nenhuma decisão pendente — fluxo de aprovação em dia.'}
          </div>
        </Card>
      </div>
    </div>
  );
}
