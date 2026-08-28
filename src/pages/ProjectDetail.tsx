import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import type { Task, TaskStatus } from '../lib/types';
import { Card, SectionTitle, Btn, Chip, StatusChip, Modal, Field, Input, Textarea, Select, Tabs, Avatar, Progress, AiBadge, Thinking, PrintSheet, EmptyState } from '../components/ui';
import { Ring, AreaLine, Gantt, VBars, RiskMatrix, PowerInterest } from '../components/charts';
import { brl, brlCompact, fmtDate, fmtDateShort, fmtMonth, computeHealth, healthLabel, evm, evmExplainer, forecastProject, overdueTasks, criticalOverdue, todayISO, uid, relTime, daysUntil } from '../lib/engine';
import { ArrowLeft, Printer, Plus, Sparkles, Target, Flag, RefreshCw, Info, Users, FileCheck2 } from 'lucide-react';

const TABS = [
  { key: 'central', label: 'Central do Projeto' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'cronograma', label: 'Cronograma' },
  { key: 'custos', label: 'Custos & EVM' },
  { key: 'riscos', label: 'Riscos & Mudanças' },
  { key: 'equipe', label: 'Equipe & RACI' },
  { key: 'ia', label: 'Inteligência' },
];

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { db, nav, route, mutate, toast, session } = useApp();
  const p = db.projects.find(x => x.id === projectId);
  const [tab, setTab] = useState(route.tab && TABS.some(t => t.key === route.tab) ? route.tab : 'central');
  const [charterOpen, setCharterOpen] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const health = useMemo(() => p ? computeHealth(db, p.id) : null, [db, p]);
  if (!p || !health) return <div className="p-8"><EmptyState title="Projeto não encontrado" action={<Btn onClick={() => nav('projetos')}>Voltar aos projetos</Btn>} /></div>;

  const tasks = db.tasks.filter(t => t.projectId === p.id);
  const costs = db.costs.filter(c => c.projectId === p.id).sort((a, b) => a.month.localeCompare(b.month));
  const risks = db.risks.filter(r => r.projectId === p.id);
  const issues = db.issues.filter(i => i.projectId === p.id);
  const changes = db.changes.filter(c => c.projectId === p.id);
  const milestones = db.milestones.filter(m => m.projectId === p.id);
  const decisions = db.decisions.filter(x => x.projectId === p.id);
  const e = evm(db, p.id);
  const org = db.organizations.find(o => o.id === p.orgId)!;
  const history = db.health.filter(h => h.projectId === p.id).sort((a, b) => a.at.localeCompare(b.at));
  const name = (id?: string) => db.users.find(u => u.id === id)?.name ?? '—';

  const generateSummary = () => {
    setSummarizing(true);
    setTimeout(() => {
      const over = overdueTasks(db, p.id);
      const crit = criticalOverdue(db, p.id);
      const fc = forecastProject(db, p.id);
      const worst = [...health.dims].sort((a, b) => a.value - b.value)[0];
      const txt = `Este projeto apresenta saúde geral de ${health.overall}/100 (${healthLabel(health.overall)}). O principal fator de atenção é ${worst.label.toLowerCase()} (${worst.value}/100). Existem ${over.length} tarefas atrasadas, sendo ${crit.length} classificadas como críticas. ${fc.delayDays > 0 ? `Mantida a tendência atual, a previsão de conclusão é ${fc.delayDays} dias após a data planejada (${fmtDate(fc.forecastEnd)}), com probabilidade de atraso de ${fc.delayProbability}%.` : `A previsão atual indica conclusão dentro do prazo planejado (${fmtDate(p.plannedEnd)}).`} ${e && e.cpi < 1 ? `O desempenho de custos (CPI ${e.cpi.toFixed(2)}) projeta ${brlCompact(Math.max(0, e.eac - p.budget))} acima do orçamento.` : 'Custos dentro da linha de base.'}`;
      setSummary(txt);
      setSummarizing(false);
      mutate(d => { d.insights.unshift({ id: uid(), orgId: p.orgId, kind: 'IA', severity: 'Informação', title: `Resumo Inteligente gerado para ${p.code}`, detail: txt.slice(0, 140) + '…', projectId: p.id, dataUsed: 'saúde, tarefas, EVM, previsão', confidence: 90, createdAt: new Date().toISOString() }); }, { action: 'GEROU_RESUMO_IA', entity: 'AiInsight', entityId: p.id });
    }, 1200);
  };

  const setTaskProgress = (t: Task, progress: number) => {
    mutate(d => {
      const x = d.tasks.find(y => y.id === t.id);
      if (!x) return;
      x.progress = progress;
      if (progress === 100) { x.status = 'Concluída'; x.actualEnd = todayISO(); }
      else if (progress > 0 && x.status !== 'Bloqueada' && x.status !== 'Aguardando Terceiro') { x.status = 'Em Andamento'; if (!x.actualStart) x.actualStart = todayISO(); }
      const pj = d.projects.find(y => y.id === p.id);
      if (pj) {
        const ts = d.tasks.filter(y => y.projectId === p.id);
        pj.progress = ts.length ? Math.round(ts.reduce((s, y) => s + y.progress, 0) / ts.length) : 0;
        pj.updatedAt = new Date().toISOString();
      }
    }, { action: 'ATUALIZOU_PROGRESSO', entity: 'Task', entityId: t.id, before: `${t.progress}%`, after: `${progress}%` });
  };

  const ganttRows = [
    ...tasks.filter(t => !t.isMilestone).map(t => ({ id: t.id, label: `${t.wbsCode ? t.wbsCode + ' · ' : ''}${t.title}`, start: t.actualStart ?? t.plannedStart, end: t.actualEnd ?? (t.progress < 100 && t.plannedEnd < todayISO() ? todayISO() : t.plannedEnd), progress: t.progress, critical: t.critical, baseline: { start: t.plannedStart, end: t.plannedEnd } })),
    ...milestones.map(m => ({ id: m.id, label: `◆ ${m.name}`, start: m.actual ?? m.forecast ?? m.planned, end: m.actual ?? m.forecast ?? m.planned, progress: m.actual ? 100 : 0, milestone: true, critical: m.status === 'Atrasado' })),
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <button onClick={() => nav('projetos')} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-petrol-600 transition mb-3"><ArrowLeft size={14} /> Portfólio de projetos</button>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4 anim-rise">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[11px] text-slate-400">{p.code}</span>
            <StatusChip s={p.status} />
            <Chip tone={p.priority === 'Crítica' ? 'red' : p.priority === 'Alta' ? 'orange' : 'neutral'}>{p.priority}</Chip>
            <Chip tone="steel">{p.methodology}</Chip>
            <Chip tone="neutral">{p.type}</Chip>
            {p.confidentiality !== 'Público' && <Chip tone="slate">{p.confidentiality}</Chip>}
          </div>
          <h1 className="font-display text-[22px] sm:text-[25px] font-bold tracking-tight text-ink-900 dark:text-white mt-1 leading-tight">{p.name}</h1>
          <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            <span>Sponsor: <b>{name(p.sponsorId)}</b></span>
            <span>Gerente: <b>{name(p.managerId)}</b></span>
            <span>{fmtDate(p.start)} → <span className={(p.forecastEnd ?? p.plannedEnd) > p.plannedEnd ? 'text-rose-500 font-semibold' : ''}>{fmtDate(p.forecastEnd ?? p.plannedEnd)}</span></span>
            <span>Orçamento: <b>{brlCompact(p.budget)}</b></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-1">
            <div className={`font-display font-bold text-[24px] leading-none ${health.overall >= 75 ? 'text-emerald-600' : health.overall >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>{health.overall}<span className="text-[13px] text-slate-400">/100</span></div>
            <div className="text-[10px] font-mono uppercase text-slate-400 mt-0.5">{healthLabel(health.overall)}</div>
          </div>
          <Ring value={p.progress} size={62} color="#17998c" label="progresso" />
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ============ CENTRAL ============ */}
      {tab === 'central' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4 stagger">
            <Card>
              <SectionTitle right={<span className="text-[10px] font-mono text-slate-400">pesos configuráveis</span>}>Índice de Saúde</SectionTitle>
              <div className="flex items-center gap-4">
                <Ring value={health.overall} size={92} />
                <div className="flex-1 space-y-1.5">
                  {health.dims.map(d => (
                    <div key={d.label} className="grid grid-cols-[74px_1fr_26px] items-center gap-2">
                      <span className="text-[10.5px] text-slate-500 dark:text-slate-400">{d.label}</span>
                      <Progress value={d.value} tone="auto" h={5} />
                      <span className="text-[10.5px] font-mono font-semibold text-right text-ink-800 dark:text-slate-200">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {history.length > 1 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/6">
                  <div className="text-[10.5px] font-semibold uppercase text-slate-400 mb-1">Tendência histórica</div>
                  <AreaLine points={history.map(h => h.overall)} labels={history.map(h => fmtDateShort(h.at))} height={80} suffix="/100" color={history[history.length - 1].overall < history[0].overall ? '#e11d48' : '#17998c'} />
                </div>
              )}
            </Card>
            <Card>
              <SectionTitle right={<AiBadge />}>Resumo Inteligente</SectionTitle>
              {!summary && !summarizing && (
                <div className="text-center py-6">
                  <Sparkles className="mx-auto text-petrol-400 mb-2" size={22} />
                  <p className="text-[12px] text-slate-400 max-w-xs mx-auto mb-3">A IA cruza saúde, cronograma, custos e riscos para gerar um parágrafo executivo deste projeto.</p>
                  <Btn size="sm" onClick={generateSummary}><Sparkles size={13} /> Gerar Resumo Inteligente</Btn>
                </div>
              )}
              {summarizing && <Thinking label="Cruzando dados do projeto…" />}
              {summary && !summarizing && (
                <div className="rounded-lg bg-ink-900 grid-tex p-3.5 text-[12.5px] text-slate-200 leading-relaxed anim-fade">
                  {summary}
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-slate-500"><Info size={11} /> Dados: saúde, {tasks.length} tarefas, EVM, previsão · {fmtDate(todayISO())}</div>
                </div>
              )}
            </Card>
            <Card>
              <SectionTitle>NEX Forecast</SectionTitle>
              <ForecastCard projectId={p.id} />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 stagger">
            <Card>
              <SectionTitle right={<Btn size="sm" variant="ghost" onClick={() => setCharterOpen(true)}><FileCheck2 size={13} /> Termo de Abertura</Btn>}>Alinhamento Estratégico</SectionTitle>
              <div className="space-y-2">
                {p.objectiveIds.map(oid => {
                  const o = db.objectives.find(x => x.id === oid);
                  if (!o) return null;
                  return (
                    <div key={oid} className="rounded-lg bg-steel-50 dark:bg-steel-900/20 ring-1 ring-steel-200/60 dark:ring-steel-800 p-3">
                      <div className="flex items-center gap-2"><Target size={13} className="text-steel-600" /><b className="font-mono text-[10.5px] text-steel-700 dark:text-steel-300">{o.code}</b></div>
                      <div className="text-[12.5px] font-semibold text-ink-900 dark:text-slate-100 mt-1">{o.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Indicador: {o.indicator} ({o.current}{o.unit} → meta {o.goal}{o.unit})</div>
                    </div>
                  );
                })}
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-[12px] text-slate-600 dark:text-slate-300"><b className="block text-[10px] uppercase text-slate-400 mb-0.5">Por que este projeto existe?</b>{p.objective}</div>
                {db.benefits.filter(b => b.projectId === p.id).map(b => (
                  <div key={b.id} className="rounded-lg bg-emerald-50 dark:bg-emerald-900/15 ring-1 ring-emerald-200/60 dark:ring-emerald-900 p-3 text-[12px]">
                    <b className="block text-[10px] uppercase text-emerald-700 dark:text-emerald-400 mb-0.5">Benefício ({b.type})</b>
                    <span className="text-slate-600 dark:text-slate-300">{b.description}: {b.baseline} → {b.target}{b.actual ? ` · medido: ${b.actual}` : ''}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle>Marcos & Entregas</SectionTitle>
              <div className="space-y-1.5">
                {milestones.map(m => {
                  const delay = m.actual ? 0 : Math.max(0, daysUntil(m.forecast ?? m.planned) < 0 ? -daysUntil(m.forecast ?? m.planned) : -(daysUntil(m.planned) - daysUntil(m.forecast ?? m.planned)));
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 ring-1 ring-slate-200/60 dark:ring-white/6">
                      <Flag size={13} className={m.status === 'Atrasado' ? 'text-rose-500' : m.status === 'Em risco' ? 'text-amber-500' : 'text-emerald-500'} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-ink-800 dark:text-slate-200 truncate">{m.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">plan. {fmtDateShort(m.planned)} · prev. {fmtDateShort(m.forecast ?? m.planned)}{m.actual ? ` · real ${fmtDateShort(m.actual)}` : ''}</div>
                      </div>
                      <StatusChip s={m.status} />
                    </div>
                  );
                })}
                {milestones.length === 0 && <div className="text-[12px] text-slate-400">Nenhum marco cadastrado.</div>}
              </div>
            </Card>
            <Card>
              <SectionTitle>Eventos Recentes & Decisões</SectionTitle>
              <div className="space-y-2">
                {decisions.slice(0, 2).map(dc => (
                  <div key={dc.id} className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5">
                    <div className="flex items-center gap-2"><Chip tone={dc.status === 'Pendente' ? 'amber' : 'green'}>{dc.status}</Chip><span className="text-[10px] font-mono text-slate-400">{fmtDate(dc.date)}</span></div>
                    <div className="text-[12px] font-semibold text-ink-800 dark:text-slate-200 mt-1">{dc.title}</div>
                  </div>
                ))}
                {db.audit.filter(a => a.entityId && tasks.some(t => t.id === a.entityId) || a.entityId === p.id).slice(0, 4).map(a => (
                  <div key={a.id} className="flex gap-2 text-[11.5px] items-start">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-steel-400 shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400"><b className="text-ink-800 dark:text-slate-200">{a.userName}</b> · {a.action.toLowerCase().replace(/_/g, ' ')} · {relTime(a.at)}{a.after ? <span className="font-mono text-[10.5px]"> → {a.after}</span> : ''}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {p.scope && (
            <Card>
              <SectionTitle>Escopo do Projeto</SectionTitle>
              <div className="grid md:grid-cols-3 gap-3 text-[12px]">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/15 p-3"><b className="block text-[10px] uppercase text-emerald-700 dark:text-emerald-400 mb-1.5">Dentro do escopo</b><ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">{p.scope.inScope.map(s => <li key={s}>{s}</li>)}</ul></div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-900/15 p-3"><b className="block text-[10px] uppercase text-rose-700 dark:text-rose-400 mb-1.5">Fora do escopo</b><ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">{p.scope.outScope.map(s => <li key={s}>{s}</li>)}</ul></div>
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3"><b className="block text-[10px] uppercase text-slate-500 mb-1.5">Entregáveis</b><ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300">{p.scope.deliverables.map(s => <li key={s}>{s}</li>)}</ul></div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ============ TAREFAS ============ */}
      {tab === 'tarefas' && (
        <Card pad={false}>
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="text-[12px] text-slate-400">{tasks.length} tarefas · {overdueTasks(db, p.id).length} vencidas · {criticalOverdue(db, p.id).length} críticas vencidas</div>
            <Btn size="sm" onClick={() => setNewTask(true)}><Plus size={13} /> Nova Tarefa</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                <th className="px-4 py-2 font-semibold">EAP</th><th className="px-3 py-2 font-semibold">Tarefa</th><th className="px-3 py-2 font-semibold">Responsável</th><th className="px-3 py-2 font-semibold">Prazo</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold w-[190px]">Progresso</th>
              </tr></thead>
              <tbody>
                {tasks.map(t => {
                  const late = !['Concluída', 'Cancelada'].includes(t.status) && t.plannedEnd < todayISO();
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/70 dark:hover:bg-white/[.03]">
                      <td className="px-4 py-2.5 font-mono text-[10.5px] text-slate-400">{t.wbsCode ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {t.critical && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" title="Caminho crítico" />}
                          <span className={`font-semibold ${late ? 'text-rose-600 dark:text-rose-400' : 'text-ink-800 dark:text-slate-200'}`}>{t.title}</span>
                          {t.blockingReason && <span className="text-[10px] text-orange-600 font-mono" title={t.blockingReason}>⚑ bloqueio</span>}
                        </div>
                        {t.blockingReason && <div className="text-[10.5px] text-slate-400 italic">{t.blockingReason}</div>}
                      </td>
                      <td className="px-3 py-2.5"><span className="flex items-center gap-1.5">{t.responsibleId && <Avatar name={name(t.responsibleId)} size={20} />}<span className="text-slate-500 dark:text-slate-400">{t.responsibleId ? name(t.responsibleId).split(' ')[0] : '—'}</span></span></td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">{fmtDateShort(t.plannedEnd)}</td>
                      <td className="px-3 py-2.5"><StatusChip s={t.status} /></td>
                      <td className="px-3 py-2.5">
                        {t.status === 'Concluída' ? <Progress value={100} tone="green" /> : (
                          <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} step={5} value={t.progress} onChange={ev => setTaskProgress(t, Number(ev.target.value))} className="flex-1 accent-petrol-600 h-1" />
                            <span className="font-mono text-[10.5px] w-8 text-right">{t.progress}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ============ CRONOGRAMA ============ */}
      {tab === 'cronograma' && (
        <div className="space-y-4">
          <Card>
            <SectionTitle right={<span className="flex items-center gap-3 text-[10.5px] text-slate-400"><span className="flex items-center gap-1"><i className="h-2 w-3 rounded bg-slate-300 inline-block" /> linha de base</span><span className="flex items-center gap-1"><i className="h-2 w-3 rounded bg-petrol-500 inline-block" /> executado</span><span className="flex items-center gap-1"><i className="h-2 w-3 rounded bg-rose-500 inline-block" /> crítico</span></span>}>
              Cronograma {p.methodology === 'Ágil' ? '(sprints)' : '(Gantt)'} — caminho crítico em destaque
            </SectionTitle>
            <Gantt rows={ganttRows} today={todayISO()} />
          </Card>
          <Card>
            <SectionTitle>Marcos do Projeto</SectionTitle>
            <div className="grid md:grid-cols-2 gap-2">
              {milestones.map(m => {
                const slip = m.actual ? 0 : daysUntil(m.planned) - daysUntil(m.forecast ?? m.planned);
                return (
                  <div key={m.id} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5">
                    <span className={`h-3 w-3 rotate-45 rounded-[2px] ${m.status === 'Atrasado' ? 'bg-rose-500' : m.status === 'Em risco' ? 'bg-amber-500' : m.actual ? 'bg-emerald-500' : 'bg-petrol-500'}`} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink-800 dark:text-slate-200 truncate">{m.name}</div>
                      <div className="text-[10.5px] font-mono text-slate-400">planejado {fmtDate(m.planned)} · previsão {fmtDate(m.forecast ?? m.planned)}{m.actual ? ` · realizado ${fmtDate(m.actual)}` : ''} · resp. {name(m.responsibleId).split(' ')[0]}</div>
                    </div>
                    <div className="text-right"><StatusChip s={m.status} />{slip > 0 && <div className="text-[10px] font-mono text-rose-500 mt-0.5">desvio +{slip}d</div>}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ============ CUSTOS ============ */}
      {tab === 'custos' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4 stagger">
            <Card className="lg:col-span-2">
              <SectionTitle>Custos Mensais — Planejado × Realizado</SectionTitle>
              <VBars series={costs.map(c => ({ label: fmtMonth(c.month), a: c.planned, b: c.actual }))} money={brlCompact} height={180} />
            </Card>
            <Card>
              <SectionTitle right={<Chip tone="teal">EVM</Chip>}>Valor Agregado</SectionTitle>
              {e ? (
                <div className="space-y-1.5">
                  {([['pv', e.pv], ['ev', e.ev], ['ac', e.ac]] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-[12px]"><span className="text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px]">{k}</span><b className="font-mono">{brlCompact(v)}</b></div>
                  ))}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {([['CPI', e.cpi.toFixed(2), e.cpi >= 1], ['SPI', e.spi.toFixed(2), e.spi >= 1]] as const).map(([k, v, ok]) => (
                      <div key={k} className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 text-center" title={evmExplainer[k.toLowerCase()]}>
                        <div className="text-[9.5px] font-mono uppercase text-slate-400">{k}</div>
                        <div className={`font-display font-bold text-lg ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 space-y-0.5">
                    <div className="flex justify-between"><span title={evmExplainer.eac}>EAC (projeção final)</span><b className="font-mono">{brlCompact(e.eac)}</b></div>
                    <div className="flex justify-between"><span title={evmExplainer.etc}>ETC (para terminar)</span><b className="font-mono">{brlCompact(e.etc)}</b></div>
                    <div className="flex justify-between"><span title={evmExplainer.vac}>VAC (variação)</span><b className={`font-mono ${e.vac >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{brlCompact(e.vac)}</b></div>
                  </div>
                </div>
              ) : <div className="text-[12px] text-slate-400">Sem dados de custo suficientes.</div>}
            </Card>
          </div>
          {org.governance.publicTerms && (
            <Card>
              <SectionTitle right={<Chip tone="steel">terminologia pública</Chip>}>Execução Orçamentária (Dotação · Empenho · Liquidação)</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                    <th className="px-3 py-2">Mês</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Contrato</th><th className="px-3 py-2">Dotação</th><th className="px-3 py-2">Empenho</th><th className="px-3 py-2">Liquidação</th><th className="px-3 py-2">Planejado</th>
                  </tr></thead>
                  <tbody>
                    {costs.filter(c => c.publicTerms).map(c => (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-white/5">
                        <td className="px-3 py-2 font-mono">{fmtMonth(c.month)}</td>
                        <td className="px-3 py-2">{c.category}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{c.publicTerms?.contract ?? '—'}</td>
                        <td className="px-3 py-2 font-mono">{c.publicTerms?.dotacao ? brlCompact(c.publicTerms.dotacao) : '—'}</td>
                        <td className="px-3 py-2 font-mono">{c.publicTerms?.empenho ? brlCompact(c.publicTerms.empenho) : '—'}</td>
                        <td className="px-3 py-2 font-mono font-semibold">{c.publicTerms?.liquidacao ? brlCompact(c.publicTerms.liquidacao) : '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-400">{brlCompact(c.planned)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-2 flex items-center gap-1.5"><Info size={11} /> Módulo de apoio à gestão — não substitui o sistema contábil oficial.</p>
            </Card>
          )}
        </div>
      )}

      {/* ============ RISCOS & MUDANÇAS ============ */}
      {tab === 'riscos' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle>Registro de Riscos ({risks.length})</SectionTitle>
            <RiskMatrix risks={risks.map(r => ({ id: r.id, p: r.probability, i: r.impact, title: r.title }))} />
            <div className="mt-3 space-y-1.5">
              {risks.map(r => (
                <div key={r.id} className="rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2">
                  <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-slate-400">{r.code}</span><StatusChip s={r.status} />{r.aiSuggested && <AiBadge>sugerido IA</AiBadge>}<span className="ml-auto font-mono text-[10.5px] font-bold text-rose-500">{r.probability * r.impact}/25</span></div>
                  <div className="text-[12.5px] font-semibold text-ink-800 dark:text-slate-200 mt-1">{r.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Resposta: {r.response}{r.mitigation ? ` — ${r.mitigation}` : ''}</div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card>
              <SectionTitle>Problemas ({issues.length})</SectionTitle>
              <div className="space-y-1.5">
                {issues.map(i => (
                  <div key={i.id} className="flex items-start gap-2 rounded-lg px-2.5 py-2 ring-1 ring-slate-200/60 dark:ring-white/6">
                    <Chip tone={i.severity === 'Crítica' ? 'red' : i.severity === 'Alta' ? 'orange' : 'neutral'}>{i.severity}</Chip>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-ink-800 dark:text-slate-200">{i.title}</div>
                      <div className="text-[10.5px] text-slate-400">{i.impact}{i.deadline ? ` · prazo ${fmtDateShort(i.deadline)}` : ''}</div>
                    </div>
                    <StatusChip s={i.status} />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <SectionTitle>Solicitações de Mudança ({changes.length})</SectionTitle>
              <div className="space-y-2">
                {changes.map(c => (
                  <div key={c.id} className="rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-[10px] text-slate-400">{c.code}</span><StatusChip s={c.status} />
                      {['Solicitada', 'Em Análise'].includes(c.status) && (
                        <span className="ml-auto flex gap-1.5">
                          <Btn size="sm" variant="outline" onClick={() => { mutate(d => { const x = d.changes.find(y => y.id === c.id); if (x) { x.status = 'Rejeitada'; x.decidedAt = todayISO(); } }, { action: 'REJEITOU_MUDANÇA', entity: 'ChangeRequest', entityId: c.id }); toast('Mudança rejeitada.', 'warn'); }}>Rejeitar</Btn>
                          <Btn size="sm" onClick={() => { mutate(d => { const x = d.changes.find(y => y.id === c.id); if (x) { x.status = 'Aprovada'; x.decidedAt = todayISO(); } const pj = d.projects.find(y => y.id === c.projectId); if (pj && c.scheduleImpactDays && pj.plannedEnd) { const t = new Date(pj.forecastEnd ?? pj.plannedEnd); t.setDate(t.getDate() + c.scheduleImpactDays); pj.forecastEnd = t.toISOString().slice(0, 10); } if (pj && c.costImpact) pj.budget += c.costImpact; }, { action: 'APROVOU_MUDANÇA', entity: 'ChangeRequest', entityId: c.id }); toast('Mudança aprovada — linha de base atualizada.', 'success'); }}>Aprovar</Btn>
                        </span>
                      )}
                    </div>
                    <div className="text-[12.5px] font-semibold text-ink-800 dark:text-slate-200 mt-1">{c.title}</div>
                    <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">escopo {c.scopeImpact} · custo {c.costImpact >= 0 ? '+' : ''}{brlCompact(c.costImpact)} · prazo {c.scheduleImpactDays >= 0 ? '+' : ''}{c.scheduleImpactDays}d</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============ EQUIPE ============ */}
      {tab === 'equipe' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle>Equipe & Alocação</SectionTitle>
            <div className="space-y-2">
              {p.teamIds.map(tid => {
                const u = db.users.find(x => x.id === tid);
                const alloc = db.allocations.filter(a => a.userId === tid).reduce((s, a) => s + a.percent, 0);
                if (!u) return null;
                return (
                  <div key={tid} className="flex items-center gap-3 rounded-lg ring-1 ring-slate-200/70 dark:ring-white/8 px-3 py-2.5">
                    <Avatar name={u.name} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink-800 dark:text-slate-200">{u.name} <span className="text-[10.5px] font-normal text-slate-400">· {u.position}</span></div>
                      <div className="flex items-center gap-2 mt-1"><Progress value={alloc} tone={alloc > 110 ? 'red' : alloc > 90 ? 'amber' : 'teal'} h={5} className="max-w-[140px]" /><span className={`text-[10.5px] font-mono font-bold ${alloc > 110 ? 'text-rose-500' : alloc > 90 ? 'text-amber-600' : 'text-slate-500'}`}>{alloc}%</span></div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[130px]">{u.skills.slice(0, 2).map(s => <Chip key={s} tone="slate">{s}</Chip>)}</div>
                  </div>
                );
              })}
            </div>
            <SectionTitle className="mt-5">Matriz RACI</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11.5px]">
                <thead><tr className="text-[9.5px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                  <th className="px-2 py-2">Atividade</th>{p.teamIds.map(tid => <th key={tid} className="px-2 py-2 text-center">{db.users.find(u => u.id === tid)?.name.split(' ')[0]}</th>)}
                </tr></thead>
                <tbody>
                  {db.raci.filter(r => r.projectId === p.id).map(r => (
                    <tr key={r.id} className="border-b border-slate-100 dark:border-white/5">
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{r.activity}</td>
                      {p.teamIds.map(tid => {
                        const v = r.raci[tid];
                        return <td key={tid} className="px-2 py-2 text-center">{v && <Chip tone={v === 'R' ? 'teal' : v === 'A' ? 'red' : v === 'C' ? 'steel' : 'neutral'}>{v}</Chip>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[10px] font-mono text-slate-400 mt-2">R = Responsável · A = Aprovador · C = Consultado · I = Informado</div>
            </div>
          </Card>
          <Card>
            <SectionTitle>Partes Interessadas — Poder × Interesse</SectionTitle>
            <PowerInterest items={db.stakeholders.filter(s => s.projectId === p.id).map(s => ({ id: s.id, name: s.name, influence: s.influence, interest: s.interest }))} />
            <div className="mt-3 space-y-1.5">
              {db.stakeholders.filter(s => s.projectId === p.id).map(s => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1 ring-slate-200/60 dark:ring-white/6">
                  <Users size={14} className="text-steel-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-ink-800 dark:text-slate-200">{s.name} <span className="text-slate-400 font-normal">· {s.organization}</span></div>
                    <div className="text-[10.5px] text-slate-400">{s.strategy}</div>
                  </div>
                  <StatusChip s={s.engagement} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ============ IA ============ */}
      {tab === 'ia' && (
        <div className="grid lg:grid-cols-2 gap-4 stagger">
          <Card>
            <SectionTitle right={<AiBadge />}>Análises da Inteligência para este projeto</SectionTitle>
            <div className="space-y-2">
              {db.insights.filter(i => i.projectId === p.id).map(i => (
                <div key={i.id} className="rounded-lg bg-slate-50 dark:bg-white/5 p-3">
                  <div className="flex items-center gap-2"><Chip tone={i.severity === 'Crítica' ? 'red' : i.severity === 'Alta' ? 'orange' : 'amber'}>{i.severity}</Chip><span className="text-[10px] font-mono uppercase text-slate-400">{i.kind}</span><span className="ml-auto text-[10px] font-mono text-slate-400">confiança {i.confidence}%</span></div>
                  <div className="text-[12.5px] font-semibold text-ink-800 dark:text-slate-200 mt-1">{i.title}</div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">{i.detail}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1.5">Dados utilizados: {i.dataUsed}</div>
                </div>
              ))}
              {db.insights.filter(i => i.projectId === p.id).length === 0 && <EmptyState title="Sem análises específicas" hint="Gere o Resumo Inteligente ou execute a análise de portfólio na Central de Inteligência." />}
            </div>
          </Card>
          <Card>
            <SectionTitle>NEX Forecast — Previsão</SectionTitle>
            <ForecastCard projectId={p.id} detailed />
            <div className="mt-3 text-[10.5px] text-slate-400 flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0" /> Esta é uma previsão baseada nos dados atualmente disponíveis e não representa garantia de resultado.</div>
          </Card>
        </div>
      )}

      {/* charter modal + print */}
      <Modal open={charterOpen} onClose={() => setCharterOpen(false)} title="Termo de Abertura do Projeto (TAP)" width="max-w-3xl"
        footer={<><Btn variant="ghost" onClick={() => setCharterOpen(false)}>Fechar</Btn><Btn onClick={() => window.print()}><Printer size={14} /> Imprimir / PDF</Btn></>}>
        <CharterView p={p} org={org.name} db={db} />
      </Modal>
      <PrintSheet><CharterView p={p} org={org.name} db={db} print /></PrintSheet>

      <NewTaskModal open={newTask} onClose={() => setNewTask(false)} projectId={p.id} orgId={p.orgId} />
    </div>
  );
}

function ForecastCard({ projectId, detailed }: { projectId: string; detailed?: boolean }) {
  const { db, refreshTick } = useApp();
  const fc = useMemo(() => forecastProject(db, projectId), [db, projectId, refreshTick]);
  const p = db.projects.find(x => x.id === projectId)!;
  if (fc.insufficient) return (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300/50 p-3.5 text-[12px] text-amber-800 dark:text-amber-200 flex gap-2"><Info size={15} className="shrink-0 mt-0.5" /> {fc.note}</div>
  );
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2.5">
        <div><div className="text-[10px] font-mono uppercase text-slate-400">Conclusão prevista</div><div className="font-display font-bold text-[15px] text-ink-900 dark:text-white">{fmtDate(fc.forecastEnd)}</div></div>
        {fc.delayDays > 0 ? <Chip tone="red">+{fc.delayDays} dias</Chip> : <Chip tone="green">no prazo</Chip>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><div className="text-[10px] font-mono uppercase text-slate-400">Prob. de atraso</div>
          <div className={`font-display font-bold text-lg ${fc.delayProbability > 60 ? 'text-rose-600' : fc.delayProbability > 35 ? 'text-amber-600' : 'text-emerald-600'}`}>{fc.delayProbability}%</div>
          <Progress value={fc.delayProbability} tone={fc.delayProbability > 60 ? 'red' : fc.delayProbability > 35 ? 'amber' : 'green'} h={4} /></div>
        <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-2.5"><div className="text-[10px] font-mono uppercase text-slate-400">Prob. estouro orçamento</div>
          <div className={`font-display font-bold text-lg ${fc.budgetOverrunProbability > 50 ? 'text-rose-600' : fc.budgetOverrunProbability > 25 ? 'text-amber-600' : 'text-emerald-600'}`}>{fc.budgetOverrunProbability}%</div>
          <Progress value={fc.budgetOverrunProbability} tone={fc.budgetOverrunProbability > 50 ? 'red' : fc.budgetOverrunProbability > 25 ? 'amber' : 'green'} h={4} /></div>
      </div>
      <div className="flex items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400"><RefreshCw size={12} /> Tendência de saúde: <b className={fc.healthTrend === 'Piorando' ? 'text-rose-500' : fc.healthTrend === 'Melhorando' ? 'text-emerald-600' : ''}>{fc.healthTrend}</b></div>
      {detailed && fc.bottlenecks.length > 0 && (
        <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3"><div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Gargalos identificados</div>
          <ul className="list-disc pl-4 text-[11.5px] text-slate-600 dark:text-slate-300 space-y-0.5">{fc.bottlenecks.map(b => <li key={b}>{b}</li>)}</ul></div>
      )}
    </div>
  );
}

function CharterView({ p, org, db, print }: { p: any; org: string; db: any; print?: boolean }) {
  const c = p.charter;
  const name = (id: string) => db.users.find((u: any) => u.id === id)?.name ?? '—';
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 border-b border-slate-100 dark:border-white/6 text-[12.5px]">
      <span className="text-[10.5px] uppercase font-mono text-slate-400 pt-0.5">{l}</span><span className="text-ink-800 dark:text-slate-200">{v}</span>
    </div>
  );
  const List = ({ items }: { items: string[] }) => <ul className="list-disc pl-4 space-y-0.5">{items.map((x: string) => <li key={x}>{x}</li>)}</ul>;
  return (
    <div className={print ? '' : 'space-y-0'}>
      {print && <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}>Termo de Abertura do Projeto — {p.name}</h1>}
      {print && <p>{org} · {p.code} · emitido em {fmtDate(todayISO())} · NETPROJECT</p>}
      <Row l="Projeto" v={<b>{p.name} ({p.code})</b>} />
      <Row l="Necessidade" v={c?.businessNeed ?? p.justification} />
      <Row l="Objetivo" v={p.objective} />
      <Row l="Escopo" v={c?.scope ?? '—'} />
      <Row l="Benefícios" v={c ? <List items={c.benefits} /> : '—'} />
      <Row l="Entregáveis" v={c ? <List items={c.deliverables} /> : '—'} />
      <Row l="Premissas" v={c ? <List items={c.assumptions} /> : '—'} />
      <Row l="Restrições" v={c ? <List items={c.constraints} /> : '—'} />
      <Row l="Riscos Iniciais" v={c ? <List items={c.risks} /> : '—'} />
      <Row l="Orçamento" v={brl(p.budget)} />
      <Row l="Prazo" v={`${fmtDate(p.start)} → ${fmtDate(p.plannedEnd)}`} />
      <Row l="Sponsor" v={name(p.sponsorId)} />
      <Row l="Gerente" v={name(p.managerId)} />
      <Row l="Aprovação" v={c?.approvedBy ? `${c.approvedBy} — ${fmtDate(c.approvedAt)}` : 'Pendente de aprovação'} />
    </div>
  );
}

function NewTaskModal({ open, onClose, projectId, orgId }: { open: boolean; onClose: () => void; projectId: string; orgId: string }) {
  const { db, mutate, toast, session } = useApp();
  const [f, setF] = useState({ title: '', responsibleId: '', plannedStart: todayISO(), plannedEnd: todayISO(), priority: 'Média', estimatedH: '16' });
  const [err, setErr] = useState('');
  const submit = () => {
    if (!f.title.trim()) { setErr('Informe o título da tarefa.'); return; }
    mutate(d => {
      d.tasks.push({ id: uid(), orgId, projectId, title: f.title, responsibleId: f.responsibleId || undefined, collaboratorIds: [], plannedStart: f.plannedStart, plannedEnd: f.plannedEnd, priority: f.priority as Task['priority'], status: 'Não Iniciada', progress: 0, dependencies: [], estimatedH: Number(f.estimatedH) || 0, actualH: 0, tags: [], critical: false });
    }, { action: 'CRIOU', entity: 'Task', after: f.title });
    toast('Tarefa criada.', 'success');
    setF({ title: '', responsibleId: '', plannedStart: todayISO(), plannedEnd: todayISO(), priority: 'Média', estimatedH: '16' });
    setErr(''); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Nova Tarefa" footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={submit}><Plus size={14} /> Criar</Btn></>}>
      <div className="space-y-3">
        <Field label="Título" required><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Responsável"><Select value={f.responsibleId} onChange={e => setF({ ...f, responsibleId: e.target.value })}><option value="">— sem responsável —</option>{db.users.filter(u => u.orgId === orgId).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
          <Field label="Prioridade"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{['Baixa', 'Média', 'Alta', 'Crítica'].map(x => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Início planejado"><Input type="date" value={f.plannedStart} onChange={e => setF({ ...f, plannedStart: e.target.value })} /></Field>
          <Field label="Fim planejado"><Input type="date" value={f.plannedEnd} onChange={e => setF({ ...f, plannedEnd: e.target.value })} /></Field>
          <Field label="Horas estimadas"><Input type="number" value={f.estimatedH} onChange={e => setF({ ...f, estimatedH: e.target.value })} /></Field>
        </div>
        {err && <div className="text-[12px] font-medium text-rose-600">{err}</div>}
      </div>
    </Modal>
  );
}
