import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import type { Idea, IdeaStatus, Demand, DemandStatus } from '../lib/types';
import { Card, PageHeader, Btn, Chip, StatusChip, Modal, Field, Input, Textarea, Select, EmptyState, AiBadge, Thinking, Tabs } from '../components/ui';
import { analyzeIdea, brlCompact, fmtDate, relTime, uid, todayISO } from '../lib/engine';
import { Lightbulb, Sparkles, FlaskConical, ArrowRight, Info, XCircle, CheckCircle2, FileSearch, Layers3, ShieldQuestion } from 'lucide-react';

const IDEA_FLOW: IdeaStatus[] = ['Registrada', 'Em Análise', 'Em Estudo', 'Priorizada', 'Aprovada', 'Convertida em Demanda'];

// ============================================================
// IDEIAS
// ============================================================
export function IdeasPage() {
  const { db, session, user, route, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const org = db.organizations.find(o => o.id === orgId)!;
  const [filter, setFilter] = useState('Todas');
  const [selId, setSelId] = useState<string | null>(route.tab === 'nova' ? 'NEW' : null);
  const [showNew, setShowNew] = useState(route.tab === 'nova');
  const [analyzing, setAnalyzing] = useState(false);
  const ideas = db.ideas.filter(i => i.orgId === orgId).filter(i => filter === 'Todas' || i.status === filter);

  useEffect(() => { if (route.tab === 'nova') setShowNew(true); }, [route.tab]);

  const sel = db.ideas.find(i => i.id === selId) ?? null;

  const runAnalysis = (idea: Idea) => {
    setAnalyzing(true);
    setTimeout(() => {
      const a = analyzeIdea(idea, org.sector);
      mutate(d => {
        const x = d.ideas.find(i => i.id === idea.id);
        if (x) { x.analysis = a; x.status = x.status === 'Registrada' ? 'Em Análise' : x.status; }
        d.insights.unshift({ id: uid(), orgId, kind: 'IA', severity: 'Informação', title: `NEX Strategy analisou a ideia ${idea.code}`, detail: `Viabilidade preliminar: ${a.score}/100.`, createdAt: new Date().toISOString(), dataUsed: a.dataUsed.join('; '), confidence: a.confidence });
      }, { action: 'GEROU_ANÁLISE_IA', entity: 'Idea', entityId: idea.id, after: `Viabilidade ${a.score}/100` });
      setAnalyzing(false);
      toast('Análise preliminar gerada pela NEX Strategy.', 'success');
    }, 1400);
  };
  const advance = (idea: Idea, status: IdeaStatus) => {
    mutate(d => { const x = d.ideas.find(i => i.id === idea.id); if (x) x.status = status; }, { action: 'ATUALIZOU_STATUS', entity: 'Idea', entityId: idea.id, before: idea.status, after: status });
    toast(`Ideia movida para "${status}".`, 'info');
  };
  const convertToDemand = (idea: Idea) => {
    const code = `DEM-${new Date().getFullYear()}-${String(100 + db.demands.length)}`;
    mutate(d => {
      const x = d.ideas.find(i => i.id === idea.id);
      if (x) x.status = 'Convertida em Demanda';
      d.demands.unshift({ id: uid(), orgId, code, title: idea.title, description: `${idea.description}\n\nProblema: ${idea.problem}\nBenefício esperado: ${idea.benefit}`, requesterId: idea.authorId, unitId: d.units.find(u => u.orgId === orgId)?.id ?? '', category: idea.area, type: 'Inovação', priority: idea.urgency === 'Alta' ? 'Alta' : 'Média', urgency: idea.urgency, impact: 'Médio', effort: 'M', requestedAt: todayISO(), status: 'Nova', origin: `Ideia ${idea.code}`, benefit: idea.benefit, justification: idea.problem });
      d.events.unshift({ id: uid(), orgId, source: 'NETPROJECT', type: 'IDEA_APPROVED', payload: `${idea.code} convertida em ${code}`, receivedAt: new Date().toISOString(), processed: true });
    }, { action: 'CONVERTEU_IDEIA', entity: 'Idea', entityId: idea.id, after: code });
    toast(`Ideia convertida na demanda ${code}.`, 'success');
    setSelId(null);
    nav('demandas');
  };

  const counts = (s: string) => db.ideas.filter(i => i.orgId === orgId && (filter === 'Todas' || true) && i.status === s).length;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Funil de inovação" title="Ideias" subtitle="Registre ideias em linguagem natural. A NEX Strategy gera a análise preliminar estruturada — separando dados confirmados, estimativas, hipóteses e premissas."
        actions={<Btn onClick={() => setShowNew(true)}><Lightbulb size={14} /> Registrar Ideia</Btn>} />

      <div className="flex gap-1.5 flex-wrap mb-4 anim-rise">
        {['Todas', ...IDEA_FLOW, 'Rejeitada'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${filter === s ? 'bg-ink-900 text-white dark:bg-petrol-700' : 'bg-card dark:bg-ink-800 ring-1 ring-slate-200 dark:ring-white/10 text-slate-500 hover:text-ink-800 dark:hover:text-white'}`}>
            {s}{s !== 'Todas' && <span className="ml-1.5 opacity-60">{counts(s)}</span>}
          </button>
        ))}
      </div>

      {ideas.length === 0 ? <Card><EmptyState title="Nenhuma ideia neste filtro" hint="Registre a primeira ideia do funil de inovação." /></Card> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
          {ideas.map(i => (
            <Card key={i.id} onClick={() => setSelId(i.id)} className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[10.5px] text-slate-400">{i.code}</span>
                <StatusChip s={i.status} />
                <Chip tone={i.urgency === 'Alta' ? 'red' : i.urgency === 'Média' ? 'amber' : 'neutral'} className="ml-auto">Urgência {i.urgency}</Chip>
              </div>
              <div className="font-display font-semibold text-[14px] text-ink-900 dark:text-white leading-snug">{i.title}</div>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 flex-1">{i.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/6">
                <span className="text-[11px] text-slate-400 truncate">{i.area}</span>
                {i.analysis
                  ? <span className="flex items-center gap-1.5"><AiBadge /> <b className={`font-display text-[13px] ${i.analysis.score >= 72 ? 'text-emerald-600' : i.analysis.score >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>{i.analysis.score}</b></span>
                  : <span className="text-[11px] font-semibold text-petrol-600 flex items-center gap-1"><Sparkles size={12} /> Aguardando análise</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* detail modal */}
      <Modal open={!!sel} onClose={() => setSelId(null)} title={sel ? `${sel.code} — ${sel.title}` : ''} width="max-w-3xl"
        footer={sel && sel.status !== 'Convertida em Demanda' && sel.status !== 'Rejeitada' ? (
          <>
            <Btn variant="ghost" onClick={() => advance(sel, 'Rejeitada')}><XCircle size={14} /> Rejeitar</Btn>
            {IDEA_FLOW.includes(sel.status) && IDEA_FLOW.indexOf(sel.status) < IDEA_FLOW.length - 1 && sel.status !== 'Aprovada' && (
              <Btn variant="outline" onClick={() => advance(sel, IDEA_FLOW[IDEA_FLOW.indexOf(sel.status) + 1])}>Avançar para “{IDEA_FLOW[IDEA_FLOW.indexOf(sel.status) + 1]}”</Btn>
            )}
            {(sel.status === 'Priorizada' || sel.status === 'Aprovada') && <Btn onClick={() => convertToDemand(sel)}><ArrowRight size={14} /> Converter em Demanda</Btn>}
          </>
        ) : undefined}>
        {sel && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-[12.5px]">
              <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3"><b className="block text-[10.5px] uppercase text-slate-400 mb-1">Problema identificado</b><span className="text-slate-600 dark:text-slate-300">{sel.problem}</span></div>
              <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3"><b className="block text-[10.5px] uppercase text-slate-400 mb-1">Benefício esperado</b><span className="text-slate-600 dark:text-slate-300">{sel.benefit}</span></div>
            </div>
            <p className="text-[13px] text-slate-600 dark:text-slate-300">{sel.description}</p>
            <div className="text-[11.5px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Área: <b className="text-slate-600 dark:text-slate-300">{sel.area}</b></span>
              <span>Público: <b className="text-slate-600 dark:text-slate-300">{sel.audience}</b></span>
              <span>Autor: <b className="text-slate-600 dark:text-slate-300">{db.users.find(u => u.id === sel.authorId)?.name}</b></span>
              <span>Registrada {relTime(sel.createdAt)}</span>
              <span>{sel.attachments} anexo(s)</span>
            </div>

            <div className="rounded-xl ring-1 ring-ink-900/10 dark:ring-white/10 bg-ink-900 grid-tex p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2"><Sparkles size={15} className="text-petrol-300" /><b className="font-display text-white text-[14px]">NEX Strategy — Análise Preliminar</b></div>
                {!sel.analysis && !analyzing && <Btn size="sm" onClick={() => runAnalysis(sel)}><FlaskConical size={13} /> Gerar análise com IA</Btn>}
              </div>
              {analyzing && <Thinking label="NEX Strategy analisando a ideia…" />}
              {!analyzing && !sel.analysis && <p className="text-[12px] text-slate-400">A análise gera: resumo executivo, viabilidade preliminar (0–100), cenários, riscos e recomendação — sempre separando o que é dado confirmado de estimativa e hipótese.</p>}
              {!analyzing && sel.analysis && <IdeaAnalysisView idea={sel} orgSector={org.sector} />}
            </div>
          </div>
        )}
      </Modal>

      <NewIdeaModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function IdeaAnalysisView({ idea, orgSector }: { idea: Idea; orgSector: 'public' | 'private' }) {
  const [tab, setTab] = useState('resumo');
  const a = idea.analysis!;
  const { db } = useApp();
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="relative h-[74px] w-[74px] shrink-0">
          <svg viewBox="0 0 74 74" className="w-full h-full">
            <circle cx="37" cy="37" r="31" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="7" />
            <circle cx="37" cy="37" r="31" fill="none" stroke={a.score >= 72 ? '#34d399' : a.score >= 55 ? '#fbbf24' : '#fb7185'} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 31} strokeDashoffset={2 * Math.PI * 31 * (1 - a.score / 100)} transform="rotate(-90 37 37)" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 grid place-items-center"><span className="font-display font-bold text-white text-lg">{a.score}</span></div>
        </div>
        <div>
          <div className="text-petrol-300 font-display font-semibold text-[13px]">Viabilidade Preliminar: {a.score}/100</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Confiança {a.confidence}% · {a.engine} · {fmtDate(a.generatedAt)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><ShieldQuestion size={11} /> Esta análise não substitui estudo de viabilidade formal.</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {a.components.map(c => (
          <div key={c.label} className="rounded-md bg-white/5 px-2 py-1.5">
            <div className="text-[9px] text-slate-400 leading-tight">{c.label}</div>
            <div className={`font-display font-bold text-[13px] ${c.value >= 70 ? 'text-emerald-300' : c.value >= 50 ? 'text-amber-300' : 'text-rose-300'}`}>{c.value}</div>
          </div>
        ))}
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[{ key: 'resumo', label: 'Resumo' }, { key: 'cenarios', label: 'Cenários' }, { key: 'rigor', label: 'Rigor & Transparência' }]} />
      {tab === 'resumo' && (
        <div className="space-y-3 text-[12.5px] text-slate-300">
          <div className="rounded-lg bg-white/6 p-3"><b className="block text-petrol-300 text-[10.5px] uppercase mb-1">Resumo Executivo</b>{a.summary}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/6 p-3"><b className="block text-petrol-300 text-[10.5px] uppercase mb-1">Recursos Necessários</b><ul className="list-disc pl-4 space-y-0.5">{a.resources.map(r => <li key={r}>{r}</li>)}</ul></div>
            <div className="rounded-lg bg-white/6 p-3"><b className="block text-petrol-300 text-[10.5px] uppercase mb-1">Prazo & Custo (estimativa)</b><p>{a.timeEstimate}</p><p>{a.costEstimate}</p><p className="mt-1 text-slate-400">Complexidade {a.complexity}</p></div>
            <div className="rounded-lg bg-white/6 p-3"><b className="block text-petrol-300 text-[10.5px] uppercase mb-1">Riscos</b><ul className="list-disc pl-4 space-y-0.5">{a.risks.map(r => <li key={r}>{r}</li>)}</ul></div>
            <div className="rounded-lg bg-white/6 p-3"><b className="block text-petrol-300 text-[10.5px] uppercase mb-1">Indicadores Sugeridos</b><ul className="list-disc pl-4 space-y-0.5">{a.indicators.map(r => <li key={r}>{r}</li>)}</ul></div>
          </div>
          <div className="rounded-lg bg-petrol-900/40 ring-1 ring-petrol-500/30 p-3"><b className="block text-petrol-200 text-[10.5px] uppercase mb-1">Recomendação da Inteligência</b>{a.recommendation}</div>
        </div>
      )}
      {tab === 'cenarios' && (
        <div className="grid sm:grid-cols-3 gap-2">
          {a.scenarios.map(s => (
            <div key={s.name} className={`rounded-lg p-3 ring-1 ${s.name === 'Equilibrado' ? 'bg-petrol-900/40 ring-petrol-500/40' : 'bg-white/5 ring-white/10'}`}>
              <div className="flex items-center justify-between"><b className="font-display text-white text-[13px]">{s.name}</b>{s.name === 'Equilibrado' && <Chip tone="teal">sugerido</Chip>}</div>
              <div className="mt-2 space-y-1 text-[11.5px] text-slate-300">
                <p><span className="text-slate-500">Custo:</span> <b>{brlCompact(s.cost)}</b></p>
                <p><span className="text-slate-500">Duração:</span> {s.durationMonths} meses</p>
                <p><span className="text-slate-500">Equipe:</span> {s.team}</p>
                <p><span className="text-slate-500">Risco:</span> {s.risk}</p>
                <p><span className="text-slate-500">Trade-offs:</span> {s.tradeoffs}</p>
              </div>
            </div>
          ))}
          <p className="sm:col-span-3 text-[10.5px] text-slate-500 flex items-center gap-1.5"><Info size={12} /> Estimativas de ordem de grandeza. A decisão de avanço é sempre humana.</p>
        </div>
      )}
      {tab === 'rigor' && (
        <div className="space-y-2 text-[12px]">
          <div className="grid sm:grid-cols-2 gap-2">
            <div className="rounded-lg bg-emerald-950/40 ring-1 ring-emerald-500/25 p-3"><b className="block text-emerald-300 text-[10.5px] uppercase mb-1">Dados Confirmados</b><ul className="list-disc pl-4 space-y-0.5 text-slate-300">{a.confirmed.map(r => <li key={r}>{r}</li>)}</ul></div>
            <div className="rounded-lg bg-amber-950/40 ring-1 ring-amber-500/25 p-3"><b className="block text-amber-300 text-[10.5px] uppercase mb-1">Estimativas</b><ul className="list-disc pl-4 space-y-0.5 text-slate-300">{a.estimates.map(r => <li key={r}>{r}</li>)}</ul></div>
            <div className="rounded-lg bg-steel-900/40 ring-1 ring-steel-500/25 p-3"><b className="block text-steel-300 text-[10.5px] uppercase mb-1">Hipóteses</b><ul className="list-disc pl-4 space-y-0.5 text-slate-300">{a.hypotheses.map(r => <li key={r}>{r}</li>)}</ul></div>
            <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3"><b className="block text-slate-300 text-[10.5px] uppercase mb-1">Premissas</b><ul className="list-disc pl-4 space-y-0.5 text-slate-300">{a.assumptions.map(r => <li key={r}>{r}</li>)}</ul></div>
          </div>
          <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-3"><b className="block text-slate-300 text-[10.5px] uppercase mb-1">Ver como esta análise foi gerada</b>
            <p className="text-slate-400 mt-1">Dados utilizados: {a.dataUsed.join('; ')}. Modelo: {a.engine}. Limitações: {a.limitations.join(' · ')}.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NewIdeaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, mutate, toast, db } = useApp();
  const orgId = session!.orgId;
  const [f, setF] = useState({ title: '', description: '', problem: '', benefit: '', area: '', audience: '', urgency: 'Média' as Idea['urgency'] });
  const [err, setErr] = useState('');
  const submit = () => {
    if (!f.title.trim() || !f.problem.trim()) { setErr('Título e problema identificado são obrigatórios.'); return; }
    const code = `IDE-${new Date().getFullYear()}-${String(17 + db.ideas.length).padStart(3, '0')}`;
    mutate(d => {
      d.ideas.unshift({ id: uid(), orgId, code, ...f, authorId: session!.userId, status: 'Registrada', createdAt: new Date().toISOString(), attachments: 0 });
    }, { action: 'CRIOU', entity: 'Idea', after: `${code} — ${f.title}` });
    toast(`Ideia ${code} registrada. Gere a análise NEX Strategy na ficha da ideia.`, 'success');
    setF({ title: '', description: '', problem: '', benefit: '', area: '', audience: '', urgency: 'Média' });
    setErr(''); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Registrar Ideia" footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={submit}><Lightbulb size={14} /> Registrar</Btn></>}>
      <div className="space-y-3">
        <Field label="Título" required><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Ex.: Atendimento ao cidadão via assistente virtual" /></Field>
        <Field label="Descrição da ideia"><Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Problema identificado" required><Textarea value={f.problem} onChange={e => setF({ ...f, problem: e.target.value })} placeholder="Descreva o problema em linguagem natural…" /></Field>
        <Field label="Benefício esperado"><Textarea value={f.benefit} onChange={e => setF({ ...f, benefit: e.target.value })} /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Área interessada"><Input value={f.area} onChange={e => setF({ ...f, area: e.target.value })} /></Field>
          <Field label="Público impactado"><Input value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })} /></Field>
          <Field label="Urgência"><Select value={f.urgency} onChange={e => setF({ ...f, urgency: e.target.value as Idea['urgency'] })}><option>Baixa</option><option>Média</option><option>Alta</option></Select></Field>
        </div>
        {err && <div className="text-[12px] font-medium text-rose-600">{err}</div>}
      </div>
    </Modal>
  );
}

// ============================================================
// DEMANDAS
// ============================================================
const DEMAND_FLOW: { s: DemandStatus; next: DemandStatus; label: string }[] = [
  { s: 'Nova', next: 'Triagem', label: 'Iniciar triagem' },
  { s: 'Triagem', next: 'Em Análise', label: 'Iniciar análise' },
  { s: 'Em Análise', next: 'Priorizada', label: 'Priorizar' },
  { s: 'Aguardando Informação', next: 'Em Análise', label: 'Retomar análise' },
  { s: 'Priorizada', next: 'Aprovada', label: 'Aprovar' },
  { s: 'Aprovada', next: 'Convertida em Projeto', label: 'Converter em Projeto' },
];
export function DemandsPage() {
  const { db, session, route, nav, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [filter, setFilter] = useState('Todas');
  const [showNew, setShowNew] = useState(route.tab === 'nova');
  const [selId, setSelId] = useState<string | null>(route.id ?? null);
  useEffect(() => { if (route.tab === 'nova') setShowNew(true); if (route.id) setSelId(route.id); }, [route.tab, route.id]);
  const demands = db.demands.filter(x => x.orgId === orgId).filter(x => filter === 'Todas' || x.status === filter);
  const sel = db.demands.find(x => x.id === selId) ?? null;
  const relatedCount = db.demands.filter(x => x.orgId === orgId && ['Nova', 'Triagem', 'Em Análise', 'Priorizada'].includes(x.status) && x.category.toLowerCase().includes('rede')).length;

  const advance = (x: Demand) => {
    const step = DEMAND_FLOW.find(s => s.s === x.status);
    if (!step) return;
    if (step.next === 'Convertida em Projeto') { convertToProject(x); return; }
    mutate(d => { const y = d.demands.find(i => i.id === x.id); if (y) y.status = step.next; }, { action: 'ATUALIZOU_STATUS', entity: 'Demand', entityId: x.id, before: x.status, after: step.next });
    toast(`Demanda movida para "${step.next}".`, 'info');
  };
  const convertToProject = (x: Demand) => {
    const code = `PRJ-${new Date().getFullYear()}-${String(7 + db.projects.length).padStart(3, '0')}`;
    mutate(d => {
      const y = d.demands.find(i => i.id === x.id); if (y) { y.status = 'Convertida em Projeto'; }
      d.projects.unshift({
        id: uid(), orgId, code, name: x.title, description: x.description, objective: x.benefit, justification: x.justification,
        sponsorId: x.requesterId, managerId: x.analystId ?? session!.userId, teamIds: [session!.userId],
        start: todayISO(), plannedEnd: (() => { const t = new Date(); t.setDate(t.getDate() + 180); return t.toISOString().slice(0, 10); })(),
        priority: x.priority, status: 'Planejamento', objectiveIds: [], portfolioId: d.portfolios.find(p => p.orgId === orgId)?.id ?? '',
        budget: x.effort === 'GG' ? 2000000 : x.effort === 'G' ? 900000 : x.effort === 'M' ? 400000 : 150000,
        methodology: 'Híbrida', type: x.category, confidentiality: 'Interno', unitId: x.unitId, progress: 0,
        tags: ['originado-de-demanda'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      d.events.unshift({ id: uid(), orgId, source: 'NETPROJECT', type: 'DEMAND_APPROVED', payload: `${x.code} convertido em projeto`, receivedAt: new Date().toISOString(), processed: true });
    }, { action: 'CONVERTEU_DEMANDA', entity: 'Demand', entityId: x.id, after: code });
    toast(`Demanda convertida no projeto ${code}.`, 'success');
    setSelId(null);
    nav('projetos');
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <PageHeader kicker="Gestão de demanda" title="Demandas" subtitle="Funil único de solicitações: triagem, análise, priorização e conversão em projetos — com consolidação sugerida pela Inteligência."
        actions={<Btn onClick={() => setShowNew(true)}>+ Nova Demanda</Btn>} />

      {relatedCount >= 2 && (
        <div className="mb-4 rounded-xl ring-1 ring-petrol-500/30 bg-petrol-50 dark:bg-petrol-900/20 px-4 py-3 flex items-start gap-3 anim-rise">
          <Layers3 size={17} className="text-petrol-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold text-petrol-800 dark:text-petrol-200">A Inteligência identificou {relatedCount} demandas relacionadas à modernização da infraestrutura de rede.</div>
            <div className="text-[11.5px] text-petrol-700/80 dark:text-petrol-300/80 mt-0.5">Considere consolidá-las em um programa. Há uma recomendação pendente na Central de Inteligência.</div>
          </div>
          <Btn size="sm" variant="outline" onClick={() => nav('inteligencia', undefined, 'recomendacoes')}>Ver recomendação</Btn>
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap mb-4 anim-rise">
        {['Todas', ...DEMAND_FLOW.map(s => s.s), 'Em Planejamento', 'Rejeitada', 'Concluída'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${filter === s ? 'bg-ink-900 text-white dark:bg-petrol-700' : 'bg-card dark:bg-ink-800 ring-1 ring-slate-200 dark:ring-white/10 text-slate-500 hover:text-ink-800 dark:hover:text-white'}`}>{s}</button>
        ))}
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="text-[10.5px] uppercase font-mono text-slate-400 border-b border-slate-200/70 dark:border-white/8">
                <th className="px-4 py-2.5 font-semibold">Código</th><th className="px-3 py-2.5 font-semibold">Demanda</th>
                <th className="px-3 py-2.5 font-semibold">Solicitante</th><th className="px-3 py-2.5 font-semibold">Prioridade</th>
                <th className="px-3 py-2.5 font-semibold">Esforço</th><th className="px-3 py-2.5 font-semibold">Status</th><th className="px-3 py-2.5 font-semibold">Origem</th>
              </tr>
            </thead>
            <tbody>
              {demands.map(x => (
                <tr key={x.id} onClick={() => setSelId(x.id)} className="border-b border-slate-100 dark:border-white/5 hover:bg-petrol-50/50 dark:hover:bg-petrol-900/10 cursor-pointer transition">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{x.code}</td>
                  <td className="px-3 py-2.5 font-semibold text-ink-900 dark:text-slate-100 max-w-[320px] truncate">{x.title}</td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{db.users.find(u => u.id === x.requesterId)?.name ?? '—'}</td>
                  <td className="px-3 py-2.5"><Chip tone={x.priority === 'Crítica' ? 'red' : x.priority === 'Alta' ? 'orange' : x.priority === 'Média' ? 'steel' : 'neutral'}>{x.priority}</Chip></td>
                  <td className="px-3 py-2.5 font-mono">{x.effort}</td>
                  <td className="px-3 py-2.5"><StatusChip s={x.status} /></td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-400">{x.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {demands.length === 0 && <EmptyState title="Nenhuma demanda neste filtro" />}
        </div>
      </Card>

      <Modal open={!!sel} onClose={() => setSelId(null)} title={sel ? `${sel.code} — ${sel.title}` : ''} width="max-w-2xl"
        footer={sel && (() => {
          const step = DEMAND_FLOW.find(s => s.s === sel.status);
          return step ? (
            <>
              {sel.status === 'Em Análise' && <Btn variant="outline" onClick={() => { mutate(d => { const y = d.demands.find(i => i.id === sel.id); if (y) y.status = 'Aguardando Informação'; }, { action: 'ATUALIZOU_STATUS', entity: 'Demand', entityId: sel.id, before: sel.status, after: 'Aguardando Informação' }); toast('Demanda aguardando informação do solicitante.', 'info'); }}>Solicitar informação</Btn>}
              <Btn variant="ghost" onClick={() => { mutate(d => { const y = d.demands.find(i => i.id === sel.id); if (y) y.status = 'Rejeitada'; }, { action: 'ATUALIZOU_STATUS', entity: 'Demand', entityId: sel.id, before: sel.status, after: 'Rejeitada' }); toast('Demanda rejeitada.', 'warn'); }}>Rejeitar</Btn>
              <Btn onClick={() => advance(sel)}>{step.next === 'Convertida em Projeto' ? <><ArrowRight size={14} /> Converter em Projeto</> : step.label}</Btn>
            </>
          ) : undefined;
        })()}>
        {sel && (
          <div className="space-y-3 text-[13px]">
            <div className="flex flex-wrap gap-2"><StatusChip s={sel.status} /><Chip tone={sel.urgency === 'Alta' ? 'red' : 'steel'}>Urgência {sel.urgency}</Chip><Chip tone={sel.impact === 'Alto' ? 'orange' : 'steel'}>Impacto {sel.impact}</Chip><Chip tone="neutral">Esforço {sel.effort}</Chip><Chip tone="neutral">{sel.type}</Chip></div>
            <p className="text-slate-600 dark:text-slate-300">{sel.description}</p>
            <div className="grid sm:grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3"><b className="block text-[10.5px] uppercase text-slate-400 mb-1">Benefício esperado</b>{sel.benefit}</div>
              <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3"><b className="block text-[10.5px] uppercase text-slate-400 mb-1">Justificativa</b>{sel.justification}</div>
            </div>
            <div className="text-[11.5px] text-slate-400 grid sm:grid-cols-2 gap-x-4 gap-y-1">
              <span>Solicitante: <b className="text-slate-600 dark:text-slate-300">{db.users.find(u => u.id === sel.requesterId)?.name}</b></span>
              <span>Unidade: <b className="text-slate-600 dark:text-slate-300">{db.units.find(u => u.id === sel.unitId)?.name ?? '—'}</b></span>
              <span>Análise: <b className="text-slate-600 dark:text-slate-300">{db.users.find(u => u.id === sel.analystId)?.name ?? 'não atribuída'}</b></span>
              <span>Solicitada em: <b className="text-slate-600 dark:text-slate-300">{fmtDate(sel.requestedAt)}</b></span>
              <span>Prazo desejado: <b className="text-slate-600 dark:text-slate-300">{fmtDate(sel.desiredDate)}</b></span>
              <span>Origem: <b className="text-slate-600 dark:text-slate-300">{sel.origin}</b></span>
            </div>
            {sel.origin.startsWith('NEX') && <div className="rounded-lg ring-1 ring-steel-300/50 bg-steel-50 dark:bg-steel-900/20 px-3 py-2 text-[11.5px] text-steel-800 dark:text-steel-200">Demanda gerada automaticamente por evento de integração do ecossistema NEX ({sel.origin}) e revisada por pessoa antes de qualquer priorização.</div>}
          </div>
        )}
      </Modal>
      <NewDemandModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewDemandModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, db, mutate, toast } = useApp();
  const orgId = session!.orgId;
  const [f, setF] = useState({ title: '', description: '', category: 'TI', priority: 'Média' as Demand['priority'], urgency: 'Média' as Demand['urgency'], impact: 'Médio' as Demand['impact'], effort: 'M' as Demand['effort'], benefit: '', justification: '' });
  const [err, setErr] = useState('');
  const submit = () => {
    if (!f.title.trim()) { setErr('Informe o título da demanda.'); return; }
    const code = `DEM-${new Date().getFullYear()}-${String(95 + db.demands.length)}`;
    mutate(d => {
      d.demands.unshift({ id: uid(), orgId, code, ...f, type: 'Melhoria', requesterId: session!.userId, unitId: db.units.find(u => u.orgId === orgId)?.id ?? '', requestedAt: todayISO(), status: 'Nova', origin: 'Interna', description: f.description || f.title });
      d.events.unshift({ id: uid(), orgId, source: 'NETPROJECT', type: 'DEMAND_CREATED', payload: code, receivedAt: new Date().toISOString(), processed: true });
    }, { action: 'CRIOU', entity: 'Demand', after: code });
    toast(`Demanda ${code} registrada no funil.`, 'success');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Nova Demanda" footer={<><Btn variant="ghost" onClick={onClose}>Cancelar</Btn><Btn onClick={submit}>Registrar Demanda</Btn></>}>
      <div className="space-y-3">
        <Field label="Título" required><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Descrição"><Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Categoria"><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{['TI', 'Infraestrutura de Rede', 'Obras', 'Capacitação', 'Transparência', 'Frota', 'Automação'].map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Prioridade"><Select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Demand['priority'] })}>{['Baixa', 'Média', 'Alta', 'Crítica'].map(c => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Esforço estimado"><Select value={f.effort} onChange={e => setF({ ...f, effort: e.target.value as Demand['effort'] })}>{['P', 'M', 'G', 'GG'].map(c => <option key={c}>{c}</option>)}</Select></Field>
        </div>
        <Field label="Benefício esperado"><Textarea value={f.benefit} onChange={e => setF({ ...f, benefit: e.target.value })} /></Field>
        {err && <div className="text-[12px] font-medium text-rose-600">{err}</div>}
      </div>
    </Modal>
  );
}
