import React, { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { Card, SectionTitle, PageHeader, Btn, Chip, StatusChip, Select, AiBadge, Avatar, Progress, EmptyState, Modal, Field, Input } from '../components/ui';
import { VBars, HBars, Donut } from '../components/charts';
import { brl, brlCompact, fmtMonth, evm, workloadOf, uid, todayISO } from '../lib/engine';
import { Coins, Sparkles, Users, Plus, ArrowLeftRight } from 'lucide-react';

// ============================================================
// CUSTOS
// ============================================================
export function CostsPage() {
  const { db, session, nav } = useApp();
  const orgId = session!.orgId;
  const org = db.organizations.find(o => o.id === orgId)!;
  const projects = db.projects.filter(p => p.orgId === orgId);
  const costs = db.costs.filter(c => c.orgId === orgId);
  const [proj, setProj] = useState('Todos');
  const byProject = projects.map(p => ({ p, actual: costs.filter(c => c.projectId === p.id).reduce((s, c) => s + c.actual, 0), planned: costs.filter(c => c.projectId === p.id).reduce((s, c) => s + c.planned, 0) })).filter(x => x.actual > 0 || x.planned > 0).sort((a, b) => b.actual - a.actual);
  const byPortfolio = db.portfolios.filter(pf => pf.orgId === orgId).map(pf => ({ label: pf.name.replace('Portfólio ', ''), value: projects.filter(p => p.portfolioId === pf.id).reduce((s, p) => s + db.costs.filter(c => c.projectId === p.id).reduce((x, c) => x + c.actual, 0), 0) }));
  const byCategory = [...new Set(costs.map(c => c.category))].map(cat => ({ label: cat, value: costs.filter(c => c.category === cat).reduce((s, c) => s + c.actual, 0) }));
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalActual = costs.reduce((s, c) => s + c.actual, 0);
  const months = [...new Set(costs.map(c => c.month))].sort();
  const visible = proj === 'Todos' ? byProject : byProject.filter(x => x.p.id === proj);

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Gestão de custos" title="Custos" subtitle="Linha de base, realizado, empenhado e projeção — por projeto, portfólio, unidade e categoria."
        actions={<Select value={proj} onChange={e => setProj(e.target.value)} className="!w-auto"><option value="Todos">Todos os projetos</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name.slice(0, 26)}</option>)}</Select>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5 stagger">
        <div className="rounded-xl bg-ink-900 grid-tex p-4 text-white"><div className="text-[11px] uppercase font-semibold text-slate-400">Orçamento Aprovado</div><div className="font-display font-bold text-[22px] mt-1">{brlCompact(totalBudget)}</div></div>
        <div className="rounded-xl bg-card dark:bg-ink-800 ring-1 ring-slate-900/8 dark:ring-white/8 p-4"><div className="text-[11px] uppercase font-semibold text-slate-400">Realizado</div><div className="font-display font-bold text-[22px] text-ink-900 dark:text-white mt-1">{brlCompact(totalActual)}</div><div className="text-[10.5px] font-mono text-slate-400 mt-0.5">{totalBudget ? Math.round(totalActual / totalBudget * 100) : 0}% do orçamento</div></div>
        <div className="rounded-xl bg-card dark:bg-ink-800 ring-1 ring-slate-900/8 dark:ring-white/8 p-4"><div className="text-[11px] uppercase font-semibold text-slate-400">Empenhado / Comprometido</div><div className="font-display font-bold text-[22px] text-ink-900 dark:text-white mt-1">{brlCompact(costs.reduce((s, c) => s + c.committed, 0))}</div></div>
        <div className="rounded-xl bg-card dark:bg-ink-800 ring-1 ring-slate-900/8 dark:ring-white/8 p-4"><div className="text-[11px] uppercase font-semibold text-slate-400">Projeção (EAC somado)</div><div className="font-display font-bold text-[22px] text-ink-900 dark:text-white mt-1">{brlCompact(byProject.reduce((s, x) => s + (evm(db, x.p.id)?.eac ?? 0), 0))}</div></div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 stagger">
        <Card className="lg:col-span-2">
          <SectionTitle>Planejado × Realizado por Mês</SectionTitle>
          <VBars height={190} money={brlCompact} series={months.map(mo => ({ label: fmtMonth(mo), a: costs.filter(c => c.month === mo).reduce((s, c) => s + c.planned, 0), b: costs.filter(c => c.month === mo).reduce((s, c) => s + c.actual, 0) }))} />
        </Card>
        <Card>
          <SectionTitle>Realizado por Portfólio</SectionTitle>
          <HBars items={byPortfolio} money={brlCompact} />
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/6">
            <div className="text-[11px] font-semibold uppercase text-slate-400 mb-2">Por categoria</div>
            <Donut size={104} thickness={13} center={brlCompact(totalActual).replace('R$ ', '')} sub="realizado" segments={byCategory.map((c, i) => ({ ...c, color: ['#17998c', '#2a6691', '#f59e0b', '#e11d48', '#94a3b8'][i % 5] }))} />
          </div>
        </Card>
      </div>
      <Card className="mt-4" pad={false}>
        <div className="p-4 pb-2 flex items-center justify-between"><SectionTitle className="!mb-0">Desempenho por Projeto (EVM)</SectionTitle>{org.governance.publicTerms && <Chip tone="steel">inclui dotação/empenho/liquidação</Chip>}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead><tr className="text-[10px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
              <th className="px-4 py-2 font-semibold">Projeto</th><th className="px-3 py-2 font-semibold">Orçamento</th><th className="px-3 py-2 font-semibold">Realizado</th><th className="px-3 py-2 font-semibold">CPI</th><th className="px-3 py-2 font-semibold">SPI</th><th className="px-3 py-2 font-semibold">EAC</th><th className="px-3 py-2 font-semibold">Variação</th>
            </tr></thead>
            <tbody>
              {visible.map(({ p, actual }) => {
                const e = evm(db, p.id);
                if (!e) return null;
                const variance = p.budget - e.eac;
                return (
                  <tr key={p.id} onClick={() => nav('projeto', p.id, 'custos')} className="border-b border-slate-100 dark:border-white/5 hover:bg-petrol-50/50 dark:hover:bg-petrol-900/10 cursor-pointer">
                    <td className="px-4 py-2.5"><b className="font-mono text-[10.5px] text-slate-400">{p.code}</b> <span className="font-semibold text-ink-800 dark:text-slate-200">{p.name}</span></td>
                    <td className="px-3 py-2.5 font-mono">{brlCompact(p.budget)}</td>
                    <td className="px-3 py-2.5 font-mono">{brlCompact(actual)}</td>
                    <td className={`px-3 py-2.5 font-mono font-bold ${e.cpi >= 1 ? 'text-emerald-600' : e.cpi >= 0.92 ? 'text-amber-600' : 'text-rose-600'}`}>{e.cpi.toFixed(2)}</td>
                    <td className={`px-3 py-2.5 font-mono font-bold ${e.spi >= 1 ? 'text-emerald-600' : e.spi >= 0.9 ? 'text-amber-600' : 'text-rose-600'}`}>{e.spi.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">{brlCompact(e.eac)}</td>
                    <td className={`px-3 py-2.5 font-mono font-semibold ${variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{variance >= 0 ? '+' : ''}{brlCompact(variance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// RECURSOS (capacidade)
// ============================================================
export function ResourcesPage() {
  const { db, session, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [confirmRec, setConfirmRec] = useState<{ from: string; to: string; taskTitle: string; taskId: string } | null>(null);
  const people = db.users.filter(u => u.orgId === orgId && db.allocations.some(a => a.userId === u.id))
    .map(u => ({ u, w: workloadOf(db, u.id), tasks: db.tasks.filter(t => t.orgId === orgId && t.responsibleId === u.id && !['Concluída', 'Cancelada'].includes(t.status)).length }))
    .sort((a, b) => b.w.total - a.w.total);
  const overloaded = people.filter(p => p.w.total > 110);
  const under = people.filter(p => p.w.total < 60);
  const suggestion = useMemo(() => {
    if (!overloaded.length || !under.length) return null;
    const from = overloaded[0], to = under[0];
    const task = db.tasks.find(t => t.responsibleId === from.u.id && !t.critical && !['Concluída', 'Cancelada'].includes(t.status));
    if (!task) return null;
    return { from: from.u, to: to.u, task };
  }, [db, overloaded.length, under.length]);

  const applyRedistribution = () => {
    if (!confirmRec) return;
    mutate(d => {
      const t = d.tasks.find(x => x.id === confirmRec.taskId);
      if (t) t.responsibleId = d.users.find(u => u.name === confirmRec.to)?.id ?? t.responsibleId;
      d.recommendations.unshift({ id: uid(), orgId, title: `Redistribuição aplicada: ${confirmRec.taskTitle}`, detail: `De ${confirmRec.from} para ${confirmRec.to} — aprovada por usuário.`, rationale: 'Recomendação da Inteligência confirmada.', action: { type: 'reassign', taskId: confirmRec.taskId }, status: 'Aplicada', createdAt: new Date().toISOString() });
    }, { action: 'REDISTRIBUIU_TAREFA', entity: 'Task', entityId: confirmRec.taskId, before: confirmRec.from, after: confirmRec.to });
    toast(`Tarefa redistribuída para ${confirmRec.to}.`, 'success');
    setConfirmRec(null);
  };

  const levelTone = (l: string) => l === 'Sobrecarga' ? 'red' : l === 'Alta utilização' ? 'amber' : l === 'Adequada' ? 'green' : 'steel';
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Capacidade & carga" title="Recursos" subtitle="Alocação por pessoa, status de utilização e redistribuição sugerida pela Inteligência — aplicada somente com sua confirmação." />

      {suggestion && (
        <div className="mb-4 rounded-xl bg-ink-900 grid-tex ring-1 ring-petrol-500/30 p-4 anim-rise">
          <div className="flex items-center gap-2 mb-1.5"><Sparkles size={15} className="text-petrol-300" /><b className="font-display text-[13.5px] text-white">Recomendação da Inteligência</b><AiBadge>human-in-the-loop</AiBadge></div>
          <p className="text-[12.5px] text-slate-300">Redistribuir “{suggestion.task.title}” de <b className="text-white">{suggestion.from.name}</b> ({workloadOf(db, suggestion.from.id).total}%, sobrecarga) para <b className="text-white">{suggestion.to.name}</b> ({workloadOf(db, suggestion.to.id).total}%).</p>
          <p className="text-[10.5px] font-mono text-slate-500 mt-1">Dados: alocações ativas × capacidade semanal · nenhuma alteração é feita sem aprovação.</p>
          <div className="flex gap-2 mt-3">
            <Btn size="sm" onClick={() => setConfirmRec({ from: suggestion.from.name, to: suggestion.to.name, taskTitle: suggestion.task.title, taskId: suggestion.task.id })}><ArrowLeftRight size={13} /> Aplicar</Btn>
            <Btn size="sm" variant="outline" className="!ring-white/25 !text-slate-200 hover:!bg-white/10" onClick={() => { mutate(d => { }, { action: 'REVISOU_RECOMENDAÇÃO', entity: 'AiRecommendation' }); toast('Recomendação marcada para revisão.', 'info'); }}>Revisar</Btn>
            <Btn size="sm" variant="ghost" className="!text-slate-400 hover:!bg-white/10" onClick={() => toast('Recomendação ignorada.', 'info')}>Ignorar</Btn>
          </div>
        </div>
      )}

      <div className="space-y-2 stagger">
        {people.map(({ u, w, tasks }) => (
          <Card key={u.id} className="!p-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={u.name} size={38} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <b className="text-[13px] text-ink-900 dark:text-slate-100">{u.name}</b>
                  <span className="text-[10.5px] text-slate-400">{u.position}</span>
                  <Chip tone={levelTone(w.level) as never}>{w.level}</Chip>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={w.total} tone={w.total > 110 ? 'red' : w.total > 90 ? 'amber' : 'teal'} h={7} className="max-w-[340px]" />
                  <span className={`font-mono text-[12px] font-bold ${w.total > 110 ? 'text-rose-600' : w.total > 90 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-300'}`}>{w.total}%</span>
                  <span className="text-[10.5px] text-slate-400 font-mono">{tasks} tarefa(s) ativa(s) · {u.capacityH}h/sem</span>
                </div>
              </div>
              <div className="hidden md:flex flex-wrap gap-1 max-w-[220px] justify-end">{u.skills.map(s => <Chip key={s} tone="slate">{s}</Chip>)}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {db.allocations.filter(a => a.userId === u.id).map(a => {
                const p = db.projects.find(x => x.id === a.projectId);
                return p ? (
                  <button key={a.id} onClick={() => nav('projeto', p.id)} className="text-[10.5px] font-mono rounded-md bg-slate-100 dark:bg-white/6 px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-petrol-100 hover:text-petrol-700 dark:hover:bg-petrol-900/30 dark:hover:text-petrol-300 transition">
                    {p.code} · {a.percent}%
                  </button>
                ) : null;
              })}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!confirmRec} onClose={() => setConfirmRec(null)} title="Confirmar redistribuição"
        footer={<><Btn variant="ghost" onClick={() => setConfirmRec(null)}>Cancelar</Btn><Btn onClick={applyRedistribution}><ArrowLeftRight size={14} /> Confirmar e aplicar</Btn></>}>
        <p className="text-[13px] text-slate-600 dark:text-slate-300">A tarefa <b>“{confirmRec?.taskTitle}”</b> será reatribuída de <b>{confirmRec?.from}</b> para <b>{confirmRec?.to}</b>. A ação fica registrada na trilha de auditoria e pode ser revertida manualmente.</p>
      </Modal>
    </div>
  );
}

// ============================================================
// EQUIPES
// ============================================================
export function TeamsPage() {
  const { db, session, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const teams = db.teams.filter(t => t.orgId === orgId);
  const submit = () => {
    if (!name.trim()) { toast('Informe o nome da equipe.', 'warn'); return; }
    mutate(d => { d.teams.push({ id: uid(), orgId, name, leadId: session?.userId, memberIds: [session!.userId] }); }, { action: 'CRIOU', entity: 'Team', after: name });
    toast('Equipe criada.', 'success');
    setShowNew(false); setName('');
  };
  return (
    <div className="p-4 sm:p-6 max-w-[1100px] mx-auto">
      <PageHeader kicker="Estrutura de pessoas" title="Equipes" subtitle="Times, papéis, habilidades e projetos — a matriz RACI completa fica na Central de cada Projeto."
        actions={<Btn onClick={() => setShowNew(true)}><Plus size={14} /> Nova Equipe</Btn>} />
      <div className="grid md:grid-cols-2 gap-3 stagger">
        {teams.map(t => {
          const lead = db.users.find(u => u.id === t.leadId);
          const projs = db.projects.filter(p => p.orgId === orgId && p.teamIds.some(m => t.memberIds.includes(m)));
          return (
            <Card key={t.id}>
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-lg bg-steel-600 text-white grid place-items-center"><Users size={16} /></span>
                <div className="flex-1"><b className="font-display text-[14px] text-ink-900 dark:text-white">{t.name}</b>
                  <div className="text-[10.5px] text-slate-400">Líder: {lead?.name ?? '—'}</div></div>
                <Chip tone="steel">{t.memberIds.length} membros</Chip>
              </div>
              <div className="flex -space-x-2 mt-3">
                {t.memberIds.map(mid => { const u = db.users.find(x => x.id === mid); return u ? <Avatar key={mid} name={u.name} size={30} /> : null; })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/6">
                <div className="text-[10px] uppercase font-mono text-slate-400 mb-1.5">Projetos atendidos</div>
                <div className="flex flex-wrap gap-1.5">
                  {projs.map(p => <button key={p.id} onClick={() => nav('projeto', p.id, 'equipe')} className="font-mono text-[10.5px] rounded-md bg-slate-100 dark:bg-white/6 px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-petrol-100 hover:text-petrol-700 transition">{p.code}</button>)}
                  {projs.length === 0 && <span className="text-[11px] text-slate-400">Nenhum projeto vinculado.</span>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Equipe" footer={<><Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn><Btn onClick={submit}>Criar Equipe</Btn></>}>
        <Field label="Nome da equipe" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Equipe de Dados e Indicadores" /></Field>
      </Modal>
    </div>
  );
}
