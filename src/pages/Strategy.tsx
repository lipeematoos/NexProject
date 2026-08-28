import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, SectionTitle, PageHeader, Chip, StatusChip, Btn, Progress, AiBadge, Stat } from '../components/ui';
import { Donut, HBars, AreaLine, Ring } from '../components/charts';
import { brlCompact, fmtDate, computeHealth, activeProjects, scoreProject, CRITERIA, healthLabel, generateInsights, forecastProject } from '../lib/engine';
import { Target, Compass, ArrowDown, TrendingUp, Sparkles, FolderKanban, Map } from 'lucide-react';

// ============================================================
// ESTRATÉGIA — Painel Estratégico (Strategic Cockpit)
// ============================================================
export function StrategyPage() {
  const { db, session, nav } = useApp();
  const orgId = session!.orgId;
  const org = db.organizations.find(o => o.id === orgId)!;
  const plan = db.plans.find(p => p.orgId === orgId);
  const objectives = db.objectives.filter(o => o.orgId === orgId);
  const projects = db.projects.filter(p => p.orgId === orgId);
  const active = projects.filter(p => ['Em Execução', 'Planejamento', 'Aprovado'].includes(p.status));
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const health = active.map(p => computeHealth(db, p.id).overall);
  const avg = health.length ? Math.round(health.reduce((s, v) => s + v, 0) / health.length) : 0;
  const benefits = db.benefits.filter(b => projects.some(p => p.id === b.projectId));
  const topRisks = db.risks.filter(r => r.orgId === orgId && r.status !== 'Encerrado').sort((a, b) => b.probability * b.impact - a.probability * a.impact).slice(0, 4);
  const insights = generateInsights(db, orgId).slice(0, 3);
  const valueLens = org.sector === 'public'
    ? ['Valor público', 'Qualidade de serviço', 'Impacto na população', 'Conformidade legal']
    : ['ROI', 'Receita', 'Margem', 'Produtividade'];

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Painel Estratégico" title={plan?.name ?? 'Estratégia'} subtitle={`Horizonte ${plan?.horizon} — conexão direta entre objetivos, portfólio, benefícios e decisões.`}
        actions={<AiBadge>Cockpit executivo</AiBadge>} />

      {/* lens */}
      <div className="mb-4 flex items-center gap-2 flex-wrap anim-rise">
        <Compass size={15} className="text-petrol-600" />
        <span className="text-[12px] text-slate-500 dark:text-slate-400">Lente de análise desta organização ({org.type}):</span>
        {valueLens.map(v => <Chip key={v} tone="teal">{v}</Chip>)}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5 stagger">
        <Stat label="Orçamento da Carteira" value={brlCompact(totalBudget)} tone="teal" />
        <Stat label="Saúde do Portfólio" value={`${avg}/100`} tone={avg >= 75 ? 'green' : avg >= 55 ? 'amber' : 'red'} hint={healthLabel(avg)} />
        <Stat label="Projetos × Objetivos" value={`${active.length}`} tone="steel" hint={`${objectives.length} objetivos estratégicos`} />
        <Stat label="Benefícios Monitorados" value={benefits.length} tone="green" hint={benefits.filter(b => b.actual).length + ' com resultado medido'} />
      </div>

      {/* Strategy map */}
      <Card className="mb-5">
        <SectionTitle right={<span className="flex items-center gap-1.5 text-[11px] text-slate-400"><Map size={13} /> mapa estratégico cascata</span>}>Mapa Estratégico</SectionTitle>
        <div className="flex flex-col items-center gap-2">
          <div className="w-full max-w-md rounded-xl bg-ink-900 grid-tex text-center px-6 py-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-petrol-300">Visão</div>
            <div className="font-display font-bold text-white text-[15px] mt-1">{org.sector === 'public' ? 'Ser referência em gestão pública digital e transparente' : 'Ser a engenharia mais digital e confiável do mercado'}</div>
          </div>
          <ArrowDown size={16} className="text-slate-300" />
          <div className="grid md:grid-cols-3 gap-2.5 w-full">
            {plan?.pillars.map(pil => (
              <div key={pil.id} className="rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-3" style={{ borderTop: `3px solid ${pil.color}` }}>
                <div className="font-display font-semibold text-[13px] text-ink-900 dark:text-white">{pil.name}</div>
                <div className="mt-2 space-y-2">
                  {objectives.filter(o => o.pillarId === pil.id).map(o => {
                    const linked = projects.filter(p => p.objectiveIds.includes(o.id) && !['Cancelado'].includes(p.status));
                    const pct = o.goal ? Math.round(Math.min(100, ((o.current ?? 0) / o.goal) * 100)) : 0;
                    return (
                      <button key={o.id} onClick={() => nav('projetos')} className="w-full text-left rounded-lg bg-slate-50 dark:bg-white/5 p-2.5 hover:ring-1 hover:ring-petrol-400 transition">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: pil.color }}>{o.code}</span>
                          <span className="text-[12px] font-semibold text-ink-800 dark:text-slate-200 flex-1 truncate">{o.name}</span>
                        </div>
                        <div className="mt-1.5"><Progress value={pct} tone="teal" h={5} /></div>
                        <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-400">
                          <span>{o.indicator}: {o.current}{o.unit} → {o.goal}{o.unit}</span>
                          <span>{linked.length} projeto{linked.length === 1 ? '' : 's'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <ArrowDown size={16} className="text-slate-300" />
          <div className="w-full max-w-2xl rounded-xl ring-1 ring-petrol-500/30 bg-petrol-50 dark:bg-petrol-900/20 px-5 py-3 text-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-petrol-700 dark:text-petrol-300">Execução</div>
            <div className="text-[12.5px] text-petrol-900 dark:text-petrol-200 mt-0.5">{active.length} projetos e {db.programs.filter(x => x.orgId === orgId).length} programas conectados aos objetivos — cada projeto responde: <b>por que existe, qual objetivo atende e qual indicador impacta</b>.</div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 stagger">
        <Card>
          <SectionTitle>Projetos por Objetivo</SectionTitle>
          <HBars items={objectives.map(o => ({ label: `${o.code} — ${o.name.slice(0, 30)}`, value: projects.filter(p => p.objectiveIds.includes(o.id)).length, color: plan?.pillars.find(p => p.id === o.pillarId)?.color ?? '#17998c' }))} />
        </Card>
        <Card>
          <SectionTitle>Principais Riscos Estratégicos</SectionTitle>
          <div className="space-y-2">
            {topRisks.map(r => (
              <button key={r.id} onClick={() => nav('riscos')} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 ring-slate-200/70 dark:ring-white/8 hover:ring-rose-300 transition text-left">
                <span className={`h-8 w-8 rounded-lg grid place-items-center font-display font-bold text-[12px] text-white shrink-0 ${r.probability * r.impact >= 15 ? 'bg-rose-500' : r.probability * r.impact >= 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}>{r.probability * r.impact}</span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-ink-800 dark:text-slate-200 truncate">{r.title}</span>
                  <span className="block text-[10px] font-mono text-slate-400">{r.category} · {r.response}{r.aiSuggested ? ' · sugerido pela IA' : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle right={<AiBadge />}>Alertas Estratégicos</SectionTitle>
          <div className="space-y-2">
            {insights.map(i => (
              <button key={i.id} onClick={() => nav('inteligencia')} className="w-full text-left rounded-lg px-2.5 py-2 ring-1 ring-slate-200/70 dark:ring-white/8 hover:ring-petrol-300 transition">
                <div className="flex items-center gap-2"><Chip tone={i.severity === 'Crítica' ? 'red' : i.severity === 'Alta' ? 'orange' : 'amber'}>{i.severity}</Chip><span className="text-[10px] font-mono text-slate-400 uppercase">{i.kind}</span></div>
                <div className="text-[12px] font-semibold text-ink-800 dark:text-slate-200 mt-1">{i.title}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/6">
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-2">Benefícios esperados</div>
            <div className="space-y-1.5">
              {benefits.slice(0, 3).map(b => (
                <div key={b.id} className="flex justify-between text-[11.5px] gap-2">
                  <span className="text-slate-500 dark:text-slate-400 truncate">{b.description}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 shrink-0">{b.baseline} → {b.target}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// PORTFÓLIOS + PROGRAMAS
// ============================================================
export function PortfoliosPage({ mode }: { mode: 'portfolios' | 'programas' }) {
  const { db, session, nav } = useApp();
  const orgId = session!.orgId;
  const [selPf, setSelPf] = useState<string | null>(null);
  const portfolios = db.portfolios.filter(p => p.orgId === orgId);
  const programs = db.programs.filter(p => p.orgId === orgId);
  const projects = db.projects.filter(p => p.orgId === orgId);
  const pf = portfolios.find(p => p.id === selPf) ?? portfolios[0];

  if (mode === 'programas') {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
        <PageHeader kicker="Gestão de programas" title="Programas" subtitle="Grupos de projetos relacionados com benefícios mensuráveis e saúde agregada." />
        <div className="grid lg:grid-cols-3 gap-4 stagger">
          {programs.map(pg => {
            const prjs = projects.filter(p => p.programId === pg.id);
            const healths = prjs.map(p => computeHealth(db, p.id).overall);
            const avgH = healths.length ? Math.round(healths.reduce((s, v) => s + v, 0) / healths.length) : 0;
            const consumed = db.costs.filter(c => prjs.some(p => p.id === c.projectId)).reduce((s, c) => s + c.actual, 0);
            const risks = db.risks.filter(r => prjs.some(p => p.id === r.projectId) && r.status !== 'Encerrado').length;
            return (
              <Card key={pg.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-[10.5px] text-slate-400">{pg.code}</div>
                    <div className="font-display font-bold text-[15px] text-ink-900 dark:text-white">{pg.name}</div>
                  </div>
                  <StatusChip s={pg.status} />
                </div>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-2">{pg.objective}</p>
                <div className="flex items-center gap-3 mt-3">
                  <Ring value={avgH} size={62} />
                  <div className="flex-1 space-y-1.5 text-[11.5px]">
                    <div className="flex justify-between"><span className="text-slate-400">Orçamento</span><b className="font-mono text-ink-800 dark:text-slate-200">{brlCompact(pg.budget)}</b></div>
                    <div className="flex justify-between"><span className="text-slate-400">Realizado</span><b className="font-mono text-ink-800 dark:text-slate-200">{brlCompact(consumed)}</b></div>
                    <div className="flex justify-between"><span className="text-slate-400">Riscos ativos</span><b className="font-mono">{risks}</b></div>
                    <div className="flex justify-between"><span className="text-slate-400">Gerente</span><b>{db.users.find(u => u.id === pg.managerId)?.name.split(' ')[0]}</b></div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/6">
                  <div className="text-[10.5px] font-semibold uppercase text-slate-400 mb-1.5">Projetos do programa</div>
                  <div className="space-y-1">
                    {prjs.map(p => (
                      <button key={p.id} onClick={() => nav('projeto', p.id)} className="w-full flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 transition">
                        <span className="text-[12px] font-medium text-ink-800 dark:text-slate-200 truncate">{p.name}</span>
                        <StatusChip s={p.status} />
                      </button>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">{pg.benefits.map(b => <Chip key={b} tone="green">{b}</Chip>)}</div>
                </div>
                <div className="text-[10.5px] font-mono text-slate-400 mt-3">{fmtDate(pg.start)} → {fmtDate(pg.end)}</div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Gestão de portfólio" title="Portfólios" subtitle="Saúde agregada, orçamento, capacidade e priorização ponderada da carteira de projetos." />
      <div className="flex gap-2 flex-wrap mb-4 anim-rise">
        {portfolios.map(p => (
          <button key={p.id} onClick={() => setSelPf(p.id)} className={`px-4 py-2 rounded-xl text-left transition ring-1 ${pf?.id === p.id ? 'bg-ink-900 dark:bg-petrol-800 text-white ring-transparent' : 'bg-card dark:bg-ink-800 ring-slate-200 dark:ring-white/10 hover:ring-petrol-400'}`}>
            <div className="font-display font-semibold text-[13px]">{p.name}</div>
            <div className={`text-[10.5px] font-mono ${pf?.id === p.id ? 'text-petrol-300' : 'text-slate-400'}`}>{brlCompact(p.budget)} · risco {p.riskProfile}</div>
          </button>
        ))}
      </div>
      {pf && (() => {
        const prjs = projects.filter(p => p.portfolioId === pf.id).filter(p => !['Cancelado'].includes(p.status));
        const activeP = prjs.filter(p => ['Em Execução', 'Planejamento', 'Aprovado'].includes(p.status));
        const healths = activeP.map(p => computeHealth(db, p.id).overall);
        const avgH = healths.length ? Math.round(healths.reduce((s, v) => s + v, 0) / healths.length) : 0;
        const consumed = db.costs.filter(c => prjs.some(p => p.id === c.projectId)).reduce((s, c) => s + c.actual, 0);
        const scored = prjs.map(p => ({ p, score: scoreProject(db, p) })).sort((a, b) => b.score - a.score);
        const byStatus = [...new Set(prjs.map(p => p.status))].map(s => ({ label: s, value: prjs.filter(p => p.status === s).length, color: s === 'Em Execução' ? '#17998c' : s === 'Concluído' ? '#10b981' : s === 'Planejamento' ? '#5b9ec6' : '#f59e0b' }));
        const teamIds = [...new Set(activeP.flatMap(p => p.teamIds))];
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 stagger">
              <Stat label="Saúde do Portfólio" value={<Ring value={avgH} size={56} />} tone={avgH >= 75 ? 'green' : avgH >= 55 ? 'amber' : 'red'} />
              <Stat label="Orçamento" value={brlCompact(pf.budget)} tone="teal" hint={`Consumido ${brlCompact(consumed)} (${pf.budget ? Math.round(consumed / pf.budget * 100) : 0}%)`} />
              <Stat label="Projetos" value={prjs.length} tone="steel" hint={`${activeP.length} ativos`} />
              <Stat label="Capacidade" value={`${teamIds.length} pessoas`} tone="teal" hint="alocadas na carteira" />
              <Stat label="Risco do Portfólio" value={pf.riskProfile} tone={pf.riskProfile === 'Alto' ? 'red' : pf.riskProfile === 'Médio' ? 'amber' : 'green'} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4 stagger">
              <Card>
                <SectionTitle>Composição</SectionTitle>
                <div className="flex items-center gap-4">
                  <Donut segments={byStatus} center={String(prjs.length)} sub="projetos" size={116} />
                  <div className="space-y-1.5 flex-1">
                    {byStatus.map(s => (
                      <div key={s.label} className="flex items-center gap-2 text-[11.5px]">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                        <span className="text-slate-500 dark:text-slate-400 flex-1 truncate">{s.label}</span>
                        <b className="font-mono">{s.value}</b>
                      </div>
                    ))}
                    <div className="pt-2 text-[10.5px] text-slate-400">Objetivos estratégicos: {pf.objectiveIds.map(o => db.objectives.find(x => x.id === o)?.code).join(', ')}</div>
                  </div>
                </div>
              </Card>
              <Card className="lg:col-span-2">
                <SectionTitle right={<span className="text-[10.5px] font-mono text-slate-400">modelo {db.organizations.find(o => o.id === orgId)?.sector === 'public' ? 'setor público (valor público)' : 'privado (ROI)'}</span>}>Priorização Ponderada</SectionTitle>
                <div className="space-y-2">
                  {scored.map(({ p, score }, i) => (
                    <button key={p.id} onClick={() => nav('projeto', p.id)} className="w-full grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-lg px-2.5 py-2 ring-1 ring-slate-200/70 dark:ring-white/8 hover:ring-petrol-400 transition text-left">
                      <span className={`h-7 w-7 rounded-lg grid place-items-center font-display font-bold text-[12px] ${i === 0 ? 'bg-petrol-600 text-white' : 'bg-slate-100 dark:bg-white/8 text-slate-500'}`}>{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-semibold text-ink-900 dark:text-slate-100 truncate">{p.name}</span>
                        <span className="block text-[10.5px] font-mono text-slate-400">{p.code} · {brlCompact(p.budget)} · {p.status}</span>
                      </span>
                      <span className={`font-display font-bold text-[17px] ${score >= 75 ? 'text-emerald-600' : score >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>{score}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/6 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-slate-400">
                  {CRITERIA.map(c => <span key={c.key}>{c.label} {(c.weight * 100).toFixed(0)}%</span>)}
                </div>
              </Card>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================
// ROADMAP
// ============================================================
export function RoadmapPage() {
  const { db, session, nav } = useApp();
  const orgId = session!.orgId;
  const projects = db.projects.filter(p => p.orgId === orgId && !['Cancelado'].includes(p.status));
  const now = new Date();
  const quarters = Array.from({ length: 6 }, (_, i) => {
    const dte = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + i * 3, 1);
    return { label: `T${Math.floor(dte.getMonth() / 3) + 1} ${dte.getFullYear()}`, start: dte, end: new Date(dte.getFullYear(), dte.getMonth() + 3, 0) };
  });
  const iso = (dte: Date) => dte.toISOString().slice(0, 10);
  const range = { start: +quarters[0].start, end: +quarters[5].end };
  const pos = (s: string) => Math.min(100, Math.max(0, ((+new Date(s + 'T00:00:00')) - range.start) / (range.end - range.start) * 100));
  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Roadmap do portfólio" title="Roadmap por Trimestre" subtitle="Linha do tempo consolidada de projetos e programas da organização." />
      <Card>
        <div className="grid grid-cols-6 text-[10.5px] font-mono font-semibold text-slate-400 mb-2 text-center">
          {quarters.map(q => <div key={q.label} className={`py-1 rounded ${q.label.startsWith(`T${Math.floor(now.getMonth() / 3) + 1}`) ? 'bg-petrol-100 dark:bg-petrol-900/40 text-petrol-700 dark:text-petrol-300' : ''}`}>{q.label}</div>)}
        </div>
        <div className="space-y-1.5">
          {db.programs.filter(p => p.orgId === orgId).map(pg => (
            <div key={pg.id} className="grid grid-cols-[170px_1fr] items-center gap-2">
              <span className="text-[11px] font-semibold text-steel-700 dark:text-steel-300 truncate flex items-center gap-1.5"><FolderKanban size={12} /> {pg.name}</span>
              <div className="relative h-5 rounded bg-slate-100 dark:bg-white/5 overflow-hidden">
                <div className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full bg-steel-400/80" style={{ left: `${pos(pg.start)}%`, width: `${Math.max(1, pos(pg.end) - pos(pg.start))}%` }} />
              </div>
            </div>
          ))}
          {projects.map(p => {
            const end = p.actualEnd ?? p.forecastEnd ?? p.plannedEnd;
            return (
              <button key={p.id} onClick={() => nav('projeto', p.id)} className="w-full grid grid-cols-[170px_1fr] items-center gap-2 group">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate text-left group-hover:text-petrol-600 transition">{p.code} · {p.name.split(' ').slice(0, 2).join(' ')}</span>
                <div className="relative h-5 rounded bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div className={`absolute top-1/2 -translate-y-1/2 h-3 rounded-full ${p.status === 'Concluído' || p.status === 'Encerrado' ? 'bg-emerald-400/80' : (p.forecastEnd ?? '') > p.plannedEnd ? 'bg-rose-400/80' : 'bg-petrol-500/85'}`}
                    style={{ left: `${pos(p.start)}%`, width: `${Math.max(1, pos(end) - pos(p.start))}%` }}>
                    <div className="h-full bg-ink-900/25 rounded-l-full" style={{ width: `${100 - p.progress}%`, marginLeft: `${p.progress}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-[10.5px] text-slate-500">
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-petrol-500/85" />No prazo</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />Com desvio de prazo</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />Concluído</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-steel-400/80" />Programa</span>
        </div>
      </Card>
    </div>
  );
}
