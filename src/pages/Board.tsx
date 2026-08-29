import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import type { Task, TaskStatus } from '../lib/types';
import { Card, PageHeader, Chip, StatusChip, Avatar, Select, Btn, EmptyState, Progress } from '../components/ui';
import { Gantt } from '../components/charts';
import { todayISO, fmtDateShort, overdueTasks } from '../lib/engine';
import { GripVertical, CalendarClock } from 'lucide-react';

const KANBAN_COLS: TaskStatus[] = ['Não Iniciada', 'Planejada', 'Em Andamento', 'Em Revisão', 'Bloqueada', 'Aguardando Terceiro', 'Concluída'];

export function KanbanPage() {
  const { db, session, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [fProject, setFProject] = useState('Todos');
  const [fResp, setFResp] = useState('Todos');
  const [fPrio, setFPrio] = useState('Todas');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const tasks = useMemo(() => db.tasks.filter(t => t.orgId === orgId)
    .filter(t => fProject === 'Todos' || t.projectId === fProject)
    .filter(t => fResp === 'Todos' || t.responsibleId === fResp)
    .filter(t => fPrio === 'Todas' || t.priority === fPrio), [db, orgId, fProject, fResp, fPrio]);

  const move = (taskId: string, status: TaskStatus) => {
    mutate(d => {
      const t = d.tasks.find(x => x.id === taskId);
      if (!t || t.status === status) return;
      const before = t.status;
      t.status = status;
      if (status === 'Concluída') { t.progress = 100; t.actualEnd = todayISO(); }
      if (status === 'Em Andamento' && !t.actualStart) t.actualStart = todayISO();
    }, { action: 'MOVEU_TAREFA', entity: 'Task', entityId: taskId, after: status });
    toast(`Tarefa movida para "${status}".`, 'info');
  };

  const projName = (id: string) => db.projects.find(p => p.id === id)?.code ?? '';
  const userName = (id?: string) => db.users.find(u => u.id === id);

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto">
      <PageHeader kicker="Quadro de atividades" title="Atividades (Kanban)" subtitle="Arraste cartões entre colunas. Filtre por projeto, responsável e prioridade — cada movimento é auditado." />
      <div className="flex flex-wrap gap-2 mb-4 anim-rise">
        <Select value={fProject} onChange={e => setFProject(e.target.value)} className="!w-auto"><option value="Todos">Todos os projetos</option>{db.projects.filter(p => p.orgId === orgId).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name.slice(0, 30)}</option>)}</Select>
        <Select value={fResp} onChange={e => setFResp(e.target.value)} className="!w-auto"><option value="Todos">Todos os responsáveis</option>{db.users.filter(u => u.orgId === orgId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
        <Select value={fPrio} onChange={e => setFPrio(e.target.value)} className="!w-auto"><option value="Todas">Todas as prioridades</option>{['Crítica', 'Alta', 'Média', 'Baixa'].map(x => <option key={x}>{x}</option>)}</Select>
        <span className="ml-auto text-[11.5px] text-slate-400 self-center font-mono">{tasks.length} cartões</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {KANBAN_COLS.map(col => {
          const colTasks = tasks.filter(t => t.status === col);
          return (
            <div key={col}
              onDragOver={e => { e.preventDefault(); setOverCol(col); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => { if (dragId) move(dragId, col); setDragId(null); setOverCol(null); }}
              className={`w-[262px] shrink-0 rounded-xl transition ring-1 ${overCol === col ? 'ring-petrol-400 bg-petrol-50/60 dark:bg-petrol-900/15' : 'ring-slate-200/70 dark:ring-white/8 bg-slate-100/60 dark:bg-ink-900/40'}`}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <StatusChip s={col} />
                <span className="text-[11px] font-mono font-bold text-slate-400">{colTasks.length}</span>
              </div>
              <div className="px-2 pb-2 space-y-2 min-h-[60px]">
                {colTasks.map(t => {
                  const late = !['Concluída', 'Cancelada'].includes(t.status) && t.plannedEnd < todayISO();
                  const u = userName(t.responsibleId);
                  return (
                    <div key={t.id} draggable
                      onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      className={`bg-card dark:bg-ink-800 rounded-lg ring-1 ring-slate-900/8 dark:ring-white/8 shadow-soft p-2.5 cursor-grab active:cursor-grabbing hover:shadow-lift transition group ${dragId === t.id ? 'opacity-40' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <GripVertical size={12} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                        <button onClick={() => nav('projeto', t.projectId, 'tarefas')} className="font-mono text-[9.5px] text-slate-400 hover:text-petrol-600">{projName(t.projectId)}</button>
                        <Chip tone={t.priority === 'Crítica' ? 'red' : t.priority === 'Alta' ? 'orange' : 'neutral'} className="ml-auto !text-[9px] !px-1.5">{t.priority}</Chip>
                      </div>
                      <button onClick={() => nav('projeto', t.projectId, 'tarefas')} className="block text-left text-[12px] font-semibold text-ink-800 dark:text-slate-200 mt-1 leading-snug hover:text-petrol-700 dark:hover:text-petrol-300">{t.title}</button>
                      {t.progress > 0 && t.progress < 100 && <Progress value={t.progress} tone="teal" h={4} className="mt-2" />}
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-[10px] font-mono ${late ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>{late ? 'vencida ' : ''}{fmtDateShort(t.plannedEnd)}</span>
                        {u ? <Avatar name={u.name} size={20} /> : <span className="text-[9.5px] text-slate-300 dark:text-slate-600">sem resp.</span>}
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && <div className="text-center text-[10.5px] text-slate-300 dark:text-slate-600 py-4 border border-dashed border-slate-200 dark:border-white/8 rounded-lg">solte aqui</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MINHAS TAREFAS
// ============================================================
export function MyTasksPage() {
  const { db, session, user, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [fStatus, setFStatus] = useState('Abertas');
  const mine = db.tasks.filter(t => t.orgId === orgId && (t.responsibleId === user?.id || t.collaboratorIds.includes(user?.id ?? '')))
    .filter(t => fStatus === 'Abertas' ? !['Concluída', 'Cancelada'].includes(t.status) : fStatus === 'Todas' ? true : t.status === fStatus);
  const overdue = mine.filter(t => !['Concluída', 'Cancelada'].includes(t.status) && t.plannedEnd < todayISO()).length;

  const update = (t: Task, patch: Partial<Task>) => {
    mutate(d => {
      const x = d.tasks.find(y => y.id === t.id);
      if (!x) return;
      Object.assign(x, patch);
      if (patch.progress === 100) { x.status = 'Concluída'; x.actualEnd = todayISO(); }
    }, { action: patch.status ? 'ATUALIZOU_STATUS' : 'ATUALIZOU_PROGRESSO', entity: 'Task', entityId: t.id, before: `${t.progress}%`, after: patch.status ?? `${patch.progress}%` });
    if (patch.progress === 100) toast('Tarefa concluída. Excelente!', 'success');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Foco operacional" title={`Minhas Tarefas`} subtitle={`${mine.length} tarefas ${fStatus === 'Abertas' ? 'abertas' : ''} · ${overdue} vencida(s) — otimize seu dia com atualizações rápidas.`}
        actions={<div className="flex gap-1.5">{['Abertas', 'Em Andamento', 'Bloqueada', 'Concluída', 'Todas'].map(s => <button key={s} onClick={() => setFStatus(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${fStatus === s ? 'bg-ink-900 text-white dark:bg-petrol-700' : 'bg-card dark:bg-ink-800 ring-1 ring-slate-200 dark:ring-white/10 text-slate-500'}`}>{s}</button>)}</div>} />
      <div className="space-y-2 stagger">
        {mine.length === 0 && <Card><EmptyState title="Nenhuma tarefa aqui" hint="Tarefas atribuídas a você aparecem neste painel, com foco mobile para atualizações rápidas." /></Card>}
        {mine.map(t => {
          const p = db.projects.find(x => x.id === t.projectId);
          const late = !['Concluída', 'Cancelada'].includes(t.status) && t.plannedEnd < todayISO();
          return (
            <Card key={t.id} className="!p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => nav('projeto', t.projectId, 'tarefas')} className="font-mono text-[10px] text-slate-400 hover:text-petrol-600">{p?.code}</button>
                <span className="text-[13px] font-semibold text-ink-900 dark:text-slate-100 flex-1 min-w-[200px]">{t.title}</span>
                <Chip tone={t.priority === 'Crítica' ? 'red' : t.priority === 'Alta' ? 'orange' : 'neutral'}>{t.priority}</Chip>
                <StatusChip s={t.status} />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2.5">
                <span className={`text-[11px] font-mono ${late ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                  <CalendarClock size={11} className="inline mr-1 -mt-0.5" />{late ? 'Venceu em ' : 'Vence em '}{fmtDateShort(t.plannedEnd)}
                </span>
                <span className="text-[11px] font-mono text-slate-400">{t.actualH}h / {t.estimatedH}h</span>
                {t.status === 'Bloqueada' || t.status === 'Aguardando Terceiro' ? (
                  <Btn size="sm" variant="outline" onClick={() => update(t, { status: 'Em Andamento', blockingReason: undefined })}>Desbloquear</Btn>
                ) : t.status !== 'Concluída' ? (
                  <div className="flex items-center gap-2 flex-1 max-w-[260px]">
                    <input type="range" min={0} max={100} step={10} value={t.progress} onChange={e => update(t, { progress: Number(e.target.value) })} className="flex-1 accent-petrol-600" />
                    <span className="font-mono text-[11px] w-9 text-right">{t.progress}%</span>
                    <Btn size="sm" variant="outline" onClick={() => update(t, { progress: 100 })}>Concluir</Btn>
                  </div>
                ) : <Progress value={100} tone="green" className="flex-1 max-w-[220px]" />}
              </div>
              {t.blockingReason && <div className="mt-2 text-[11px] text-orange-600 dark:text-orange-400 italic">Motivo do bloqueio: {t.blockingReason}</div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// CRONOGRAMA GLOBAL
// ============================================================
export function SchedulePage() {
  const { db, session, nav } = useApp();
  const orgId = session!.orgId;
  const [projectId, setProjectId] = useState('Todos');
  const projects = db.projects.filter(p => p.orgId === orgId && ['Em Execução', 'Planejamento'].includes(p.status));
  const rows = useMemo(() => {
    const base = projectId === 'Todos'
      ? projects.flatMap(p => db.tasks.filter(t => t.projectId === p.id && t.critical).map(t => ({ ...t, pname: p.code })))
      : db.tasks.filter(t => t.projectId === projectId).map(t => ({ ...t, pname: db.projects.find(p => p.id === projectId)?.code ?? '' }));
    return base.map(t => ({
      id: t.id, label: `${t.pname} · ${t.title.slice(0, 42)}`,
      start: t.actualStart ?? t.plannedStart,
      end: t.status === 'Concluída' ? (t.actualEnd ?? t.plannedEnd) : (t.plannedEnd < todayISO() && t.progress < 100 ? todayISO() : t.plannedEnd),
      progress: t.progress, critical: t.critical || (t.plannedEnd < todayISO() && t.progress < 100),
      baseline: { start: t.plannedStart, end: t.plannedEnd },
    }));
  }, [db, projectId, projects]);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Cronograma consolidado" title="Cronograma" subtitle={projectId === 'Todos' ? 'Atividades críticas de todos os projetos em execução, com linha de base e marcos de atraso.' : 'Todas as atividades do projeto selecionado.'}
        actions={<Select value={projectId} onChange={e => setProjectId(e.target.value)} className="!w-auto"><option value="Todos">Caminho crítico — todos</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name.slice(0, 28)}</option>)}</Select>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="Nenhuma atividade crítica" hint="Bom sinal: nenhum item em atraso no filtro atual." /> : <Gantt rows={rows} today={todayISO()} />}
        <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-white/6 text-[10.5px] text-slate-500">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />Atividade crítica / vencida</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-petrol-500 inline-block" />Dentro do planejado</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-4 rounded bg-slate-300 dark:bg-white/20 inline-block" />Linha de base</span>
        </div>
      </Card>
      <Card className="mt-4">
        <div className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-2">Folgas e desvios detectados</div>
        <div className="grid md:grid-cols-3 gap-2 text-[12px]">
          {projects.slice(0, 6).map(p => {
            const slip = db.tasks.filter(t => t.projectId === p.id && t.plannedEnd < todayISO() && t.progress < 100).length;
            return (
              <button key={p.id} onClick={() => nav('projeto', p.id, 'cronograma')} className="rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5 text-left hover:ring-petrol-400 transition">
                <div className="font-mono text-[10px] text-slate-400">{p.code}</div>
                <div className={`font-semibold ${slip > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{slip > 0 ? `${slip} atividade(s) vencida(s)` : 'Sem desvios'}</div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
